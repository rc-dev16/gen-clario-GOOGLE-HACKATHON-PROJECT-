import { getFirestore } from 'firebase-admin/firestore';
import { HttpError } from '../http/errors.js';
export const DEFAULT_MAX_CONTRACTS = 5;
export const DEFAULT_PLAN = 'free';
export async function getUserQuota(uid) {
    const snapshot = await getFirestore().collection('users').doc(uid).get();
    if (!snapshot.exists) {
        return {
            contractsAnalyzed: 0,
            contractsInFlight: 0,
            maxContracts: DEFAULT_MAX_CONTRACTS,
            plan: DEFAULT_PLAN
        };
    }
    const data = snapshot.data() || {};
    return {
        contractsAnalyzed: typeof data.contractsAnalyzed === 'number' ? data.contractsAnalyzed : 0,
        contractsInFlight: typeof data.contractsInFlight === 'number' ? data.contractsInFlight : 0,
        maxContracts: typeof data.maxContracts === 'number' ? data.maxContracts : DEFAULT_MAX_CONTRACTS,
        plan: typeof data.plan === 'string' ? data.plan : DEFAULT_PLAN
    };
}
export function shouldSkipQuota(token) {
    return token?.admin === true;
}
export async function assertWithinQuota(uid, token) {
    if (shouldSkipQuota(token)) {
        return;
    }
    const quota = await getUserQuota(uid);
    if (quota.contractsAnalyzed + quota.contractsInFlight >= quota.maxContracts) {
        throw new HttpError(403, 'QUOTA_EXCEEDED', 'You have reached the maximum number of analyses for your plan.');
    }
}
export function assertQuotaFromSnapshot(data, options = {}) {
    if (options.skipQuota) {
        return;
    }
    const contractsAnalyzed = typeof data?.contractsAnalyzed === 'number' ? data.contractsAnalyzed : 0;
    const contractsInFlight = typeof data?.contractsInFlight === 'number' ? data.contractsInFlight : 0;
    const maxContracts = typeof data?.maxContracts === 'number' ? data.maxContracts : DEFAULT_MAX_CONTRACTS;
    if (contractsAnalyzed + contractsInFlight >= maxContracts) {
        throw new HttpError(403, 'QUOTA_EXCEEDED', 'You have reached the maximum number of analyses for your plan.');
    }
}
