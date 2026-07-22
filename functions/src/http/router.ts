import { randomUUID } from 'node:crypto';
import { onRequest } from 'firebase-functions/v2/https';
import type { Request, Response } from 'express';
import { HttpError } from './errors.js';
import { writeSecurityHeaders } from './headers.js';
import { getApiPath } from './request.js';
import { authenticate } from '../middleware/auth.js';
import { enforceRateLimit } from '../middleware/rateLimit.js';
import { handleUploadUrl } from '../routes/storageUploadUrl.js';
import { handleAnalysisDelete } from '../routes/analysisDelete.js';
import { handleAnalysesCreate } from '../routes/analysesCreate.js';
import {
  handleAnalysisChatPost,
  handleAnalysisChatSessionsGet,
  handleAnalysisChatsGet,
  handleNegotiationChatPost,
  handleNegotiationStateGet,
  handleNegotiationSuggestionsPost
} from '../routes/analysisChat.js';

export const api = onRequest({ region: 'us-central1', cors: true }, async (req: Request, res: Response) => {
  writeSecurityHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const user = await authenticate(req);
    await enforceRateLimit(user.uid);

    const apiPath = getApiPath(req);
    const analysisChatMatch = apiPath.match(/^\/analysis\/([^/]+)\/chat$/);
    const analysisChatsMatch = apiPath.match(/^\/analysis\/([^/]+)\/chats$/);
    const analysisChatSessionsMatch = apiPath.match(/^\/analysis\/([^/]+)\/chat-sessions$/);
    const negotiationSuggestionsMatch = apiPath.match(/^\/analysis\/([^/]+)\/negotiation\/suggestions$/);
    const negotiationChatMatch = apiPath.match(/^\/analysis\/([^/]+)\/negotiation\/chat$/);
    const negotiationStateMatch = apiPath.match(/^\/analysis\/([^/]+)\/negotiation$/);
    const analysisDeleteMatch = apiPath.match(/^\/analysis\/([^/]+)$/);

    if (apiPath === '/storage/upload-url') {
      res.status(200).json(await handleUploadUrl(req, user));
      return;
    }

    if (apiPath === '/analyses' && req.method === 'POST') {
      res.status(200).json(await handleAnalysesCreate(req, user));
      return;
    }

    if (analysisChatMatch) {
      res.status(200).json(await handleAnalysisChatPost(req, user, analysisChatMatch[1]));
      return;
    }

    if (analysisChatsMatch) {
      res.status(200).json(await handleAnalysisChatsGet(req, user, analysisChatsMatch[1]));
      return;
    }

    if (analysisChatSessionsMatch) {
      res.status(200).json(await handleAnalysisChatSessionsGet(req, user, analysisChatSessionsMatch[1]));
      return;
    }

    if (negotiationSuggestionsMatch) {
      res.status(200).json(await handleNegotiationSuggestionsPost(req, user, negotiationSuggestionsMatch[1]));
      return;
    }

    if (negotiationChatMatch) {
      res.status(200).json(await handleNegotiationChatPost(req, user, negotiationChatMatch[1]));
      return;
    }

    if (negotiationStateMatch) {
      res.status(200).json(await handleNegotiationStateGet(req, user, negotiationStateMatch[1]));
      return;
    }

    if (analysisDeleteMatch) {
      res.status(200).json(await handleAnalysisDelete(req, user, analysisDeleteMatch[1]));
      return;
    }

    throw new HttpError(404, 'NOT_FOUND', 'API route not found.');
  } catch (error) {
    const requestId = randomUUID();

    if (error instanceof HttpError) {
      res.status(error.status).json({
        error: {
          code: error.code,
          message: error.message,
          requestId
        }
      });
      return;
    }

    console.error(`[api] unhandled error ${requestId}`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL',
        message: 'Internal server error.',
        requestId
      }
    });
  }
});
