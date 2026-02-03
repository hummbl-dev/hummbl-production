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

### Claude Desktop Setup

Install the MCP server to use HUMMBL directly in Claude Desktop:

```bash
npm install -g @hummbl/mcp-server
```

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "hummbl": {
      "command": "npx",
      "args": ["@hummbl/mcp-server"]
    }
  }
}
```

### Available Tools

- `select_model` - Select appropriate mental models for a problem
- `apply_transformation` - Apply a transformation type to reframe a problem (P, IN, CO, DE, RE, SY)
- `analyze_problem` - Comprehensive analysis using multiple mental models

### Available Resources

- `models://all` - All 120 mental models
- `models://by-transformation` - Models grouped by transformation type
- `relationships://all` - Validated relationships between mental models
- `transformations://overview` - Overview of the 6 transformations

### Available Prompts

- `problem_decomposition` - Systematic 6-transformation problem analysis framework

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
