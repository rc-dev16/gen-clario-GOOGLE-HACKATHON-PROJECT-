/**
 * Returns a same-origin relative path suitable for post-login redirects.
 * Rejects protocol-relative and absolute URLs to avoid open redirects.
 */
export function getSafeNextPath(
  raw: string | null | undefined,
  fallback = '/dashboard'
): string {
  if (!raw) {
    return fallback;
  }

  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return fallback;
  }

  if (
    !decoded.startsWith('/') ||
    decoded.startsWith('//') ||
    decoded.startsWith('/\\') ||
    decoded.startsWith('/auth')
  ) {
    return fallback;
  }

  return decoded;
}
