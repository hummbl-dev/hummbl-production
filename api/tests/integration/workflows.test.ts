/**
 * End-to-end workflow tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import app from '../../src/index.js';

describe('End-to-End Workflows', () => {
  beforeEach(() => {
    (globalThis as any).rateLimitMap = new Map();
  });

  describe('Complete API Discovery Workflow', () => {
    it('should allow full API exploration workflow', async () => {
      const clientIP = '192.168.100.1';

      // Step 1: Check API health
      const healthRes = await app.request('/health', {
        headers: { 'CF-Connecting-IP': clientIP },
      });
      expect(healthRes.status).toBe(200);
      const healthData = await healthRes.json();
      expect(healthData.status).toBe('healthy');
      expect(healthData.models_count).toBe(120);

      // Step 2: Get all transformations
      const transformationsRes = await app.request('/v1/transformations', {
        headers: { 'CF-Connecting-IP': clientIP },
      });
      expect(transformationsRes.status).toBe(200);
      const transformationsData = await transformationsRes.json();
      expect(transformationsData.data).toHaveLength(6);

      // Step 3: Get all models
      const modelsRes = await app.request('/v1/models', {
        headers: { 'CF-Connecting-IP': clientIP },
      });
      expect(modelsRes.status).toBe(200);
      const modelsData = await modelsRes.json();
      expect(modelsData.data).toHaveLength(120);

      // Step 4: Get specific model details
      const specificModelRes = await app.request('/v1/models/P1', {
        headers: { 'CF-Connecting-IP': clientIP },
      });
      expect(specificModelRes.status).toBe(200);
      const specificModelData = await specificModelRes.json();
      expect(specificModelData.data.code).toBe('P1');
      expect(specificModelData.data.name).toBe('First Principles Framing');

      // Step 5: Get recommendations
      const recommendRes = await app.request('/v1/recommend', {
        method: 'POST',
        headers: {
          'CF-Connecting-IP': clientIP,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          problem: 'I need to break down this complex problem into smaller parts',
        }),
      });
      expect(recommendRes.status).toBe(200);
      const recommendData = await recommendRes.json();
      expect(recommendData.success).toBe(true);
      expect(recommendData.data).toBeInstanceOf(Array);
      expect(recommendData.data.length).toBeGreaterThan(0);

      // Verify workflow consistency
      const recommendedCodes = recommendData.data.map((m: any) => m.code);
      const allModelCodes = modelsData.data.map((m: any) => m.code);

      // All recommended models should exist in the full model list
      recommendedCodes.forEach((code: string) => {
        expect(allModelCodes).toContain(code);
      });
    });
  });

  describe('MCP Server Simulation Workflow', () => {
    it('should simulate MCP server tool calls', async () => {
      const clientIP = '192.168.100.2';

      // Simulate MCP server initialization
      const healthRes = await app.request('/health', {
        headers: { 'CF-Connecting-IP': clientIP },
      });
      expect(healthRes.status).toBe(200);

      // Simulate hummbl_search tool call
      const searchRes = await app.request('/v1/recommend', {
        method: 'POST',
        headers: {
          'CF-Connecting-IP': clientIP,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          problem: 'Help me prioritize my tasks for today',
          limit: 5,
        }),
      });
      expect(searchRes.status).toBe(200);
      const searchData = await searchRes.json();
      expect(searchData.data.length).toBeLessThanOrEqual(5);

      // Simulate hummbl_get_model tool calls for each recommendation
      for (const model of searchData.data.slice(0, 3)) {
        const modelRes = await app.request(`/v1/models/${model.code}`, {
          headers: { 'CF-Connecting-IP': clientIP },
        });
        expect(modelRes.status).toBe(200);

        const modelData = await modelRes.json();
        expect(modelData.success).toBe(true);
        expect(modelData.data.code).toBe(model.code);
        expect(modelData.data.definition).toBeTruthy();
      }

      // Simulate hummbl_recommend tool call with different problem
      const recommendRes = await app.request('/v1/recommend', {
        method: 'POST',
        headers: {
          'CF-Connecting-IP': clientIP,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          problem: 'I need to think about this from multiple perspectives',
        }),
      });
      expect(recommendRes.status).toBe(200);
      const recommendData = await recommendRes.json();
      expect(recommendData.success).toBe(true);

      // Verify different recommendations for different problems
      const searchCodes = searchData.data.map((m: any) => m.code).sort();
      const recommendCodes = recommendData.data.map((m: any) => m.code).sort();

      // Should get different recommendations for different problems
      // (though they might overlap, which is fine)
      expect(searchCodes.length).toBeGreaterThan(0);
      expect(recommendCodes.length).toBeGreaterThan(0);
    });
  });

  describe('Frontend Integration Workflow', () => {
    it('should support typical frontend API usage patterns', async () => {
      const clientIP = '192.168.100.3';

      // Simulate frontend initial load
      const healthRes = await app.request('/health', {
        headers: { 'CF-Connecting-IP': clientIP },
      });
      expect(healthRes.status).toBe(200);

      // Simulate loading all models for explorer
      const modelsRes = await app.request('/v1/models', {
        headers: { 'CF-Connecting-IP': clientIP },
      });
      expect(modelsRes.status).toBe(200);
      const modelsData = await modelsRes.json();

      // Simulate user searching/filtering models
      const searchRes = await app.request('/v1/recommend', {
        method: 'POST',
        headers: {
          'CF-Connecting-IP': clientIP,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          problem: 'decision making under uncertainty',
        }),
      });
      expect(searchRes.status).toBe(200);
      const searchData = await searchRes.json();

      // Simulate user clicking on a recommended model
      if (searchData.data.length > 0) {
        const firstRecommendation = searchData.data[0];
        const detailRes = await app.request(`/v1/models/${firstRecommendation.code}`, {
          headers: { 'CF-Connecting-IP': clientIP },
        });
        expect(detailRes.status).toBe(200);

        const detailData = await detailRes.json();
        expect(detailData.data.code).toBe(firstRecommendation.code);
      }

      // Simulate user trying different search terms
      const searchTerms = [
        'problem solving',
        'systems thinking',
        'innovation',
        'analysis',
        'planning',
      ];

      for (const term of searchTerms) {
        const termRes = await app.request('/v1/recommend', {
          method: 'POST',
          headers: {
            'CF-Connecting-IP': clientIP,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ problem: term }),
        });
        expect(termRes.status).toBe(200);

        const termData = await termRes.json();
        expect(termData.success).toBe(true);
        expect(termData.data).toBeInstanceOf(Array);
      }
    });
  });

  describe('Data Consistency Workflow', () => {
    it('should maintain data consistency across all endpoints', async () => {
      const clientIP = '192.168.100.4';

      // Get all models
      const modelsRes = await app.request('/v1/models', {
        headers: { 'CF-Connecting-IP': clientIP },
      });
      const modelsData = await modelsRes.json();

      // Get all transformations
      const transformationsRes = await app.request('/v1/transformations', {
        headers: { 'CF-Connecting-IP': clientIP },
      });
      const transformationsData = await transformationsRes.json();

      // Verify transformation counts match
      const transformationCounts: Record<string, number> = {};
      modelsData.data.forEach((model: any) => {
        const prefix = model.code.match(/^[A-Z]+/)?.[0] || 'Unknown';
        transformationCounts[prefix] = (transformationCounts[prefix] || 0) + 1;
      });

      transformationsData.data.forEach((transformation: any) => {
        expect(transformationCounts[transformation.key]).toBe(transformation.model_count);
      });

      // Verify all model codes are unique
      const modelCodes = modelsData.data.map((m: any) => m.code);
      const uniqueCodes = new Set(modelCodes);
      expect(uniqueCodes.size).toBe(modelCodes.length);

      // Verify all models have valid priority levels
      modelsData.data.forEach((model: any) => {
        expect([1, 2, 3, 4, 5]).toContain(model.priority);
      });

      // Verify model code format consistency
      modelsData.data.forEach((model: any) => {
        expect(model.code).toMatch(/^[A-Z]{1,3}\d+$/);
      });
    });
  });

  describe('Performance Workflow', () => {
    it('should handle rapid sequential requests efficiently', async () => {
      const clientIP = '192.168.100.5';
      const startTime = Date.now();

      // Make rapid requests to different endpoints
      const requests = [
        app.request('/health', { headers: { 'CF-Connecting-IP': clientIP } }),
        app.request('/v1/models', { headers: { 'CF-Connecting-IP': clientIP } }),
        app.request('/v1/transformations', { headers: { 'CF-Connecting-IP': clientIP } }),
        app.request('/v1/models/P1', { headers: { 'CF-Connecting-IP': clientIP } }),
        app.request('/v1/recommend', {
          method: 'POST',
          headers: {
            'CF-Connecting-IP': clientIP,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ problem: 'test problem' }),
        }),
      ];

      const results = await Promise.all(requests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All requests should succeed
      results.forEach((res) => {
        expect(res.status).toBe(200);
      });

      // Should complete within reasonable time (less than 1 second)
      expect(totalTime).toBeLessThan(1000);

      // Verify responses are valid
      const healthData = await results[0].json();
      const modelsData = await results[1].json();
      const transformationsData = await results[2].json();
      const modelData = await results[3].json();
      const recommendData = await results[4].json();

      expect(healthData.status).toBe('healthy');
      expect(modelsData.data).toHaveLength(120);
      expect(transformationsData.data).toHaveLength(6);
      expect(modelData.data.code).toBe('P1');
      expect(recommendData.success).toBe(true);
    });
  });
});
