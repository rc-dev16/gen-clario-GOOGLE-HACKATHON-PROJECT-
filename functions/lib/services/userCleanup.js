import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from './gcs.js';
import { requireUploadBucket } from '../config.js';
import { deleteAnalysisSideData } from './chatsRepo.js';
/**
 * Cascade cleanup when an Auth user is deleted (e.g. by an admin).
 * Removes Firestore docs/jobs and GCS objects owned by that uid.
 * There is no end-user self-delete API — this is admin/Auth-triggered only.
 */
export async function deleteAllDataForUser(uid) {
    if (!uid.trim()) {
        return { analysesDeleted: 0, jobsDeleted: 0, gcsPrefixesCleared: [] };
    }
    const firestore = getFirestore();
    let analysesDeleted = 0;
    let jobsDeleted = 0;
    const analysesSnap = await firestore.collection('analyses').where('userId', '==', uid).get();
    for (const doc of analysesSnap.docs) {
        await deleteAnalysisSideData(doc.id);
        await doc.ref.delete();
        analysesDeleted += 1;
    }
    const jobsSnap = await firestore.collection('analysisJobs').where('userId', '==', uid).get();
    for (let i = 0; i < jobsSnap.docs.length; i += 400) {
        const batch = firestore.batch();
        for (const doc of jobsSnap.docs.slice(i, i + 400)) {
            batch.delete(doc.ref);
            jobsDeleted += 1;
        }
        await batch.commit();
    }
    const userRef = firestore.collection('users').doc(uid);
    const rateLimitRef = firestore.collection('apiRateLimits').doc(uid);
    await Promise.all([
        userRef.delete().catch(() => undefined),
        rateLimitRef.delete().catch(() => undefined)
    ]);
    const gcsPrefixesCleared = [];
    try {
        const bucketName = requireUploadBucket();
        const bucket = getStorage().bucket(bucketName);
        const prefixes = [`uploads/${uid}/`, `texts/${uid}/`];
        for (const prefix of prefixes) {
            await bucket.deleteFiles({ prefix, force: true });
            gcsPrefixesCleared.push(prefix);
        }
    }
    catch (error) {
        console.warn(`[deleteAllDataForUser] GCS cleanup skipped/failed for ${uid}`, error);
    }
    return { analysesDeleted, jobsDeleted, gcsPrefixesCleared };
}
