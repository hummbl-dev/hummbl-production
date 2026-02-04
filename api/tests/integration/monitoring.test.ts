/**
 * Monitoring & Observability Tests
 */
import { describe, it, expect } from 'vitest';

describe('Monitoring Endpoints', () => {
  const API_BASE = 'https://hummbl-api.hummbl.workers.dev';

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const res = await fetch(`${API_BASE}/health`);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.status).toBeDefined();
      expect(data.version).toBe('1.0.0');
      expect(data.models_count).toBe(120);
      expect(data.uptime_ms).toBeGreaterThan(0);
      expect(data.timestamp).toBeDefined();
      expect(data.rate_limit_status).toBeDefined();
    });

    it('should include rate limit status', async () => {
      const res = await fetch(`${API_BASE}/health`);
      const data = await res.json();

      expect(data.rate_limit_status).toHaveProperty('active_ips');
      expect(data.rate_limit_status).toHaveProperty('window_ms');
      expect(data.rate_limit_status).toHaveProperty('max_requests_per_minute');
    });
  });

  describe('GET /metrics', () => {
    it('should return detailed metrics', async () => {
      const res = await fetch(`${API_BASE}/metrics`);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.timestamp).toBeDefined();
      expect(data.metrics).toBeDefined();
      expect(data.alerts).toBeDefined();
    });

    it('should have request metrics structure', async () => {
      const res = await fetch(`${API_BASE}/metrics`);
      const data = await res.json();

      expect(data.metrics.requests).toBeDefined();
      expect(data.metrics.requests).toHaveProperty('total');
      expect(data.metrics.requests).toHaveProperty('last_minute');
      expect(data.metrics.requests).toHaveProperty('last_5_minutes');
      expect(data.metrics.requests).toHaveProperty('rate_per_second');
    });

    it('should have error metrics structure', async () => {
      const res = await fetch(`${API_BASE}/metrics`);
      const data = await res.json();

      expect(data.metrics.errors).toBeDefined();
      expect(data.metrics.errors).toHaveProperty('total');
      expect(data.metrics.errors).toHaveProperty('last_minute');
      expect(data.metrics.errors).toHaveProperty('error_rate');
    });

    it('should have performance metrics', async () => {
      const res = await fetch(`${API_BASE}/metrics`);
      const data = await res.json();

      expect(data.metrics.performance).toBeDefined();
      expect(data.metrics.performance).toHaveProperty('avg_response_time_ms');
      expect(data.metrics.performance).toHaveProperty('p95_response_time_ms');
    });

    it('should have top endpoints list', async () => {
      const res = await fetch(`${API_BASE}/metrics`);
      const data = await res.json();

      expect(Array.isArray(data.metrics.top_endpoints)).toBe(true);
    });
  });

  describe('GET /metrics/errors', () => {
    it('should return errors list', async () => {
      const res = await fetch(`${API_BASE}/metrics/errors`);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.count).toBeDefined();
      expect(Array.isArray(data.errors)).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const res = await fetch(`${API_BASE}/metrics/errors?limit=5`);
      const data = await res.json();

      expect(data.errors.length).toBeLessThanOrEqual(5);
    });
  });

  describe('GET /metrics/slow', () => {
    it('should return slow requests list', async () => {
      const res = await fetch(`${API_BASE}/metrics/slow`);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.threshold_ms).toBeDefined();
      expect(data.count).toBeDefined();
      expect(Array.isArray(data.requests)).toBe(true);
    });

    it('should respect threshold parameter', async () => {
      const res = await fetch(`${API_BASE}/metrics/slow?threshold=500`);
      const data = await res.json();

      expect(data.threshold_ms).toBe(500);
    });
  });
});

describe('Metrics Collection', () => {
  it('should track requests across multiple endpoints', async () => {
    const API_BASE = 'https://hummbl-api.hummbl.workers.dev';

    // Make various requests
    await fetch(`${API_BASE}/health`);
    await fetch(`${API_BASE}/v1/models`);
    await fetch(`${API_BASE}/v1/transformations`);

    // Check metrics reflect activity
    const metricsRes = await fetch(`${API_BASE}/metrics`);
    const metrics = await metricsRes.json();

    expect(metrics.metrics.requests.total).toBeGreaterThan(0);
  });

  it('should calculate response times', async () => {
    const API_BASE = 'https://hummbl-api.hummbl.workers.dev';

    // Make a request
    const start = Date.now();
    await fetch(`${API_BASE}/v1/models`);
    const duration = Date.now() - start;

    // Response should be reasonably fast
    expect(duration).toBeLessThan(5000); // 5 seconds max
  });
});
