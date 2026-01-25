/**
 * Test setup for HUMMBL API
 */

import { vi } from 'vitest';

// Mock Cloudflare Workers environment
global.Request = Request as any;
global.Response = Response as any;
global.Headers = Headers as any;

// Mock console methods for cleaner test output
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Mock global startTime for uptime tracking
(globalThis as any).startTime = Date.now();
