import { describe, it, expect } from 'vitest';
import { maskHeaders, toCurl } from '@/lib/debug/curl-generator';

describe('maskHeaders', () => {
  it('returns an empty object for empty input', () => {
    expect(maskHeaders({})).toEqual({});
  });

  it('passes through non-sensitive headers unchanged', () => {
    const input = { 'Content-Type': 'application/json', Accept: 'text/html' };
    expect(maskHeaders(input)).toEqual(input);
  });

  it('masks Authorization header', () => {
    expect(maskHeaders({ Authorization: 'Bearer secret' })).toEqual({
      Authorization: '[REDACTED]',
    });
  });

  it('masks authorization header case-insensitively', () => {
    expect(maskHeaders({ authorization: 'Bearer secret' })).toEqual({
      authorization: '[REDACTED]',
    });
  });

  it('masks X-Api-Key header', () => {
    expect(maskHeaders({ 'X-Api-Key': 'my-key' })).toEqual({
      'X-Api-Key': '[REDACTED]',
    });
  });

  it('masks Cookie header', () => {
    expect(maskHeaders({ Cookie: 'session=abc123' })).toEqual({
      Cookie: '[REDACTED]',
    });
  });

  it('masks Set-Cookie header', () => {
    expect(maskHeaders({ 'Set-Cookie': 'id=x; Path=/' })).toEqual({
      'Set-Cookie': '[REDACTED]',
    });
  });

  it('masks X-Auth-Token header', () => {
    expect(maskHeaders({ 'X-Auth-Token': 'tok123' })).toEqual({
      'X-Auth-Token': '[REDACTED]',
    });
  });

  it('masks X-Secret header', () => {
    expect(maskHeaders({ 'X-Secret': 'shh' })).toEqual({
      'X-Secret': '[REDACTED]',
    });
  });

  it('masks Proxy-Authorization header', () => {
    expect(maskHeaders({ 'Proxy-Authorization': 'Basic abc' })).toEqual({
      'Proxy-Authorization': '[REDACTED]',
    });
  });

  it('masks WWW-Authenticate header', () => {
    expect(maskHeaders({ 'WWW-Authenticate': 'Bearer realm="api"' })).toEqual({
      'WWW-Authenticate': '[REDACTED]',
    });
  });

  it('masks sensitive headers while preserving safe ones', () => {
    const result = maskHeaders({
      Authorization: 'Bearer token',
      'Content-Type': 'application/json',
      'X-Api-Key': 'key',
      Accept: '*/*',
    });
    expect(result['Authorization']).toBe('[REDACTED]');
    expect(result['X-Api-Key']).toBe('[REDACTED]');
    expect(result['Content-Type']).toBe('application/json');
    expect(result['Accept']).toBe('*/*');
  });

  it('does not mutate the original headers object', () => {
    const input = { Authorization: 'Bearer secret' };
    maskHeaders(input);
    expect(input.Authorization).toBe('Bearer secret');
  });
});

describe('toCurl', () => {
  it('generates a basic cURL command for GET', () => {
    const result = toCurl('https://example.com/api', 'GET', {});
    expect(result).toBe("curl -X GET 'https://example.com/api'");
  });

  it('generates a cURL command with headers', () => {
    const result = toCurl('https://example.com/api', 'POST', {
      'Content-Type': 'application/json',
    });
    expect(result).toContain("-H 'Content-Type: application/json'");
  });

  it('masks sensitive headers in the cURL output', () => {
    const result = toCurl('https://example.com', 'GET', {
      Authorization: 'Bearer super-secret',
      'X-Api-Key': 'my-key-12345',
    });
    expect(result).not.toContain('super-secret');
    expect(result).not.toContain('my-key-12345');
    expect(result).toContain('[REDACTED]');
  });

  it('includes the request body with -d flag', () => {
    const result = toCurl('https://example.com', 'POST', {}, '{"key":"value"}');
    expect(result).toContain("-d '{\"key\":\"value\"}'");
  });

  it('escapes single quotes in the body', () => {
    const result = toCurl('https://example.com', 'POST', {}, "it's a test");
    expect(result).toContain("-d 'it'\\''s a test'");
  });

  it('escapes single quotes in the URL', () => {
    const result = toCurl("https://example.com/it's", 'GET', {});
    expect(result).toContain("curl -X GET 'https://example.com/it'\\''s'");
  });

  it('escapes single quotes in header values', () => {
    const result = toCurl('https://example.com', 'GET', { 'X-Custom': "val'ue" });
    expect(result).toContain("X-Custom: val'\\''ue");
  });

  it('omits the body section when body is undefined', () => {
    const result = toCurl('https://example.com', 'GET', {});
    expect(result).not.toContain('-d');
  });
});
