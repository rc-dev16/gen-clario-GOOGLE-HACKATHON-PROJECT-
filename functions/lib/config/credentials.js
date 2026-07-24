import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
function candidatePaths() {
    const fromEnv = [
        process.env.CLARIO_SERVICE_ACCOUNT_PATH,
        process.env.GOOGLE_APPLICATION_CREDENTIALS
    ]
        .map((value) => value?.trim())
        .filter((value) => Boolean(value));
    const relative = [
        path.resolve(process.cwd(), '../config/google-cloud/service-account.json'),
        path.resolve(process.cwd(), 'config/google-cloud/service-account.json'),
        path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../config/google-cloud/service-account.json')
    ];
    return [...fromEnv, ...relative];
}
function tryLoadServiceAccount(filePath) {
    const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
    if (!existsSync(resolved)) {
        return null;
    }
    try {
        const parsed = JSON.parse(readFileSync(resolved, 'utf8'));
        if (typeof parsed.client_email !== 'string' || typeof parsed.private_key !== 'string') {
            console.warn(`[credentials] skipping ${resolved}: missing client_email/private_key`);
            return null;
        }
        return parsed;
    }
    catch (error) {
        console.warn(`[credentials] failed to read ${resolved}`, error);
        return null;
    }
}
/**
 * Load a full service-account key usable for GCS V4 signed URLs.
 * Skips ADC / incomplete credential files (common in the Functions emulator).
 */
export function loadSigningServiceAccount() {
    for (const candidate of candidatePaths()) {
        const loaded = tryLoadServiceAccount(candidate);
        if (loaded) {
            console.log(`[credentials] signing as ${loaded.client_email}`);
            return loaded;
        }
    }
    return null;
}
/** @deprecated Prefer loadSigningServiceAccount() */
export function resolveGoogleCredentialsOptions() {
    const account = loadSigningServiceAccount();
    if (!account) {
        return {};
    }
    // Re-resolve path for callers that still want keyFilename
    for (const candidate of candidatePaths()) {
        const resolved = path.isAbsolute(candidate) ? candidate : path.resolve(process.cwd(), candidate);
        if (!existsSync(resolved))
            continue;
        try {
            const parsed = JSON.parse(readFileSync(resolved, 'utf8'));
            if (parsed.client_email === account.client_email) {
                return { keyFilename: resolved };
            }
        }
        catch {
            // continue
        }
    }
    return {};
}
