import { randomUUID } from 'node:crypto';
import type { Request } from 'express';
import { HttpError } from '../http/errors.js';
import { assertJsonObject, getRequestUrl, requireString } from '../http/request.js';
import { buildDocumentChatPrompt } from '../prompts/chat.js';
import { buildNegotiationAdvicePrompt, buildNegotiationSuggestionsPrompt } from '../prompts/negotiation.js';
import { chatResponseSchema, suggestionResponseSchema } from '../prompts/schemas.js';
import { getOwnedAnalysis, loadAnalysisDocumentText } from '../services/analysisAccess.js';
import {
  appendChatMessages,
  getNegotiationState,
  listChatMessages,
  listChatSessions,
  saveNegotiationState,
  type ChatKind
} from '../services/chatsRepo.js';
import { generateGeminiJson } from '../services/gemini.js';
import type { AuthenticatedRequestContext } from '../types.js';

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string');
}

function requireKind(value: string): ChatKind {
  if (value === 'document' || value === 'negotiation') {
    return value;
  }
  throw new HttpError(400, 'INVALID_REQUEST', 'kind must be document or negotiation.');
}

export async function handleAnalysisChatPost(
  req: Request,
  user: AuthenticatedRequestContext,
  analysisId: string
): Promise<{ response: string; sessionId: string; messages: unknown[] }> {
  if (req.method !== 'POST') {
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Use POST for this endpoint.');
  }

  const body = assertJsonObject(req.body);
  const message = requireString(body, 'message');
  const sessionId =
    typeof body.sessionId === 'string' && body.sessionId.trim()
      ? body.sessionId.trim()
      : randomUUID();

  const analysis = await getOwnedAnalysis(user.uid, analysisId);
  const extractedText = await loadAnalysisDocumentText(user.uid, analysis);
  const prompt = buildDocumentChatPrompt({
    fileName: typeof analysis.fileName === 'string' ? analysis.fileName : 'document',
    documentType:
      typeof analysis.contractType === 'string'
        ? analysis.contractType
        : typeof analysis.documentType === 'string'
          ? analysis.documentType
          : undefined,
    extractedText,
    question: message
  });

  const result = await generateGeminiJson<{ response: string }>(prompt, chatResponseSchema(), 2048);
  const persisted = await appendChatMessages(analysisId, [
    { sessionId, kind: 'document', role: 'user', content: message },
    { sessionId, kind: 'document', role: 'assistant', content: result.response }
  ]);

  return {
    response: result.response,
    sessionId,
    messages: persisted
  };
}

export async function handleAnalysisChatsGet(
  req: Request,
  user: AuthenticatedRequestContext,
  analysisId: string
): Promise<{ messages: unknown[] }> {
  if (req.method !== 'GET') {
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Use GET for this endpoint.');
  }

  await getOwnedAnalysis(user.uid, analysisId);
  const url = getRequestUrl(req);
  const sessionId = url.searchParams.get('sessionId');
  const kind = requireKind(url.searchParams.get('kind') || 'document');

  if (!sessionId) {
    throw new HttpError(400, 'INVALID_REQUEST', 'sessionId is required.');
  }

  const messages = await listChatMessages(analysisId, { sessionId, kind });
  return { messages };
}

export async function handleAnalysisChatSessionsGet(
  req: Request,
  user: AuthenticatedRequestContext,
  analysisId: string
): Promise<{ sessions: unknown[] }> {
  if (req.method !== 'GET') {
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Use GET for this endpoint.');
  }

  await getOwnedAnalysis(user.uid, analysisId);
  const url = getRequestUrl(req);
  const kind = requireKind(url.searchParams.get('kind') || 'document');
  const sessions = await listChatSessions(analysisId, kind);
  return { sessions };
}

export async function handleNegotiationSuggestionsPost(
  req: Request,
  user: AuthenticatedRequestContext,
  analysisId: string
): Promise<{ suggestions: unknown[]; party: string }> {
  if (req.method !== 'POST') {
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Use POST for this endpoint.');
  }

  const body = assertJsonObject(req.body);
  const party = requireString(body, 'party');
  const analysis = await getOwnedAnalysis(user.uid, analysisId);
  const extractedText = await loadAnalysisDocumentText(user.uid, analysis);
  const summary =
    analysis.summary && typeof analysis.summary === 'object' && !Array.isArray(analysis.summary)
      ? (analysis.summary as Record<string, unknown>)
      : {};

  const prompt = buildNegotiationSuggestionsPrompt({
    party,
    fileName: typeof analysis.fileName === 'string' ? analysis.fileName : 'document',
    documentType: typeof analysis.documentType === 'string' ? analysis.documentType : undefined,
    riskLevel: typeof analysis.riskLevel === 'string' ? analysis.riskLevel : undefined,
    keyTerms: asStringArray(analysis.keyTerms),
    paymentTerms: typeof analysis.paymentTerms === 'string' ? analysis.paymentTerms : undefined,
    concerningPoints: asStringArray(analysis.concerningPoints),
    missingOrAmbiguousTerms: asStringArray(summary.missingOrAmbiguousTerms),
    parties: asStringArray(analysis.parties),
    extractedText
  });

  const result = await generateGeminiJson<{ suggestions: unknown[] }>(
    prompt,
    suggestionResponseSchema(),
    4096
  );

  const suggestions = result.suggestions.map((suggestion: any) => ({
    id: typeof suggestion.id === 'string' && suggestion.id ? suggestion.id : `suggestion-${randomUUID()}`,
    ...suggestion
  }));

  await saveNegotiationState(analysisId, {
    party,
    suggestions,
    updatedAt: new Date().toISOString()
  });

  return { suggestions, party };
}

export async function handleNegotiationChatPost(
  req: Request,
  user: AuthenticatedRequestContext,
  analysisId: string
): Promise<{ response: string; sessionId: string; messages: unknown[] }> {
  if (req.method !== 'POST') {
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Use POST for this endpoint.');
  }

  const body = assertJsonObject(req.body);
  const message = requireString(body, 'message');
  const party = requireString(body, 'party');
  const sessionId =
    typeof body.sessionId === 'string' && body.sessionId.trim()
      ? body.sessionId.trim()
      : `negotiation-${analysisId}`;

  const analysis = await getOwnedAnalysis(user.uid, analysisId);
  const extractedText = await loadAnalysisDocumentText(user.uid, analysis);
  const prompt = buildNegotiationAdvicePrompt({
    party,
    question: message,
    fileName: typeof analysis.fileName === 'string' ? analysis.fileName : 'document',
    documentType: typeof analysis.documentType === 'string' ? analysis.documentType : undefined,
    riskLevel: typeof analysis.riskLevel === 'string' ? analysis.riskLevel : undefined,
    keyTerms: asStringArray(analysis.keyTerms),
    concerningPoints: asStringArray(analysis.concerningPoints),
    parties: asStringArray(analysis.parties),
    extractedText
  });

  const result = await generateGeminiJson<{ response: string }>(prompt, chatResponseSchema(), 2048);
  const persisted = await appendChatMessages(analysisId, [
    { sessionId, kind: 'negotiation', role: 'user', content: message, party },
    { sessionId, kind: 'negotiation', role: 'assistant', content: result.response, party }
  ]);

  return {
    response: result.response,
    sessionId,
    messages: persisted
  };
}

export async function handleNegotiationStateGet(
  req: Request,
  user: AuthenticatedRequestContext,
  analysisId: string
): Promise<{ state: unknown }> {
  if (req.method !== 'GET') {
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Use GET for this endpoint.');
  }

  await getOwnedAnalysis(user.uid, analysisId);
  const state = await getNegotiationState(analysisId);
  return { state };
}
