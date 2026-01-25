/**
 * Recommendations endpoint tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import app from '../../src/index.js';

describe('Recommendations Endpoint', () => {
  beforeEach(() => {
    (globalThis as any).rateLimitMap = new Map();
  });

  describe('Valid Requests', () => {
    it('should return recommendations for valid problem', async () => {
      const res = await app.request('/v1/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: 'I need to prioritize my tasks better',
        }),
      });

      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data).toBeInstanceOf(Array);
      expect(data.data.length).toBeGreaterThan(0);
    });

    it('should respect limit parameter', async () => {
      const res = await app.request('/v1/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: 'Help me think systematically',
          limit: 3,
        }),
      });

      const data = await res.json();
      expect(data.data.length).toBeLessThanOrEqual(3);
    });

    it('should return models with correct structure', async () => {
      const res = await app.request('/v1/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: 'I need to break down this complex problem',
        }),
      });

      const data = await res.json();
      if (data.data.length > 0) {
        const firstModel = data.data[0];
        expect(firstModel).toHaveProperty('code');
        expect(firstModel).toHaveProperty('name');
        expect(firstModel).toHaveProperty('definition');
        expect(firstModel).toHaveProperty('priority');
      }
    });

    it('should handle empty limit (defaults to 5)', async () => {
      const res = await app.request('/v1/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: 'I need creative solutions',
        }),
      });

      const data = await res.json();
      expect(data.data.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Invalid Requests', () => {
    it('should return 400 for missing problem', async () => {
      const res = await app.request('/v1/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Missing or invalid');
    });

    it('should return 400 for invalid problem type', async () => {
      const res = await app.request('/v1/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: 123,
        }),
      });

      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Missing or invalid');
    });

    it('should return 400 for empty problem string', async () => {
      const res = await app.request('/v1/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: '',
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid JSON', async () => {
      const res = await app.request('/v1/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      expect(res.status).toBe(400);
    });

    it('should handle negative limit', async () => {
      const res = await app.request('/v1/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: 'I need help with decision making',
          limit: -1,
        }),
      });

      const data = await res.json();
      expect(data.data.length).toBeLessThanOrEqual(5); // Should default to 5
    });

    it('should handle very large limit', async () => {
      const res = await app.request('/v1/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: 'I need systematic thinking approach',
          limit: 100,
        }),
      });

      const data = await res.json();
      expect(data.data.length).toBeLessThanOrEqual(20); // Should cap at 20
    });
  });
});
