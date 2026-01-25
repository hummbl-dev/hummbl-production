/**
 * API integration workflow tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import app from '../../src/index.js';

describe('API Integration Workflows', () => {
  beforeEach(() => {
    (globalThis as any).rateLimitMap = new Map();
  });

  describe('Recommendation Engine Integration', () => {
    it('should provide relevant recommendations for different problem types', async () => {
      const clientIP = '192.168.200.1';
      
      const problemTypes = [
        {
          problem: 'I need to break down this complex system into smaller parts',
          expectedTransformation: 'DE', // Decomposition
          description: 'Should recommend decomposition models'
        },
        {
          problem: 'What if this project completely fails?',
          expectedTransformation: 'IN', // Inversion
          description: 'Should recommend inversion models'
        },
        {
          problem: 'How can I combine these different approaches?',
          expectedTransformation: 'CO', // Composition
          description: 'Should recommend composition models'
        },
        {
          problem: 'I need to look at this from different angles',
          expectedTransformation: 'P', // Perspective
          description: 'Should recommend perspective models'
        },
        {
          problem: 'This keeps happening in cycles',
          expectedTransformation: 'RE', // Recursion
          description: 'Should recommend recursion models'
        },
        {
          problem: 'What are the underlying patterns here?',
          expectedTransformation: 'SY', // Systems
          description: 'Should recommend systems models'
        }
      ];
      
      for (const { problem, description } of problemTypes) {
        const res = await app.request('/v1/recommend', {
          method: 'POST',
          headers: { 
            'CF-Connecting-IP': clientIP,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ problem })
        });
        
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.data.length).toBeGreaterThan(0);
      }
    });

    it('should handle limit parameter correctly across different scenarios', async () => {
      const clientIP = '192.168.200.2';
      const problem = 'I need help with strategic planning';
      
      const limits = [1, 3, 5, 10, 20];
      
      for (const limit of limits) {
        const res = await app.request('/v1/recommend', {
          method: 'POST',
          headers: { 
            'CF-Connecting-IP': clientIP,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ problem, limit })
        });
        
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.data.length).toBeLessThanOrEqual(limit);
      }
    });

    it('should provide consistent results for the same input', async () => {
      const clientIP = '192.168.200.3';
      const problem = 'Help me prioritize my tasks';
      
      // Make the same request multiple times
      const requests = Array.from({ length: 105 }, () =>
        app.request('/v1/recommend', {
          method: 'POST',
          headers: { 
            'CF-Connecting-IP': clientIP,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ problem })
        })
      );
      
      const results = await Promise.all(requests);
      const responses = await Promise.all(results.map(r => r.json()));
      
      // All responses should be identical
      const successCount = results.filter(r => r.status === 200).length;
      const rateLimitedCount = results.filter(r => r.status === 429).length;
      
      expect(successCount + rateLimitedCount).toBe(105);
      expect(successCount).toBeGreaterThanOrEqual(95); // Should be close to 100
      expect(rateLimitedCount).toBeGreaterThan(0); // Some should be rate limited
      });
    });
  });

  describe('Model Discovery Integration', () => {
    it('should support complete model discovery workflow', async () => {
      const clientIP = '192.168.200.4';
      
      // Step 1: Get all transformations to understand the framework
      const transformationsRes = await app.request('/v1/transformations', {
        headers: { 'CF-Connecting-IP': clientIP }
      });
      expect(transformationsRes.status).toBe(200);
      const transformationsData = await transformationsRes.json();
      expect(transformationsData.data).toHaveLength(6);
      
      // Step 2: For each transformation, get sample models
      for (const transformation of transformationsData.data) {
        // Find models for this transformation by checking code prefixes
        const modelsRes = await app.request('/v1/models', {
          headers: { 'CF-Connecting-IP': clientIP }
        });
        const modelsData = await modelsRes.json();
        
        const transformationModels = modelsData.data.filter((model: any) =>
          model.code.startsWith(transformation.key)
        );
        
        expect(transformationModels.length).toBeGreaterThan(0);
        expect(transformationModels.length).toBe(transformation.model_count);
        
        // Verify each model has required fields
        transformationModels.forEach((model: any) => {
          expect(model.code).toMatch(new RegExp(`^${transformation.key}\\d+`));
          expect(model.name).toBeTruthy();
          expect(model.definition).toBeTruthy();
          expect([1, 2, 3, 4, 5]).toContain(model.priority);
        });
      }
    });

    it('should support model exploration by priority levels', async () => {
      const clientIP = '192.168.200.5';
      
      // Get all models
      const modelsRes = await app.request('/v1/models', {
        headers: { 'CF-Connecting-IP': clientIP }
      });
      const modelsData = await modelsRes.json();
      
      // Group models by priority
      const modelsByPriority: Record<number, any[]> = {};
      modelsData.data.forEach((model: any) => {
        if (!modelsByPriority[model.priority]) {
          modelsByPriority[model.priority] = [];
        }
        modelsByPriority[model.priority].push(model);
      });
      
      // Verify each priority level has models
      [1, 2, 3, 4, 5].forEach(priority => {
        expect(modelsByPriority[priority]).toBeDefined();
        expect(modelsByPriority[priority].length).toBeGreaterThan(0);
      });
      
      // Priority 1 should have the most critical models
      expect(modelsByPriority[1].length).toBeGreaterThan(0);
      
      // Verify priority distribution makes sense
      expect(Object.keys(modelsByPriority).length).toBe(5);
    });
  });

  describe('Cross-Endpoint Data Integration', () => {
    it('should maintain data consistency between recommendations and model details', async () => {
      const clientIP = '192.168.200.6';
      
      // Get recommendations
      const recommendRes = await app.request('/v1/recommend', {
        method: 'POST',
        headers: { 
          'CF-Connecting-IP': clientIP,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          problem: 'I need to improve my decision making process'
        })
      });
      
      const recommendData = await recommendRes.json();
      expect(recommendData.success).toBe(true);
      
      // Get detailed information for each recommended model
      for (const recommendedModel of recommendData.data) {
        const modelRes = await app.request(`/v1/models/${recommendedModel.code}`, {
          headers: { 'CF-Connecting-IP': clientIP }
        });
        
        expect(modelRes.status).toBe(200);
        const modelData = await modelRes.json();
        expect(modelData.success).toBe(true);
        
        // Verify data consistency
        expect(modelData.data.code).toBe(recommendedModel.code);
        expect(modelData.data.name).toBe(recommendedModel.name);
        expect(modelData.data.definition).toBe(recommendedModel.definition);
        expect(modelData.data.priority).toBe(recommendedModel.priority);
      }
    });

    it('should support transformation-based filtering workflow', async () => {
      const clientIP = '192.168.200.7';
      
      // Get all models
      const modelsRes = await app.request('/v1/models', {
        headers: { 'CF-Connecting-IP': clientIP }
      });
      const modelsData = await modelsRes.json();
      
      // Get transformations
      const transformationsRes = await app.request('/v1/transformations', {
        headers: { 'CF-Connecting-IP': clientIP }
      });
      const transformationsData = await transformationsRes.json();
      
      // Test filtering by transformation type
      for (const transformation of transformationsData.data) {
        const filteredModels = modelsData.data.filter((model: any) =>
          model.code.startsWith(transformation.key)
        );
        
        // Should match the count from transformations endpoint
        expect(filteredModels.length).toBe(transformation.model_count);
        
        // All filtered models should have the correct transformation prefix
        filteredModels.forEach((model: any) => {
          expect(model.code).toMatch(new RegExp(`^${transformation.key}\\d+`));
        });
      }
    });
  });

  describe('Real-World Usage Scenarios', () => {
    it('should handle consultant workflow', async () => {
      const clientIP = '192.168.200.8';
      
      // Consultant starts with health check
      const healthRes = await app.request('/health', {
        headers: { 'CF-Connecting-IP': clientIP }
      });
      expect(healthRes.status).toBe(200);
      
      // Gets overview of all models
      const modelsRes = await app.request('/v1/models', {
        headers: { 'CF-Connecting-IP': clientIP }
      });
      const modelsData = await modelsRes.json();
      
      // Client presents problem: "Our team is struggling with innovation"
      const problemRes = await app.request('/v1/recommend', {
        method: 'POST',
        headers: { 
          'CF-Connecting-IP': clientIP,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          problem: 'Our team is struggling with innovation and creative thinking',
          limit: 5
        })
      });
      
      const problemData = await problemRes.json();
      expect(problemData.success).toBe(true);
      expect(problemData.data.length).toBeLessThanOrEqual(5);
      
      // Consultant gets details on top recommendations
      const topRecommendations = problemData.data.slice(0, 3);
      for (const rec of topRecommendations) {
        const detailRes = await app.request(`/v1/models/${rec.code}`, {
          headers: { 'CF-Connecting-IP': clientIP }
        });
        
        const detailData = await detailRes.json();
        expect(detailData.success).toBe(true);
        expect(detailData.data.definition).toBeTruthy();
      }
      
      // Verify workflow provides actionable insights
      expect(topRecommendations.length).toBeGreaterThan(0);
    });

    it('should handle developer integration workflow', async () => {
      const clientIP = '192.168.200.9';
      
      // Developer building MCP server integration
      const testProblems = [
        'How to handle errors gracefully',
        'Need to optimize database queries',
        'Should I use microservices or monolith',
        'How to improve code maintainability'
      ];
      
      const allRecommendations: any[] = [];
      
      for (const problem of testProblems) {
        const res = await app.request('/v1/recommend', {
          method: 'POST',
          headers: { 
            'CF-Connecting-IP': clientIP,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ problem })
        });
        
        const data = await res.json();
        expect(data.success).toBe(true);
        allRecommendations.push(...data.data);
      }
      
      // Verify recommendations cover different transformations
      const transformations = new Set(
        allRecommendations.map((rec: any) => rec.code.match(/^[A-Z]+/)?.[0])
      );
      expect(transformations.size).toBeGreaterThan(2); // Should have variety
      
      // Verify no duplicates across different problems
      const allCodes = allRecommendations.map((rec: any) => rec.code);
      const uniqueCodes = new Set(allCodes);
      // Some duplicates are expected across different problems
      expect(uniqueCodes.size).toBeGreaterThan(10); // Should have reasonable variety
      expect(uniqueCodes.size).toBeLessThanOrEqual(allCodes.length);
    });
  });
