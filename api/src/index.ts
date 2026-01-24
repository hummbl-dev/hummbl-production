/**
 * HUMMBL API - Mental Models for AI Agents
 * Simple, working API with inline data
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { TRANSFORMATIONS, getAllModels, getModelByCode } from './base120.js';

const app = new Hono();

// CORS - allow all origins for public API
app.use('*', cors());

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
 * GET /health - Health check
 */
app.get('/health', (c) => {
  const allModels = getAllModels();
  return c.json({
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    models_count: allModels.length
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
      error: result.error.message
    }, 404);
  }
});

/**
 * POST /v1/recommend - Get model recommendations for a problem
 */
app.post('/v1/recommend', async (c) => {
  try {
    const { problem } = await c.req.json();

    if (!problem || typeof problem !== 'string') {
      return c.json({
        success: false,
        error: 'Missing or invalid "problem" field'
      }, 400);
    }

    // Simple keyword matching for now
    // TODO: Implement proper semantic search
    const allModels = getAllModels();
    const keywords = problem.toLowerCase().split(/\s+/);

    const scored = allModels.map(model => {
      const searchText = `${model.name} ${model.definition}`.toLowerCase();
      const matches = keywords.filter(kw => searchText.includes(kw)).length;
      return { model, score: matches };
    });

    const recommendations = scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(s => s.model);

    // If no keyword matches, return top priority models
    if (recommendations.length === 0) {
      return c.json({
        success: true,
        data: allModels
          .filter(m => m.priority === 1)
          .slice(0, 5),
        message: 'No specific matches - showing high-priority models'
      });
    }

    return c.json({
      success: true,
      data: recommendations
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
