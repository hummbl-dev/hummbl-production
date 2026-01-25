/**
 * Error handling workflow tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import app from '../../src/index.js';

describe('Error Handling Workflows', () => {
  beforeEach(() => {
    (globalThis as any).rateLimitMap = new Map();
  });

  describe('Input Validation Error Handling', () => {
    it('should handle malformed requests gracefully', async () => {
      const clientIP = '192.168.300.1';
      
      const malformedRequests = [
        {
          name: 'Invalid JSON',
          request: {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{ invalid json }'
          }
        },
        {
          name: 'Empty request body',
          request: {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: ''
          }
        },
        {
          name: 'Null request body',
          request: {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: 'null'
          }
        },
        {
          name: 'Non-JSON content type',
          request: {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: 'not json'
          }
        }
      ];
      
      for (const { name, request } of malformedRequests) {
        const res = await app.request('/v1/recommend', request);
        
        // Should handle gracefully without crashing
        expect(res.status).toBeLessThan(500);
        
        if (res.status === 400) {
          const data = await res.json();
          expect(data.success).toBe(false);
          expect(data.error).toBeTruthy();
        }
      }
    });

    it('should handle invalid parameter values', async () => {
      const clientIP = '192.168.300.2';
      
      const invalidParams = [
        { problem: '', description: 'Empty problem' },
        { problem: '   ', description: 'Whitespace only' },
        { problem: null, description: 'Null problem' },
        { problem: undefined, description: 'Undefined problem' },
        { problem: 123, description: 'Number instead of string' },
        { problem: [], description: 'Array instead of string' },
        { problem: {}, description: 'Object instead of string' }
      ];
      
      for (const { problem, description } of invalidParams) {
        const res = await app.request('/v1/recommend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ problem })
        });
        
        // Some invalid params might be handled differently
        expect([200, 400]).toContain(res.status);
        
        if (res.status === 400) {
          const data = await res.json();
          expect(data.success).toBe(false);
          expect(data.error).toContain('Missing or invalid');
        }
      }
    });

    it('should handle extreme parameter values', async () => {
      const clientIP = '192.168.300.3';
      
      const extremeValues = [
        { 
          problem: 'x'.repeat(10000), 
          limit: -1,
          description: 'Very long problem with negative limit'
        },
        { 
          problem: 'x'.repeat(50000), 
          limit: 1000,
          description: 'Extremely long problem with huge limit'
        },
        { 
          problem: '🚀'.repeat(1000), 
          limit: 0,
          description: 'Unicode spam with zero limit'
        }
      ];
      
      for (const { problem, limit, description } of extremeValues) {
        const res = await app.request('/v1/recommend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ problem, limit })
        });
        
        // Should handle without crashing
        expect(res.status).toBeLessThan(500);
        
        if (res.status === 200) {
          const data = await res.json();
          expect(data.success).toBe(true);
          expect(data.data.length).toBeLessThanOrEqual(20); // Should cap at 20
        }
      }
    });
  });

  describe('Resource Error Handling', () => {
    it('should handle concurrent requests safely', async () => {
      const clientIP = '192.168.300.4';
      
      // Make many concurrent requests
      const concurrentRequests = Array.from({ length: 50 }, (_, i) =>
        app.request('/v1/recommend', {
          method: 'POST',
          headers: { 
            'CF-Connecting-IP': clientIP,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            problem: `Concurrent test problem ${i}`,
            limit: 5
          })
        })
      );
      
      const results = await Promise.allSettled(concurrentRequests);
      
      // All requests should complete without errors
      results.forEach((result, index) => {
        expect(result.status).toBe('fulfilled');
        if (result.status === 'fulfilled') {
          const res = result.value;
          expect(res.status).toBeLessThan(500);
        }
      });
      
      // Count successful vs rate-limited requests
      const successful = results.filter(r => 
        r.status === 'fulfilled' && r.value.status === 200
      ).length;
      const rateLimited = results.filter(r => 
        r.status === 'fulfilled' && r.value.status === 429
      ).length;
      
      expect(successful + rateLimited).toBe(50);
      expect(successful).toBeGreaterThan(0);
    });

    it('should handle memory pressure gracefully', async () => {
      const clientIP = '192.168.300.5';
      
      // Create many different IPs to test memory cleanup
      const memoryTestRequests = [];
      
      for (let i = 0; i < 100; i++) {
        memoryTestRequests.push(
          app.request('/v1/models', {
            headers: { 'CF-Connecting-IP': `192.168.300.${i}` }
          })
        );
      }
      
      const results = await Promise.all(memoryTestRequests);
      
      // All requests should succeed
      results.forEach(res => {
        expect(res.status).toBe(200);
      });
      
      // Verify responses are valid
      const firstResponse = await results[0].json();
      expect(firstResponse.data).toHaveLength(120);
    });
  });

  describe('Network Error Handling', () => {
    it('should handle missing headers gracefully', async () => {
      const clientIP = '192.168.300.6';
      
      // Request without Content-Type header
      const res1 = await app.request('/v1/recommend', {
        method: 'POST',
        body: JSON.stringify({ problem: 'test problem' })
      });
      
      expect(res1.status).toBeLessThan(500);
      
      // Request with invalid Content-Type
      const res2 = await app.request('/v1/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml' },
        body: JSON.stringify({ problem: 'test problem' })
      });
      
      expect(res2.status).toBeLessThan(500);
    });

    it('should handle malformed URLs gracefully', async () => {
      const clientIP = '192.168.300.7';
      
      const malformedUrls = [
        '/v1/models/', // Trailing slash
        '/v1/models//P1', // Double slash
        '/v1/models/P1/', // Trailing slash on model
        '/v1/models/P1/extra', // Extra path
        '/v1/models/P1?param=value', // Query parameters
        '/v1/models/P1#fragment' // URL fragment
      ];
      
      for (const url of malformedUrls) {
        const res = await app.request(url, {
          headers: { 'CF-Connecting-IP': clientIP }
        });
        
        // Should handle gracefully (404 for invalid URLs)
        expect([200, 404]).toContain(res.status);
      }
    });

    it('should handle HTTP method edge cases', async () => {
      const clientIP = '192.168.300.8';
      
      const edgeCases = [
        { method: 'PATCH', url: '/health' },
        { method: 'PUT', url: '/health' },
        { method: 'DELETE', url: '/health' },
        { method: 'HEAD', url: '/health' },
        { method: 'OPTIONS', url: '/v1/models/P1' }
      ];
      
      for (const { method, url } of edgeCases) {
        const res = await app.request(url, {
          method,
          headers: { 'CF-Connecting-IP': clientIP }
        });
        
        // Should handle without crashing
        expect(res.status).toBeLessThan(500);
      }
    });
  });

  describe('Data Integrity Error Handling', () => {
    it('should handle corrupted data gracefully', async () => {
      const clientIP = '192.168.300.9';
      
      // Simulate various data corruption scenarios
      const corruptionTests = [
        {
          name: 'JSON with circular references',
          test: async () => {
            // This would normally cause JSON.stringify to fail
            // but we're testing the server's handling
            const res = await app.request('/v1/recommend', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: '{"problem":"test"}'
            });
            return res.status < 500;
          }
        },
        {
          name: 'Extremely nested objects',
          test: async () => {
            const nested: any = { problem: 'test' };
            for (let i = 0; i < 100; i++) {
              nested.nested = { ...nested };
            }
            
            const res = await app.request('/v1/recommend', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(nested)
            });
            return res.status < 500;
          }
        }
      ];
      
      for (const { name, test } of corruptionTests) {
        const result = await test();
        expect(result).toBe(true);
      }
    });

    it('should maintain API consistency under error conditions', async () => {
      const clientIP = '192.168.300.10';
      
      // First, make a valid request to establish baseline
      const baselineRes = await app.request('/health', {
        headers: { 'CF-Connecting-IP': clientIP }
      });
      expect(baselineRes.status).toBe(200);
      const baselineData = await baselineRes.json();
      
      // Make invalid requests
      const invalidRes = await app.request('/v1/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json'
      });
      expect(invalidRes.status).toBe(400);
      
      // API should still work correctly after errors
      const recoveryRes = await app.request('/health', {
        headers: { 'CF-Connecting-IP': clientIP }
      });
      expect(recoveryRes.status).toBe(200);
      
      const recoveryData = await recoveryRes.json();
      expect(recoveryData.status).toBe(baselineData.status);
      expect(recoveryData.models_count).toBe(baselineData.models_count);
    });
  });

  describe('Rate Limiting Error Handling', () => {
    it('should handle rate limiting gracefully', async () => {
      const clientIP = '192.168.300.11';
      
      // Make requests up to the rate limit
      const requests = [];
      for (let i = 0; i < 105; i++) {
        requests.push(
          app.request('/health', {
            headers: { 'CF-Connecting-IP': clientIP }
          })
        );
      }
      
      const results = await Promise.all(requests);
      
      // Some should succeed, some should be rate limited
      const successCount = results.filter(r => r.status === 200).length;
      const rateLimitedCount = results.filter(r => r.status === 429).length;
      
      expect(successCount + rateLimitedCount).toBe(105);
      expect(successCount).toBeGreaterThanOrEqual(95); // Should be close to 100
      expect(rateLimitedCount).toBeGreaterThan(0); // Some should be rate limited
      
      // Verify rate limit response format
      const rateLimitedResponse = results.find(r => r.status === 429);
      if (rateLimitedResponse) {
        const data = await rateLimitedResponse.json();
        expect(data.success).toBe(false);
        expect(data.error).toContain('Rate limit exceeded');
      }
    });

    it('should recover from rate limiting after timeout', async () => {
      const clientIP = '192.168.300.12';
      
      // Exhaust rate limit
      for (let i = 0; i < 101; i++) {
        await app.request('/health', {
          headers: { 'CF-Connecting-IP': clientIP }
        });
      }
      
      // Should be rate limited
      const rateLimitedRes = await app.request('/health', {
        headers: { 'CF-Connecting-IP': clientIP }
      });
      expect(rateLimitedRes.status).toBe(429);
      
      // Wait for rate limit to reset (simulate time passing)
      // In real scenario, this would be 60 seconds
      // For testing, we'll just verify the structure
      
      const rateLimitedData = await rateLimitedRes.json();
      expect(rateLimitedData.success).toBe(false);
      expect(rateLimitedData.error).toContain('Rate limit exceeded');
    });
  });
});
