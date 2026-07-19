import { ALLOWED_UPLOAD_MIME_TYPES } from '../config.js';
import { HttpError } from '../http/errors.js';
import { assertJsonObject, requireString } from '../http/request.js';
import { processDocumentFromGcs } from '../services/documentAi.js';
import { assertWithinQuota } from '../services/usersRepo.js';
export async function handleDocumentProcess(req, user) {
    if (req.method !== 'POST') {
        throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Use POST for this endpoint.');
    }
    await assertWithinQuota(user.uid, user.token);
    const body = assertJsonObject(req.body);
    const gcsUri = requireString(body, 'gcsUri');
    const mimeType = requireString(body, 'mimeType');
    if (!ALLOWED_UPLOAD_MIME_TYPES.has(mimeType)) {
        throw new HttpError(400, 'UNSUPPORTED_FILE_TYPE', 'Only PDF, DOCX, and plain text uploads are supported.');
    }
    return processDocumentFromGcs(gcsUri, mimeType, user.uid);
}
