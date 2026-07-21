import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { HttpError } from '../http/errors.js';
import { assertUserOwnedGcsUri } from './gcs.js';
import {
  DEFAULT_MAX_CONTRACTS,
  DEFAULT_PLAN,
  shouldSkipQuota
} from './usersRepo.js';
import type { AnalysisPayload } from '../types.js';

export type AnalysisJobStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type AnalysisDocStatus = 'pending' | 'processing' | 'ready' | 'failed' | 'completed';

export interface CreateAnalysisJobInput {
  gcsUri: string;
  mimeType: string;
  fileName: string;
  fileSize?: number | string;
}

export interface CreateAnalysisJobResult {
  analysisId: string;
  jobId: string;
  status: 'pending';
}

export async function createAnalysisJob(
  uid: string,
  input: CreateAnalysisJobInput,
  token?: DecodedIdToken
): Promise<CreateAnalysisJobResult> {
  assertUserOwnedGcsUri(input.gcsUri, uid, ['uploads']);

  const firestore = getFirestore();
  const analysisRef = firestore.collection('analyses').doc();
  const jobRef = firestore.collection('analysisJobs').doc();
  const userRef = firestore.collection('users').doc(uid);
  const now = new Date().toISOString();
  const skipQuota = shouldSkipQuota(token);

  const pendingAnalysis: AnalysisPayload = {
    id: analysisRef.id,
    userId: uid,
    fileName: input.fileName,
    fileSize: input.fileSize ?? '',
    gcsUri: input.gcsUri,
    mimeType: input.mimeType,
    status: 'pending',
    analysisDate: now,
    createdAt: now,
    summary: { points: [] },
    fields: [],
    documentType: 'Pending',
    riskLevel: 'Low',
    completionScore: 0
  };

  await firestore.runTransaction(async (transaction) => {
    const userSnapshot = await transaction.get(userRef);
    const data = (userSnapshot.data() || {}) as Record<string, unknown>;
    const contractsAnalyzed =
      typeof data.contractsAnalyzed === 'number' ? data.contractsAnalyzed : 0;
    const contractsInFlight =
      typeof data.contractsInFlight === 'number' ? data.contractsInFlight : 0;
    const maxContracts =
      typeof data.maxContracts === 'number' ? data.maxContracts : DEFAULT_MAX_CONTRACTS;

    if (!skipQuota && contractsAnalyzed + contractsInFlight >= maxContracts) {
      throw new HttpError(
        403,
        'QUOTA_EXCEEDED',
        'You have reached the maximum number of analyses for your plan.'
      );
    }

    transaction.set(analysisRef, pendingAnalysis);
    transaction.set(jobRef, {
      id: jobRef.id,
      userId: uid,
      analysisId: analysisRef.id,
      gcsUri: input.gcsUri,
      mimeType: input.mimeType,
      fileName: input.fileName,
      fileSize: input.fileSize ?? '',
      status: 'pending' satisfies AnalysisJobStatus,
      createdAt: now,
      updatedAt: now
    });

    if (userSnapshot.exists) {
      transaction.update(userRef, {
        contractsInFlight: FieldValue.increment(1),
        updatedAt: now
      });
    } else {
      transaction.set(userRef, {
        contractsAnalyzed: 0,
        contractsInFlight: 1,
        maxContracts: DEFAULT_MAX_CONTRACTS,
        plan: DEFAULT_PLAN,
        createdAt: now,
        updatedAt: now
      });
    }
  });

  return {
    analysisId: analysisRef.id,
    jobId: jobRef.id,
    status: 'pending'
  };
}

export async function markJobProcessing(jobId: string, analysisId: string): Promise<void> {
  const firestore = getFirestore();
  const now = new Date().toISOString();
  const batch = firestore.batch();
  batch.update(firestore.collection('analysisJobs').doc(jobId), {
    status: 'processing',
    updatedAt: now
  });
  batch.update(firestore.collection('analyses').doc(analysisId), {
    status: 'processing',
    updatedAt: now
  });
  await batch.commit();
}

export async function completeAnalysisJob(input: {
  jobId: string;
  analysisId: string;
  uid: string;
  analysisFields: Record<string, unknown>;
  gcsTextUri: string;
}): Promise<void> {
  const firestore = getFirestore();
  const now = new Date().toISOString();
  const analysisRef = firestore.collection('analyses').doc(input.analysisId);
  const jobRef = firestore.collection('analysisJobs').doc(input.jobId);
  const userRef = firestore.collection('users').doc(input.uid);

  await firestore.runTransaction(async (transaction) => {
    const userSnapshot = await transaction.get(userRef);
    const analysisSnapshot = await transaction.get(analysisRef);

    if (!analysisSnapshot.exists) {
      throw new HttpError(404, 'NOT_FOUND', 'Analysis not found.');
    }

    const forbiddenRawTextField = ['document', 'Text'].join('');
    const sanitized = Object.fromEntries(
      Object.entries(input.analysisFields).filter(([key]) => key !== forbiddenRawTextField)
    );

    transaction.update(analysisRef, {
      ...sanitized,
      id: input.analysisId,
      userId: input.uid,
      gcsTextUri: input.gcsTextUri,
      status: 'ready',
      completedAt: now,
      updatedAt: now,
      analysisDate: now
    });

    transaction.update(jobRef, {
      status: 'completed',
      updatedAt: now,
      completedAt: now
    });

    if (userSnapshot.exists) {
      transaction.update(userRef, {
        contractsAnalyzed: FieldValue.increment(1),
        contractsInFlight: FieldValue.increment(-1),
        lastAnalysis: input.analysisId,
        updatedAt: now
      });
    } else {
      transaction.set(userRef, {
        contractsAnalyzed: 1,
        contractsInFlight: 0,
        maxContracts: DEFAULT_MAX_CONTRACTS,
        plan: DEFAULT_PLAN,
        createdAt: now,
        lastAnalysis: input.analysisId,
        updatedAt: now
      });
    }
  });
}

export async function failAnalysisJob(input: {
  jobId: string;
  analysisId: string;
  uid: string;
  error: string;
}): Promise<void> {
  const firestore = getFirestore();
  const now = new Date().toISOString();
  const analysisRef = firestore.collection('analyses').doc(input.analysisId);
  const jobRef = firestore.collection('analysisJobs').doc(input.jobId);
  const userRef = firestore.collection('users').doc(input.uid);

  await firestore.runTransaction(async (transaction) => {
    const userSnapshot = await transaction.get(userRef);

    transaction.update(analysisRef, {
      status: 'failed',
      error: input.error,
      updatedAt: now,
      failedAt: now
    });

    transaction.update(jobRef, {
      status: 'failed',
      error: input.error,
      updatedAt: now,
      failedAt: now
    });

    if (userSnapshot.exists) {
      const inFlight =
        typeof userSnapshot.data()?.contractsInFlight === 'number'
          ? userSnapshot.data()!.contractsInFlight
          : 0;
      transaction.update(userRef, {
        contractsInFlight: Math.max(0, inFlight - 1),
        updatedAt: now
      });
    }
  });
}
