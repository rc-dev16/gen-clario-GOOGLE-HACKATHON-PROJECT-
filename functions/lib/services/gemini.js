import { GoogleAuth } from 'google-auth-library';
import { requireGeminiLocation, requireGeminiModel, requireProjectId } from '../config.js';
import { HttpError } from '../http/errors.js';
const googleAuth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
export async function generateGeminiJson(prompt, schema, maxOutputTokens = 4096) {
    const projectId = requireProjectId();
    const location = requireGeminiLocation();
    const model = requireGeminiModel();
    const client = await googleAuth.getClient();
    const accessToken = await client.getAccessToken();
    if (!accessToken.token) {
        throw new HttpError(500, 'ADC_TOKEN_UNAVAILABLE', 'Could not acquire Google ADC access token.');
    }
    const response = await fetch(`https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`, {
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
    });
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
    return JSON.parse(text);
}
