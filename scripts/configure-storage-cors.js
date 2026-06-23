import { Storage } from '@google-cloud/storage';

const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
const bucketName = process.env.CLARIO_UPLOAD_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET;

if (!bucketName) {
  throw new Error('Missing CLARIO_UPLOAD_BUCKET or VITE_FIREBASE_STORAGE_BUCKET.');
}

const configuredOrigins = (process.env.CLARIO_CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const origins = configuredOrigins.length > 0
  ? configuredOrigins
  : [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      ...(projectId ? [`https://${projectId}.web.app`, `https://${projectId}.firebaseapp.com`] : [])
    ];

const storage = new Storage();

await storage.bucket(bucketName).setCorsConfiguration([
  {
    origin: origins,
    method: ['PUT', 'GET', 'HEAD', 'OPTIONS'],
    responseHeader: [
      'Content-Type',
      'Content-Length',
      'ETag',
      'x-goog-content-length-range',
      'x-goog-meta-sourcegcsuri'
    ],
    maxAgeSeconds: 3600
  }
]);

console.log(`Configured CORS for gs://${bucketName}`);
console.log(`Allowed origins: ${origins.join(', ')}`);
