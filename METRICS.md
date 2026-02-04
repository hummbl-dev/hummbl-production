# HUMMBL Metrics Baseline

**Established**: February 4, 2026  
**Last Updated**: February 4, 2026  
**Update Frequency**: Weekly (manual until automated)

---

## 🎯 Phase 0 Goals (To Be Defined)

| Metric                  | Target | Current | Status                  |
| ----------------------- | ------ | ------- | ----------------------- |
| MCP Weekly Downloads    | TBD    | 9       | 📊 Baseline             |
| Web Weekly Visitors     | TBD    | TBD     | ⏳ Pending CF Analytics |
| API Weekly Active Users | TBD    | TBD     | ✅ Live (2026-02-04)    |
| Case Studies Completed  | 3      | 0/3     | 📋 Not started          |

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

### Current Stats (as of 2026-02-04)

| Metric             | Value   |
| ------------------ | ------- |
| **Total Requests** | **TBD** |
| **Unique IPs**     | **TBD** |
| Top Endpoints      | TBD     |

### Endpoints

| Endpoint               | Status   | Description                |
| ---------------------- | -------- | -------------------------- |
| `GET /health`          | ✅ Live  | Health check               |
| `GET /v1/models`       | ✅ Live  | List all models            |
| `GET /v1/models/:code` | ✅ Live  | Get model by code          |
| `POST /v1/recommend`   | ✅ Live  | Get recommendations        |
| `GET /metrics`         | ✅ Live  | System metrics             |
| `GET /analytics`       | ⏳ Ready | Usage analytics (needs KV) |

### Status

⏳ **Analytics module implemented** - awaiting KV namespace creation and deployment.

**To activate**:

1. Create KV namespace: `wrangler kv:namespace create "ANALYTICS_KV"`
2. Update `api/wrangler.toml` with KV namespace ID
3. Deploy: `wrangler deploy`

---

## 📊 Weekly Trends

### MCP Downloads

```
Week of 2026-01-28: 9 downloads ▬▬▬▬▬▬▬▬▬▬
```

### Combined Weekly Active Users (WAU)

| Week       | MCP Installs | Web Visitors | API Users | Total WAU |
| ---------- | ------------ | ------------ | --------- | --------- |
| 2026-01-28 | 9            | TBD          | TBD       | TBD       |

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

**2026-02-04**: Analytics infrastructure added. No historical data available prior to this date. Flying blind until now.

**MCP Version Discrepancy**: npm shows v1.0.2, GitHub shows v1.0.0-beta.2. Local publishes were never pushed. Consider syncing or documenting.

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

**Current Status (Feb 4, 16:56 UTC)**:

- API: 4 requests since baseline reset
- Web: TBD (CF Analytics propagating, 2-5 min delay)
- MCP: 9 weekly downloads
