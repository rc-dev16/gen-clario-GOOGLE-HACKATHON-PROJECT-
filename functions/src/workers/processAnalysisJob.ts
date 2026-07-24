import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { runAnalysisJob } from '../services/runAnalysisJob.js';

export const processAnalysisJob = onDocumentCreated(
  {
    document: 'analysisJobs/{jobId}',
    region: 'us-central1',
    timeoutSeconds: 540,
    memory: '1GiB'
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      return;
    }

    const job = snapshot.data();
    const jobId = event.params.jobId;
    const analysisId = typeof job.analysisId === 'string' ? job.analysisId : '';
    const uid = typeof job.userId === 'string' ? job.userId : '';
    const gcsUri = typeof job.gcsUri === 'string' ? job.gcsUri : '';
    const mimeType = typeof job.mimeType === 'string' ? job.mimeType : '';
    const fileName = typeof job.fileName === 'string' ? job.fileName : 'document';
    const fileSize = job.fileSize;

    if (!analysisId || !uid || !gcsUri || !mimeType) {
      console.error('[processAnalysisJob] invalid job payload', jobId, job);
      return;
    }

    if (job.status && job.status !== 'pending') {
      return;
    }

    await runAnalysisJob({
      jobId,
      analysisId,
      uid,
      gcsUri,
      mimeType,
      fileName,
      fileSize: typeof fileSize === 'number' || typeof fileSize === 'string' ? fileSize : undefined
    });
  }
);
