import { ALLOWED_UPLOAD_MIME_TYPES } from '../config.js';
import { HttpError } from '../http/errors.js';
import { assertJsonObject, requireString } from '../http/request.js';
import { createAnalysisJob } from '../services/jobsRepo.js';
import { runAnalysisJob } from '../services/runAnalysisJob.js';
export async function handleAnalysesCreate(req, user) {
    if (req.method !== 'POST') {
        throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Use POST for this endpoint.');
    }
    const body = assertJsonObject(req.body);
    const gcsUri = requireString(body, 'gcsUri');
    const mimeType = requireString(body, 'mimeType');
    const fileName = requireString(body, 'fileName');
    const fileSize = body.fileSize;
    if (!ALLOWED_UPLOAD_MIME_TYPES.has(mimeType)) {
        throw new HttpError(400, 'UNSUPPORTED_FILE_TYPE', 'Only PDF, DOCX, and plain text uploads are supported.');
    }
    const normalizedFileSize = typeof fileSize === 'number' || typeof fileSize === 'string' ? fileSize : undefined;
    const created = await createAnalysisJob(user.uid, {
        gcsUri,
        mimeType,
        fileName,
        fileSize: normalizedFileSize
    }, user.token);
    // Local Functions emulator cannot receive Firestore triggers against production.
    // Kick the worker inline so analyze progress can leave "Queued".
    if (process.env.FUNCTIONS_EMULATOR === 'true') {
        console.log(`[analysesCreate] emulator: running job ${created.jobId} inline (Firestore trigger unavailable)`);
        void runAnalysisJob({
            jobId: created.jobId,
            analysisId: created.analysisId,
            uid: user.uid,
            gcsUri,
            mimeType,
            fileName,
            fileSize: normalizedFileSize
        });
    }
    return created;
}
