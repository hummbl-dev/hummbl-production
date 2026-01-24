# HUMMBL Production

**Single source of truth for hummbl.io production system.**

## Purpose

Lead generation for HUMMBL Base120 mental models framework:
- Show people the MCP server works
- Book discovery calls
- Demonstrate the system

## Structure

```
/api        Cloudflare Worker - REST API for Base120 models
/web        Static site - Lead generation landing page
```

## Deployments

| Component | Platform | URL |
|-----------|----------|-----|
| API | Cloudflare Workers | https://hummbl-api.hummbl.workers.dev |
| Web | Cloudflare Pages | https://hummbl.io |

## MCP Server

The MCP server is published separately: [@hummbl/mcp-server](https://www.npmjs.com/package/@hummbl/mcp-server)

Repository: https://github.com/hummbl-dev/mcp-server

## Quick Start

### API Development
```bash
cd api
npm install
npm run dev
```

### Web Development
```bash
cd web
npm install
npm run dev
```

## What Happened to Other Repos?

Previous repos (hummbl-systems, hummbl-api, etc.) are archived. This is the only active production repo.

**One repo. One truth.**
