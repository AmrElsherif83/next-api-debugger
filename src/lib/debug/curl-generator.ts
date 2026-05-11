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
 *
 * Single quotes inside URL, header strings, and body are shell-escaped using
 * the ANSI-C quoting trick (`'` → `'\''`) so the generated command is always
 * valid shell syntax, even when field values contain apostrophes or special
 * characters.
 */
export function toCurl(
  url: string,
  method: string,
  headers: Record<string, string>,
  body?: string,
): string {
  const safeHeaders = maskHeaders(headers);
  // Escape single quotes in the URL so the generated shell command is valid
  // for URLs that contain apostrophes (e.g. ?q=it%27s or similar).
  const safeUrl = shellEscapeForSingleQuote(url);
  const parts: string[] = [`curl -X ${method.toUpperCase()} '${safeUrl}'`];

  for (const [key, value] of Object.entries(safeHeaders)) {
    // Escape both key and value — header names rarely contain quotes but
    // non-sensitive values (e.g. custom metadata headers) might.
    const safeKey = shellEscapeForSingleQuote(key);
    const safeValue = shellEscapeForSingleQuote(value);
    parts.push(`  -H '${safeKey}: ${safeValue}'`);
  }

  if (body) {
    const safeBody = shellEscapeForSingleQuote(body);
    parts.push(`  -d '${safeBody}'`);
  }

  return parts.join(' \\\n');
}

/**
 * Escapes a string for safe embedding inside a single-quoted shell argument.
 * The standard technique ends the current single-quoted string, emits a
 * literal single quote, then reopens the single-quoted string:
 *   `it's` → `it'\''s`
 */
function shellEscapeForSingleQuote(s: string): string {
  return s.replace(/'/g, "'\\''");
}
