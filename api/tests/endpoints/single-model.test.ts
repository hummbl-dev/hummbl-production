/**
 * Single model endpoint tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import app from '../../src/index.js';

describe('Single Model Endpoint', () => {
  beforeEach(() => {
    (globalThis as any).rateLimitMap = new Map();
  });

  describe('Valid Model Codes', () => {
    it('should return P1 model', async () => {
      const res = await app.request('/v1/models/P1');
      expect(res.status).toBe(200);
      
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.code).toBe('P1');
      expect(data.data.name).toBe('First Principles Framing');
    });

    it('should return DE1 model', async () => {
      const res = await app.request('/v1/models/DE1');
      expect(res.status).toBe(200);
      
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.code).toBe('DE1');
      // Verify it's a decomposition model by checking the code prefix
      expect(data.data.code).toMatch(/^DE/);
    });

    it('should handle lowercase codes', async () => {
      const res = await app.request('/v1/models/p1');
      expect(res.status).toBe(200);
      
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.code).toBe('P1');
    });

    it('should return model with all required fields', async () => {
      const res = await app.request('/v1/models/P1');
      const data = await res.json();
      
      expect(data.data).toHaveProperty('code');
      expect(data.data).toHaveProperty('name');
      expect(data.data).toHaveProperty('definition');
      expect(data.data).toHaveProperty('priority');
    });
  });

  describe('Invalid Model Codes', () => {
    it('should return 404 for non-existent model', async () => {
      const res = await app.request('/v1/models/INVALID');
      expect(res.status).toBe(404);
      
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Model not found');
    });

    it('should return 404 for empty code', async () => {
      const res = await app.request('/v1/models/');
      expect(res.status).toBe(404);
    });

    it('should return 404 for malformed code', async () => {
      const res = await app.request('/v1/models/XYZ999');
      expect(res.status).toBe(404);
    });
  });
});
