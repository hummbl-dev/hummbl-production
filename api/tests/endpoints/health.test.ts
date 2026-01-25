/**
 * Health endpoint tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import app from '../../src/index.js';

describe('Health Endpoint', () => {
  beforeEach(() => {
    // Reset rate limiting map for clean tests
    (globalThis as any).rateLimitMap = new Map();
  });

  it('should return 200 status', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
  });

  it('should return correct response structure', async () => {
    const res = await app.request('/health');
    const data = await res.json();
    
    expect(data).toHaveProperty('status', 'healthy');
    expect(data).toHaveProperty('version', '1.0.0');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('uptime_ms');
    expect(data).toHaveProperty('models_count', 120);
    expect(data).toHaveProperty('rate_limit_status');
  });

  it('should include rate limit status', async () => {
    const res = await app.request('/health');
    const data = await res.json();
    
    expect(data.rate_limit_status).toHaveProperty('active_ips');
    expect(data.rate_limit_status).toHaveProperty('window_ms', 60000);
    expect(data.rate_limit_status).toHaveProperty('max_requests_per_minute', 100);
  });

  it('should have valid timestamp', async () => {
    const res = await app.request('/health');
    const data = await res.json();
    
    const timestamp = new Date(data.timestamp);
    expect(timestamp.getTime()).not.toBeNaN();
  });

  it('should track uptime correctly', async () => {
    const res = await app.request('/health');
    const data = await res.json();
    
    expect(data.uptime_ms).toBeGreaterThan(0);
    expect(typeof data.uptime_ms).toBe('number');
  });
});
