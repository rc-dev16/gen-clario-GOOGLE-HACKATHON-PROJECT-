import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpError } from '../http/errors.js';
import { assertUserOwnedGcsUri } from './gcs.js';
import { DEFAULT_MAX_CONTRACTS, DEFAULT_PLAN, assertQuotaFromSnapshot } from './usersRepo.js';
export async function persistAnalysis(uid, analysis, options = {}) {
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
    const sanitizedAnalysis = Object.fromEntries(Object.entries(analysis).filter(([key]) => key !== forbiddenRawTextField));
    const persistedAnalysis = {
        ...sanitizedAnalysis,
        id: analysisRef.id,
        userId: uid,
        createdAt: now,
        status: 'completed'
    };
    await firestore.runTransaction(async (transaction) => {
        const userSnapshot = await transaction.get(userRef);
        assertQuotaFromSnapshot(userSnapshot.data(), { skipQuota: options.skipQuota });
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
export async function deleteAnalysisForUser(uid, analysisId) {
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
        transaction.delete(analysisRef);
        if (!userSnapshot.exists) {
            return 0;
        }
        const current = typeof userSnapshot.data()?.contractsAnalyzed === 'number'
            ? userSnapshot.data().contractsAnalyzed
            : 0;
        const next = Math.max(0, current - 1);
        transaction.update(userRef, {
            contractsAnalyzed: next,
            updatedAt: now
        });
        return next;
    });
    return {
        deleted: true,
        contractsAnalyzed
    };
}
export function shouldSkipQuota(token) {
    return token?.admin === true;
}
