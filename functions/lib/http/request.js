import { HttpError } from './errors.js';
export function getRequestUrl(req) {
    const rawUrl = req.originalUrl || req.url || '/';
    return new URL(rawUrl, 'https://clario.local');
}
export function getApiPath(req) {
    const url = getRequestUrl(req);
    const apiIndex = url.pathname.indexOf('/api/');
    if (apiIndex >= 0) {
        return url.pathname.slice(apiIndex + '/api'.length);
    }
    return url.pathname;
}
export function assertJsonObject(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new HttpError(400, 'INVALID_JSON', 'Request body must be a JSON object.');
    }
    return value;
}
export function requireString(body, field) {
    const value = body[field];
    if (typeof value !== 'string' || !value.trim()) {
        throw new HttpError(400, 'INVALID_REQUEST', `${field} is required.`);
    }
    return value.trim();
}
