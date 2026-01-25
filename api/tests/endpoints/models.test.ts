/**
 * Models endpoint tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import app from '../../src/index.js';

describe('Models Endpoint', () => {
  beforeEach(() => {
    (globalThis as any).rateLimitMap = new Map();
  });

  it('should return all models', async () => {
    const res = await app.request('/v1/models');
    expect(res.status).toBe(200);
    
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data).toBeInstanceOf(Array);
    expect(data.data).toHaveLength(120);
    expect(data.count).toBe(120);
  });

  it('should return models with correct structure', async () => {
    const res = await app.request('/v1/models');
    const data = await res.json();
    
    const firstModel = data.data[0];
    expect(firstModel).toHaveProperty('code');
    expect(firstModel).toHaveProperty('name');
    expect(firstModel).toHaveProperty('definition');
    expect(firstModel).toHaveProperty('priority');
  });

  it('should include all transformation types', async () => {
    // This test verifies that we have models from all transformation types
    // by checking the model codes which indicate their transformation
    const res = await app.request('/v1/models');
    const data = await res.json();
    
    const modelCodes = data.data.map((m: any) => m.code);
    
    // Check for models from each transformation type
    expect(modelCodes.some((code: string) => code.startsWith('P'))).toBe(true); // Perspective
    expect(modelCodes.some((code: string) => code.startsWith('IN'))).toBe(true); // Inversion
    expect(modelCodes.some((code: string) => code.startsWith('CO'))).toBe(true); // Composition
    expect(modelCodes.some((code: string) => code.startsWith('DE'))).toBe(true); // Decomposition
    expect(modelCodes.some((code: string) => code.startsWith('RE'))).toBe(true); // Recursion
    expect(modelCodes.some((code: string) => code.startsWith('SY'))).toBe(true); // Systems
  });

  it('should have valid model codes', async () => {
    const res = await app.request('/v1/models');
    const data = await res.json();
    
    data.data.forEach((model: any) => {
      expect(model.code).toMatch(/^[A-Z]{1,3}\d+$/);
    });
  });

  it('should have valid priority levels', async () => {
    const res = await app.request('/v1/models');
    const data = await res.json();
    
    data.data.forEach((model: any) => {
      expect([1, 2, 3, 4, 5]).toContain(model.priority);
    });
  });
});
