import { getAuth } from 'firebase-admin/auth';
import { HttpError } from '../http/errors.js';
export async function authenticate(req) {
    const authorization = req.get('authorization') || '';
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (!match) {
        throw new HttpError(401, 'UNAUTHORIZED', 'Missing bearer token.');
    }
    try {
        const token = await getAuth().verifyIdToken(match[1], true);
        return { uid: token.uid, token };
    }
    catch (error) {
        console.warn('[auth] rejected request', error);
        throw new HttpError(401, 'UNAUTHORIZED', 'Invalid bearer token.');
    }
}
