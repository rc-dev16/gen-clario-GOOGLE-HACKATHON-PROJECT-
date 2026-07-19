import { HttpError } from '../http/errors.js';
import { deleteAnalysisForUser } from '../services/analysesRepo.js';
export async function handleAnalysisDelete(req, user, analysisId) {
    if (req.method !== 'DELETE') {
        throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Use DELETE for this endpoint.');
    }
    return deleteAnalysisForUser(user.uid, analysisId);
}
