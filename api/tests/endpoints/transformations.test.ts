/**
 * Transformations endpoint tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import app from '../../src/index.js';

describe('Transformations Endpoint', () => {
  beforeEach(() => {
    (globalThis as any).rateLimitMap = new Map();
  });

  it('should return all transformations', async () => {
    const res = await app.request('/v1/transformations');
    expect(res.status).toBe(200);
    
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data).toBeInstanceOf(Array);
    expect(data.data).toHaveLength(6);
  });

  it('should return transformations with correct structure', async () => {
    const res = await app.request('/v1/transformations');
    const data = await res.json();
    
    data.data.forEach((transformation: any) => {
      expect(transformation).toHaveProperty('key');
      expect(transformation).toHaveProperty('name');
      expect(transformation).toHaveProperty('description');
      expect(transformation).toHaveProperty('model_count');
      expect(typeof transformation.model_count).toBe('number');
      expect(transformation.model_count).toBeGreaterThan(0);
    });
  });

  it('should include all expected transformation keys', async () => {
    const res = await app.request('/v1/transformations');
    const data = await res.json();
    
    const keys = data.data.map((t: any) => t.key);
    const expectedKeys = ['P', 'IN', 'CO', 'DE', 'RE', 'SY'];
    
    expectedKeys.forEach(key => {
      expect(keys).toContain(key);
    });
  });

  it('should have transformation names', async () => {
    const res = await app.request('/v1/transformations');
    const data = await res.json();
    
    data.data.forEach((transformation: any) => {
      expect(transformation.name).toBeTruthy();
      expect(typeof transformation.name).toBe('string');
      expect(transformation.name.length).toBeGreaterThan(0);
    });
  });

  it('should have descriptions', async () => {
    const res = await app.request('/v1/transformations');
    const data = await res.json();
    
    data.data.forEach((transformation: any) => {
      expect(transformation.description).toBeTruthy();
      expect(typeof transformation.description).toBe('string');
      expect(transformation.description.length).toBeGreaterThan(0);
    });
  });
});
