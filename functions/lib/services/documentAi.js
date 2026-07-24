import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import { randomUUID } from 'node:crypto';
import { requireDocumentAiLocation, requireDocumentAiProcessorId, requireProjectId } from '../config.js';
import { loadSigningServiceAccount } from '../config/credentials.js';
import { HttpError } from '../http/errors.js';
import { assertUserOwnedGcsUri, writeTextObject } from './gcs.js';
function createDocumentAiClient() {
    const credentials = loadSigningServiceAccount();
    if (credentials) {
        return new DocumentProcessorServiceClient({
            credentials,
            projectId: credentials.project_id
        });
    }
    return new DocumentProcessorServiceClient();
}
let documentAiClient = null;
function getDocumentAiClient() {
    if (!documentAiClient) {
        documentAiClient = createDocumentAiClient();
    }
    return documentAiClient;
}
function requireDocumentAiProcessorName() {
    return getDocumentAiClient().processorPath(requireProjectId(), requireDocumentAiLocation(), requireDocumentAiProcessorId());
}
function extractDocumentParagraphs(document) {
    if (!Array.isArray(document.pages)) {
        return [];
    }
    return document.pages.flatMap((page) => (page.paragraphs || []).map((paragraph) => {
        const segments = paragraph.layout?.textAnchor?.textSegments || [];
        const text = segments
            .map((segment) => {
            const startIndex = Number(segment.startIndex || 0);
            const endIndex = Number(segment.endIndex || 0);
            return (document.text || '').slice(startIndex, endIndex);
        })
            .join('');
        return {
            text,
            confidence: Number(paragraph.layout?.confidence || 0)
        };
    }));
}
function extractDocumentTables(document) {
    if (!Array.isArray(document.pages)) {
        return [];
    }
    return document.pages.flatMap((page) => (page.tables || []).map((table) => ({
        headerRows: (table.headerRows || []).flatMap((row) => (row.cells || []).map((cell) => cell.layout?.textAnchor?.content || '').filter(Boolean)),
        bodyRows: (table.bodyRows || []).map((row) => (row.cells || []).map((cell) => cell.layout?.textAnchor?.content || '').filter(Boolean))
    })));
}
export async function processDocumentFromGcs(gcsUri, mimeType, uid) {
    assertUserOwnedGcsUri(gcsUri, uid, ['uploads']);
    try {
        const [processResult] = await getDocumentAiClient().processDocument({
            name: requireDocumentAiProcessorName(),
            // Raises online PDF page limit from 15 → 30 (required for longer contracts).
            imagelessMode: true,
            gcsDocument: {
                gcsUri,
                mimeType
            }
        });
        const document = processResult.document;
        if (!document?.text) {
            throw new Error('Document AI returned no text.');
        }
        const textObjectName = `texts/${uid}/${randomUUID()}.txt`;
        const textGcsUri = await writeTextObject(textObjectName, document.text, gcsUri);
        return {
            text: document.text,
            pages: Array.isArray(document.pages) ? document.pages.length : 1,
            mimeType,
            textGcsUri,
            entities: (document.entities || []).map((entity) => ({
                type: entity.type || 'UNKNOWN',
                content: entity.mentionText || '',
                confidence: Number(entity.confidence || 0)
            })),
            tables: extractDocumentTables(document),
            paragraphs: extractDocumentParagraphs(document)
        };
    }
    catch (error) {
        console.error('[documentai] processing failed', error);
        if (isPageLimitExceeded(error)) {
            throw new HttpError(413, 'DOCUMENT_TOO_LONG', 'This document has too many pages for online analysis (max 30). Try a shorter PDF or split it.');
        }
        if (mimeType === 'application/pdf') {
            throw new HttpError(503, 'OCR_SERVICE_UNAVAILABLE', 'OCR Service Unavailable');
        }
        throw new HttpError(502, 'DOCUMENT_AI_FAILED', 'Document processing failed.');
    }
}
function isPageLimitExceeded(error) {
    if (!error || typeof error !== 'object') {
        return false;
    }
    const record = error;
    const haystack = `${record.reason || ''} ${record.details || ''} ${record.message || ''}`;
    return /PAGE_LIMIT_EXCEEDED/i.test(haystack) || /pages .* exceed/i.test(haystack);
}
