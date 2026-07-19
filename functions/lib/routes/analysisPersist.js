import { HttpError } from '../http/errors.js';
import { assertJsonObject, requireString } from '../http/request.js';
import { persistAnalysis } from '../services/analysesRepo.js';
import { shouldSkipQuota } from '../services/usersRepo.js';
export async function handleAnalysisPersist(req, user) {
    if (req.method !== 'POST') {
        throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Use POST for this endpoint.');
    }
    const body = assertJsonObject(req.body);
    const analysis = assertJsonObject(body.analysis);
    requireString(analysis, 'gcsTextUri');
    const persistedAnalysis = await persistAnalysis(user.uid, analysis, {
        skipQuota: shouldSkipQuota(user.token)
    });
    return {
        analysis: persistedAnalysis
    };
}
