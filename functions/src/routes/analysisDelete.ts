import type { Request } from 'express';
import { HttpError } from '../http/errors.js';
import { deleteAnalysisForUser } from '../services/analysesRepo.js';
import type { AuthenticatedRequestContext } from '../types.js';

export async function handleAnalysisDelete(
  req: Request,
  user: AuthenticatedRequestContext,
  analysisId: string
): Promise<{ deleted: true; contractsAnalyzed: number }> {
  if (req.method !== 'DELETE') {
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Use DELETE for this endpoint.');
  }

  return deleteAnalysisForUser(user.uid, analysisId);
}
