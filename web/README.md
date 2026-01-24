# HUMMBL Landing Page

Single-page lead generation site.

## What It Does

- Shows value prop
- Proves API works (working curl snippet)
- Books discovery calls (Cal.com)
- MCP setup instructions

## Deploy to Cloudflare Pages

1. Push this repo to GitHub
2. Cloudflare Pages → Create Project
3. Connect GitHub repo
4. Build settings:
   - **Build command:** (leave empty)
   - **Build output:** `web`
   - **Root directory:** `web`
5. Deploy

## Update Booking Link

Replace `https://cal.com/yourname/30min` with your actual Cal.com link in `index.html`.

## Local Preview

```bash
python3 -m http.server 8000
open http://localhost:8000
```
