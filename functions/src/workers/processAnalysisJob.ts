import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { buildAnalysisPrompt } from '../prompts/analysis.js';
import { analysisResponseSchema } from '../prompts/schemas.js';
import { processDocumentFromGcs } from '../services/documentAi.js';
import { generateGeminiJson } from '../services/gemini.js';
import {
  completeAnalysisJob,
  failAnalysisJob,
  markJobProcessing
} from '../services/jobsRepo.js';

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

    try {
      await markJobProcessing(jobId, analysisId);

      const docResult = await processDocumentFromGcs(gcsUri, mimeType, uid);
      const structured = await generateGeminiJson<Record<string, unknown>>(
        buildAnalysisPrompt(docResult.text, fileName),
        analysisResponseSchema()
      );

      await completeAnalysisJob({
        jobId,
        analysisId,
        uid,
        gcsTextUri: docResult.textGcsUri,
        analysisFields: {
          ...structured,
          fileName,
          fileSize: typeof fileSize === 'number' || typeof fileSize === 'string' ? fileSize : '',
          gcsUri,
          mimeType
        }
      });
    } catch (error) {
      console.error(`[processAnalysisJob] failed ${jobId}`, error);
      const message =
        error instanceof Error ? error.message : 'Analysis job failed.';

      try {
        await failAnalysisJob({
          jobId,
          analysisId,
          uid,
          error: message
        });
      } catch (failError) {
        console.error(`[processAnalysisJob] failed to mark job failed ${jobId}`, failError);
      }
    }
  }
);
