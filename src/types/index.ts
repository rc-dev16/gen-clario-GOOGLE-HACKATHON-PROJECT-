/**
 * Type Definitions
 * 
 * Core type definitions for:
 * - User management and authentication
 * - Contract analysis and processing
 * - Document fields and metadata
 * - Application state and context
 * 
 * These types ensure type safety across:
 * - Component props
 * - API responses
 * - State management
 * - Data processing
 */

export interface User {
  id: string;
  email: string;
  name: string;
  plan: 'free' | 'pro' | 'enterprise';
  contractsAnalyzed: number;
  maxContracts: number;
  createdAt: string;
  avatar?: string;
  lastAnalysis?: string | null;
  subscriptionStatus?: 'active' | 'expired' | 'trial';
}

export interface ContractField {
  name: string;
  status: 'Filled' | 'Missing/Needs Input';
  value?: string;
  description?: string;
  confidence?: number; // Confidence score between 0 and 1
  type?: string; // Type of the field (e.g., 'text', 'date', 'number')
  required?: boolean; // Whether the field is required
}

export interface ContractSummary {
  points: string[];
  contractType?: string;
  missingOrAmbiguousTerms?: string[];
  purpose?: string; // Document purpose
  keyObligations?: string[]; // Key obligations from the summary
  keyRights?: string[]; // Key rights from the summary
  overview?: string; // Overview from the summary
}

export interface AnalysisResult {
  id: string;
  summary: ContractSummary;
  fields: ContractField[];
  documentType: string;
  analysisDate: string;
  fileName: string;
  fileSize: string | number;
  riskLevel: 'Low' | 'Medium' | 'High';
  completionScore: number;
  
  // Document metadata
  contractType?: string;
  purpose?: string;
  
  // Document content
  documentText?: string; // Raw text extracted from Document AI
  
  // Parties and relationships
  parties?: string[];
  
  // Key information
  keyTerms?: string[];
  importantDates?: Record<string, string>;
  paymentTerms?: string;
  terminationClauses?: string[];
  
  // Risk and concerns
  concerningPoints?: string[];
  riskFactors?: string[];
  
  // Summaries
  overallSummary?: string;
  missingElements?: string[];
  ambiguousTerms?: string[];
  recommendedAdditions?: string[];
  
  // Completion details
  completionExplanation?: string;
  requiredToComplete?: string[];
}

export interface UploadedFile extends File {
  content?: string;
}

export interface UserPlan {
  id: string;
  name: string;
  maxContracts: number;
  contractLimitReset: string; // ISO timestamp
  remainingAnalyses: number;
  subscriptionStatus: 'active' | 'expired' | 'trial';
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}