/**
 * Gemini AI Service
 * 
 * Provides document analysis using Google's Gemini AI:
 * - Document content extraction
 * - AI-powered analysis
 * - Risk assessment
 * - Contract summarization
 * 
 * Features:
 * - File validation and security
 * - Structured analysis results
 * - Error handling and fallbacks
 * - Response parsing and normalization
 * 
 * Security:
 * - API key validation
 * - File type verification
 * - Size limit enforcement
 * - Secure content handling
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import DocumentAIService from './documentAIService';
import { AnalysisResult } from '../types';
import { v4 as uuidv4 } from 'uuid';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const documentAIService = new DocumentAIService();

export const validateFile = (file: File): Error | null => {
  const MAX_SIZE = 10 * 1024 * 1024;
  const ALLOWED_TYPES = ['application/pdf', 'text/plain'];

  if (!ALLOWED_TYPES.includes(file.type)) {
    return new Error('Invalid file type. Please upload a PDF or TXT file. Word document support coming soon.');
  }

  if (file.size > MAX_SIZE) {
    return new Error('File too large. Maximum size is 10MB.');
  }

  return null;
};

export const extractFileContent = async (file: File): Promise<string> => {
  try {
    const result = await documentAIService.analyzeDocument(file);
    return result.text;
  } catch (error) {
    throw new Error('Failed to extract file content');
  }
};

const extractListItems = (text: string): string[] => {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('-'))
    .map(line => line.replace(/^[-*]\s*/, ''))
    .filter(Boolean);
};

function parseGeminiResponse(text: string) {
  try {
    const sections = text.split(/(?=\d+\.)/);
    
    let documentType = 'Document';
    let riskLevel = 'Medium';
    let riskFactors: string[] = [];
    let completionScore = 0.5;
    let missingClauses: string[] = [];
    let keyTerms: string[] = [];
    let summary = '';
    let parties: string[] = [];
    let dates: Record<string, string> = {};
    let paymentTerms = '';
    let terminationClauses: string[] = [];
    let concerningPoints: string[] = [];
    sections.forEach((section) => {
      const sectionText = section.trim();
      if (!sectionText) return;

      // Section 1: Document Type and Purpose
      if (section.startsWith('1.')) {
        // Try multiple patterns to extract document type
        let typeMatch = section.match(/Type:\s*([^\n-]+)/i);
        if (!typeMatch) {
          typeMatch = section.match(/Document Type:\s*([^\n-]+)/i);
        }
        if (!typeMatch) {
          typeMatch = section.match(/Type\s*:\s*([^\n-]+)/i);
        }
        
        if (typeMatch) {
          let extractedType = typeMatch[1].trim();
          // Clean up the document type - remove "and Purpose:" and other extraneous text
          extractedType = extractedType.replace(/\s*and\s+Purpose\s*:?\s*/i, '');
          extractedType = extractedType.replace(/\s*-\s*Purpose\s*:?\s*/i, '');
          extractedType = extractedType.replace(/\s*Purpose\s*:?\s*/i, '');
          extractedType = extractedType.replace(/\s*\([^)]*\)\s*/g, ''); // Remove parentheses content
          // Remove any trailing punctuation and extra spaces
          extractedType = extractedType.replace(/[:\s]+$/, '').trim();
          documentType = extractedType;
        }
      }

      // Section 2: Parties Involved
      if (section.startsWith('2.')) {
        parties = extractListItems(section);
      }

      // Section 3: Important Dates
      if (section.startsWith('3.')) {
        const dateItems = extractListItems(section);
        dateItems.forEach(item => {
          if (item.includes(':')) {
            const [key, value] = item.split(':').map(part => part.trim());
            if (key && value) {
              dates[key] = value;
            }
          }
        });
      }

      // Section 4: Payment Terms
      if (section.startsWith('4.')) {
        const paymentItems = extractListItems(section);
        const cleanedItems = paymentItems.map(item => {
          return item
            .replace(/^[-*]\s*/, '')
            .replace(/^\d+\.\s*/, '')
            .trim();
        }).filter(item => item.length > 0);
        
        paymentTerms = cleanedItems.join(' || ');
      }

      // Section 5: Key Terms and Conditions
      if (section.startsWith('5.')) {
        keyTerms = extractListItems(section);
      }

      // Section 6: Risk Assessment
      if (section.startsWith('6.')) {
        // Extract risk level with fallback based on concerning points
        const riskMatch = section.match(/Risk Level:\s*(High|Medium|Low)/i);
        if (riskMatch) {
          riskLevel = riskMatch[1];
        }

        // Extract risk factors
        const riskSection = section.split('Risk Factors:')[1] || section.split('Risk Factors')[1];
        if (riskSection) {
          riskFactors = extractListItems(riskSection);
          // Fallback risk level based on number of risk factors if not explicitly set
          if (!riskMatch) {
            if (riskFactors.length > 5) riskLevel = 'High';
            else if (riskFactors.length > 2) riskLevel = 'Medium';
            else riskLevel = 'Low';
          }
        }

        // Extract concerning points
        const concerningSection = section.split('Concerning Elements:')[1] || section.split('Concerning Elements')[1];
        if (concerningSection) {
          concerningPoints = extractListItems(concerningSection);
          // Adjust risk level up if there are many concerning points
          if (concerningPoints.length > 3 && riskLevel !== 'High') {
            riskLevel = 'High';
          }
        }
      }

      // Section 7: Missing or Unclear Elements
      if (section.startsWith('7.')) {
        missingClauses = extractListItems(section);
      }

      // Section 8: Completion Score
      if (section.startsWith('8.')) {
        // Try to extract explicit score first
        let scoreMatch = section.match(/Score:\s*(\d+(?:\.\d+)?)/i);
        if (!scoreMatch) {
          scoreMatch = section.match(/Score\s*:\s*(\d+(?:\.\d+)?)/i);
        }
        if (!scoreMatch) {
          scoreMatch = section.match(/(\d+(?:\.\d+)?)/i);
        }
        if (!scoreMatch) {
          scoreMatch = section.match(/(\d+\.\d+)/);
        }
        
        // Calculate completion score
        if (scoreMatch) {
          const extractedScore = parseFloat(scoreMatch[1]);
          
          if (extractedScore >= 0 && extractedScore <= 1) {
            completionScore = extractedScore;
          } else if (extractedScore > 1 && extractedScore <= 10) {
            completionScore = extractedScore / 10;
          } else if (extractedScore > 10 && extractedScore <= 100) {
            completionScore = extractedScore / 100;
          } else {
            completionScore = Math.min(extractedScore / 10, 1);
          }
        } else {
          // Fallback: Calculate completion score based on missing elements
          const totalExpectedFields = 8; // Key sections we expect in a complete document
          const missingCount = missingClauses.length;
          const hasParties = parties.length > 0;
          const hasDates = Object.keys(dates).length > 0;
          const hasKeyTerms = keyTerms.length > 0;
          const hasRiskAssessment = riskFactors.length > 0;
          const hasPaymentTerms = paymentTerms.length > 0;
          const hasSummary = summary.length > 0;
          
          const presentFields = [
            hasParties,
            hasDates,
            hasKeyTerms,
            hasRiskAssessment,
            hasPaymentTerms,
            hasSummary
          ].filter(Boolean).length;

          // Base score on present fields minus impact of missing clauses
          completionScore = Math.max(
            0,
            Math.min(
              1,
              (presentFields / totalExpectedFields) - (missingCount * 0.1)
            )
          );
        }
      }

      // Section 9: Plain English Summary
      if (section.startsWith('9.')) {
        const summaryItems = extractListItems(section);
        summary = summaryItems.join(' ');
      }
    });

    // Extract termination clauses from key terms
    terminationClauses = keyTerms.filter(term => {
      const lowerTerm = term.toLowerCase();
      return (
        lowerTerm.includes('terminat') ||
        lowerTerm.includes('cancel') ||
        lowerTerm.includes('revoke') ||
        lowerTerm.includes('end') ||
        lowerTerm.includes('expiration')
      );
    });

    const result = {
      documentType,
      riskLevel,
      riskFactors,
      completionScore,
      missingClauses,
      keyTerms,
      summary,
      parties,
      dates,
      paymentTerms,
      terminationClauses,
      concerningPoints
    };

    return result;

  } catch (error) {
    return {
      documentType: 'Document',
      riskLevel: 'Medium',
      riskFactors: [],
      completionScore: 0.5,
      missingClauses: [],
      keyTerms: [],
      summary: '',
      parties: [],
      dates: {},
      paymentTerms: '',
      terminationClauses: [],
      concerningPoints: []
    };
  }
}

export const analyzeDocumentWithGemini = async (file: File): Promise<AnalysisResult> => {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured');
  }

  try {
    // Use DocumentAI to extract text content
    const docAIResult = await documentAIService.analyzeDocument(file);
    const content = docAIResult.text;
    
    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 0.1,
        maxOutputTokens: 4096,
      }
    });

    // Generate content
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: ANALYSIS_PROMPT + content }] }]
    });

    const response = await result.response;
    const analysisText = response.text();

    // Parse Gemini response
    const analysis = parseGeminiResponse(analysisText);
    
    // Create the analysis result
    return {
      id: uuidv4(),
          fileName: file.name,
          fileSize: file.size,
      documentType: analysis.documentType,
      analysisDate: new Date().toISOString(),
      riskLevel: analysis.riskLevel as 'Low' | 'Medium' | 'High',
      completionScore: analysis.completionScore,
      summary: {
        points: analysis.keyTerms,
        contractType: analysis.documentType,
        missingOrAmbiguousTerms: analysis.missingClauses
      },
      fields: [],
      contractType: analysis.documentType,
      documentText: content, // Store the raw document text from Document AI
      keyTerms: analysis.keyTerms,
      parties: analysis.parties,
      importantDates: analysis.dates,
      paymentTerms: analysis.paymentTerms,
      terminationClauses: analysis.terminationClauses,
      concerningPoints: analysis.concerningPoints,
      overallSummary: analysis.summary
    };
  } catch (error) {
    throw error;
  }
};

const ANALYSIS_PROMPT = `You are a legal document analyzer. Analyze this document and provide a structured analysis in the following format:

1. Document Type and Purpose:
   - Type: [Specify only the exact type of legal document, e.g., "Employment Agreement", "Student Agreement", "Non-Disclosure Agreement"]
   - Purpose: [Explain its main purpose and intent]

2. Parties Involved:
   - List each party with their role (e.g., "Company ABC (Employer)", "John Doe (Employee)")
   - Include any relevant party details mentioned

3. Important Dates:
   - Effective Date: [Date the agreement becomes effective]
   - Termination Date: [If specified]
   - Other Key Dates: [List any other significant dates]

4. Payment Terms and Financial Details:
   - Payment Amount: [Specify amounts]
   - Payment Schedule: [Frequency, due dates]
   - Payment Method: [If specified]
   - Late Payment Terms: [If any]

5. Key Terms and Conditions:
   - List each major term briefly
   - Highlight any unusual clauses
   - Include key obligations

6. Risk Assessment:
   - Risk Level: [High/Medium/Low]
   - Risk Factors: [List specific risks]
   - Concerning Elements: [List red flags]

7. Missing or Unclear Elements:
   - Required Information: [List missing items]
   - Ambiguous Terms: [List unclear terms]
   - Recommended Additions: [Key missing clauses]

8. Completion Score:
   - Score: [0.0-1.0 decimal format, e.g., 0.7]
   - Explanation: [Brief reason for score]
   - Required to Complete: [Key missing items]

9. Plain English Summary:
   - Overview: [2-3 sentences max]
   - Key Rights: [Main rights]
   - Key Obligations: [Main obligations]

Keep responses clear and use simple bullet points without asterisks.

Document content to analyze:
`;