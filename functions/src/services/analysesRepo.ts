import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpError } from '../http/errors.js';
import type { AnalysisPayload } from '../types.js';
import { assertUserOwnedGcsUri } from './gcs.js';
import {
  DEFAULT_MAX_CONTRACTS,
  DEFAULT_PLAN,
  assertQuotaFromSnapshot
} from './usersRepo.js';
import { deleteAnalysisSideData } from './chatsRepo.js';

export async function persistAnalysis(
  uid: string,
  analysis: Record<string, unknown>,
  options: { skipQuota?: boolean } = {}
): Promise<AnalysisPayload> {
  const gcsTextUri = analysis.gcsTextUri;

  if (typeof gcsTextUri !== 'string' || !gcsTextUri.trim()) {
    throw new HttpError(400, 'INVALID_REQUEST', 'gcsTextUri is required.');
  }

  assertUserOwnedGcsUri(gcsTextUri, uid, ['texts']);

  const firestore = getFirestore();
  const analysisRef = firestore.collection('analyses').doc();
  const userRef = firestore.collection('users').doc(uid);
  const now = new Date().toISOString();

  const forbiddenRawTextField = ['document', 'Text'].join('');
  const sanitizedAnalysis = Object.fromEntries(
    Object.entries(analysis).filter(([key]) => key !== forbiddenRawTextField)
  );
  const persistedAnalysis: AnalysisPayload = {
    ...sanitizedAnalysis,
    id: analysisRef.id,
    userId: uid,
    createdAt: now,
    status: 'completed'
  };

  await firestore.runTransaction(async (transaction) => {
    const userSnapshot = await transaction.get(userRef);
    assertQuotaFromSnapshot(
      userSnapshot.data() as Record<string, unknown> | undefined,
      { skipQuota: options.skipQuota }
    );

    transaction.create(analysisRef, persistedAnalysis);

    if (userSnapshot.exists) {
      transaction.update(userRef, {
        contractsAnalyzed: FieldValue.increment(1),
        lastAnalysis: analysisRef.id,
        updatedAt: now
      });
      return;
    }

    transaction.set(userRef, {
      contractsAnalyzed: 1,
      maxContracts: DEFAULT_MAX_CONTRACTS,
      plan: DEFAULT_PLAN,
      createdAt: now,
      lastAnalysis: analysisRef.id,
      updatedAt: now
    });
  });

  return persistedAnalysis;
}

export async function deleteAnalysisForUser(
  uid: string,
  analysisId: string
): Promise<{ deleted: true; contractsAnalyzed: number }> {
  if (!analysisId.trim()) {
    throw new HttpError(400, 'INVALID_REQUEST', 'analysisId is required.');
  }

  const firestore = getFirestore();
  const analysisRef = firestore.collection('analyses').doc(analysisId);
  const userRef = firestore.collection('users').doc(uid);
  const now = new Date().toISOString();

  const contractsAnalyzed = await firestore.runTransaction(async (transaction) => {
    const analysisSnapshot = await transaction.get(analysisRef);
    const userSnapshot = await transaction.get(userRef);

    if (!analysisSnapshot.exists) {
      throw new HttpError(404, 'NOT_FOUND', 'Analysis not found.');
    }

    const analysis = analysisSnapshot.data();

    if (analysis?.userId !== uid) {
      throw new HttpError(403, 'FORBIDDEN', 'You do not have access to this analysis.');
    }

    const status = typeof analysis?.status === 'string' ? analysis.status : 'completed';
    transaction.delete(analysisRef);

    if (!userSnapshot.exists) {
      return 0;
    }

    const userData = userSnapshot.data() || {};
    const current =
      typeof userData.contractsAnalyzed === 'number' ? userData.contractsAnalyzed : 0;
    const inFlight =
      typeof userData.contractsInFlight === 'number' ? userData.contractsInFlight : 0;

    const updates: Record<string, unknown> = { updatedAt: now };

    if (status === 'pending' || status === 'processing') {
      updates.contractsInFlight = Math.max(0, inFlight - 1);
      transaction.update(userRef, updates);
      return current;
    }

    // ready | completed | failed (failed already released inFlight)
    if (status === 'ready' || status === 'completed') {
      updates.contractsAnalyzed = Math.max(0, current - 1);
    }

    transaction.update(userRef, updates);
    return typeof updates.contractsAnalyzed === 'number' ? updates.contractsAnalyzed : current;
  });

  await deleteAnalysisSideData(analysisId);

  return {
    deleted: true,
    contractsAnalyzed
  };
}
