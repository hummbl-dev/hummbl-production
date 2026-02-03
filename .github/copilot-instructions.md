# AI Agent Instructions for HUMMBL Production

## Project Overview

HUMMBL Production is a **lean, production-grade system** serving the HUMMBL Base120 mental models framework:
- **API**: Cloudflare Workers runtime exposing Base120 models (120 mental models across 6 transformations: P, IN, CO, DE, RE, SY)
- **Web**: Static lead generation site at hummbl.io (Cloudflare Pages)
- **MCP Server**: Published separately as `@hummbl/mcp-server` (not in this repo)

## Architecture & Data Flow

### Base120 Framework (Core Domain)

The system revolves around **120 mental models** organized into 6 transformation domains:

| Code | Domain | Count | Example Models |
|------|--------|-------|-----------------|
| **P** | Perspective | 20 | P1 (First Principles), P2 (Stakeholder Mapping) |
| **IN** | Inversion | 20 | IN1 (Reverse Engineering), IN5 (Failure Post-mortem) |
| **CO** | Composition | 20 | CO3 (Common Ground), CO9 (Pattern Matching) |
| **DE** | Decomposition | 20 | DE1 (Fundamental Truths), DE2 (Why Ladder) |
| **RE** | Recursion | 20 | RE1 (Continuous Improvement), RE4 (Self-Reference) |
| **SY** | Systems | 20 | SY1 (Feedback Loops), SY3 (2nd/3rd Order Effects) |

**Source of truth**: [api/src/base120.ts](../api/src/base120.ts) - Contains 900+ lines defining all models with code, name, definition, and priority.

### API Architecture

- **Framework**: Hono (lightweight, Cloudflare Workers native)
- **Key modules**:
  - [api/src/index.ts](../api/src/index.ts) - 7 core endpoints + middleware (CORS, security headers, rate limiting)
  - [api/src/base120.ts](../api/src/base120.ts) - Model definitions + helper functions (`getAllModels()`, `getModelByCode()`)
  - [api/src/workflows.ts](../api/src/workflows.ts) - Curated sequences of 3+ models for problem patterns (e.g., "Strategic Decision" uses DE1→P2→IN1→SY3→DE15)
  - [api/src/recommend.ts](../api/src/recommend.ts) - Recommendation engine (matches problem text to models)
  - [api/src/pinecone.ts](../api/src/pinecone.ts) - Optional semantic search via Pinecone (uses Cloudflare secrets)

### Deployment

| Component | Platform | Env | URL |
|-----------|----------|-----|-----|
| API | Cloudflare Workers | wrangler | `https://hummbl-api.hummbl.workers.dev` |
| Web | Cloudflare Pages | Static | `https://hummbl.io` |

## Development Workflows

### API Development

```bash
cd api
npm install              # Install deps
npm run dev             # Local dev server (http://localhost:8787)
npm test                # Run vitest suite
npm run test:coverage   # Coverage report
npm run lint            # ESLint check
npm run format          # Prettier fix
npm run deploy          # Deploy to Cloudflare Workers
```

**Testing strategy**: Vitest with mocked Cloudflare Workers environment ([api/tests/setup.ts](../api/tests/setup.ts)). Test endpoints in `api/tests/endpoints/` and integration tests in `api/tests/integration/`.

### Web Development

```bash
cd web
npm install             # Install deps (if added)
npm run dev            # Local preview (if dev server configured)
```

**Note**: Web is static HTML + inline CSS/JS. No build step. Deploy via Cloudflare Pages (pushes `web/` directory).

### Deployment Checklist

1. API: Run `npm test && npm run lint` in `/api` before `npm run deploy`
2. Web: Validate static HTML, CSS, JS in `web/` directory
3. Check production URLs post-deploy to ensure health endpoints respond

## Code Patterns & Conventions

### Type Safety (TypeScript)

- **Strict mode enabled** in [api/tsconfig.json](../api/tsconfig.json)
- Use discriminated unions for results: [api/src/types.ts](../api/src/types.ts) defines `type Result<T, E>` with `ok(value)` and `err(error)` helpers
- All API endpoints return structured JSON: `{ success: boolean, data?: T, error?: string }`

### API Endpoint Pattern

```typescript
// In api/src/index.ts
app.get('/v1/models/:code', (c) => {
  const code = c.req.param('code');
  const model = getModelByCode(code);
  if (!model) return c.json({ success: false, error: 'Not found' }, 404);
  return c.json({ success: true, data: model });
});
```

Key patterns:
- Use `c.param()` for URL params, `c.query()` for query strings, `c.req.json()` for body
- Always return `{ success: boolean, data?, error? }` structure
- Rate limiting + security headers applied globally via middleware

### Model Lookup Pattern

```typescript
// DON'T: Loop through models
// DO: Use helper functions
getModelByCode('P1')          // Single model by code
getAllModels()                // All 120 models
matchWorkflows(problemText)   // Find workflows for problem
```

See [api/src/base120.ts](../api/src/base120.ts) for all helpers.

### Workflows Pattern

Workflows are curated sequences of models for specific problem types. Example from [api/src/workflows.ts](../api/src/workflows.ts):

```typescript
{
  id: 'strategic-decision',
  name: 'Strategic Decision Making',
  problemTypes: ['decision', 'strategy', 'choose'], // Keywords that trigger
  steps: [
    { order: 1, modelCode: 'DE1', purpose: 'Break down to fundamental truths' },
    { order: 2, modelCode: 'P2', purpose: 'Map stakeholders' },
    // ...
  ]
}
```

When adding workflows, ensure steps are **ordered** and purposes are **explicit**.

## Integration Points & Dependencies

### External Services

- **Cloudflare Workers**: API runtime + secret management ([wrangler.toml](../wrangler.toml))
- **Cloudflare Pages**: Static hosting for web
- **Pinecone** (optional): Semantic search via API key in Cloudflare secrets

### Environment & Configuration

- **Secrets**: Store in Cloudflare (accessed via `c.env.PINECONE_API_KEY`, etc.)
- **wrangler.toml**: Defines Worker bindings, routes, build configuration

### MCP Server Relationship

This repo is **NOT** the MCP server. The MCP server is published separately:
- Repo: <https://github.com/hummbl-dev/mcp-server>
- NPM: `@hummbl/mcp-server`
- This API serves as reference data for MCP server consumers

## Security & Rate Limiting

- **CORS**: Enabled for all origins (public API)
- **Security headers**: CSP, X-Frame-Options, X-XSS-Protection, Referrer-Policy applied globally
- **Rate limiting**: 100 requests/minute per IP (in-memory Map with auto-cleanup)
- **No auth required**: API is public (no API keys needed)

## Recommendation Algorithm Details

[api/src/recommend.ts](../api/src/recommend.ts) uses **multi-stage matching** to suggest relevant models:

### Stage 1: Keyword Extraction
- Strips stopwords, normalizes to lowercase
- Applies simple stemming (removes -ing, -ed, -ly, -tion, etc.) to find word roots
- Example: "implementing feedback" → ["implement", "feedback"]

### Stage 2: Pattern Detection
- Matches problem keywords against 7 curated **problem patterns** (each mapped to transformation domains)
- Patterns include: Perspective keywords like "stakeholder", Inversion keywords like "stuck/obstacle", Decomposition keywords like "complex/overwhelming", etc.
- Each matched pattern applies a **boost multiplier** (1.5–2.0x) to models in that transformation
- Example: "I'm stuck and can't move forward" matches Inversion pattern (keyword "stuck"), boosts IN1–IN20

### Stage 3: Scoring
- Scores each model: keyword overlaps in name/definition + pattern boosts + priority bonus
- Priority (P1 = foundational, P20 = specialized) adds small bonus to fundamental models
- Sorts by score, returns top 5 (or limit specified)
- **Fallback**: If no matches, returns all priority-1 models as universal starting points

### Extending Recommendations
- Add keywords to `PROBLEM_PATTERNS` array to detect new problem types
- Add synonyms to `SYNONYMS` map (e.g., "stuck" → ["blocked", "stalled"]) to improve matching
- Adjust boost multipliers in patterns if certain transformations over/under-match

## Pinecone Semantic Search

[api/src/pinecone.ts](../api/src/pinecone.ts) enables AI-powered semantic matching (optional, requires API key):

### Setup
1. Store Pinecone API key in Cloudflare Secrets: `wrangler secret put PINECONE_API_KEY`
2. Optional: Override index host if using custom Pinecone namespace

### How It Works
- Accepts natural language query (e.g., "How do I handle team conflicts?")
- Sends to Pinecone with embedded inference (no separate embedding call)
- Returns top 10 semantically similar models + relevance scores
- Falls back to keyword-based recommendation if Pinecone unavailable

### Calling It
```typescript
// In index.ts route
const semanticResult = await semanticSearch(problem, c.env, 10);
if (semanticResult) {
  return c.json({ success: true, data: semanticResult.models, scores: semanticResult.scores });
}
// Fall back to keyword recommendation
const keywordResult = recommendModels(problem, getAllModels());
return c.json({ success: true, data: keywordResult.models });
```

**Gotchas**:
- Pinecone fails gracefully (returns null); keyword recommendation is **always available**
- API host must match index namespace (default: hummbl-models-ss3rcfm.svc...)
- Token usage tracked for cost monitoring

## When Adding Features

1. **New mental models**: Add to `TRANSFORMATIONS` object in [api/src/base120.ts](../api/src/base120.ts)
2. **New endpoints**: Use Hono patterns in [api/src/index.ts](../api/src/index.ts), add tests in `api/tests/`
3. **New workflows**: Add to `WORKFLOWS` array in [api/src/workflows.ts](../api/src/workflows.ts)
4. **New problem patterns**: Add to `PROBLEM_PATTERNS` in [api/src/recommend.ts](../api/src/recommend.ts)
5. **Type changes**: Update [api/src/types.ts](../api/src/types.ts) first, then implement
6. **Web changes**: Edit static files in `web/` directly (no build required)

## Debugging & Troubleshooting

### API Issues

**Problem**: Endpoint returns 404 or empty results
- **Check**: Did you add models to `TRANSFORMATIONS` in base120.ts? Verify structure matches MentalModel interface
- **Check**: Rate limiting? Add IP allowlist in middleware or increase limit threshold (currently 100 req/min)
- **Check**: Run `npm test` to validate model definitions

**Problem**: Recommendations not matching problem text
- **Debug**: Add keywords to `PROBLEM_PATTERNS` or `SYNONYMS` in recommend.ts
- **Debug**: Test keyword extraction: add console.log in `extractKeywords()` to see parsed terms
- **Debug**: Check stemming logic—may be too aggressive. Adjust suffix list if needed

**Problem**: Pinecone search returns null/fails silently
- **Check**: Is `PINECONE_API_KEY` set in Cloudflare Secrets? Try `wrangler secret list`
- **Check**: Is index host correct? Verify in [api/src/pinecone.ts](../api/src/pinecone.ts) DEFAULT_INDEX_HOST
- **Fallback**: Keyword recommendation will activate; Pinecone is optional

**Problem**: Tests fail with "Pinecone search error"
- **Expected**: Pinecone tests skip if API key not available (graceful degradation)
- **Check**: Ensure test setup mocks fetch or PINECONE_API_KEY is undefined

**Problem**: Deployment fails
- **Check**: Run `npm run lint` first—ESLint catches TS errors before deploy
- **Check**: Verify wrangler.toml is valid TOML (quotes, spacing)
- **Check**: Try `wrangler publish --dry-run` to preview without deploying

### Web Issues

**Problem**: Static site not loading at hummbl.io
- **Check**: Verify files in `web/` directory (index.html, explorer.html, CSS, JS)
- **Check**: HTML references assets with correct paths (relative or absolute)
- **Check**: Cloudflare Pages is connected to `web/` output directory in wrangler.toml

**Problem**: Explorer doesn't connect to API
- **Check**: CORS enabled in [api/src/index.ts](../api/src/index.ts) (`app.use('*', cors())`)
- **Check**: API URL in HTML is `https://hummbl-api.hummbl.workers.dev` (not localhost)
- **Check**: Browser console for 403 (CORS) or 404 (wrong endpoint)

### Development Environment Issues

**Problem**: `npm run dev` fails or crashes
- **Check**: Node version matches .nvmrc (if present). Try `nvm use`
- **Check**: Dependencies installed: `npm install` in `/api` folder
- **Check**: Port 8787 available? Try `lsof -i :8787` to check
- **Check**: wrangler authenticated? Try `wrangler login`

**Problem**: Tests timeout or hang
- **Check**: Test filter too broad? Use `npm run test -- --grep "pattern"` for specific tests
- **Check**: Mock not set up? Verify [api/tests/setup.ts](../api/tests/setup.ts) runs before tests
- **Check**: Infinite loop in test? Check recommendation algorithm with empty input

**Problem**: TypeScript compilation errors
- **Check**: tsconfig.json strict mode enabled—all types must be explicit
- **Check**: Missing type annotations on function parameters?
- **Check**: Circular imports? Check import order in api/src/

### Cross-Folder Structure Guidance

Your machine has multiple HUMMBL repos. Understanding the split:

| Folder | Purpose | Key Files |
|--------|---------|-----------|
| **hummbl-production** | Production system (API + landing page) | api/, web/, wrangler.toml |
| **hummbl-monorepo** | Internal tooling (agents-guidelines branch) | agents/, commands/, skills/ |
| **mcp-server** | Published npm package (@hummbl/mcp-server) | src/, package.json |
| **workspace/** | Local scaffolding/templates | MACHINE_SCAFFOLDING.md |

**Cross-repo debugging**:
- hummbl-production API serves data that mcp-server consumers use—if API changes, test mcp-server integration
- monorepo agents reference Base120 models—sync model definitions if updated
- mcp-server package exports should match production API response shapes

### Common Setup Pitfalls

1. **Wrong folder**: You're in hummbl-monorepo but editing hummbl-production code
   - Check: `pwd` and git remote (`git remote -v`)
   
2. **Version mismatches**: Node/npm versions differ between projects
   - Check: `.nvmrc` or package.json engines field
   - Fix: `nvm use` or `node --version`

3. **API key leaks**: Committing secrets (ANTHROPIC_API_KEY, etc.)
   - **Use**: Cloudflare Secrets for deployed keys, .env.example + .gitignore for local
   - **Check**: `git log --all -S "sk-"` to scan history

4. **Model data desync**: base120.ts changed but old versions still cached
   - **Fix**: Clear `npm cache`, delete node_modules, reinstall
   - **Fix**: Check if models are hardcoded elsewhere

## Critical Files Reference

- [api/src/index.ts](../api/src/index.ts) - All API endpoints
- [api/src/base120.ts](../api/src/base120.ts) - 120 models definition (read-only source of truth)
- [api/src/types.ts](../api/src/types.ts) - Domain types and Result type
- [api/src/workflows.ts](../api/src/workflows.ts) - Curated problem→model sequences
- [api/src/recommend.ts](../api/src/recommend.ts) - Recommendation algorithm + pattern matching
- [api/src/pinecone.ts](../api/src/pinecone.ts) - Semantic search integration
- [DEPLOYMENT.md](../DEPLOYMENT.md) - Live endpoint URLs and status
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Code review + testing expectations
- [wrangler.toml](../wrangler.toml) - Cloudflare Workers configuration
