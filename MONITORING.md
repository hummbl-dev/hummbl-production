# HUMMBL Production Monitoring

Observability setup for the HUMMBL API and infrastructure.

## Overview

| Component | URL | Purpose |
|-----------|-----|---------|
| Health Check | `GET /health` | Basic health + alerts |
| Metrics | `GET /metrics` | Detailed metrics & performance |
| Errors | `GET /metrics/errors` | Recent error log |
| Slow Requests | `GET /metrics/slow` | Performance bottleneck detection |

## Quick Start

```bash
# Check health
curl https://hummbl-api.hummbl.workers.dev/health

# Get detailed metrics
curl https://hummbl-api.hummbl.workers.dev/metrics

# View recent errors
curl https://hummbl-api.hummbl.workers.dev/metrics/errors

# Find slow requests (>1000ms)
curl https://hummbl-api.hummbl.workers.dev/metrics/slow?threshold=1000
```

## Health Endpoint

```json
GET /health
{
  "status": "healthy",           // or "degraded" if alerts firing
  "version": "1.0.0",
  "timestamp": "2026-02-03T18:42:48.323Z",
  "uptime_ms": 1770144168323,
  "models_count": 120,
  "rate_limit_status": {
    "active_ips": 1,
    "window_ms": 60000,
    "max_requests_per_minute": 100
  },
  "alerts": [                    // Only present if issues detected
    "High error rate: 5.5%",
    "High latency: 2300ms avg"
  ]
}
```

## Metrics Endpoint

```json
GET /metrics
{
  "success": true,
  "timestamp": "2026-02-03T18:42:48.323Z",
  "metrics": {
    "requests": {
      "total": 15420,
      "last_minute": 45,
      "last_5_minutes": 210,
      "rate_per_second": 0.75
    },
    "errors": {
      "total": 23,
      "last_minute": 1,
      "last_5_minutes": 3,
      "error_rate": 2.2
    },
    "performance": {
      "avg_response_time_ms": 145,
      "p95_response_time_ms": 320
    },
    "top_endpoints": [
      ["GET /v1/models", 5234],
      ["POST /v1/recommend", 3421],
      ["GET /health", 2890]
    ],
    "error_breakdown": [
      ["GET /v1/models:NotFound", 12],
      ["POST /v1/recommend:ValidationError", 8]
    ]
  },
  "alerts": []
}
```

## Alert Conditions

Automatic alerts trigger when:

| Condition | Threshold | Action |
|-----------|-----------|--------|
| Error Rate | > 5% | Health status → "degraded" |
| Avg Response Time | > 2000ms | Health status → "degraded" |
| Request Spike | > 1000 req/min | Health status → "degraded" |

## Cloudflare Dashboard Monitoring

### Analytics
- Log into [Cloudflare Dashboard](https://dash.cloudflare.com)
- Select your Worker: `hummbl-api`
- View: HTTP Traffic, Errors, CPU Time

### Key Metrics to Watch
- **Requests/sec**: Baseline ~10-50, spike > 100
- **Error rate**: Target < 1%, alert > 5%
- **Median CPU time**: Target < 10ms
- **95th percentile**: Target < 100ms

### Log Retention
- Cloudflare Workers: 7 days via dashboard
- Real-time logs: Use `wrangler tail`

## Monitoring Scripts

### Local Monitoring
```bash
# Watch logs in real-time
npx wrangler tail

# Health check script
#!/bin/bash
while true; do
  curl -s https://hummbl-api.hummbl.workers.dev/health | jq .
  sleep 30
done
```

### External Monitoring (Uptime)
Set up external ping monitoring:
- **URL**: `https://hummbl-api.hummbl.workers.dev/health`
- **Interval**: 1 minute
- **Expected**: HTTP 200, JSON with `status: "healthy"`

Services: UptimeRobot, Pingdom, StatusCake

## Log Aggregation

### Structured Logging
All logs use JSON format:
```json
{
  "timestamp": "2026-02-03T18:42:48.323Z",
  "level": "error",
  "message": "Pinecone search failed",
  "endpoint": "POST /v1/semantic-search",
  "error": "503 Service Unavailable"
}
```

### Integration Options

**Option 1: Cloudflare Logpush**
- Enterprise feature
- Push logs to S3, Datadog, Splunk

**Option 2: Custom Logging Service**
- Add POST endpoint to receive logs
- Forward to your own aggregator

**Option 3: Client-side Collection**
- Poll `/metrics` endpoint periodically
- Store in your own time-series DB

## Performance Baselines

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Avg Response | < 100ms | 100-500ms | > 500ms |
| P95 Response | < 200ms | 200-1000ms | > 1000ms |
| Error Rate | < 1% | 1-5% | > 5% |
| Requests/min | < 1000 | 1000-5000 | > 5000 |

## Troubleshooting with Metrics

### High Error Rate
```bash
# Check what's failing
curl https://hummbl-api.hummbl.workers.dev/metrics/errors?limit=20

# Look for patterns in error breakdown
```

### Slow Response Times
```bash
# Find slow endpoints
curl https://hummbl-api.hummbl.workers.dev/metrics/slow?threshold=500

# Check if specific endpoint is slow
curl https://hummbl-api.hummbl.workers.dev/metrics | jq '.metrics.top_endpoints'
```

### Rate Limiting Issues
```bash
# Check active IPs
curl https://hummbl-api.hummbl.workers.dev/health | jq '.rate_limit_status'

# If high, check geographic distribution in Cloudflare dashboard
```

## Deployment Checklist

Before deploying monitoring changes:
- [ ] Run `npm test` - all tests pass
- [ ] Run `npm run lint` - no errors
- [ ] Deploy with `npm run deploy`
- [ ] Verify `/health` returns 200
- [ ] Verify `/metrics` returns data
- [ ] Check Cloudflare dashboard for errors

## Related Files

- `api/src/monitoring.ts` - Metrics collection logic
- `api/src/index.ts` - Metrics endpoints
- `DEPLOYMENT.md` - Deployment procedures
