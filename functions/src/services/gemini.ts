import { GoogleAuth } from 'google-auth-library';
import { requireGeminiLocation, requireGeminiModel, requireProjectId } from '../config.js';
import { loadSigningServiceAccount } from '../config/credentials.js';
import { HttpError } from '../http/errors.js';

function createGoogleAuth(): GoogleAuth {
  const credentials = loadSigningServiceAccount();
  if (credentials) {
    return new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
  }
  return new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
}

const googleAuth = createGoogleAuth();

interface GeminiGenerateResult {
  text: string;
  finishReason: string;
}

async function requestGeminiText(
  prompt: string,
  schema: Record<string, unknown>,
  maxOutputTokens: number
): Promise<GeminiGenerateResult> {
  const projectId = requireProjectId();
  const location = requireGeminiLocation();
  const model = requireGeminiModel();
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

  const data = (await response.json()) as {
    candidates?: Array<{
      finishReason?: string;
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const candidate = data?.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text;
  const finishReason = candidate?.finishReason || 'UNKNOWN';

  if (typeof text !== 'string' || !text.trim()) {
    throw new HttpError(502, 'GEMINI_EMPTY_RESPONSE', 'AI orchestration returned no content.');
  }

  return { text, finishReason };
}

function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

function parseGeminiJson<T>(text: string): T {
  return JSON.parse(stripJsonFences(text)) as T;
}

function isTruncatedOutput(finishReason: string, parseError: unknown): boolean {
  if (/MAX_TOKENS|LENGTH/i.test(finishReason)) {
    return true;
  }

  if (!(parseError instanceof SyntaxError)) {
    return false;
  }

  return /Unterminated|Unexpected end|Unexpected token|Bad control character/i.test(
    parseError.message
  );
}

export async function generateGeminiJson<T>(
  prompt: string,
  schema: Record<string, unknown>,
  maxOutputTokens = 8192
): Promise<T> {
  const tokenBudgets = Array.from(
    new Set([maxOutputTokens, Math.min(Math.max(maxOutputTokens * 2, 16384), 65536)])
  );

  let lastError: unknown;

  for (let attempt = 0; attempt < tokenBudgets.length; attempt += 1) {
    const tokens = tokenBudgets[attempt];
    const { text, finishReason } = await requestGeminiText(prompt, schema, tokens);

    try {
      return parseGeminiJson<T>(text);
    } catch (error) {
      lastError = error;
      const truncated = isTruncatedOutput(finishReason, error);
      console.warn(
        `[gemini] JSON parse failed (finishReason=${finishReason}, tokens=${tokens}, truncated=${truncated})`,
        error
      );

      if (!truncated || attempt === tokenBudgets.length - 1) {
        break;
      }

      console.warn('[gemini] retrying with a larger output budget');
    }
  }

  if (lastError instanceof SyntaxError) {
    throw new HttpError(
      502,
      'GEMINI_INVALID_JSON',
      'AI returned incomplete analysis JSON. Please try again with a shorter document.'
    );
  }

  throw lastError instanceof Error
    ? lastError
    : new HttpError(502, 'GEMINI_FAILED', 'AI orchestration failed.');
}
