import { getFirestore } from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';

export type ChatKind = 'document' | 'negotiation';
export type ChatRole = 'user' | 'assistant';

export interface ChatMessageRecord {
  id: string;
  sessionId: string;
  kind: ChatKind;
  role: ChatRole;
  content: string;
  party?: string;
  createdAt: string;
  timestamp: number;
}

export interface ChatSessionSummary {
  sessionId: string;
  kind: ChatKind;
  preview: string;
  lastTime: number;
  name: string;
  party?: string;
}

export interface NegotiationState {
  party: string;
  suggestions: unknown[];
  updatedAt: string;
}

function chatsCollection(analysisId: string) {
  return getFirestore().collection('analyses').doc(analysisId).collection('chats');
}

function negotiationStateRef(analysisId: string) {
  return getFirestore().collection('analyses').doc(analysisId).collection('negotiationState').doc('current');
}

export async function appendChatMessages(
  analysisId: string,
  messages: Array<{
    sessionId: string;
    kind: ChatKind;
    role: ChatRole;
    content: string;
    party?: string;
  }>
): Promise<ChatMessageRecord[]> {
  const batch = getFirestore().batch();
  const now = Date.now();
  const records: ChatMessageRecord[] = [];

  for (const [index, message] of messages.entries()) {
    const id = randomUUID();
    const createdAt = new Date(now + index).toISOString();
    const record: ChatMessageRecord = {
      id,
      sessionId: message.sessionId,
      kind: message.kind,
      role: message.role,
      content: message.content,
      createdAt,
      timestamp: now + index,
      ...(message.party ? { party: message.party } : {})
    };
    batch.set(chatsCollection(analysisId).doc(id), record);
    records.push(record);
  }

  await batch.commit();
  return records;
}

export async function listChatMessages(
  analysisId: string,
  options: { sessionId: string; kind: ChatKind }
): Promise<ChatMessageRecord[]> {
  const snapshot = await chatsCollection(analysisId)
    .where('sessionId', '==', options.sessionId)
    .get();

  return snapshot.docs
    .map((doc) => doc.data() as ChatMessageRecord)
    .filter((message) => message.kind === options.kind)
    .sort((a, b) => a.timestamp - b.timestamp);
}

export async function listChatSessions(
  analysisId: string,
  kind: ChatKind
): Promise<ChatSessionSummary[]> {
  const snapshot = await chatsCollection(analysisId).where('kind', '==', kind).get();
  const bySession = new Map<string, ChatMessageRecord[]>();

  for (const doc of snapshot.docs) {
    const message = doc.data() as ChatMessageRecord;
    const existing = bySession.get(message.sessionId) || [];
    existing.push(message);
    bySession.set(message.sessionId, existing);
  }

  const sessions: ChatSessionSummary[] = [];

  for (const [sessionId, messages] of bySession.entries()) {
    messages.sort((a, b) => a.timestamp - b.timestamp);
    const firstUser = messages.find((message) => message.role === 'user');
    const last = messages[messages.length - 1];
    const preview = firstUser?.content?.trim().slice(0, 40) || 'New chat session';

    sessions.push({
      sessionId,
      kind,
      preview: preview.length >= 40 ? `${preview}...` : preview,
      lastTime: last?.timestamp || 0,
      name: 'Chat Session',
      ...(last?.party ? { party: last.party } : {})
    });
  }

  return sessions.sort((a, b) => b.lastTime - a.lastTime);
}

export async function saveNegotiationState(
  analysisId: string,
  state: NegotiationState
): Promise<NegotiationState> {
  await negotiationStateRef(analysisId).set(state, { merge: true });
  return state;
}

export async function getNegotiationState(analysisId: string): Promise<NegotiationState | null> {
  const snapshot = await negotiationStateRef(analysisId).get();
  if (!snapshot.exists) {
    return null;
  }
  return snapshot.data() as NegotiationState;
}

export async function deleteAnalysisSideData(analysisId: string): Promise<void> {
  const firestore = getFirestore();
  const chats = await chatsCollection(analysisId).listDocuments();
  const negotiationDocs = await firestore
    .collection('analyses')
    .doc(analysisId)
    .collection('negotiationState')
    .listDocuments();

  const batchSize = 400;
  const allRefs = [...chats, ...negotiationDocs];

  for (let i = 0; i < allRefs.length; i += batchSize) {
    const batch = firestore.batch();
    for (const ref of allRefs.slice(i, i + batchSize)) {
      batch.delete(ref);
    }
    await batch.commit();
  }
}
