/**
 * HUMMBL API - Mental Models for AI Agents
 * Simple, working API with inline data
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { TRANSFORMATIONS, getAllModels, getModelByCode } from './base120.js';
import { recommendModels } from './recommend.js';
import { semanticSearch, type PineconeEnv } from './pinecone.js';
import { getAllWorkflows, getWorkflowById, matchWorkflows } from './workflows.js';
import {
  metricsMiddleware,
  getMetrics,
  getRecentErrors,
  getSlowRequests,
  checkAlertConditions,
} from './monitoring.js';
import {
  sanitizeInput,
  validateInput,
  detectPII,
  validateOutput,
  logSecurityEvent,
  getSecurityEvents,
  getSecurityStats,
  checkToolPermission,
} from './security.js';
import { analyticsMiddleware, getAnalyticsSummary, type AnalyticsBindings } from './analytics.js';

// Environment bindings type
type Bindings = PineconeEnv & AnalyticsBindings;

// Initialize start time for uptime tracking
(globalThis as any).startTime = Date.now();

const app = new Hono<{ Bindings: Bindings }>();

// CORS - allow all origins for public API
app.use('*', cors());

// Security headers
app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '1; mode=block');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://hummbl-api.hummbl.workers.dev; frame-ancestors 'none'; form-action 'self';",
  );
});

// Request logging
app.use('*', logger());

// Metrics collection
app.use('*', metricsMiddleware);

// Analytics tracking
app.use('*', analyticsMiddleware());

// Basic rate limiting (100 requests per minute per IP) with cleanup
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

app.use('*', async (c, next) => {
  // Cleanup expired entries periodically
  if (Math.random() < 0.01) {
    // 1% chance to cleanup on each request
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
    return c.json(
      {
        success: false,
        error: 'Rate limit exceeded. Please try again later.',
      },
      429,
    );
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
    version: '1.1.0',
    description: 'Mental models for AI agents',
    endpoints: {
      health: '/health',
      metrics: '/metrics',
      security: {
        events: '/security/events',
        stats: '/security/stats',
        validate: '/security/validate',
      },
      models: '/v1/models',
      model: '/v1/models/:code',
      transformations: '/v1/transformations',
      recommend: '/v1/recommend',
      workflows: '/v1/workflows',
      workflow: '/v1/workflows/:id',
      workflowMatch: '/v1/workflows/match',
      semanticSearch: '/v1/semantic-search',
    },
    mcp_server: 'npm install -g @hummbl/mcp-server',
  });
});

/**
 * GET /health - Health check with monitoring metrics and security status
 */
app.get('/health', (c) => {
  const allModels = getAllModels();
  const uptime = Date.now() - (globalThis as any).startTime || 0;
  const alerts = checkAlertConditions();
  const securityStats = getSecurityStats();

  // Determine overall status
  let status = 'healthy';
  const allAlerts: string[] = alerts.alert ? [...alerts.conditions] : [];

  if (securityStats.recentCritical > 0) {
    status = 'critical';
    allAlerts.push(`${securityStats.recentCritical} critical security events in last hour`);
  } else if (alerts.alert) {
    status = 'degraded';
  }

  return c.json({
    status,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime_ms: uptime,
    models_count: allModels.length,
    rate_limit_status: {
      active_ips: rateLimitMap.size,
      window_ms: 60 * 1000,
      max_requests_per_minute: 100,
    },
    security: {
      total_events: securityStats.totalEvents,
      recent_critical: securityStats.recentCritical,
      by_severity: securityStats.bySeverity,
    },
    alerts: allAlerts.length > 0 ? allAlerts : undefined,
  });
});

/**
 * GET /metrics - Detailed metrics and observability
 */
app.get('/metrics', (c) => {
  const metrics = getMetrics();
  const alerts = checkAlertConditions();

  return c.json({
    success: true,
    timestamp: new Date().toISOString(),
    metrics,
    alerts: alerts.alert ? alerts.conditions : [],
  });
});

/**
 * GET /metrics/errors - Recent errors for debugging
 */
app.get('/metrics/errors', (c) => {
  const limit = parseInt(c.req.query('limit') || '50');
  const errors = getRecentErrors(limit);

  return c.json({
    success: true,
    count: errors.length,
    errors,
  });
});

/**
 * GET /metrics/slow - Slow requests for performance analysis
 */
app.get('/metrics/slow', (c) => {
  const threshold = parseInt(c.req.query('threshold') || '1000');
  const limit = parseInt(c.req.query('limit') || '50');
  const slow = getSlowRequests(threshold, limit);

  return c.json({
    success: true,
    threshold_ms: threshold,
    count: slow.length,
    requests: slow,
  });
});

/**
 * GET /analytics - Usage analytics summary
 */
app.get('/analytics', async (c) => {
  const kv = c.env.ANALYTICS_KV;

  if (!kv) {
    return c.json(
      {
        success: false,
        error: 'Analytics not configured',
        message: 'ANALYTICS_KV binding not found',
      },
      503,
    );
  }

  const summary = await getAnalyticsSummary(kv);

  return c.json({
    success: true,
    timestamp: new Date().toISOString(),
    ...summary,
  });
});

/**
 * GET /security/events - Security event log (last 100 events)
 */
app.get('/security/events', (c) => {
  const type = c.req.query('type');
  const severity = c.req.query('severity');
  const limit = parseInt(c.req.query('limit') || '100');

  const events = getSecurityEvents({
    type: type as any,
    severity: severity as any,
    limit,
  });

  return c.json({
    success: true,
    count: events.length,
    events,
  });
});

/**
 * GET /security/stats - Security statistics
 */
app.get('/security/stats', (c) => {
  const stats = getSecurityStats();

  return c.json({
    success: true,
    stats,
  });
});

/**
 * POST /security/validate - Validate input for injection attacks
 */
app.post('/security/validate', async (c) => {
  try {
    const { input } = await c.req.json();

    if (!input || typeof input !== 'string') {
      return c.json(
        {
          success: false,
          error: 'Missing or invalid "input" field',
        },
        400,
      );
    }

    const validation = validateInput(input);
    const sanitized = sanitizeInput(input);
    const piiCheck = detectPII(input);

    return c.json({
      success: true,
      validation,
      sanitized,
      pii: piiCheck,
    });
  } catch (_error) {
    return c.json(
      {
        success: false,
        error: 'Invalid request body',
      },
      400,
    );
  }
});

/**
 * GET /v1/transformations - List all 6 transformations
 */
app.get('/v1/transformations', (c) => {
  const transformations = Object.values(TRANSFORMATIONS).map((t) => ({
    key: t.key,
    name: t.name,
    description: t.description,
    model_count: t.models.length,
  }));

  return c.json({
    success: true,
    data: transformations,
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
    count: allModels.length,
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
      data: result.value,
    });
  } else {
    return c.json(
      {
        success: false,
        error:
          result.error.type === 'NotFound'
            ? `Model not found: ${code}`
            : `Error: ${result.error.type}`,
      },
      404,
    );
  }
});

/**
 * POST /v1/recommend - Get model recommendations for a problem
 * Uses improved algorithm with stopwords, pattern matching, and semantic scoring
 * Includes security validation for prompt injection and PII
 */
app.post('/v1/recommend', async (c) => {
  try {
    const { problem, limit } = await c.req.json();

    if (!problem || typeof problem !== 'string') {
      return c.json(
        {
          success: false,
          error: 'Missing or invalid "problem" field',
        },
        400,
      );
    }

    // Security: Validate input for prompt injection
    const validation = validateInput(problem);
    if (!validation.valid) {
      logSecurityEvent(
        'prompt_injection_attempt',
        'HIGH',
        {
          endpoint: '/v1/recommend',
          reason: validation.reason,
          inputPreview: problem.substring(0, 100),
        },
        {
          clientIp: c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For'),
          userAgent: c.req.header('User-Agent'),
          endpoint: '/v1/recommend',
        },
      );
      return c.json(
        {
          success: false,
          error: `Security validation failed: ${validation.reason}`,
        },
        400,
      );
    }

    // Security: Check for PII
    const piiCheck = detectPII(problem);
    if (piiCheck.found) {
      logSecurityEvent(
        'pii_detected_in_input',
        'MEDIUM',
        {
          endpoint: '/v1/recommend',
          types: piiCheck.types,
        },
        {
          clientIp: c.req.header('CF-Connecting-IP'),
          endpoint: '/v1/recommend',
        },
      );
      // Continue but log the event
    }

    // Security: Sanitize input
    const sanitizedProblem = sanitizeInput(problem);

    // Check tool permission
    const permission = checkToolPermission('analyze_problem', 'read', sanitizedProblem.length);
    if (!permission.permitted) {
      return c.json(
        {
          success: false,
          error: permission.reason,
        },
        403,
      );
    }

    const allModels = getAllModels();
    const maxResults = typeof limit === 'number' && limit > 0 && limit <= 20 ? limit : 5;

    const result = recommendModels(sanitizedProblem, allModels, maxResults);

    // Security: Validate output
    const outputValidation = validateOutput(result.models);
    if (!outputValidation.valid) {
      logSecurityEvent('output_validation_failed', 'HIGH', {
        endpoint: '/v1/recommend',
        reason: outputValidation.reason,
      });
      return c.json(
        {
          success: false,
          error: 'Output validation failed',
        },
        500,
      );
    }

    if (result.models.length === 0) {
      return c.json({
        success: true,
        data: allModels.filter((m) => m.priority === 1).slice(0, maxResults),
        message: 'No specific matches - showing high-priority models',
      });
    }

    return c.json({
      success: true,
      data: result.models,
      meta: {
        matchedPatterns: result.matchedPatterns,
        keywordsAnalyzed: result.keywordsUsed.length,
      },
    });
  } catch (_error) {
    return c.json(
      {
        success: false,
        error: 'Invalid request body',
      },
      400,
    );
  }
});

/**
 * GET /v1/workflows - List all curated workflows
 */
app.get('/v1/workflows', (c) => {
  const workflows = getAllWorkflows();
  return c.json({
    success: true,
    data: workflows,
    count: workflows.length,
  });
});

/**
 * GET /v1/workflows/:id - Get specific workflow by ID
 */
app.get('/v1/workflows/:id', (c) => {
  const id = c.req.param('id');
  const workflow = getWorkflowById(id);

  if (workflow) {
    return c.json({
      success: true,
      data: workflow,
    });
  }

  return c.json(
    {
      success: false,
      error: `Workflow not found: ${id}`,
    },
    404,
  );
});

/**
 * POST /v1/workflows/match - Find workflows matching a problem
 * Includes security validation
 */
app.post('/v1/workflows/match', async (c) => {
  try {
    const { problem, limit } = await c.req.json();

    if (!problem || typeof problem !== 'string') {
      return c.json(
        {
          success: false,
          error: 'Missing or invalid "problem" field',
        },
        400,
      );
    }

    // Security: Validate input
    const validation = validateInput(problem);
    if (!validation.valid) {
      logSecurityEvent('prompt_injection_attempt', 'HIGH', {
        endpoint: '/v1/workflows/match',
        reason: validation.reason,
      });
      return c.json(
        {
          success: false,
          error: `Security validation failed: ${validation.reason}`,
        },
        400,
      );
    }

    const sanitizedProblem = sanitizeInput(problem);
    const maxResults = typeof limit === 'number' && limit > 0 && limit <= 10 ? limit : 3;
    const workflows = matchWorkflows(sanitizedProblem, maxResults);

    return c.json({
      success: true,
      data: workflows,
      count: workflows.length,
    });
  } catch (_error) {
    return c.json(
      {
        success: false,
        error: 'Invalid request body',
      },
      400,
    );
  }
});

/**
 * POST /v1/semantic-search - Semantic search for mental models (requires Pinecone)
 * Includes security validation for prompt injection and PII
 */
app.post('/v1/semantic-search', async (c) => {
  try {
    const { query, limit } = await c.req.json();

    if (!query || typeof query !== 'string') {
      return c.json(
        {
          success: false,
          error: 'Missing or invalid "query" field',
        },
        400,
      );
    }

    // Security: Validate input
    const validation = validateInput(query);
    if (!validation.valid) {
      logSecurityEvent('prompt_injection_attempt', 'HIGH', {
        endpoint: '/v1/semantic-search',
        reason: validation.reason,
      });
      return c.json(
        {
          success: false,
          error: `Security validation failed: ${validation.reason}`,
        },
        400,
      );
    }

    // Security: Check tool permission (stricter rate limit for external calls)
    const permission = checkToolPermission('semantic_search', 'read', query.length);
    if (!permission.permitted) {
      return c.json(
        {
          success: false,
          error: permission.reason,
        },
        403,
      );
    }

    const sanitizedQuery = sanitizeInput(query);
    const topK = typeof limit === 'number' && limit > 0 && limit <= 20 ? limit : 10;
    const result = await semanticSearch(sanitizedQuery, c.env, topK);

    if (!result) {
      return c.json(
        {
          success: false,
          error: 'Semantic search unavailable - Pinecone not configured',
        },
        503,
      );
    }

    return c.json({
      success: true,
      data: result.models,
      meta: {
        tokenUsage: result.tokenUsage,
        scoresAvailable: result.scores.size > 0,
      },
    });
  } catch (_error) {
    return c.json(
      {
        success: false,
        error: 'Invalid request body',
      },
      400,
    );
  }
});

/**
 * 404 handler
 */
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: 'Endpoint not found',
    },
    404,
  );
});

export default app;
