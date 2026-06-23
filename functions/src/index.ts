import { randomUUID } from 'node:crypto';
import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import { Storage } from '@google-cloud/storage';
import { onRequest } from 'firebase-functions/v2/https';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { GoogleAuth } from 'google-auth-library';
import type { Request, Response } from 'express';

if (getApps().length === 0) {
  initializeApp();
}

const storage = new Storage();
const documentAiClient = new DocumentProcessorServiceClient();
const googleAuth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const SIGNED_URL_TTL_MS = 15 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
]);

interface AuthenticatedRequestContext {
  uid: string;
  token: DecodedIdToken;
}

interface UploadUrlResponse {
  uploadUrl: string;
  gcsUri: string;
  expiresAt: string;
}

interface GcsPointer {
  bucket: string;
  object: string;
}

interface DocumentAIResult {
  text: string;
  pages: number;
  mimeType: string;
  textGcsUri: string;
  entities: Array<{
    type: string;
    content: string;
    confidence: number;
  }>;
  tables: Array<{
    headerRows: string[];
    bodyRows: string[][];
  }>;
  paragraphs: Array<{
    text: string;
    confidence: number;
  }>;
}

type AiOperation = 'analyze' | 'chat' | 'negotiationSuggestions' | 'negotiationAdvice';
type AnalysisPayload = Record<string, unknown>;

class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message);
  }
}

function writeSecurityHeaders(res: Response): void {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
}

function getRequestUrl(req: Request): URL {
  const rawUrl = req.originalUrl || req.url || '/';
  return new URL(rawUrl, 'https://clario.local');
}

function getApiPath(req: Request): string {
  const url = getRequestUrl(req);
  const apiIndex = url.pathname.indexOf('/api/');

  if (apiIndex >= 0) {
    return url.pathname.slice(apiIndex + '/api'.length);
  }

  return url.pathname;
}

function sanitizeFilename(filename: string): string {
  const normalized = filename.trim().replace(/[/\\]/g, '_').replace(/[^\w. -]/g, '_');

  if (!normalized || normalized === '.' || normalized === '..') {
    throw new HttpError(400, 'INVALID_FILENAME', 'A valid filename is required.');
  }

  return normalized.slice(0, 128);
}

function requireUploadBucket(): string {
  const bucket = process.env.CLARIO_UPLOAD_BUCKET;

  if (!bucket) {
    throw new HttpError(500, 'UPLOAD_BUCKET_NOT_CONFIGURED', 'Upload bucket is not configured.');
  }

  return bucket;
}

function requireProjectId(): string {
  const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || process.env.PROJECT_ID;

  if (!projectId) {
    throw new HttpError(500, 'PROJECT_NOT_CONFIGURED', 'Google Cloud project is not configured.');
  }

  return projectId;
}

function requireDocumentAiProcessorName(): string {
  const processorId = process.env.DOCUMENT_AI_PROCESSOR_ID;
  const location = process.env.DOCUMENT_AI_LOCATION || 'us';

  if (!processorId) {
    throw new HttpError(500, 'DOCUMENT_AI_NOT_CONFIGURED', 'Document AI processor is not configured.');
  }

  return documentAiClient.processorPath(requireProjectId(), location, processorId);
}

function assertJsonObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(400, 'INVALID_JSON', 'Request body must be a JSON object.');
  }

  return value as Record<string, unknown>;
}

function requireString(body: Record<string, unknown>, field: string): string {
  const value = body[field];

  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpError(400, 'INVALID_REQUEST', `${field} is required.`);
  }

  return value.trim();
}

function parseGcsUri(gcsUri: string): GcsPointer {
  const match = gcsUri.match(/^gs:\/\/([^/]+)\/(.+)$/);

  if (!match) {
    throw new HttpError(400, 'INVALID_GCS_URI', 'Expected a gs:// bucket pointer.');
  }

  return { bucket: match[1], object: match[2] };
}

function assertUserOwnedGcsUri(gcsUri: string, uid: string, allowedPrefixes: string[]): GcsPointer {
  const pointer = parseGcsUri(gcsUri);
  const expectedBucket = requireUploadBucket();

  if (pointer.bucket !== expectedBucket) {
    throw new HttpError(403, 'FORBIDDEN_GCS_URI', 'The GCS object is outside the Clario upload boundary.');
  }

  if (!allowedPrefixes.some((prefix) => pointer.object.startsWith(`${prefix}/${uid}/`))) {
    throw new HttpError(403, 'FORBIDDEN_GCS_URI', 'The GCS object is not owned by the authenticated user.');
  }

  return pointer;
}

async function authenticate(req: Request): Promise<AuthenticatedRequestContext> {
  const authorization = req.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Missing bearer token.');
  }

  try {
    const token = await getAuth().verifyIdToken(match[1], true);
    return { uid: token.uid, token };
  } catch (error) {
    console.warn('[auth] rejected request', error);
    throw new HttpError(401, 'UNAUTHORIZED', 'Invalid bearer token.');
  }
}

async function enforceRateLimit(uid: string): Promise<void> {
  const firestore = getFirestore();
  const rateLimitRef = firestore.collection('apiRateLimits').doc(uid);
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(rateLimitRef);
    const timestamps = snapshot.exists && Array.isArray(snapshot.data()?.timestamps)
      ? (snapshot.data()?.timestamps as unknown[]).filter((value): value is number => typeof value === 'number')
      : [];
    const recentRequests = timestamps.filter((timestamp) => timestamp > windowStart);

    if (recentRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
      throw new HttpError(429, 'RATE_LIMITED', 'Too many requests. Try again in one minute.');
    }

    transaction.set(rateLimitRef, {
      timestamps: [...recentRequests, now],
      updatedAt: new Date(now).toISOString()
    });
  });
}

async function handleUploadUrl(
  req: Request,
  user: AuthenticatedRequestContext
): Promise<UploadUrlResponse> {
  if (req.method !== 'GET') {
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Use GET for this endpoint.');
  }

  const url = getRequestUrl(req);
  const filename = url.searchParams.get('filename') || undefined;
  const contentType = url.searchParams.get('contentType') || undefined;
  const sizeBytesRaw = url.searchParams.get('sizeBytes') || undefined;
  const sizeBytes = Number(sizeBytesRaw);

  if (!filename || !contentType || !Number.isFinite(sizeBytes)) {
    throw new HttpError(400, 'INVALID_UPLOAD_REQUEST', 'filename, contentType, and sizeBytes are required.');
  }

  if (!ALLOWED_UPLOAD_MIME_TYPES.has(contentType)) {
    throw new HttpError(400, 'UNSUPPORTED_FILE_TYPE', 'Only PDF, DOCX, and plain text uploads are supported.');
  }

  if (sizeBytes <= 0 || sizeBytes > MAX_UPLOAD_BYTES) {
    throw new HttpError(400, 'FILE_TOO_LARGE', 'Files must be greater than 0 bytes and no larger than 10MB.');
  }

  const bucketName = requireUploadBucket();
  const safeFilename = sanitizeFilename(filename);
  const objectName = `uploads/${user.uid}/${randomUUID()}-${safeFilename}`;
  const expiresAtMs = Date.now() + SIGNED_URL_TTL_MS;
  const [uploadUrl] = await storage.bucket(bucketName).file(objectName).getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: expiresAtMs,
    contentType
  });

  return {
    uploadUrl,
    gcsUri: `gs://${bucketName}/${objectName}`,
    expiresAt: new Date(expiresAtMs).toISOString()
  };
}

function extractDocumentParagraphs(document: any): DocumentAIResult['paragraphs'] {
  if (!Array.isArray(document.pages)) {
    return [];
  }

  return document.pages.flatMap((page: any) =>
    (page.paragraphs || []).map((paragraph: any) => {
      const segments = paragraph.layout?.textAnchor?.textSegments || [];
      const text = segments
        .map((segment: any) => {
          const startIndex = Number(segment.startIndex || 0);
          const endIndex = Number(segment.endIndex || 0);
          return (document.text || '').slice(startIndex, endIndex);
        })
        .join('');

      return {
        text,
        confidence: Number(paragraph.layout?.confidence || 0)
      };
    })
  );
}

function extractDocumentTables(document: any): DocumentAIResult['tables'] {
  if (!Array.isArray(document.pages)) {
    return [];
  }

  return document.pages.flatMap((page: any) =>
    (page.tables || []).map((table: any) => ({
      headerRows: (table.headerRows || []).flatMap((row: any) =>
        (row.cells || []).map((cell: any) => cell.layout?.textAnchor?.content || '').filter(Boolean)
      ),
      bodyRows: (table.bodyRows || []).map((row: any) =>
        (row.cells || []).map((cell: any) => cell.layout?.textAnchor?.content || '').filter(Boolean)
      )
    }))
  );
}

async function handleDocumentProcess(req: Request, user: AuthenticatedRequestContext): Promise<DocumentAIResult> {
  if (req.method !== 'POST') {
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Use POST for this endpoint.');
  }

  const body = assertJsonObject(req.body);
  const gcsUri = requireString(body, 'gcsUri');
  const mimeType = requireString(body, 'mimeType');

  if (!ALLOWED_UPLOAD_MIME_TYPES.has(mimeType)) {
    throw new HttpError(400, 'UNSUPPORTED_FILE_TYPE', 'Only PDF, DOCX, and plain text uploads are supported.');
  }

  assertUserOwnedGcsUri(gcsUri, user.uid, ['uploads']);

  try {
    const [processResult] = await documentAiClient.processDocument({
      name: requireDocumentAiProcessorName(),
      gcsDocument: {
        gcsUri,
        mimeType
      }
    });

    const document = processResult.document;

    if (!document?.text) {
      throw new Error('Document AI returned no text.');
    }

    const textObjectName = `texts/${user.uid}/${randomUUID()}.txt`;
    await storage.bucket(requireUploadBucket()).file(textObjectName).save(document.text, {
      resumable: false,
      contentType: 'text/plain; charset=utf-8',
      metadata: {
        cacheControl: 'no-store',
        metadata: {
          sourceGcsUri: gcsUri
        }
      }
    });

    return {
      text: document.text,
      pages: Array.isArray(document.pages) ? document.pages.length : 1,
      mimeType,
      textGcsUri: `gs://${requireUploadBucket()}/${textObjectName}`,
      entities: (document.entities || []).map((entity: any) => ({
        type: entity.type || 'UNKNOWN',
        content: entity.mentionText || '',
        confidence: Number(entity.confidence || 0)
      })),
      tables: extractDocumentTables(document),
      paragraphs: extractDocumentParagraphs(document)
    };
  } catch (error) {
    console.error('[documentai] processing failed', error);

    if (mimeType === 'application/pdf') {
      throw new HttpError(503, 'OCR_SERVICE_UNAVAILABLE', 'OCR Service Unavailable');
    }

    throw new HttpError(502, 'DOCUMENT_AI_FAILED', 'Document processing failed.');
  }
}

function analysisResponseSchema(): Record<string, unknown> {
  return {
    type: 'OBJECT',
    properties: {
      summary: {
        type: 'OBJECT',
        properties: {
          points: { type: 'ARRAY', items: { type: 'STRING' } },
          contractType: { type: 'STRING' },
          missingOrAmbiguousTerms: { type: 'ARRAY', items: { type: 'STRING' } },
          purpose: { type: 'STRING' },
          keyObligations: { type: 'ARRAY', items: { type: 'STRING' } },
          keyRights: { type: 'ARRAY', items: { type: 'STRING' } },
          overview: { type: 'STRING' }
        },
        required: ['points']
      },
      fields: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            name: { type: 'STRING' },
            status: { type: 'STRING', enum: ['Filled', 'Missing/Needs Input'] },
            value: { type: 'STRING' },
            description: { type: 'STRING' },
            confidence: { type: 'NUMBER' },
            type: { type: 'STRING' },
            required: { type: 'BOOLEAN' }
          },
          required: ['name', 'status']
        }
      },
      documentType: { type: 'STRING' },
      riskLevel: { type: 'STRING', enum: ['Low', 'Medium', 'High'] },
      completionScore: { type: 'NUMBER' },
      contractType: { type: 'STRING' },
      purpose: { type: 'STRING' },
      parties: { type: 'ARRAY', items: { type: 'STRING' } },
      keyTerms: { type: 'ARRAY', items: { type: 'STRING' } },
      importantDates: { type: 'OBJECT', additionalProperties: { type: 'STRING' } },
      paymentTerms: { type: 'STRING' },
      terminationClauses: { type: 'ARRAY', items: { type: 'STRING' } },
      concerningPoints: { type: 'ARRAY', items: { type: 'STRING' } },
      riskFactors: { type: 'ARRAY', items: { type: 'STRING' } },
      overallSummary: { type: 'STRING' },
      missingElements: { type: 'ARRAY', items: { type: 'STRING' } },
      ambiguousTerms: { type: 'ARRAY', items: { type: 'STRING' } },
      recommendedAdditions: { type: 'ARRAY', items: { type: 'STRING' } },
      completionExplanation: { type: 'STRING' },
      requiredToComplete: { type: 'ARRAY', items: { type: 'STRING' } }
    },
    required: ['summary', 'fields', 'documentType', 'riskLevel', 'completionScore']
  };
}

function suggestionResponseSchema(): Record<string, unknown> {
  return {
    type: 'OBJECT',
    properties: {
      suggestions: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            id: { type: 'STRING' },
            type: { type: 'STRING', enum: ['improvement', 'risk-mitigation', 'cost-optimization', 'clarity'] },
            title: { type: 'STRING' },
            description: { type: 'STRING' },
            priority: { type: 'STRING', enum: ['high', 'medium', 'low'] },
            impact: { type: 'STRING' }
          },
          required: ['type', 'title', 'description', 'priority', 'impact']
        }
      }
    },
    required: ['suggestions']
  };
}

async function generateGeminiJson<T>(prompt: string, schema: Record<string, unknown>, maxOutputTokens = 4096): Promise<T> {
  const projectId = requireProjectId();
  const location = process.env.GEMINI_LOCATION || 'us-central1';
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
  const client = await googleAuth.getClient();
  const accessToken = await client.getAccessToken();

  if (!accessToken.token) {
    throw new HttpError(500, 'ADC_TOKEN_UNAVAILABLE', 'Could not acquire Google ADC access token.');
  }

  const response = await fetch(
    `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          topP: 0.1,
          maxOutputTokens,
          responseMimeType: 'application/json',
          responseSchema: schema
        }
      })
    }
  );

  if (!response.ok) {
    const details = await response.text();
    console.error('[gemini] vertex ai request failed', response.status, details);
    throw new HttpError(502, 'GEMINI_FAILED', 'AI orchestration failed.');
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (typeof text !== 'string' || !text.trim()) {
    throw new HttpError(502, 'GEMINI_EMPTY_RESPONSE', 'AI orchestration returned no content.');
  }

  return JSON.parse(text) as T;
}

async function readUserTextObject(textGcsUri: string, uid: string): Promise<string> {
  const pointer = assertUserOwnedGcsUri(textGcsUri, uid, ['texts']);
  const [buffer] = await storage.bucket(pointer.bucket).file(pointer.object).download();
  return buffer.toString('utf8');
}

function buildAnalysisPrompt(extractedText: string, fileName: string, documentTypeHint?: string): string {
  return `You are a legal document analyzer. Analyze the document and return only JSON matching the provided schema.

Rules:
- Use plain English.
- riskLevel must be one of Low, Medium, High.
- completionScore must be a decimal between 0 and 1.
- fields must include important missing or completed contract fields.
- Do not include raw document text in the response.

File name: ${fileName}
Document type hint: ${documentTypeHint || 'none'}

Document text:
${extractedText}`;
}

async function handleAiOrchestrate(req: Request, user: AuthenticatedRequestContext): Promise<unknown> {
  if (req.method !== 'POST') {
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Use POST for this endpoint.');
  }

  const body = assertJsonObject(req.body);
  const operation = requireString(body, 'operation') as AiOperation;

  if (operation === 'analyze') {
    const textGcsUri = requireString(body, 'textGcsUri');
    const fileName = requireString(body, 'fileName');
    const fileSize = body.fileSize;
    const extractedText = await readUserTextObject(textGcsUri, user.uid);
    const structured = await generateGeminiJson<any>(
      buildAnalysisPrompt(extractedText, fileName, typeof body.documentTypeHint === 'string' ? body.documentTypeHint : undefined),
      analysisResponseSchema()
    );
    const now = new Date().toISOString();

    return {
      analysis: {
        ...structured,
        id: randomUUID(),
        userId: user.uid,
        analysisDate: now,
        fileName,
        fileSize: typeof fileSize === 'number' || typeof fileSize === 'string' ? fileSize : '',
        gcsTextUri: textGcsUri
      }
    };
  }

  if (operation === 'chat' || operation === 'negotiationAdvice') {
    const prompt = requireString(body, 'prompt');
    const result = await generateGeminiJson<{ response: string }>(
      prompt,
      {
        type: 'OBJECT',
        properties: { response: { type: 'STRING' } },
        required: ['response']
      },
      2048
    );

    return result;
  }

  if (operation === 'negotiationSuggestions') {
    const prompt = requireString(body, 'prompt');
    const result = await generateGeminiJson<{ suggestions: unknown[] }>(prompt, suggestionResponseSchema(), 4096);

    return {
      suggestions: result.suggestions.map((suggestion: any) => ({
        id: typeof suggestion.id === 'string' && suggestion.id ? suggestion.id : `suggestion-${randomUUID()}`,
        ...suggestion
      }))
    };
  }

  throw new HttpError(400, 'UNSUPPORTED_AI_OPERATION', 'Unsupported AI orchestration operation.');
}

async function handleAnalysisPersist(req: Request, user: AuthenticatedRequestContext): Promise<{ analysis: AnalysisPayload }> {
  if (req.method !== 'POST') {
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Use POST for this endpoint.');
  }

  const body = assertJsonObject(req.body);
  const analysis = assertJsonObject(body.analysis);
  const gcsTextUri = requireString(analysis, 'gcsTextUri');

  assertUserOwnedGcsUri(gcsTextUri, user.uid, ['texts']);

  const firestore = getFirestore();
  const analysisRef = firestore.collection('analyses').doc();
  const userRef = firestore.collection('users').doc(user.uid);
  const now = new Date().toISOString();

  const forbiddenRawTextField = ['document', 'Text'].join('');
  const sanitizedAnalysis = Object.fromEntries(
    Object.entries(analysis).filter(([key]) => key !== forbiddenRawTextField)
  );
  const persistedAnalysis: AnalysisPayload = {
    ...sanitizedAnalysis,
    id: analysisRef.id,
    userId: user.uid,
    createdAt: now,
    status: 'completed'
  };

  await firestore.runTransaction(async (transaction) => {
    const userSnapshot = await transaction.get(userRef);
    transaction.create(analysisRef, persistedAnalysis);

    if (userSnapshot.exists) {
      transaction.update(userRef, {
        contractsAnalyzed: FieldValue.increment(1),
        lastAnalysis: analysisRef.id,
        updatedAt: now
      });
      return;
    }

    transaction.set(userRef, {
      contractsAnalyzed: 1,
      maxContracts: 5,
      plan: 'free',
      createdAt: now,
      lastAnalysis: analysisRef.id,
      updatedAt: now
    });
  });

  return {
    analysis: persistedAnalysis
  };
}

export const api = onRequest({ region: 'us-central1', cors: true }, async (req, res) => {
  writeSecurityHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const user = await authenticate(req);
    await enforceRateLimit(user.uid);

    const apiPath = getApiPath(req);

    if (apiPath === '/storage/upload-url') {
      res.status(200).json(await handleUploadUrl(req, user));
      return;
    }

    if (apiPath === '/documentai/process') {
      res.status(200).json(await handleDocumentProcess(req, user));
      return;
    }

    if (apiPath === '/ai/orchestrate') {
      res.status(200).json(await handleAiOrchestrate(req, user));
      return;
    }

    if (apiPath === '/analysis/persist') {
      res.status(200).json(await handleAnalysisPersist(req, user));
      return;
    }

    throw new HttpError(404, 'NOT_FOUND', 'API route not found.');
  } catch (error) {
    const requestId = randomUUID();

    if (error instanceof HttpError) {
      res.status(error.status).json({
        error: {
          code: error.code,
          message: error.message,
          requestId
        }
      });
      return;
    }

    console.error(`[api] unhandled error ${requestId}`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL',
        message: 'Internal server error.',
        requestId
      }
    });
  }
});
