/**
 * KV-backed task queue for the agent swarm.
 *
 * Keys:
 *   task:{id}        → Task JSON
 *   queue:pending    → JSON array of task IDs (sorted by priority desc)
 *   agent:{id}:hb    → Heartbeat JSON (TTL 300s)
 */

export interface Task {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  priority: number;
  assignedAgent?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retries: number;
  maxRetries: number;
  timeoutMs: number;
  createdAt: string;
  completedAt?: string;
  result?: unknown;
  error?: string;
}

export interface AgentHeartbeat {
  agentId: string;
  status: string;
  tasksActive: number;
  ollamaAvailable: boolean;
  memoryUsageMb: number;
  uptimeMs: number;
  powerState: string;
  batteryPercent?: number;
  ts: string;
}

/** Enqueue a new task */
export async function enqueueTask(
  kv: KVNamespace,
  task: Omit<Task, 'id' | 'status' | 'retries' | 'createdAt'>,
): Promise<Task> {
  const id = crypto.randomUUID();
  const fullTask: Task = {
    ...task,
    id,
    status: 'pending',
    retries: 0,
    createdAt: new Date().toISOString(),
  };

  // Store task
  await kv.put(`task:${id}`, JSON.stringify(fullTask), {
    expirationTtl: 86400, // 24h TTL
  });

  // Add to pending queue
  const pending = await getPendingQueue(kv);
  pending.push({ id, priority: task.priority });
  pending.sort((a, b) => b.priority - a.priority); // highest priority first
  await kv.put('queue:pending', JSON.stringify(pending));

  return fullTask;
}

/** Poll for the next available task (assigns to agent) */
export async function pollNextTask(
  kv: KVNamespace,
  agentId: string,
): Promise<Task | null> {
  const pending = await getPendingQueue(kv);
  if (pending.length === 0) return null;

  // Take highest-priority task
  const entry = pending.shift()!;
  await kv.put('queue:pending', JSON.stringify(pending));

  // Get and update task
  const raw = await kv.get(`task:${entry.id}`);
  if (!raw) return null;

  const task: Task = JSON.parse(raw);
  task.status = 'processing';
  task.assignedAgent = agentId;

  await kv.put(`task:${entry.id}`, JSON.stringify(task), {
    expirationTtl: 86400,
  });

  return task;
}

/** Mark a task as completed or failed */
export async function completeTask(
  kv: KVNamespace,
  taskId: string,
  update: {
    status: 'completed' | 'failed';
    result?: unknown;
    error?: string;
    completedAt: string;
  },
): Promise<Task | null> {
  const raw = await kv.get(`task:${taskId}`);
  if (!raw) return null;

  const task: Task = JSON.parse(raw);
  Object.assign(task, update);

  // Keep completed tasks for 1 hour (for dashboard)
  await kv.put(`task:${taskId}`, JSON.stringify(task), {
    expirationTtl: 3600,
  });

  return task;
}

/** Store agent heartbeat */
export async function storeHeartbeat(
  kv: KVNamespace,
  heartbeat: AgentHeartbeat,
): Promise<void> {
  await kv.put(`agent:${heartbeat.agentId}:hb`, JSON.stringify(heartbeat), {
    expirationTtl: 120, // 2 min TTL — agent heartbeats every 60s, 2x buffer
  });
}

/** Get all agent statuses */
export async function getAgentStatuses(
  kv: KVNamespace,
  agentIds: string[] = ['soma', 'echo'],
): Promise<Array<AgentHeartbeat & { online: boolean }>> {
  const results = [];
  for (const id of agentIds) {
    const raw = await kv.get(`agent:${id}:hb`);
    if (raw) {
      const hb: AgentHeartbeat = JSON.parse(raw);
      results.push({ ...hb, online: true });
    } else {
      results.push({
        agentId: id,
        status: 'offline',
        tasksActive: 0,
        ollamaAvailable: false,
        memoryUsageMb: 0,
        uptimeMs: 0,
        powerState: 'unknown',
        ts: '',
        online: false,
      });
    }
  }
  return results;
}

/** Get pending queue entries */
async function getPendingQueue(
  kv: KVNamespace,
): Promise<Array<{ id: string; priority: number }>> {
  const raw = await kv.get('queue:pending');
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/** Get queue stats for dashboard */
export async function getQueueStats(kv: KVNamespace): Promise<{
  pendingCount: number;
  agents: Array<AgentHeartbeat & { online: boolean }>;
}> {
  const pending = await getPendingQueue(kv);
  const agents = await getAgentStatuses(kv);
  return { pendingCount: pending.length, agents };
}
