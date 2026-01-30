/**
 * Tests for workflow and semantic search endpoints
 */

import { describe, it, expect, beforeEach } from 'vitest';
import app from '../../src/index.js';

describe('Workflow Endpoints', () => {
  beforeEach(() => {
    (globalThis as any).rateLimitMap = new Map();
  });

  describe('GET /v1/workflows', () => {
    it('should return all workflows', async () => {
      const res = await app.request('/v1/workflows', {
        headers: { 'CF-Connecting-IP': '192.168.1.1' },
      });

      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.success).toBe(true);
      expect(data.data).toBeInstanceOf(Array);
      expect(data.count).toBeGreaterThan(0);
      expect(data.data.length).toBe(data.count);

      // Verify workflow structure
      const workflow = data.data[0];
      expect(workflow).toHaveProperty('id');
      expect(workflow).toHaveProperty('name');
      expect(workflow).toHaveProperty('description');
      expect(workflow).toHaveProperty('problemTypes');
      expect(workflow).toHaveProperty('steps');
      expect(workflow.steps).toBeInstanceOf(Array);
    });
  });

  describe('GET /v1/workflows/:id', () => {
    it('should return specific workflow by ID', async () => {
      const res = await app.request('/v1/workflows/strategic-decision', {
        headers: { 'CF-Connecting-IP': '192.168.1.1' },
      });

      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.success).toBe(true);
      expect(data.data.id).toBe('strategic-decision');
      expect(data.data.name).toBe('Strategic Decision Making');
      expect(data.data.steps.length).toBeGreaterThan(0);
    });

    it('should return 404 for non-existent workflow', async () => {
      const res = await app.request('/v1/workflows/non-existent', {
        headers: { 'CF-Connecting-IP': '192.168.1.1' },
      });

      expect(res.status).toBe(404);
      const data = await res.json();

      expect(data.success).toBe(false);
      expect(data.error).toContain('not found');
    });
  });

  describe('POST /v1/workflows/match', () => {
    it('should match workflows to problem description', async () => {
      const res = await app.request('/v1/workflows/match', {
        method: 'POST',
        headers: {
          'CF-Connecting-IP': '192.168.1.1',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          problem: 'I need to make a strategic decision about our product direction',
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.success).toBe(true);
      expect(data.data).toBeInstanceOf(Array);
      expect(data.count).toBeGreaterThan(0);

      // Strategic decision should match
      const matchedIds = data.data.map((w: any) => w.id);
      expect(matchedIds).toContain('strategic-decision');
    });

    it('should respect limit parameter', async () => {
      const res = await app.request('/v1/workflows/match', {
        method: 'POST',
        headers: {
          'CF-Connecting-IP': '192.168.1.1',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          problem: 'complex problem with many aspects',
          limit: 2,
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.data.length).toBeLessThanOrEqual(2);
    });

    it('should return 400 for missing problem', async () => {
      const res = await app.request('/v1/workflows/match', {
        method: 'POST',
        headers: {
          'CF-Connecting-IP': '192.168.1.1',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const data = await res.json();

      expect(data.success).toBe(false);
      expect(data.error).toContain('problem');
    });
  });
});

describe('Semantic Search Endpoint', () => {
  beforeEach(() => {
    (globalThis as any).rateLimitMap = new Map();
  });

  describe('POST /v1/semantic-search', () => {
    it('should return 503 or handle gracefully when Pinecone not configured', async () => {
      // Without env bindings, semantic search should gracefully fail
      const res = await app.request('/v1/semantic-search', {
        method: 'POST',
        headers: {
          'CF-Connecting-IP': '192.168.1.1',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: 'decision making under uncertainty',
        }),
      });

      // Should return either 503 (service unavailable) or handle error
      expect([400, 503]).toContain(res.status);
      const data = await res.json();
      expect(data.success).toBe(false);
    });

    it('should return 400 for missing query', async () => {
      const res = await app.request('/v1/semantic-search', {
        method: 'POST',
        headers: {
          'CF-Connecting-IP': '192.168.1.1',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const data = await res.json();

      expect(data.success).toBe(false);
      expect(data.error).toContain('query');
    });

    it('should return 400 for invalid body', async () => {
      const res = await app.request('/v1/semantic-search', {
        method: 'POST',
        headers: {
          'CF-Connecting-IP': '192.168.1.1',
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      });

      expect(res.status).toBe(400);
    });
  });
});

describe('API Info Update', () => {
  it('should include new endpoints in API info', async () => {
    const res = await app.request('/', {
      headers: { 'CF-Connecting-IP': '192.168.1.1' },
    });

    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.version).toBe('1.1.0');
    expect(data.endpoints).toHaveProperty('workflows');
    expect(data.endpoints).toHaveProperty('workflow');
    expect(data.endpoints).toHaveProperty('workflowMatch');
    expect(data.endpoints).toHaveProperty('semanticSearch');
  });
});
