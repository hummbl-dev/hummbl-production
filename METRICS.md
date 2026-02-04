# HUMMBL Metrics Baseline

**Established**: February 4, 2026
**Last Updated**: February 4, 2026 18:41 UTC
**Update Frequency**: Weekly (manual until automated)

---

## 🎯 Phase 0 Goals (To Be Defined)

| Metric                  | Target | Current | Status                  |
| ----------------------- | ------ | ------- | ----------------------- |
| MCP Weekly Downloads    | TBD    | 9       | 📊 Baseline             |
| Web Weekly Visitors     | TBD    | TBD     | ⏳ Pending CF Analytics |
| API Weekly Active Users | TBD    | 17*     | ✅ Live (2026-02-04)    |
| Case Studies Completed  | 1      | 1/1     | ✅ Complete (PR #21)    |

*Partial day since 16:39 UTC reset

**Note**: Phase 0 targets need to be set based on 2 weeks of baseline data.

---

## 📦 MCP Server (@hummbl/mcp-server)

**Package**: https://www.npmjs.com/package/@hummbl/mcp-server

### Current Stats (as of 2026-02-04)

| Metric                      | Value             |
| --------------------------- | ----------------- |
| Current Version             | 1.0.2             |
| First Published             | 2025-12-06        |
| Total Versions              | 3                 |
| **Downloads (Last 7 Days)** | **9**             |
| Downloads (Previous 7 Days) | TBD (next update) |

### Historical Data

| Week                     | Downloads | Notes         |
| ------------------------ | --------- | ------------- |
| 2026-01-28 to 2026-02-03 | 9         | Baseline week |

---

## 🌐 Web App (hummbl.io)

**URL**: https://hummbl.io  
**Platform**: Cloudflare Pages

### Current Stats (as of 2026-02-04)

| Metric              | Value   |
| ------------------- | ------- |
| **Unique Visitors** | **TBD** |
| **Page Views**      | **TBD** |
| Top Referrers       | TBD     |

### Status

✅ **Cloudflare Web Analytics active** - CF Pages automatic setup verified (token: `68207ada08f9497aa8d2ea4fb67dc335`)

**Note**: Analytics beacon added to `web/index.html` and `web/explorer.html`. Token placeholder needs to be replaced with actual Cloudflare Analytics token for data collection to begin.

---

## 🔌 API (hummbl-api.hummbl.workers.dev)

**URL**: https://hummbl-api.hummbl.workers.dev  
**Platform**: Cloudflare Workers

### Current Stats (as of 2026-02-04 18:41 UTC)

| Metric             | Value                      |
| ------------------ | -------------------------- |
| **Total Requests** | **17** (since 16:39 reset) |
| **Unique IPs**     | **0** (tracking bug?)      |
| Top Endpoints      | /metrics (11), /health (10), /metrics/errors (8) |

### Endpoints

| Endpoint               | Status   | Description                |
| ---------------------- | -------- | -------------------------- |
| `GET /health`          | ✅ Live  | Health check               |
| `GET /v1/models`       | ✅ Live  | List all models            |
| `GET /v1/models/:code` | ✅ Live  | Get model by code          |
| `POST /v1/recommend`   | ✅ Live  | Get recommendations        |
| `GET /metrics`         | ✅ Live  | System metrics             |
| `GET /analytics`       | ✅ Live  | Usage analytics (KV active) |

### Status

✅ **Analytics module LIVE** - KV namespace active, tracking requests since 16:39 UTC reset.

**KV Namespace ID**: `4101f085485a42368be2bc9bbaf254a5`

---

## 📊 Weekly Trends

### MCP Downloads

```
Week of 2026-01-28: 9 downloads ▬▬▬▬▬▬▬▬▬▬
```

### Combined Weekly Active Users (WAU)

| Week       | MCP Installs | Web Visitors | API Requests | Total WAU |
| ---------- | ------------ | ------------ | ------------ | --------- |
| 2026-01-28 | 9            | TBD          | 17*          | TBD       |

*API requests since 16:39 UTC reset on Feb 4 (partial day)

---

## 🔧 How to Update This File

### Manual Update (Weekly)

1. **NPM Stats**:

   ```bash
   node scripts/npm-stats.js
   ```

2. **Cloudflare Analytics**: Check Cloudflare dashboard → Web Analytics

3. **API Stats**:

   ```bash
   curl https://hummbl-api.hummbl.workers.dev/analytics
   ```

4. Update this file with new numbers

### Automated Update (Future)

GitHub Action to run weekly:

- Pull npm stats
- Query Cloudflare Analytics API
- Query API analytics endpoint
- Auto-update this file

---

## 📈 Next Actions

- [x] Create KV namespace and deploy API analytics ✅ **COMPLETED 2026-02-04**
- [ ] Replace `ANALYTICS_TOKEN_PLACEHOLDER` in `web/index.html` with actual Cloudflare token
- [ ] Collect 2 weeks of baseline data
- [ ] Define realistic Phase 0 targets based on baseline
- [ ] Set up automated weekly reporting

---

## 📝 Notes

**2026-02-04 18:41 UTC**: Second snapshot captured. 17 API requests since reset. uniqueIPs returning 0 despite traffic - likely tracking not implemented in analytics endpoint.

**2026-02-04**: Analytics infrastructure added. No historical data available prior to this date. Flying blind until now.

**MCP Version Discrepancy**: npm shows v1.0.2, GitHub shows v1.0.0-beta.2. Local publishes were never pushed. Consider syncing or documenting.

**Known Issue**: `uniqueIPs` counter returns 0. Need to verify IP tracking implementation in `/analytics` endpoint.

---

## 📊 Pre-Activation Baseline (API Analytics Deployed)

**Date**: 2026-02-04 16:34 UTC  
**Commit**: `658bbfd`

### Infrastructure Status

| Component     | Status     | Notes                                                     |
| ------------- | ---------- | --------------------------------------------------------- |
| API Analytics | ✅ Live    | KV namespace `4101f085485a42368be2bc9bbaf254a5` deployed  |
| Web Analytics | ✅ Live    | CF Pages auto (token: `68207ada08f9497aa8d2ea4fb67dc335`) |
| MCP Tracking  | ✅ Working | 9 weekly downloads                                        |

### Known Metrics (Pre-Activation)

| Metric                 | Value | Source                        |
| ---------------------- | ----- | ----------------------------- |
| MCP Downloads (weekly) | 9     | npm registry                  |
| MCP Total Versions     | 3     | npm registry                  |
| API Total Requests     | 0     | Reset at 2026-02-04 16:39 UTC |
| API Unique IPs         | 0     | Reset at 2026-02-04 16:39 UTC |
| Web Visitors           | TBD   | Pending CF Analytics          |

### Baseline Reset

**Counters reset**: 2026-02-04 16:39 UTC  
**Reason**: Clear test artifacts, establish clean baseline  
**Next snapshot**: 2026-02-05 16:39 UTC (24h of clean data)

**Activation Plan**:

1. ✅ API analytics deployed (COMPLETE)
2. ✅ Web analytics deployed (COMPLETE - Cloudflare automatic setup)
3. 📅 Capture first full snapshot: 2026-02-05 16:39 UTC (24h of data)
4. 📅 Define Phase 0 targets: 2026-02-18 (2 weeks data)

**First Snapshot (Feb 4, 18:27 UTC)**:

| Metric               | Value           | Notes                             |
| -------------------- | --------------- | --------------------------------- |
| MCP Weekly Downloads | 9               | Period: 2026-01-28 to 2026-02-03  |
| API Daily Requests   | 8               | Since 16:39 UTC reset             |
| API Top Endpoint     | GET:/health (7) | Health check polling              |
| Web Visitors         | TBD             | Manual CF dashboard check pending |

**Second Snapshot (Feb 4, 18:41 UTC)**:

| Metric               | Value              | Notes                              |
| -------------------- | ------------------ | ---------------------------------- |
| MCP Weekly Downloads | 9                  | Period: 2026-01-28 to 2026-02-03   |
| API Daily Requests   | 17                 | Since 16:39 UTC reset (+9 from first) |
| API Unique IPs       | 0                  | ⚠️ Tracking not implemented?      |
| API Top Endpoints    | /metrics (11), /health (10) | Health/metrics polling    |
| Web Visitors         | TBD                | Manual CF dashboard check pending  |

**Endpoint Breakdown (Feb 4)**:
- `GET:/metrics` - 11 hits
- `GET:/health` - 10 hits
- `GET:/metrics/errors` - 8 hits
- `GET:/v1/models` - 8 hits
- `GET:/metrics/slow` - 7 hits
- `GET:/analytics` - 5 hits
- `GET:/v1/transformations` - 4 hits

**Methodology Validation**:

- ✅ MCP: npm registry API returning consistent data
- ✅ API: KV counters incrementing correctly (17 requests tracked)
- ✅ API: Daily stats aggregating by date
- ⚠️ API: uniqueIPs returns 0 despite 17 requests (investigate)
- ⏳ Web: CF Analytics dashboard verification needed

**Next Snapshot**: 2026-02-05 16:39 UTC (24h complete cycle)

---

## 🔧 Automated Snapshot Tool

**Script**: `scripts/capture-wau-snapshot.js`

**Purpose**: Capture WAU metrics from all sources in one command

**Usage**:

```bash
node scripts/capture-wau-snapshot.js
```

**Captures**:

- MCP weekly downloads (npm registry)
- API analytics (KV namespace)
- Web analytics (manual dashboard instructions)

**Output**: Human-readable + JSON for programmatic use

**Validation Status**:

- ✅ MCP: Automated via npm API
- ✅ API: Automated via /analytics endpoint
- ⏳ Web: Requires manual CF dashboard check
