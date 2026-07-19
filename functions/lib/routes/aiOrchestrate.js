import { randomUUID } from 'node:crypto';
import { HttpError } from '../http/errors.js';
import { assertJsonObject, requireString } from '../http/request.js';
import { buildAnalysisPrompt } from '../prompts/analysis.js';
import { analysisResponseSchema, chatResponseSchema, suggestionResponseSchema } from '../prompts/schemas.js';
import { generateGeminiJson } from '../services/gemini.js';
import { readUserTextObject } from '../services/gcs.js';
import { assertWithinQuota } from '../services/usersRepo.js';
export async function handleAiOrchestrate(req, user) {
    if (req.method !== 'POST') {
        throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Use POST for this endpoint.');
    }
    const body = assertJsonObject(req.body);
    const operation = requireString(body, 'operation');
    if (operation === 'analyze') {
        await assertWithinQuota(user.uid, user.token);
        const textGcsUri = requireString(body, 'textGcsUri');
        const fileName = requireString(body, 'fileName');
        const fileSize = body.fileSize;
        const extractedText = await readUserTextObject(textGcsUri, user.uid);
        const structured = await generateGeminiJson(buildAnalysisPrompt(extractedText, fileName, typeof body.documentTypeHint === 'string' ? body.documentTypeHint : undefined), analysisResponseSchema());
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
        return generateGeminiJson(prompt, chatResponseSchema(), 2048);
    }
    if (operation === 'negotiationSuggestions') {
        const prompt = requireString(body, 'prompt');
        const result = await generateGeminiJson(prompt, suggestionResponseSchema(), 4096);
        return {
            suggestions: result.suggestions.map((suggestion) => ({
                id: typeof suggestion.id === 'string' && suggestion.id ? suggestion.id : `suggestion-${randomUUID()}`,
                ...suggestion
            }))
        };
    }
    throw new HttpError(400, 'UNSUPPORTED_AI_OPERATION', 'Unsupported AI orchestration operation.');
}
