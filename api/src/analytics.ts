/**
 * HUMMBL API Analytics
 * Simple usage tracking via Cloudflare KV
 */

import type { Context } from 'hono';

// Analytics key prefixes
const KEYS = {
  TOTAL_REQUESTS: 'analytics:total_requests',
  UNIQUE_IPS: 'analytics:unique_ips',
  DAILY_REQUESTS: (date: string) => `analytics:daily:${date}`,
  IP_FIRST_SEEN: (ip: string) => `analytics:ip:${ip}`,
  ENDPOINT_STATS: (endpoint: string) => `analytics:endpoint:${endpoint}`,
};

// Bindings type extension
export interface AnalyticsBindings {
  ANALYTICS_KV: KVNamespace;
  ENABLE_ANALYTICS?: string; // Feature flag: 'true' or 'false'
}

/**
 * Track a request in analytics
 *
 * KNOWN LIMITATION: Race Condition in Counter Increments
 *
 * This function uses a read-modify-write pattern for counter updates which is
 * NOT atomic. Under high concurrency, multiple workers may read the same value
 * before any write completes, causing some increments to be lost.
 *
 * As a result, counts tracked here should be considered APPROXIMATE, not exact.
 * This is an accepted trade-off for the simplicity and cost-effectiveness of
 * KV storage.
 *
 * For exact counts in high-concurrency scenarios, consider:
 * - Cloudflare Durable Objects (provides transactional guarantees)
 * - Cloudflare Analytics Engine (purpose-built for metrics)
 * - External time-series database with proper atomic operations
 */
export async function trackRequest(
  kv: KVNamespace,
  ip: string,
  endpoint: string,
  method: string,
): Promise<void> {
  const now = new Date();
  const dateKeyParts = now.toISOString().split('T');
  const dateKey = dateKeyParts[0] ?? now.toISOString().slice(0, 10); // YYYY-MM-DD

  try {
    // Increment total requests
    // NOTE: Read-modify-write is not atomic; count may drift under high concurrency (eventual consistency)
    await kv.put(KEYS.TOTAL_REQUESTS, ((await getTotalRequests(kv)) + 1).toString());

    // Track daily requests
    const dailyKey = KEYS.DAILY_REQUESTS(dateKey);
    const dailyValue = await kv.get(dailyKey);
    const dailyCount = dailyValue ? parseInt(dailyValue) : 0;
    await kv.put(dailyKey, (dailyCount + 1).toString(), {
      expirationTtl: 60 * 60 * 24 * 90, // 90 days retention
    });

    // Track unique IPs
    const ipKey = KEYS.IP_FIRST_SEEN(ip);
    const firstSeen = await kv.get(ipKey);
    if (!firstSeen) {
      await kv.put(ipKey, now.toISOString(), {
        expirationTtl: 60 * 60 * 24 * 30, // 30 days retention for IP tracking
      });
      // NOTE: Read-modify-write is not atomic; count may drift under high concurrency (eventual consistency)
      await kv.put(KEYS.UNIQUE_IPS, ((await getUniqueIPCount(kv)) + 1).toString());
    }

    // Track endpoint stats
    const endpointKey = KEYS.ENDPOINT_STATS(`${method}:${endpoint}`);
    const endpointCount = parseInt((await kv.get(endpointKey)) || '0');
    await kv.put(endpointKey, (endpointCount + 1).toString(), {
      expirationTtl: 60 * 60 * 24 * 30, // 30 days retention
    });
  } catch (error) {
    // Silently fail - analytics shouldn't break the API
    console.error('Analytics tracking error:', error);
  }
}

/**
 * Get total request count
 */
export async function getTotalRequests(kv: KVNamespace): Promise<number> {
  const value = await kv.get(KEYS.TOTAL_REQUESTS);
  return parseInt(value || '0');
}

/**
 * Get unique IP count
 */
export async function getUniqueIPCount(kv: KVNamespace): Promise<number> {
  const value = await kv.get(KEYS.UNIQUE_IPS);
  return parseInt(value || '0');
}

/**
 * Get daily request counts for last N days
 */
export async function getDailyStats(
  kv: KVNamespace,
  days: number = 7,
): Promise<Array<{ date: string; requests: number }>> {
  const results = [];
  const now = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateKeyParts = date.toISOString().split('T');
    const dateKey = dateKeyParts[0] ?? 'unknown';
    const dailyValue = await kv.get(KEYS.DAILY_REQUESTS(dateKey));
    const count = dailyValue ? parseInt(dailyValue) : 0;
    results.push({ date: dateKey, requests: count });
  }

  return results.reverse();
}

/**
 * Get top endpoints by usage
 */
export async function getTopEndpoints(
  kv: KVNamespace,
  limit: number = 10,
): Promise<Array<{ endpoint: string; count: number }>> {
  // List all endpoint keys
  const list = await kv.list({ prefix: 'analytics:endpoint:' });
  const endpoints = [];

  for (const key of list.keys) {
    const count = parseInt((await kv.get(key.name)) || '0');
    const endpoint = key.name.replace('analytics:endpoint:', '');
    endpoints.push({ endpoint, count });
  }

  return endpoints.sort((a, b) => b.count - a.count).slice(0, limit);
}

/**
 * Get complete analytics summary
 */
export async function getAnalyticsSummary(kv: KVNamespace): Promise<{
  totalRequests: number;
  uniqueIPs: number;
  dailyStats: Array<{ date: string; requests: number }>;
  topEndpoints: Array<{ endpoint: string; count: number }>;
}> {
  const [totalRequests, uniqueIPs, dailyStats, topEndpoints] = await Promise.all([
    getTotalRequests(kv),
    getUniqueIPCount(kv),
    getDailyStats(kv, 7),
    getTopEndpoints(kv, 10),
  ]);

  return {
    totalRequests,
    uniqueIPs,
    dailyStats,
    topEndpoints,
  };
}

/**
 * Hono middleware for analytics tracking
 */
export function analyticsMiddleware() {
  return async (c: Context<{ Bindings: AnalyticsBindings }>, next: () => Promise<void>) => {
    const kv = c.env?.ANALYTICS_KV;

    // Feature flag: check if analytics is enabled (default: true if KV configured)
    const enabled = c.env?.ENABLE_ANALYTICS !== 'false';

    // Only track if KV is configured AND analytics is enabled
    if (kv && enabled) {
      const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
      const endpoint = c.req.path;
      const method = c.req.method;

      // Track asynchronously (don't block request)
      c.executionCtx.waitUntil(trackRequest(kv, ip, endpoint, method));
    }

    await next();
  };
}
