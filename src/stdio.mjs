#!/usr/bin/env node
// Local stdio transport for Design Skills MCP.
// Runs the exact same handler as the hosted server (src/worker.js) on this machine.
// Skill data is read from data/design-skills.json in this repo, so no network is needed
// for the skill tools. lint_design with a `url` argument still fetches that page.
//
// Usage: node src/stdio.mjs   (newline-delimited JSON-RPC on stdin/stdout)

import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import worker from "./worker.js";

const DATA_FILE = fileURLToPath(new URL("../data/design-skills.json", import.meta.url));
const DATA_URL_PREFIX = "https://raw.githubusercontent.com/bodhi584/design-skills-mcp/";

// Serve the bundled skill data locally instead of fetching it from GitHub.
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const href = typeof input === "string" ? input : input && input.url;
  if (href && href.startsWith(DATA_URL_PREFIX) && href.endsWith("/data/design-skills.json")) {
    return new Response(readFileSync(DATA_FILE, "utf8"), { headers: { "Content-Type": "application/json" } });
  }
  const { cf, ...rest } = init || {};
  return realFetch(input, rest);
};

const env = {};
const ctx = { waitUntil() {}, passThroughOnException() {} };

async function handle(line) {
  const req = new Request("http://localhost/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: line,
  });
  const res = await worker.fetch(req, env, ctx);
  if (res.status === 202) return; // notification, no reply
  const text = await res.text();
  if (text) process.stdout.write(text.replace(/\n/g, "") + "\n");
}

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
let queue = Promise.resolve();
rl.on("line", (line) => {
  if (!line.trim()) return;
  queue = queue.then(() => handle(line)).catch((e) => {
    process.stderr.write(`design-skills-mcp: ${e && e.stack || e}\n`);
  });
});
rl.on("close", () => { queue.then(() => process.exit(0)); });
process.stderr.write("design-skills-mcp: stdio server ready\n");
