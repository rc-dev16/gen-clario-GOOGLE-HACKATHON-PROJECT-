/**
 * Document AI Service
 * 
 * Handles document processing using Google Cloud Document AI:
 * - Document text extraction
 * - Entity recognition
 * - Table extraction
 * - Paragraph analysis
 * 
 * Features:
 * - JWT-based authentication
 * - Error handling and validation
 * - Structured data extraction
 * - Multiple format support
 */

import { 
  DocumentAIResult, 
  DocumentProcessingError 
} from '../types/documentai';
import KJUR from 'jsrsasign';

class DocumentAIService {
  private config: {
    projectId: string;
    location: string;
    processorId: string;
  };

  constructor() {
    // Initialize with default location, project ID will be set in processDocument
    this.config = {
      projectId: '',
      location: 'us',
      processorId: import.meta.env.VITE_DOCUMENT_AI_PROCESSOR_ID
    };
  }

  private async processDocument(file: File): Promise<any> {
    try {
      const buffer = await file.arrayBuffer();
      const base64String = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      let credentials: { project_id: string; private_key: string; client_email: string };
      try {
        const response = await fetch('/config/google-cloud/service-account.json');
        if (!response.ok) {
          throw new Error('Failed to load service account file');
        }
        credentials = await response.json();
        
        // Update project ID from credentials
        this.config.projectId = credentials.project_id;

        const requiredFields = ['private_key', 'client_email', 'project_id'] as const;
        const missingFields = requiredFields.filter(field => !credentials[field as keyof typeof credentials]);
        
        if (missingFields.length > 0) {
          throw new Error(`Missing required fields in service account credentials: ${missingFields.join(', ')}`);
        }

        if (!credentials.private_key.includes('-----BEGIN PRIVATE KEY-----')) {
          throw new Error('Invalid private key format in service account credentials');
        }

      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Service account credentials error: ${error.message}`);
        }
        throw new Error('Failed to validate service account credentials');
      }
      const jwt = this.createJWT(credentials);

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to get access token');
      }

      const { access_token } = await tokenResponse.json();

      const processorPath = `https://${this.config.location}-documentai.googleapis.com/v1/projects/${this.config.projectId}/locations/${this.config.location}/processors/${this.config.processorId}:process`;
      
      const requestPayload = {
        rawDocument: {
          content: base64String,
          mimeType: file.type
        }
      };

      const response = await fetch(processorPath, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Document processing failed');
      }

      const result = await response.json();
      return result.document;
    } catch (error) {
      const err = error as Error;
      throw {
        code: 'DOCUMENT_PROCESSING_ERROR',
        message: err.message,
        details: err
      } as DocumentProcessingError;
    }
  }

  private createJWT(credentials: any): string {
    const now = Math.floor(Date.now() / 1000);
    const oneHour = 3600;
    const expiry = now + oneHour;

    const header = {
      alg: 'RS256',
      typ: 'JWT',
      kid: credentials.private_key_id
    };

    const claim = {
      iss: credentials.client_email,
      sub: credentials.client_email,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: expiry,
      scope: 'https://www.googleapis.com/auth/cloud-platform'
    };

    const sHeader = JSON.stringify(header);
    const sPayload = JSON.stringify(claim);
    const sJWT = (KJUR as any).jws.JWS.sign(
      'RS256',
      sHeader,
      sPayload,
      credentials.private_key
    );

    return sJWT;
  }

  private extractEntities(document: any) {
    return document.entities?.map((entity: any) => ({
      type: entity.type || 'UNKNOWN',
      content: entity.mentionText || '',
      confidence: entity.confidence || 0
    })) || [];
  }

  private extractTables(document: any) {
    return document.pages?.flatMap((page: any) => 
      page.tables?.map((table: any) => {
        const headerRows: string[] = [];
        const bodyRows: string[][] = [];

        table.headerRows?.forEach((row: any) => {
          const rowText = row.cells?.map((cell: any) => cell.text || '').filter(Boolean);
          if (rowText) headerRows.push(...rowText);
        });

        table.bodyRows?.forEach((row: any) => {
          const rowText = row.cells?.map((cell: any) => cell.text || '').filter(Boolean);
          if (rowText) bodyRows.push(rowText);
        });

        return { headerRows, bodyRows };
      }) || []
    ) || [];
  }

  private extractParagraphs(document: any) {
    return document.pages?.flatMap((page: any) =>
      page.paragraphs?.map((para: any) => ({
        text: para.text || '',
        confidence: para.confidence || 0
      })) || []
    ) || [];
  }

  public async analyzeDocument(file: File): Promise<DocumentAIResult> {
    const document = await this.processDocument(file);
    
    const result = {
      text: document.text || '',
      pages: document.pages?.length || 0,
      mimeType: document.mimeType || '',
      entities: this.extractEntities(document),
      tables: this.extractTables(document),
      paragraphs: this.extractParagraphs(document)
    };


    return result;
  }
}

export default DocumentAIService;