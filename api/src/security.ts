/**
 * HUMMBL Security Module
 * Input validation, PII detection, output sanitization, and security logging
 */

import { structuredLog } from './monitoring.js';

// ============================================================================
// INPUT VALIDATION & SANITIZATION
// ============================================================================

// Note: Using 'i' flag only (not 'gi') because .test() with global flag mutates
// lastIndex, causing non-deterministic validation. See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/lastIndex
const DANGEROUS_PATTERNS = [
  /ignore previous instructions/i,
  /ignore the above/i,
  /system prompt/i,
  /you are now/i,
  /you are a \w+ assistant/i,
  /new instruction/i,
  /override/i,
  /disregard/i,
  /forget everything/i,
  /<!\[CDATA\[/i,
  /<script/i,
  /javascript:/i,
  /on\w+\s*=/i, // onclick, onerror, etc.
];

const PROMPT_INJECTION_PATTERNS = [
  /\/\/.*/g, // Comments
  /\/\*[\s\S]*?\*\//g, // Block comments
  /`[\s\S]*?`/g, // Template literals
  /\$\{.*?\}/g, // Template expressions
];

/**
 * Sanitize user input to prevent prompt injection attacks
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  let cleaned = input;

  // Remove dangerous patterns
  DANGEROUS_PATTERNS.forEach((pattern) => {
    cleaned = cleaned.replace(pattern, '[FILTERED]');
  });

  // Neutralize prompt injection attempts
  PROMPT_INJECTION_PATTERNS.forEach((pattern) => {
    cleaned = cleaned.replace(pattern, (match) => `[CODE-BLOCKED:${match.length}]`);
  });

  // Limit input length
  const MAX_INPUT_LENGTH = 10000;
  if (cleaned.length > MAX_INPUT_LENGTH) {
    cleaned = cleaned.substring(0, MAX_INPUT_LENGTH) + '...[TRUNCATED]';
  }

  return cleaned;
}

/**
 * Validate that input doesn't contain injection attempts
 */
export function validateInput(input: string): { valid: boolean; reason?: string } {
  if (!input || typeof input !== 'string') {
    return { valid: false, reason: 'Input must be a non-empty string' };
  }

  // Check for dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(input)) {
      logSecurityEvent('prompt_injection_attempt', 'HIGH', {
        pattern: pattern.source,
        inputPreview: input.substring(0, 100),
      });
      return { valid: false, reason: 'Potential prompt injection detected' };
    }
  }

  // Check input size
  if (input.length > 10000) {
    return { valid: false, reason: 'Input exceeds maximum length (10000 chars)' };
  }

  return { valid: true };
}

// ============================================================================
// PII DETECTION & REDACTION
// ============================================================================

const PII_PATTERNS = {
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  apiKey: /(?:api[_-]?key|apikey)\s*[:=]\s*['"]?[\w-]{20,}['"]?/gi,
  password: /(?:password|passwd|pwd)\s*[:=]\s*['"]?[^\s'"]+['"]?/gi,
  token: /(?:token|auth)\s*[:=]\s*['"]?[\w-]{20,}['"]?/gi,
  privateKey: /-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/gi,
};

/**
 * Detect PII in text
 */
export function detectPII(text: string): { found: boolean; types: string[]; matches: string[] } {
  const types: string[] = [];
  const matches: string[] = [];

  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    const found = text.match(pattern);
    if (found) {
      types.push(type);
      matches.push(...found);
    }
  }

  return {
    found: types.length > 0,
    types,
    matches: matches.slice(0, 10), // Limit matches
  };
}

/**
 * Redact PII from text
 */
export function redactPII(text: string): string {
  let redacted = text;

  // Redact each PII type
  redacted = redacted.replace(PII_PATTERNS.ssn, '[REDACTED-SSN]');
  redacted = redacted.replace(PII_PATTERNS.creditCard, '[REDACTED-CC]');
  redacted = redacted.replace(PII_PATTERNS.email, '[REDACTED-EMAIL]');
  redacted = redacted.replace(PII_PATTERNS.phone, '[REDACTED-PHONE]');
  redacted = redacted.replace(PII_PATTERNS.apiKey, '[REDACTED-API-KEY]');
  redacted = redacted.replace(PII_PATTERNS.password, '[REDACTED-PASSWORD]');
  redacted = redacted.replace(PII_PATTERNS.token, '[REDACTED-TOKEN]');
  redacted = redacted.replace(PII_PATTERNS.privateKey, '[REDACTED-PRIVATE-KEY]');

  return redacted;
}

// ============================================================================
// OUTPUT VALIDATION & GUARDRAILS
// ============================================================================

const EXFILTRATION_PATTERNS = [
  // Data encoding in URLs
  /https?:\/\/[^\s]+(?:base64|encode|data:text)/gi,
  // Large data in webhooks
  /webhook.*\{[\s\S]{1000,}\}/gi,
  // Suspicious data patterns
  /\b(?:password|secret|key|token)\s*[:=]\s*['"][^'"]{10,}['"]/gi,
];

/**
 * Validate agent output before execution/display
 */
export function validateOutput(output: unknown): { valid: boolean; reason?: string } {
  const outputStr = JSON.stringify(output);

  // Check for PII leakage
  const piiCheck = detectPII(outputStr);
  if (piiCheck.found) {
    logSecurityEvent('pii_leakage_detected', 'CRITICAL', {
      types: piiCheck.types,
    });
    return {
      valid: false,
      reason: `Output contains PII: ${piiCheck.types.join(', ')}`,
    };
  }

  // Check for data exfiltration
  for (const pattern of EXFILTRATION_PATTERNS) {
    if (pattern.test(outputStr)) {
      logSecurityEvent('potential_exfiltration', 'HIGH', {
        pattern: pattern.source,
      });
      return {
        valid: false,
        reason: 'Potential data exfiltration pattern detected',
      };
    }
  }

  // Check output size
  if (outputStr.length > 50000) {
    return {
      valid: false,
      reason: 'Output exceeds maximum size (50000 chars)',
    };
  }

  return { valid: true };
}

/**
 * Apply output guardrails
 */
export function applyOutputGuardrails(output: string): string {
  let guarded = output;

  // Redact any PII that slipped through
  guarded = redactPII(guarded);

  // Limit length
  if (guarded.length > 10000) {
    guarded = guarded.substring(0, 10000) + '\n...[OUTPUT TRUNCATED]';
  }

  return guarded;
}

// ============================================================================
// SECURITY EVENT LOGGING
// ============================================================================

type SecurityEventType =
  | 'prompt_injection_attempt'
  | 'pii_leakage_detected'
  | 'potential_exfiltration'
  | 'rate_limit_exceeded'
  | 'authentication_failure'
  | 'tool_abuse_detected'
  | 'anomalous_behavior'
  | 'unauthorized_access';

type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

interface SecurityEvent {
  timestamp: string;
  type: SecurityEventType;
  severity: Severity;
  details: Record<string, unknown>;
  clientIp?: string;
  userAgent?: string;
  endpoint?: string;
}

// In-memory security event log (last 1000 events)
const securityEvents: SecurityEvent[] = [];
const MAX_SECURITY_EVENTS = 1000;

/**
 * Log a security event
 */
export function logSecurityEvent(
  type: SecurityEventType,
  severity: Severity,
  details: Record<string, unknown>,
  meta?: { clientIp?: string; userAgent?: string; endpoint?: string },
): void {
  const event: SecurityEvent = {
    timestamp: new Date().toISOString(),
    type,
    severity,
    details,
    ...meta,
  };

  // Add to in-memory log
  securityEvents.push(event);
  if (securityEvents.length > MAX_SECURITY_EVENTS) {
    securityEvents.shift();
  }

  // Also log to structured logging
  structuredLog('error', `Security Event: ${type}`, {
    severity,
    ...details,
    ...meta,
  });

  // Alert on critical events
  if (severity === 'CRITICAL') {
    console.error(`🚨 CRITICAL SECURITY EVENT: ${type}`, JSON.stringify(event));
  }
}

/**
 * Get recent security events
 */
export function getSecurityEvents(
  options: { type?: SecurityEventType; severity?: Severity; limit?: number } = {},
): SecurityEvent[] {
  let events = [...securityEvents].reverse();

  if (options.type) {
    events = events.filter((e) => e.type === options.type);
  }

  if (options.severity) {
    events = events.filter((e) => e.severity === options.severity);
  }

  return events.slice(0, options.limit || 100);
}

/**
 * Get security statistics
 */
export function getSecurityStats(): {
  totalEvents: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  recentCritical: number;
} {
  const byType: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};

  securityEvents.forEach((event) => {
    byType[event.type] = (byType[event.type] || 0) + 1;
    bySeverity[event.severity] = (bySeverity[event.severity] || 0) + 1;
  });

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const recentCritical = securityEvents.filter(
    (e) => e.severity === 'CRITICAL' && e.timestamp > oneHourAgo,
  ).length;

  return {
    totalEvents: securityEvents.length,
    byType,
    bySeverity,
    recentCritical,
  };
}

// ============================================================================
// TOOL PERMISSIONS & RISK LEVELS
// ============================================================================

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

interface ToolPermission {
  allowedOperations: string[];
  rateLimit: number; // per minute
  requiresAuth: boolean;
  riskLevel: RiskLevel;
  maxInputLength: number;
}

export const TOOL_PERMISSIONS: Record<string, ToolPermission> = {
  select_model: {
    allowedOperations: ['read'],
    rateLimit: 100,
    requiresAuth: false,
    riskLevel: RiskLevel.LOW,
    maxInputLength: 10000,
  },
  apply_transformation: {
    allowedOperations: ['read'],
    rateLimit: 100,
    requiresAuth: false,
    riskLevel: RiskLevel.LOW,
    maxInputLength: 10000,
  },
  analyze_problem: {
    allowedOperations: ['read'],
    rateLimit: 50,
    requiresAuth: false,
    riskLevel: RiskLevel.LOW,
    maxInputLength: 10000,
  },
  semantic_search: {
    allowedOperations: ['read'],
    rateLimit: 10,
    requiresAuth: false,
    riskLevel: RiskLevel.MEDIUM,
    maxInputLength: 5000,
  },
};

/**
 * Check if tool call is permitted
 */
export function checkToolPermission(
  toolName: string,
  operation: string,
  inputLength: number,
): { permitted: boolean; reason?: string } {
  const permission = TOOL_PERMISSIONS[toolName];

  if (!permission) {
    return { permitted: false, reason: `Unknown tool: ${toolName}` };
  }

  if (!permission.allowedOperations.includes(operation)) {
    return {
      permitted: false,
      reason: `Operation '${operation}' not allowed for tool '${toolName}'`,
    };
  }

  if (inputLength > permission.maxInputLength) {
    return {
      permitted: false,
      reason: `Input exceeds max length (${permission.maxInputLength} chars)`,
    };
  }

  return { permitted: true };
}

// ============================================================================
// REQUEST SIGNING (for agent-to-agent communication)
// ============================================================================

import { createHmac } from 'crypto';

interface SignedRequest {
  payload: string;
  timestamp: string;
  signature: string;
  agentId: string;
}

/**
 * Constant-time string comparison using Web Crypto API
 * Prevents timing attacks by ensuring comparison takes same time regardless of where strings differ
 */
async function constantTimeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);

  // Handle length mismatch in constant time by padding shorter string
  const maxLen = Math.max(aBytes.length, bBytes.length);
  const aPadded = new Uint8Array(maxLen);
  const bPadded = new Uint8Array(maxLen);
  aPadded.set(aBytes);
  bPadded.set(bBytes);

  // Import both as keys and compare via HMAC to ensure constant-time operation
  const key = await crypto.subtle.importKey(
    'raw',
    new Uint8Array(32), // Fixed key for comparison only
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const [aHash, bHash] = await Promise.all([
    crypto.subtle.sign('HMAC', key, aPadded),
    crypto.subtle.sign('HMAC', key, bPadded),
  ]);

  const aView = new Uint8Array(aHash);
  const bView = new Uint8Array(bHash);

  // XOR comparison - result is same regardless of match position
  let result = 0;
  for (let i = 0; i < aView.length; i++) {
    result |= aView[i] ^ bView[i];
  }

  // Also check original lengths match (after constant-time hash comparison)
  return result === 0 && aBytes.length === bBytes.length;
}

/**
 * Sign a request for secure inter-agent communication
 */
export function signRequest(payload: unknown, agentId: string, secret: string): SignedRequest {
  const timestamp = new Date().toISOString();
  const payloadStr = JSON.stringify(payload);

  // Create signature
  const dataToSign = `${agentId}:${timestamp}:${payloadStr}`;
  const signature = createHmac('sha256', secret).update(dataToSign).digest('hex');

  return {
    payload: payloadStr,
    timestamp,
    signature,
    agentId,
  };
}

/**
 * Verify a signed request
 */
export async function verifyRequest(
  request: SignedRequest,
  secret: string,
  maxAgeMs: number = 5 * 60 * 1000, // 5 minutes
): Promise<{ valid: boolean; reason?: string; payload?: unknown }> {
  // Check timestamp
  const requestTime = new Date(request.timestamp).getTime();
  const now = Date.now();
  if (now - requestTime > maxAgeMs) {
    return { valid: false, reason: 'Request expired (possible replay attack)' };
  }

  // Recreate signature
  const dataToSign = `${request.agentId}:${request.timestamp}:${request.payload}`;
  const expectedSignature = createHmac('sha256', secret).update(dataToSign).digest('hex');

  // Verify signature using constant-time comparison to prevent timing attacks
  const signaturesMatch = await constantTimeEqual(request.signature, expectedSignature);
  if (!signaturesMatch) {
    return { valid: false, reason: 'Invalid signature' };
  }

  // Parse payload
  try {
    const payload = JSON.parse(request.payload);
    return { valid: true, payload };
  } catch {
    return { valid: false, reason: 'Invalid payload format' };
  }
}
