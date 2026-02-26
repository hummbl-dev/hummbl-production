/**
 * Task queue routes for the agent swarm control plane.
 *
 * POST /enqueue       - Submit a new task
 * GET  /poll          - Long-poll for next task (agent calls this)
 * POST /:id/complete  - Mark task done
 * GET  /stats         - Queue stats for dashboard
 */

import { Hono } from 'hono';
import { enqueueTask, pollNextTask, completeTask, getQueueStats } from '../lib/queue.js';

type Bindings = { ANALYTICS_KV: KVNamespace };

const tasks = new Hono<{ Bindings: Bindings }>();

/** POST /enqueue - Submit a task to the queue */
tasks.post('/enqueue', async (c) => {
  try {
    const body = await c.req.json();

    if (!body.type || typeof body.type !== 'string') {
      return c.json({ success: false, error: 'Missing "type" field' }, 400);
    }

    const task = await enqueueTask(c.env.ANALYTICS_KV, {
      type: body.type,
      payload: body.payload ?? {},
      priority: typeof body.priority === 'number' ? body.priority : 5,
      maxRetries: typeof body.maxRetries === 'number' ? body.maxRetries : 3,
      timeoutMs: typeof body.timeoutMs === 'number' ? body.timeoutMs : 120_000,
    });

    return c.json({ success: true, task });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[enqueue] Error:', msg);
    const status = msg.includes('KV') || msg.includes('limit') ? 503 : 400;
    return c.json({ success: false, error: msg }, status);
  }
});

/** GET /poll - Long-poll for the next task */
tasks.get('/poll', async (c) => {
  const agentId = c.req.query('agentId');
  if (!agentId) {
    return c.json({ success: false, error: 'Missing agentId query param' }, 400);
  }

  // Workers can't truly long-poll (30s CPU limit), so just check and return
  const task = await pollNextTask(c.env.ANALYTICS_KV, agentId);
  if (!task) {
    return c.body(null, 204); // No content — no tasks available
  }

  return c.json({ success: true, task });
});

/** POST /:id/complete - Report task completion */
tasks.post('/:id/complete', async (c) => {
  const taskId = c.req.param('id');
  try {
    const body = await c.req.json();

    const task = await completeTask(c.env.ANALYTICS_KV, taskId, {
      status: body.error ? 'failed' : 'completed',
      result: body.result,
      error: body.error,
      completedAt: body.completedAt ?? new Date().toISOString(),
    });

    if (!task) {
      return c.json({ success: false, error: 'Task not found' }, 404);
    }

    return c.json({ success: true, task });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[complete] Error:', msg);
    const status = msg.includes('KV') || msg.includes('limit') ? 503 : 400;
    return c.json({ success: false, error: msg }, status);
  }
});

/** GET /stats - Queue statistics */
tasks.get('/stats', async (c) => {
  const stats = await getQueueStats(c.env.ANALYTICS_KV);
  return c.json({ success: true, ...stats });
});

export default tasks;
