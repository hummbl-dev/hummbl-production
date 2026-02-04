#!/usr/bin/env node
/**
 * NPM Stats Collector for @hummbl/mcp-server
 *
 * Usage: node npm-stats.js
 *
 * This script fetches download statistics for the MCP server from npm.
 * Run weekly to track adoption.
 */

const https = require("https");

const PACKAGE = "@hummbl/mcp-server";
const ENCODED_PACKAGE = encodeURIComponent(PACKAGE);

function fetchNpmStats() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.npmjs.org",
      path: `/downloads/point/last-week/${ENCODED_PACKAGE}`,
      method: "GET",
      headers: {
        "User-Agent": "HUMMBL-Analytics/1.0",
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          reject(new Error(`Failed to parse npm response: ${e.message}`));
        }
      });
    });

    req.on("error", reject);
    req.end();
  });
}

function fetchPackageInfo() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "registry.npmjs.org",
      path: `/${ENCODED_PACKAGE}`,
      method: "GET",
      headers: {
        "User-Agent": "HUMMBL-Analytics/1.0",
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          resolve({
            version: json["dist-tags"]?.latest,
            published: json.time?.created,
            lastModified: json.time?.modified,
            totalVersions: Object.keys(json.versions || {}).length,
          });
        } catch (e) {
          reject(new Error(`Failed to parse registry response: ${e.message}`));
        }
      });
    });

    req.on("error", reject);
    req.end();
  });
}

async function main() {
  console.log("📦 HUMMBL NPM Analytics");
  console.log("========================\n");
  console.log(`Package: ${PACKAGE}`);
  console.log(`Date: ${new Date().toISOString()}\n`);

  try {
    // Fetch weekly downloads
    const stats = await fetchNpmStats();
    console.log("📊 Download Statistics:");
    console.log(`  Last 7 days: ${stats.downloads.toLocaleString()}`);
    console.log(`  Period: ${stats.start} to ${stats.end}`);

    // Fetch package metadata
    const info = await fetchPackageInfo();
    console.log("\n📋 Package Info:");
    console.log(`  Current version: ${info.version}`);
    console.log(`  Published: ${info.published}`);
    console.log(`  Last modified: ${info.lastModified}`);
    console.log(`  Total versions: ${info.totalVersions}`);

    // Output JSON for programmatic use
    console.log("\n📤 JSON Output:");
    console.log(
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          package: PACKAGE,
          weeklyDownloads: stats.downloads,
          periodStart: stats.start,
          periodEnd: stats.end,
          version: info.version,
          published: info.published,
          lastModified: info.lastModified,
          totalVersions: info.totalVersions,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.error("❌ Error fetching npm stats:", error.message);
    process.exit(1);
  }
}

main();
