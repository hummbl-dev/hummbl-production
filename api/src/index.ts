/**
 * HUMMBL API - Mental Models for AI Agents
 * Simple, working API with inline data
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { TRANSFORMATIONS, getAllModels, getModelByCode } from './base120.js';
import { recommendModels } from './recommend.js';

// Initialize start time for uptime tracking
(globalThis as any).startTime = Date.now();

const app = new Hono();

// CORS - allow all origins for public API
app.use('*', cors());

// Security headers
app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '1; mode=block');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://hummbl-api.hummbl.workers.dev; frame-ancestors 'none'; form-action 'self';");
});

// Request logging
app.use('*', logger());

// Basic rate limiting (100 requests per minute per IP) with cleanup
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

app.use('*', async (c, next) => {
  // Cleanup expired entries periodically
  if (Math.random() < 0.01) { // 1% chance to cleanup on each request
    const now = Date.now();
    for (const [ip, data] of rateLimitMap.entries()) {
      if (now > data.resetTime) {
        rateLimitMap.delete(ip);
      }
    }
  }

  const clientIP = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 100;

  const rateLimitData = rateLimitMap.get(clientIP);
  
  if (!rateLimitData || now > rateLimitData.resetTime) {
    rateLimitMap.set(clientIP, { count: 1, resetTime: now + windowMs });
    return await next();
  }

  if (rateLimitData.count >= maxRequests) {
    return c.json({
      success: false,
      error: 'Rate limit exceeded. Please try again later.'
    }, 429);
  }

  rateLimitData.count++;
  return await next();
});

/**
 * GET / - API info
 */
app.get('/', (c) => {
  return c.json({
    name: 'HUMMBL API',
    version: '1.0.0',
    description: 'Mental models for AI agents',
    endpoints: {
      health: '/health',
      models: '/v1/models',
      model: '/v1/models/:code',
      transformations: '/v1/transformations',
      recommend: '/v1/recommend'
    },
    mcp_server: 'npm install -g @hummbl/mcp-server'
  });
});

/**
 * GET /health - Health check with monitoring metrics
 */
app.get('/health', (c) => {
  const allModels = getAllModels();
  const uptime = Date.now() - (globalThis as any).startTime || 0;
  
  return c.json({
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime_ms: uptime,
    models_count: allModels.length,
    rate_limit_status: {
      active_ips: rateLimitMap.size,
      window_ms: 60 * 1000,
      max_requests_per_minute: 100
    }
  });
});

/**
 * GET /v1/transformations - List all 6 transformations
 */
app.get('/v1/transformations', (c) => {
  const transformations = Object.values(TRANSFORMATIONS).map(t => ({
    key: t.key,
    name: t.name,
    description: t.description,
    model_count: t.models.length
  }));

  return c.json({
    success: true,
    data: transformations
  });
});

/**
 * GET /v1/models - List all mental models
 */
app.get('/v1/models', (c) => {
  const allModels = getAllModels();

  return c.json({
    success: true,
    data: allModels,
    count: allModels.length
  });
});

/**
 * GET /v1/models/:code - Get specific model
 * Example: /v1/models/P1
 */
app.get('/v1/models/:code', (c) => {
  const code = c.req.param('code').toUpperCase();
  const result = getModelByCode(code);

  if (result.ok) {
    return c.json({
      success: true,
      data: result.value
    });
  } else {
    return c.json({
      success: false,
      error: result.error.type === 'NotFound' 
        ? `Model not found: ${code}` 
        : `Error: ${result.error.type}`
    }, 404);
  }
});

/**
 * POST /v1/recommend - Get model recommendations for a problem
 * Uses improved algorithm with stopwords, pattern matching, and semantic scoring
 */
app.post('/v1/recommend', async (c) => {
  try {
    const { problem, limit } = await c.req.json();

    if (!problem || typeof problem !== 'string') {
      return c.json({
        success: false,
        error: 'Missing or invalid "problem" field'
      }, 400);
    }

    const allModels = getAllModels();
    const maxResults = typeof limit === 'number' && limit > 0 && limit <= 20 ? limit : 5;

    const result = recommendModels(problem, allModels, maxResults);

    if (result.models.length === 0) {
      return c.json({
        success: true,
        data: allModels.filter(m => m.priority === 1).slice(0, maxResults),
        message: 'No specific matches - showing high-priority models'
      });
    }

    return c.json({
      success: true,
      data: result.models,
      meta: {
        matchedPatterns: result.matchedPatterns,
        keywordsAnalyzed: result.keywordsUsed.length
      }
    });
  } catch (error) {
    return c.json({
      success: false,
      error: 'Invalid request body'
    }, 400);
  }
});

/**
 * 404 handler
 */
app.notFound((c) => {
  return c.json({
    success: false,
    error: 'Endpoint not found'
  }, 404);
});

export default app;
