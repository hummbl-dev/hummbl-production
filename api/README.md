# HUMMBL API

Mental models API for AI agents. Simple, working, deploy-ready.

## What It Does

- **GET /health** - Health check (returns model count)
- **GET /v1/models** - List all 120 models
- **GET /v1/models/:code** - Get specific model (e.g., P1)
- **POST /v1/recommend** - Get recommendations for a problem
- **GET /v1/transformations** - List 6 transformations

## Run Locally

```bash
npm install
npm run dev
```

Test:

```bash
curl http://localhost:8787/health
curl http://localhost:8787/v1/models/P1
```

## Deploy

```bash
npx wrangler login
npm run deploy
```

Deploys to: `https://hummbl-api.hummbl.workers.dev`

## Data

All 120 mental models are inline in `src/base120.ts`. No database needed.

## Tech

- Hono (web framework)
- Cloudflare Workers
- TypeScript
