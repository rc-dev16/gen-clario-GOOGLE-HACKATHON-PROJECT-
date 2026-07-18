import { HttpError } from './http/errors.js';
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const SIGNED_URL_TTL_MS = 15 * 60 * 1000;
export const RATE_LIMIT_WINDOW_MS = 60 * 1000;
export const RATE_LIMIT_MAX_REQUESTS = 5;
export const ALLOWED_UPLOAD_MIME_TYPES = new Set([
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
]);
export function requireUploadBucket() {
    const bucket = process.env.CLARIO_UPLOAD_BUCKET;
    if (!bucket) {
        throw new HttpError(500, 'UPLOAD_BUCKET_NOT_CONFIGURED', 'Upload bucket is not configured.');
    }
    return bucket;
}
export function requireProjectId() {
    const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || process.env.PROJECT_ID;
    if (!projectId) {
        throw new HttpError(500, 'PROJECT_NOT_CONFIGURED', 'Google Cloud project is not configured.');
    }
    return projectId;
}
export function requireGeminiLocation() {
    return process.env.GEMINI_LOCATION || 'us-central1';
}
export function requireGeminiModel() {
    return process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
}
export function requireDocumentAiLocation() {
    return process.env.DOCUMENT_AI_LOCATION || 'us';
}
export function requireDocumentAiProcessorId() {
    const processorId = process.env.DOCUMENT_AI_PROCESSOR_ID;
    if (!processorId) {
        throw new HttpError(500, 'DOCUMENT_AI_NOT_CONFIGURED', 'Document AI processor is not configured.');
    }
    return processorId;
}
