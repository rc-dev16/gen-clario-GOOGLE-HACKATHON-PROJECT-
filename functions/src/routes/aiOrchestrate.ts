import { randomUUID } from 'node:crypto';
import type { Request } from 'express';
import { HttpError } from '../http/errors.js';
import { assertJsonObject, requireString } from '../http/request.js';
import { buildAnalysisPrompt } from '../prompts/analysis.js';
import { analysisResponseSchema } from '../prompts/schemas.js';
import { generateGeminiJson } from '../services/gemini.js';
import { readUserTextObject } from '../services/gcs.js';
import { assertWithinQuota } from '../services/usersRepo.js';
import type { AiOperation, AuthenticatedRequestContext } from '../types.js';

export async function handleAiOrchestrate(
  req: Request,
  user: AuthenticatedRequestContext
): Promise<unknown> {
  if (req.method !== 'POST') {
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Use POST for this endpoint.');
  }

  const body = assertJsonObject(req.body);
  const operation = requireString(body, 'operation') as AiOperation;

  if (operation === 'analyze') {
    await assertWithinQuota(user.uid, user.token);

    const textGcsUri = requireString(body, 'textGcsUri');
    const fileName = requireString(body, 'fileName');
    const fileSize = body.fileSize;
    const extractedText = await readUserTextObject(textGcsUri, user.uid);
    const structured = await generateGeminiJson<any>(
      buildAnalysisPrompt(
        extractedText,
        fileName,
        typeof body.documentTypeHint === 'string' ? body.documentTypeHint : undefined
      ),
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

  if (operation === 'chat' || operation === 'negotiationAdvice' || operation === 'negotiationSuggestions') {
    throw new HttpError(
      410,
      'DEPRECATED_AI_OPERATION',
      'Use /api/analysis/:id/chat or /api/analysis/:id/negotiation endpoints instead.'
    );
  }

  throw new HttpError(400, 'UNSUPPORTED_AI_OPERATION', 'Unsupported AI orchestration operation.');
}
