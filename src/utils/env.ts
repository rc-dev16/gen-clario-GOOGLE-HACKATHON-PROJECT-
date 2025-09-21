/**
 * Environment Variables Validator
 * 
 * Ensures all required environment variables are present for:
 * - Firebase configuration
 * - Gemini API integration
 * - Document AI processing
 * - Google Cloud authentication
 */

const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_MEASUREMENT_ID',
  'VITE_GEMINI_API_KEY',
  'VITE_DOCUMENT_AI_PROCESSOR_ID'
] as const;

export function validateEnv(): void {
  const missingVars = requiredEnvVars.filter(
    (varName) => !import.meta.env[varName]
  );

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }
}

// Validate environment variables immediately
validateEnv();
