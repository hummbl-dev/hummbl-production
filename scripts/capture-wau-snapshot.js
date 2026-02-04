#!/usr/bin/env node
/**
 * WAU Snapshot Capture Script
 *
 * Captures Weekly Active Users metrics from all sources:
 * - MCP: npm download stats
 * - API: KV namespace analytics
 * - Web: Cloudflare Analytics (manual dashboard check)
 *
 * Usage: node scripts/capture-wau-snapshot.js
 */

const https = require("https");
const { execSync } = require("child_process");

const PACKAGE = "@hummbl/mcp-server";
const API_BASE = "https://hummbl-api.hummbl.workers.dev";

function fetchNpmStats() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.npmjs.org",
      path: `/downloads/point/last-week/${encodeURIComponent(PACKAGE)}`,
      method: "GET",
      headers: { "User-Agent": "HUMMBL-WAU-Snapshot/1.0" },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}`));
        }
      });
    });

    req.on("error", reject);
    req.end();
  });
}

async function fetchApiAnalytics() {
  try {
    const response = await fetch(`${API_BASE}/analytics`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    return { error: error.message };
  }
}

async function main() {
  const timestamp = new Date().toISOString();

  console.log("📊 HUMMBL WAU Snapshot");
  console.log("======================");
  console.log(`Timestamp: ${timestamp}\n`);

  // MCP Stats
  console.log("📦 MCP Server (@hummbl/mcp-server)");
  try {
    const npmStats = await fetchNpmStats();
    console.log(`  Weekly Downloads: ${npmStats.downloads.toLocaleString()}`);
    console.log(`  Period: ${npmStats.start} to ${npmStats.end}`);
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
  }

  // API Stats
  console.log("\n🔌 API Analytics");
  try {
    const apiStats = await fetchApiAnalytics();
    if (apiStats.error) {
      console.log(`  ❌ Error: ${apiStats.error}`);
    } else {
      console.log(`  Total Requests: ${apiStats.totalRequests}`);
      console.log(`  Unique IPs: ${apiStats.uniqueIPs}`);
      console.log(`  Daily Stats (last 7 days):`);
      apiStats.dailyStats.forEach((day) => {
        console.log(`    ${day.date}: ${day.requests} requests`);
      });
      console.log(`  Top Endpoints:`);
      apiStats.topEndpoints.slice(0, 5).forEach((ep) => {
        console.log(`    ${ep.endpoint}: ${ep.count}`);
      });
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
  }

  // Web Stats (manual check reminder)
  console.log("\n🌐 Web Analytics");
  console.log("  ⚠️  Manual check required:");
  console.log("  1. Go to https://dash.cloudflare.com");
  console.log("  2. Analytics & Logs → Web Analytics");
  console.log("  3. Select site: hummbl.io");
  console.log("  4. Note: Unique visitors, Page views, Top paths");

  // Output JSON for programmatic use
  console.log("\n📤 Raw Output (JSON):");
  const snapshot = {
    timestamp,
    mcp: { package: PACKAGE, weeklyDownloads: null },
    api: null,
    web: { note: "Manual dashboard check required" },
  };

  try {
    const npmStats = await fetchNpmStats();
    snapshot.mcp.weeklyDownloads = npmStats.downloads;
    snapshot.mcp.periodStart = npmStats.start;
    snapshot.mcp.periodEnd = npmStats.end;
  } catch (e) {
    snapshot.mcp.error = e.message;
  }

  try {
    snapshot.api = await fetchApiAnalytics();
  } catch (e) {
    snapshot.api = { error: e.message };
  }

  console.log(JSON.stringify(snapshot, null, 2));

  console.log("\n✅ Snapshot complete");
  console.log("\nNext: Update METRICS.md with these values");
}

main().catch(console.error);
