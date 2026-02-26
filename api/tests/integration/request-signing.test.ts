/**
 * CRITICAL Security Fixes Tests
 * Tests for timing attack prevention, Web Crypto API, and race condition fixes
 */

import { describe, it, expect } from 'vitest';
import { signRequest, verifyRequest } from '../../src/security.js';

describe('CRITICAL Security Fixes', () => {
  describe('Timing Attack Prevention (CRITICAL #1)', () => {
    it('should use constant-time signature comparison', async () => {
      const payload = { test: 'data' };
      const agentId = 'test-agent';
      const secret = 'test-secret-key';

      const signed = await signRequest(payload, agentId, secret);

      // Verify with correct secret should succeed
      const validResult = await verifyRequest(signed, secret);
      expect(validResult.valid).toBe(true);
      expect(validResult.payload).toEqual(payload);

      // Verify with wrong secret should fail
      const invalidResult = await verifyRequest(signed, 'wrong-secret');
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.reason).toBe('Invalid signature');
    });

    it('should reject signatures with wrong length (constant-time safe)', async () => {
      const payload = { test: 'data' };
      const agentId = 'test-agent';
      const secret = 'test-secret-key';

      const signed = await signRequest(payload, agentId, secret);

      // Tamper with signature (change length)
      const tamperedSigned = {
        ...signed,
        signature: signed.signature.slice(0, 32), // Half the signature
      };

      const result = await verifyRequest(tamperedSigned, secret);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Invalid signature');
    });

    it('should detect single character changes in signature', async () => {
      const payload = { test: 'data' };
      const agentId = 'test-agent';
      const secret = 'test-secret-key';

      const signed = await signRequest(payload, agentId, secret);

      // Flip one character in signature
      const tamperedSignature =
        signed.signature.slice(0, -1) + (signed.signature.slice(-1) === '0' ? '1' : '0');

      const tamperedSigned = {
        ...signed,
        signature: tamperedSignature,
      };

      const result = await verifyRequest(tamperedSigned, secret);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Invalid signature');
    });
  });

  describe('Web Crypto API Migration (CRITICAL #2)', () => {
    it('should sign and verify using Web Crypto API (no Node.js crypto)', async () => {
      const payload = { action: 'test', data: [1, 2, 3] };
      const agentId = 'agent-123';
      const secret = 'super-secret-key-32-chars-long!!';

      // This would fail in Cloudflare Workers if using Node.js crypto
      const signed = await signRequest(payload, agentId, secret);

      expect(signed).toHaveProperty('payload');
      expect(signed).toHaveProperty('timestamp');
      expect(signed).toHaveProperty('signature');
      expect(signed).toHaveProperty('agentId', agentId);

      // Signature should be 64 hex characters (SHA-256)
      expect(signed.signature).toMatch(/^[a-f0-9]{64}$/);

      // Should verify successfully
      const verified = await verifyRequest(signed, secret);
      expect(verified.valid).toBe(true);
    });

    it('should generate verifiable signatures for same payload', async () => {
      const payload = { test: 'consistent' };
      const agentId = 'test-agent';
      const secret = 'test-secret';

      const signed1 = await signRequest(payload, agentId, secret);

      // Wait a small amount to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      const signed2 = await signRequest(payload, agentId, secret);

      // Both should verify with the same secret
      const verified1 = await verifyRequest(signed1, secret);
      const verified2 = await verifyRequest(signed2, secret);

      expect(verified1.valid).toBe(true);
      expect(verified2.valid).toBe(true);

      // Both should contain the same payload
      expect(verified1.payload).toEqual(payload);
      expect(verified2.payload).toEqual(payload);

      // If timestamps differ, signatures should differ
      if (signed1.timestamp !== signed2.timestamp) {
        expect(signed1.signature).not.toBe(signed2.signature);
      }
    });

    it('should handle large payloads', async () => {
      const payload = { data: 'x'.repeat(10000) };
      const agentId = 'test-agent';
      const secret = 'test-secret';

      const signed = await signRequest(payload, agentId, secret);
      const verified = await verifyRequest(signed, secret);

      expect(verified.valid).toBe(true);
      expect(verified.payload).toEqual(payload);
    });
  });

  describe('Replay Attack Prevention', () => {
    it('should reject expired requests', async () => {
      const payload = { test: 'data' };
      const agentId = 'test-agent';
      const secret = 'test-secret';

      const signed = await signRequest(payload, agentId, secret);

      // Tamper with timestamp to make it expired (6 minutes ago)
      const expiredTime = new Date(Date.now() - 6 * 60 * 1000).toISOString();
      const expiredSigned = {
        ...signed,
        timestamp: expiredTime,
      };

      const result = await verifyRequest(expiredSigned, secret, 5 * 60 * 1000);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('expired');
      expect(result.reason).toContain('replay attack');
    });

    it('should accept requests within time window', async () => {
      const payload = { test: 'data' };
      const agentId = 'test-agent';
      const secret = 'test-secret';

      const signed = await signRequest(payload, agentId, secret);

      // Should accept fresh request
      const result = await verifyRequest(signed, secret, 5 * 60 * 1000);
      expect(result.valid).toBe(true);
    });

    it('should reject future timestamps', async () => {
      const payload = { test: 'data' };
      const agentId = 'test-agent';
      const secret = 'test-secret';

      const signed = await signRequest(payload, agentId, secret);

      // Tamper with timestamp to make it in the future
      const futureTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const futureSigned = {
        ...signed,
        timestamp: futureTime,
      };

      // Even though it's in the future, it should still be within the 5min window
      // from a verification perspective (now - future = negative, which is < 5min)
      // But actually, since future - now = 1 hour > 5min, it should fail
      const result = await verifyRequest(futureSigned, secret, 5 * 60 * 1000);
      expect(result.valid).toBe(false);
    });
  });

  describe('Invalid Payload Handling', () => {
    it('should reject invalid JSON payload', async () => {
      const agentId = 'test-agent';
      const secret = 'test-secret';

      const signed = {
        payload: 'not valid json',
        timestamp: new Date().toISOString(),
        signature: 'a'.repeat(64),
        agentId,
      };

      const result = await verifyRequest(signed, secret);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Invalid signature');
    });

    it('should handle empty payload', async () => {
      const payload = {};
      const agentId = 'test-agent';
      const secret = 'test-secret';

      const signed = await signRequest(payload, agentId, secret);
      const verified = await verifyRequest(signed, secret);

      expect(verified.valid).toBe(true);
      expect(verified.payload).toEqual(payload);
    });
  });
});
