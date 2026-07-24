import { auth } from 'firebase-functions/v1';
import { deleteAllDataForUser } from '../services/userCleanup.js';
/**
 * Fires when an Auth user is deleted (Firebase Console / Admin SDK).
 * No in-app self-delete — cascade is admin-driven only.
 */
export const onAuthUserDeleted = auth.user().onDelete(async (user) => {
    console.log(`[onAuthUserDeleted] cascading data delete for uid=${user.uid}`);
    const result = await deleteAllDataForUser(user.uid);
    console.log('[onAuthUserDeleted] cleanup result', result);
});
