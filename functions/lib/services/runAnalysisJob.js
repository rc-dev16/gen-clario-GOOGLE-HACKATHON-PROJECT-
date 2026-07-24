import { buildAnalysisPrompt } from '../prompts/analysis.js';
import { analysisResponseSchema } from '../prompts/schemas.js';
import { processDocumentFromGcs } from './documentAi.js';
import { generateGeminiJson } from './gemini.js';
import { completeAnalysisJob, failAnalysisJob, markJobProcessing } from './jobsRepo.js';
export async function runAnalysisJob(input) {
    const { jobId, analysisId, uid, gcsUri, mimeType, fileName, fileSize } = input;
    try {
        await markJobProcessing(jobId, analysisId);
        const docResult = await processDocumentFromGcs(gcsUri, mimeType, uid);
        const structured = await generateGeminiJson(buildAnalysisPrompt(docResult.text, fileName), analysisResponseSchema(), 16384);
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
    }
    catch (error) {
        console.error(`[runAnalysisJob] failed ${jobId}`, error);
        const message = error instanceof Error ? error.message : 'Analysis job failed.';
        try {
            await failAnalysisJob({
                jobId,
                analysisId,
                uid,
                error: message
            });
        }
        catch (failError) {
            console.error(`[runAnalysisJob] failed to mark job failed ${jobId}`, failError);
        }
    }
}
