import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import { randomUUID } from 'node:crypto';
import { requireDocumentAiLocation, requireDocumentAiProcessorId, requireProjectId } from '../config.js';
import { HttpError } from '../http/errors.js';
import { assertUserOwnedGcsUri, writeTextObject } from './gcs.js';
const documentAiClient = new DocumentProcessorServiceClient();
function requireDocumentAiProcessorName() {
    return documentAiClient.processorPath(requireProjectId(), requireDocumentAiLocation(), requireDocumentAiProcessorId());
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
        const [processResult] = await documentAiClient.processDocument({
            name: requireDocumentAiProcessorName(),
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
        if (mimeType === 'application/pdf') {
            throw new HttpError(503, 'OCR_SERVICE_UNAVAILABLE', 'OCR Service Unavailable');
        }
        throw new HttpError(502, 'DOCUMENT_AI_FAILED', 'Document processing failed.');
    }
}
