/**
 * HUMMBL API Monitoring & Observability
 * Structured logging, metrics, and telemetry for production workloads
 */

import type { Context, Next } from 'hono';

// Metric types
interface RequestMetric {
  timestamp: string;
  method: string;
  path: string;
  status: number;
  duration_ms: number;
  client_ip?: string;
  user_agent?: string;
  error?: string;
}

interface ErrorMetric {
  timestamp: string;
  type: string;
  message: string;
  stack?: string;
  endpoint?: string;
}

// In-memory metrics store (for health endpoint)
const requestMetrics: RequestMetric[] = [];
const errorMetrics: ErrorMetric[] = [];
const MAX_STORED_METRICS = 1000;

// Endpoint call counters
const endpointCounters: Map<string, number> = new Map();
const errorCounters: Map<string, number> = new Map();

/**
 * Middleware to track request metrics
 */
export async function metricsMiddleware(c: Context, next: Next) {
  const start = Date.now();
  const method = c.req.method;
  const path = c.req.path;

  try {
    await next();

    const duration = Date.now() - start;
    const status = c.res.status;

    // Record request metric
    const metric: RequestMetric = {
      timestamp: new Date().toISOString(),
      method,
      path,
      status,
      duration_ms: duration,
      client_ip: c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For'),
      user_agent: c.req.header('User-Agent'),
    };

    recordRequestMetric(metric);

    // Increment endpoint counter
    const key = `${method} ${path}`;
    endpointCounters.set(key, (endpointCounters.get(key) || 0) + 1);
  } catch (error) {
    const _duration = Date.now() - start;
    const errorMsg = error instanceof Error ? error.message : String(error);

    // Record error metric
    const errorMetric: ErrorMetric = {
      timestamp: new Date().toISOString(),
      type: error instanceof Error ? error.constructor.name : 'Unknown',
      message: errorMsg,
      stack: error instanceof Error ? error.stack : undefined,
      endpoint: `${method} ${path}`,
    };

    recordErrorMetric(errorMetric);

    // Increment error counter
    const key = `${method} ${path}:${errorMetric.type}`;
    errorCounters.set(key, (errorCounters.get(key) || 0) + 1);

    throw error;
  }
}

/**
 * Record request metric with retention limit
 */
function recordRequestMetric(metric: RequestMetric) {
  requestMetrics.push(metric);
  if (requestMetrics.length > MAX_STORED_METRICS) {
    requestMetrics.shift();
  }
}

/**
 * Record error metric with retention limit
 */
function recordErrorMetric(metric: ErrorMetric) {
  errorMetrics.push(metric);
  if (errorMetrics.length > MAX_STORED_METRICS) {
    errorMetrics.shift();
  }
}

/**
 * Get aggregated metrics for health/monitoring endpoint
 */
export function getMetrics() {
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

  // Calculate request rates
  const requestsLastMinute = requestMetrics.filter(
    (m) => new Date(m.timestamp) > oneMinuteAgo,
  ).length;

  const requestsLast5Minutes = requestMetrics.filter(
    (m) => new Date(m.timestamp) > fiveMinutesAgo,
  ).length;

  // Calculate error rates
  const errorsLastMinute = errorMetrics.filter((m) => new Date(m.timestamp) > oneMinuteAgo).length;

  const errorsLast5Minutes = errorMetrics.filter(
    (m) => new Date(m.timestamp) > fiveMinutesAgo,
  ).length;

  // Calculate average response times
  const recentRequests = requestMetrics.slice(-100);
  const avgResponseTime =
    recentRequests.length > 0
      ? recentRequests.reduce((sum, m) => sum + m.duration_ms, 0) / recentRequests.length
      : 0;

  // Get top endpoints
  const topEndpoints = Array.from(endpointCounters.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Get error breakdown
  const errorBreakdown = Array.from(errorCounters.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return {
    requests: {
      total: requestMetrics.length,
      last_minute: requestsLastMinute,
      last_5_minutes: requestsLast5Minutes,
      rate_per_second: requestsLastMinute / 60,
    },
    errors: {
      total: errorMetrics.length,
      last_minute: errorsLastMinute,
      last_5_minutes: errorsLast5Minutes,
      error_rate: requestsLastMinute > 0 ? (errorsLastMinute / requestsLastMinute) * 100 : 0,
    },
    performance: {
      avg_response_time_ms: Math.round(avgResponseTime),
      p95_response_time_ms: calculateP95(recentRequests),
    },
    top_endpoints: topEndpoints,
    error_breakdown: errorBreakdown,
  };
}

/**
 * Calculate P95 response time
 */
function calculateP95(requests: RequestMetric[]): number {
  if (requests.length === 0) return 0;

  const sorted = [...requests].sort((a, b) => a.duration_ms - b.duration_ms);
  const index = Math.ceil(sorted.length * 0.95) - 1;
  return sorted[Math.max(0, index)].duration_ms;
}

/**
 * Get recent errors for alerting/debugging
 */
export function getRecentErrors(limit: number = 50): ErrorMetric[] {
  return errorMetrics.slice(-limit).reverse();
}

/**
 * Get slow requests for performance analysis
 */
export function getSlowRequests(thresholdMs: number = 1000, limit: number = 50): RequestMetric[] {
  return requestMetrics
    .filter((r) => r.duration_ms > thresholdMs)
    .slice(-limit)
    .reverse();
}

/**
 * Structured logger for consistent log format
 */
export function structuredLog(
  level: 'info' | 'warn' | 'error',
  message: string,
  meta?: Record<string, unknown>,
) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };

  // In production, this would send to a log aggregation service
  // For now, output to stderr (Cloudflare captures this)
  console.error(JSON.stringify(logEntry));
}

/**
 * Alert check - returns true if alert conditions met
 */
export function checkAlertConditions(): { alert: boolean; conditions: string[] } {
  const conditions: string[] = [];
  const metrics = getMetrics();

  // Error rate alert (> 5%)
  if (metrics.errors.error_rate > 5) {
    conditions.push(`High error rate: ${metrics.errors.error_rate.toFixed(2)}%`);
  }

  // Response time alert (> 2s average)
  if (metrics.performance.avg_response_time_ms > 2000) {
    conditions.push(`High latency: ${metrics.performance.avg_response_time_ms}ms avg`);
  }

  // Request spike alert (> 1000 req/min)
  if (metrics.requests.last_minute > 1000) {
    conditions.push(`Request spike: ${metrics.requests.last_minute} req/min`);
  }

  return {
    alert: conditions.length > 0,
    conditions,
  };
}
