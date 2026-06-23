import { auth } from '../firebase-config';

interface ApiErrorPayload {
  error?: {
    code?: string;
    message?: string;
    requestId?: string;
  };
}

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly requestId?: string
  ) {
    super(message);
  }
}

async function getAuthorizationHeader(): Promise<string> {
  const user = auth.currentUser;

  if (!user) {
    throw new ApiClientError(401, 'UNAUTHENTICATED', 'Please sign in before using Clario AI.');
  }

  return `Bearer ${await user.getIdToken()}`;
}

async function parseError(response: Response): Promise<ApiClientError> {
  try {
    const payload = (await response.json()) as ApiErrorPayload;
    return new ApiClientError(
      response.status,
      payload.error?.code || 'API_ERROR',
      payload.error?.message || response.statusText,
      payload.error?.requestId
    );
  } catch {
    return new ApiClientError(response.status, 'API_ERROR', response.statusText);
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', await getAuthorizationHeader());

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(path, {
    ...init,
    headers
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  return response.json() as Promise<T>;
}
