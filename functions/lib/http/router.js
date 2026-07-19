import { randomUUID } from 'node:crypto';
import { onRequest } from 'firebase-functions/v2/https';
import { HttpError } from './errors.js';
import { writeSecurityHeaders } from './headers.js';
import { getApiPath } from './request.js';
import { authenticate } from '../middleware/auth.js';
import { enforceRateLimit } from '../middleware/rateLimit.js';
import { handleUploadUrl } from '../routes/storageUploadUrl.js';
import { handleDocumentProcess } from '../routes/documentProcess.js';
import { handleAiOrchestrate } from '../routes/aiOrchestrate.js';
import { handleAnalysisPersist } from '../routes/analysisPersist.js';
import { handleAnalysisDelete } from '../routes/analysisDelete.js';
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
        const analysisDeleteMatch = apiPath.match(/^\/analysis\/([^/]+)$/);
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
        if (analysisDeleteMatch && analysisDeleteMatch[1] !== 'persist') {
            res.status(200).json(await handleAnalysisDelete(req, user, analysisDeleteMatch[1]));
            return;
        }
        throw new HttpError(404, 'NOT_FOUND', 'API route not found.');
    }
    catch (error) {
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
