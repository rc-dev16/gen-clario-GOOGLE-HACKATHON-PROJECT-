import type { Request } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { HttpError } from '../http/errors.js';
import type { AuthenticatedRequestContext } from '../types.js';

export async function authenticate(req: Request): Promise<AuthenticatedRequestContext> {
  const authorization = req.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Missing bearer token.');
  }

  try {
    const token = await getAuth().verifyIdToken(match[1], true);
    return { uid: token.uid, token };
  } catch (error) {
    console.warn('[auth] rejected request', error);
    throw new HttpError(401, 'UNAUTHORIZED', 'Invalid bearer token.');
  }
}
