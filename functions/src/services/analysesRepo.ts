import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpError } from '../http/errors.js';
import type { AnalysisPayload } from '../types.js';
import { assertUserOwnedGcsUri } from './gcs.js';

export async function persistAnalysis(
  uid: string,
  analysis: Record<string, unknown>
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
      maxContracts: 5,
      plan: 'free',
      createdAt: now,
      lastAnalysis: analysisRef.id,
      updatedAt: now
    });
  });

  return persistedAnalysis;
}
