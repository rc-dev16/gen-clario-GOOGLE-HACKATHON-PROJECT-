import { getFirestore } from 'firebase-admin/firestore';
import { RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS } from '../config.js';
import { HttpError } from '../http/errors.js';
export async function enforceRateLimit(uid) {
    const firestore = getFirestore();
    const rateLimitRef = firestore.collection('apiRateLimits').doc(uid);
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW_MS;
    await firestore.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(rateLimitRef);
        const timestamps = snapshot.exists && Array.isArray(snapshot.data()?.timestamps)
            ? (snapshot.data()?.timestamps).filter((value) => typeof value === 'number')
            : [];
        const recentRequests = timestamps.filter((timestamp) => timestamp > windowStart);
        if (recentRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
            throw new HttpError(429, 'RATE_LIMITED', 'Too many requests. Try again in one minute.');
        }
        transaction.set(rateLimitRef, {
            timestamps: [...recentRequests, now],
            updatedAt: new Date(now).toISOString()
        });
    });
}
