#!/usr/bin/env node
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import { realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { PROJECTS, createSnapshot, hasUsableData, normalizeProject, projectEndpoints } from "./project-status.mjs";

const exec = promisify(execFile);
const TIMEOUT_MS = 20_000;
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_REQUESTS = 45;
const CONCURRENCY = 3;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseBody(status, body) {
  // A failed request body can include upstream diagnostics. Never serialize it.
  if (status !== 200) return { status };
  try { return { status, data: JSON.parse(body) }; } catch { return { status, error: "invalid-json" }; }
}

export function parseGhResponse(output) {
  const match = /^HTTP\/\S+ (\d{3})[^\r\n]*\r?\n/.exec(output);
  if (!match) return { status: null, error: "network" };
  const separator = /\r?\n\r?\n/.exec(output);
  if (!separator) return { status: null, error: "network" };
  return parseBody(Number(match[1]), output.slice(separator.index + separator[0].length));
}

export function githubRequest({ gh = false, token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN } = {}) {
  if (!gh && !token) throw new Error("Set GH_TOKEN or GITHUB_TOKEN, or use --gh for local GitHub CLI authentication");
  return async (endpoint) => {
    // All endpoints originate from the static project configuration. Never send
    // credentials to a URL obtained from a release or workflow response.
    if (!/^\/repos\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\//.test(endpoint) || endpoint.includes("..")) {
      throw new Error("Unexpected GitHub API endpoint");
    }
    if (gh) {
      try {
        const { stdout } = await exec("gh", ["api", "--hostname", "github.com", "--include", endpoint,
          "-H", "Accept: application/vnd.github+json", "-H", "X-GitHub-Api-Version: 2022-11-28"], {
          encoding: "utf8", timeout: TIMEOUT_MS, maxBuffer: MAX_BYTES,
          env: { ...process.env, GH_PROMPT_DISABLED: "1", GH_PAGER: "cat" },
        });
        return parseGhResponse(stdout);
      } catch (error) {
        if (error.killed) return { status: null, error: "timeout" };
        if (error.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER") return { status: null, error: "too-large" };
        // gh exits nonzero for HTTP 404, but --include still supplies its status.
        return parseGhResponse(typeof error.stdout === "string" ? error.stdout : "");
      }
    }
    const signal = AbortSignal.timeout(TIMEOUT_MS);
    try {
      const response = await fetch(`https://api.github.com${endpoint}`, {
        signal, redirect: "error",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
      });
      if (response.status !== 200) {
        await response.body?.cancel();
        return { status: response.status };
      }
      const chunks = [];
      let size = 0;
      for await (const chunk of response.body) {
        size += chunk.length;
        if (size > MAX_BYTES) return { status: response.status, error: "too-large" };
        chunks.push(chunk);
      }
      return parseBody(response.status, Buffer.concat(chunks).toString("utf8"));
    } catch {
      return { status: null, error: signal.aborted ? "timeout" : "network" };
    }
  };
}

export async function collectSnapshot({ request, projects = PROJECTS, now = () => new Date().toISOString() }) {
  const results = new Array(projects.length);
  let cursor = 0;
  let requestCount = 0;
  const read = async (endpoint) => {
    if (requestCount >= MAX_REQUESTS) return { status: null, error: "request-limit" };
    requestCount += 1;
    try { return await request(endpoint); } catch { return { status: null, error: "network" }; }
  };
  async function worker() {
    while (cursor < projects.length) {
      const index = cursor++;
      const project = projects[index];
      const endpoints = projectEndpoints(project);
      const responses = {};
      for (const [status, endpoint] of Object.entries(endpoints.releasing ?? {})) responses[status] = await read(endpoint);
      responses.release = await read(endpoints.release);
      if (responses.release.status === 404 && !responses.release.error) responses.fallback = await read(endpoints.fallback);
      results[index] = normalizeProject(project, responses, now());
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, projects.length) }, () => worker()));
  return { snapshot: createSnapshot(results, now()), requestCount };
}

export async function writeSnapshot(file, snapshot) {
  if (!hasUsableData(snapshot)) throw new Error("All project-status requests failed; the previous snapshot was left unchanged");
  const content = `${JSON.stringify(snapshot, null, 2)}\n`;
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(temporary, content, { flag: "wx", mode: 0o644 });
    await fs.rename(temporary, file);
  } finally {
    await fs.rm(temporary, { force: true });
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 1 || args.some((arg) => arg !== "--gh")) throw new Error("Usage: node scripts/sync-project-status.mjs [--gh]");
  const { snapshot, requestCount } = await collectSnapshot({ request: githubRequest({ gh: args.includes("--gh") }) });
  await writeSnapshot(path.join(ROOT, "docs/project-status.json"), snapshot);
  const incomplete = Object.values(snapshot.projects).filter((project) => project.errors.length > 0);
  process.stdout.write(`Updated ${Object.keys(snapshot.projects).length} projects using ${requestCount}/${MAX_REQUESTS} GitHub requests; ${incomplete.length} have partial errors.\n`);
  for (const project of incomplete) process.stdout.write(`${project.repository}: ${project.errors.join("; ")}\n`);
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    // These errors are generated locally. API bodies and process diagnostics
    // (which may include authentication details) never reach this output.
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
