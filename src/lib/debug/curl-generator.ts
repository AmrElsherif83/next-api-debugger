/** Headers whose values must never be sent to the browser. */
const SENSITIVE_HEADER_PATTERNS: RegExp[] = [
  /^authorization$/i,
  /^cookie$/i,
  /^set-cookie$/i,
  /^x-api-key$/i,
  /^x-auth-token$/i,
  /^x-secret$/i,
  /^proxy-authorization$/i,
  /^www-authenticate$/i,
];

const REDACTED = '[REDACTED]';

/**
 * Returns a copy of the headers record with sensitive values replaced.
 * This masked copy is safe to store in the log store and return to the browser.
 */
export function maskHeaders(headers: Record<string, string>): Record<string, string> {
  const masked: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    masked[key] = SENSITIVE_HEADER_PATTERNS.some((p) => p.test(key)) ? REDACTED : value;
  }
  return masked;
}

/**
 * Converts a fetch-like request descriptor into a cURL command string.
 * All sensitive header values are automatically masked before serialisation.
 */
export function toCurl(
  url: string,
  method: string,
  headers: Record<string, string>,
  body?: string,
): string {
  const safeHeaders = maskHeaders(headers);
  const parts: string[] = [`curl -X ${method.toUpperCase()} '${url}'`];

  for (const [key, value] of Object.entries(safeHeaders)) {
    parts.push(`  -H '${key}: ${value}'`);
  }

  if (body) {
    const safeBody = body.replace(/'/g, "'\\''");
    parts.push(`  -d '${safeBody}'`);
  }

  return parts.join(' \\\n');
}
