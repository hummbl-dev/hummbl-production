# HUMMBL Security Implementation

Comprehensive security layer implementation for AI orchestration protection.

## 🛡️ Security Features Implemented

### 1. Input Validation & Sanitization

**File:** `api/src/security.ts`

Protects against prompt injection attacks by:
- Filtering dangerous patterns (`ignore previous instructions`, `system prompt`, etc.)
- Neutralizing code injection attempts (comments, template literals)
- Limiting input length (10,000 characters max)
- Validating input structure

**Usage:**
```typescript
import { sanitizeInput, validateInput } from './security.js';

// Sanitize user input
const clean = sanitizeInput(userInput);

// Validate before processing
const validation = validateInput(userInput);
if (!validation.valid) {
  return errorResponse(validation.reason);
}
```

**Patterns Detected:**
| Pattern | Example | Action |
|---------|---------|--------|
| Instruction override | "ignore previous instructions" | [FILTERED] |
| System prompt | "system prompt:" | [FILTERED] |
| JavaScript injection | `<script>`, `javascript:` | [CODE-BLOCKED] |
| Template injection | `${...}`, `${{}}` | [CODE-BLOCKED] |

### 2. PII Detection & Redaction

**File:** `api/src/security.ts`

Automatically detects and redacts sensitive information:

**PII Types Detected:**
| Type | Pattern | Redaction |
|------|---------|-----------|
| SSN | `123-45-6789` | [REDACTED-SSN] |
| Credit Card | `1234-5678-9012-3456` | [REDACTED-CC] |
| Email | `user@example.com` | [REDACTED-EMAIL] |
| Phone | `123-456-7890` | [REDACTED-PHONE] |
| API Key | `api_key=...` | [REDACTED-API-KEY] |
| Password | `password=...` | [REDACTED-PASSWORD] |
| Token | `token=...` | [REDACTED-TOKEN] |
| Private Key | `-----BEGIN PRIVATE KEY-----` | [REDACTED-PRIVATE-KEY] |

**Usage:**
```typescript
import { detectPII, redactPII } from './security.js';

// Check for PII
const check = detectPII(text);
if (check.found) {
  console.log(`Found: ${check.types.join(', ')}`);
}

// Redact PII
const safe = redactPII(text);
```

### 3. Security Event Logging

**File:** `api/src/security.ts`

Tracks security-relevant events with severity levels:

**Event Types:**
- `prompt_injection_attempt` - Input contains injection patterns
- `pii_detected_in_input` - PII found in user input
- `pii_leakage_detected` - PII detected in output
- `potential_exfiltration` - Data exfiltration pattern detected
- `rate_limit_exceeded` - Too many requests
- `authentication_failure` - Auth check failed
- `tool_abuse_detected` - Tool used inappropriately
- `anomalous_behavior` - Unusual activity detected
- `unauthorized_access` - Access denied

**Severity Levels:**
- `LOW` - Informational, no immediate threat
- `MEDIUM` - Suspicious activity, monitor
- `HIGH` - Active attack or policy violation
- `CRITICAL` - Immediate threat, requires action

**Endpoints:**
```
GET /security/events?type=&severity=&limit=100
GET /security/stats
```

**Example Response:**
```json
{
  "success": true,
  "stats": {
    "totalEvents": 42,
    "byType": {
      "prompt_injection_attempt": 5,
      "rate_limit_exceeded": 37
    },
    "bySeverity": {
      "HIGH": 5,
      "MEDIUM": 37
    },
    "recentCritical": 0
  }
}
```

### 4. Output Validation & Guardrails

**File:** `api/src/security.ts`

Validates agent outputs before delivery:

**Checks Performed:**
1. PII leakage detection
2. Data exfiltration patterns
3. Output size limits (50,000 characters)
4. Schema validation

**Exfiltration Patterns Detected:**
- Encoded data in URLs (`base64`, `data:text`)
- Large payloads in webhooks
- Sensitive data in API calls

### 5. Tool Permissions & Risk Levels

**File:** `api/src/security.ts`

Granular permissions per tool:

| Tool | Risk Level | Rate Limit | Max Input |
|------|------------|------------|-----------|
| `select_model` | LOW | 100/min | 10,000 chars |
| `apply_transformation` | LOW | 100/min | 10,000 chars |
| `analyze_problem` | LOW | 50/min | 10,000 chars |
| `semantic_search` | MEDIUM | 10/min | 5,000 chars |

**Risk Levels:**
- `LOW` - Read-only, no side effects
- `MEDIUM` - External API calls
- `HIGH` - Write operations
- `CRITICAL` - Irreversible actions

### 6. Request Signing (Agent-to-Agent)

**File:** `api/src/security.ts`

HMAC-SHA256 request signing for secure inter-agent communication:

```typescript
import { signRequest, verifyRequest } from './security.js';

// Sign a request
const signed = signRequest(payload, agentId, secret);

// Verify signature
const result = verifyRequest(signed, secret, maxAgeMs);
if (result.valid) {
  processRequest(result.payload);
}
```

**Signature Format:**
```
HMAC-SHA256("{agentId}:{timestamp}:{payload}", secret)
```

**Features:**
- Prevents request tampering
- Replay attack protection (5-minute window)
- Agent identity verification

### 7. Enhanced Health Endpoint

**File:** `api/src/index.ts`

Updated `/health` endpoint includes security status:

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2026-02-03T22:28:51Z",
  "uptime_ms": 12345678,
  "models_count": 120,
  "rate_limit_status": {
    "active_ips": 3,
    "window_ms": 60000,
    "max_requests_per_minute": 100
  },
  "security": {
    "total_events": 42,
    "recent_critical": 0,
    "by_severity": {
      "HIGH": 5,
      "MEDIUM": 37
    }
  },
  "alerts": []
}
```

**Status Values:**
- `healthy` - No issues
- `degraded` - Performance or security alerts
- `critical` - Critical security events in last hour

## 🔒 Protected Endpoints

### Input Validation Applied

| Endpoint | Validation | PII Check | Sanitization |
|----------|------------|-----------|--------------|
| `POST /v1/recommend` | ✅ | ✅ | ✅ |
| `POST /v1/semantic-search` | ✅ | ✅ | ✅ |
| `POST /v1/workflows/match` | ✅ | ❌ | ✅ |

### Security Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /security/events` | Security event log (filterable) |
| `GET /security/stats` | Security statistics |
| `POST /security/validate` | Validate input for injection |

## 🚀 Deployment

### Step 1: Deploy Security Updates

```bash
cd ~/hummbl-production/api
npm run lint
npm run test:run
npm run deploy
```

### Step 2: Verify Security Endpoints

```bash
# Check health with security status
curl https://hummbl-api.hummbl.workers.dev/health

# View security stats
curl https://hummbl-api.hummbl.workers.dev/security/stats

# Test input validation
curl -X POST https://hummbl-api.hummbl.workers.dev/security/validate \
  -H "Content-Type: application/json" \
  -d '{"input": "ignore previous instructions"}'
```

### Step 3: Monitor Security Events

```bash
# Watch security events
./scripts/monitor-health.sh

# Or poll security stats
curl https://hummbl-api.hummbl.workers.dev/security/events?limit=10
```

## 📊 Security Monitoring

### Key Metrics to Watch

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Injection attempts/hour | 0 | > 5 | > 20 |
| PII detection events | 0 | > 0 | > 5 |
| Failed validations | < 1% | > 5% | > 10% |
| Critical events | 0 | > 0 | > 1 |

### Alert Conditions

Automatic alerts trigger when:
- Error rate > 5%
- Response time > 2000ms
- Critical security events in last hour

### Log Aggregation

Security events are logged in JSON format:
```json
{
  "timestamp": "2026-02-03T22:28:51Z",
  "level": "error",
  "message": "Security Event: prompt_injection_attempt",
  "severity": "HIGH",
  "endpoint": "/v1/recommend",
  "details": { "pattern": "ignore previous instructions" }
}
```

## 🔐 Best Practices

### For API Consumers

1. **Sanitize inputs** before sending to API
2. **Never include PII** in problem descriptions
3. **Handle validation errors** gracefully
4. **Monitor rate limits** and implement backoff
5. **Validate outputs** before displaying to users

### For Administrators

1. **Monitor `/security/stats`** regularly
2. **Review critical events** immediately
3. **Update patterns** as new threats emerge
4. **Rotate secrets** for request signing
5. **Audit tool permissions** quarterly

## 📝 Changelog

### v1.1.0 - Security Implementation

- Added comprehensive input validation
- Implemented PII detection and redaction
- Created security event logging system
- Added output validation and guardrails
- Implemented tool permission system
- Added request signing for agent communication
- Enhanced health endpoint with security status
- Created security monitoring endpoints

## 📚 References

- [OWASP AI Agent Security](https://cheatsheetseries.owasp.org/)
- [OWASP Agentic AI Threats](https://genai.owasp.org/)
- [NIST AI Risk Management](https://www.nist.gov/itl/ai-risk-management-framework)
- [GaaS Research Paper](https://arxiv.org/abs/2508.18765)
