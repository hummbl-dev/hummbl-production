/**
 * Agent registry routes for the swarm control plane.
 *
 * POST /heartbeat  - Agent phone-home
 * GET  /status     - All agent statuses
 */

import { Hono } from 'hono';
import { storeHeartbeat, getAgentStatuses, type AgentHeartbeat } from '../lib/queue.js';

type Bindings = { ANALYTICS_KV: KVNamespace };

const agents = new Hono<{ Bindings: Bindings }>();

/** POST /heartbeat - Agent reports its status */
agents.post('/heartbeat', async (c) => {
  try {
    const heartbeat: AgentHeartbeat = await c.req.json();

    if (!heartbeat.agentId) {
      return c.json({ success: false, error: 'Missing agentId' }, 400);
    }

    await storeHeartbeat(c.env.ANALYTICS_KV, heartbeat);
    return c.json({ success: true, received: heartbeat.ts });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[heartbeat] Error:', msg);
    // Distinguish KV/server errors (503) from bad payloads (400)
    const status = msg.includes('KV') || msg.includes('limit') ? 503 : 400;
    return c.json({ success: false, error: msg }, status);
  }
});

/** GET /status - List all agents with online/offline status */
agents.get('/status', async (c) => {
  const agents_ = await getAgentStatuses(c.env.ANALYTICS_KV);
  return c.json({
    success: true,
    agents: agents_,
    timestamp: new Date().toISOString(),
  });
});

export default agents;
