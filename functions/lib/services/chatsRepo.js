import { getFirestore } from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';
function chatsCollection(analysisId) {
    return getFirestore().collection('analyses').doc(analysisId).collection('chats');
}
function negotiationStateRef(analysisId) {
    return getFirestore().collection('analyses').doc(analysisId).collection('negotiationState').doc('current');
}
export async function appendChatMessages(analysisId, messages) {
    const batch = getFirestore().batch();
    const now = Date.now();
    const records = [];
    for (const [index, message] of messages.entries()) {
        const id = randomUUID();
        const createdAt = new Date(now + index).toISOString();
        const record = {
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
export async function listChatMessages(analysisId, options) {
    const snapshot = await chatsCollection(analysisId)
        .where('sessionId', '==', options.sessionId)
        .get();
    return snapshot.docs
        .map((doc) => doc.data())
        .filter((message) => message.kind === options.kind)
        .sort((a, b) => a.timestamp - b.timestamp);
}
export async function listChatSessions(analysisId, kind) {
    const snapshot = await chatsCollection(analysisId).where('kind', '==', kind).get();
    const bySession = new Map();
    for (const doc of snapshot.docs) {
        const message = doc.data();
        const existing = bySession.get(message.sessionId) || [];
        existing.push(message);
        bySession.set(message.sessionId, existing);
    }
    const sessions = [];
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
export async function saveNegotiationState(analysisId, state) {
    await negotiationStateRef(analysisId).set(state, { merge: true });
    return state;
}
export async function getNegotiationState(analysisId) {
    const snapshot = await negotiationStateRef(analysisId).get();
    if (!snapshot.exists) {
        return null;
    }
    return snapshot.data();
}
export async function deleteAnalysisSideData(analysisId) {
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
