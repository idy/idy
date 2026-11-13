import assert from "node:assert/strict";
import test from "node:test";
import {
  ACTIVE_RELEASE_STATUSES, PROJECTS, fetchProject, githubRequest,
  normalizeProject, normalizeRelease, normalizeReleasing, projectEndpoints, safeRepositoryUrl,
} from "../docs/project-status.js";
import { api, nootify, now, ok, runs, run, release, responses } from "./helpers/github.mjs";

const gizclaw = PROJECTS.find((project) => project.repository === "GizClaw/gizclaw");
const gizos = PROJECTS.find((project) => project.repository === "GizClaw/gizos");
const wgc = PROJECTS.find((project) => project.repository === "idy/wgc");
const activePages = (...items) => [runs(...items), runs(), runs()];

test("thirteen projects retain seven primary release workflows and proven tag-push configuration", () => {
  assert.equal(PROJECTS.length, 13);
  assert.equal(PROJECTS.filter((project) => project.releaseWorkflow).length, 7);
  assert.equal(PROJECTS.filter((project) => project.tagPushOnly).length, 6);
  assert.deepEqual(ACTIVE_RELEASE_STATUSES, ["in_progress", "queued", "waiting"]);
  const yesman = PROJECTS.find((project) => project.repository === "idy/yesman");
  assert.equal(yesman.releaseWorkflow, ".github/workflows/release.yml");
  assert.equal(yesman.tagPushOnly, true);
});

test("only proven tag pushes identify active versions; dispatches and branches remain unknown", () => {
  for (const project of PROJECTS.filter((item) => item.releaseWorkflow)) {
    for (const event of ["push", "workflow_dispatch", "release", "workflow_run", "repository_dispatch"]) {
      const result = normalizeReleasing(activePages(run(project, { event })), project);
      assert.equal(result.versions[0].version, project.tagPushOnly && event === "push" ? "v0.2.2" : null);
    }
    for (const head_branch of ["main", "feature/v2.1.0", "v2/feature", "vNext", "v2 beta", "a".repeat(40)]) {
      assert.equal(normalizeReleasing(activePages(run(project, { head_branch })), project).versions[0].version, null);
    }
  }
  assert.equal(normalizeReleasing(activePages(run(nootify, { head_branch: "v2.1.0-rc.1" })), nootify).versions[0].version, "v2.1.0-rc.1");
  assert.deepEqual(normalizeReleasing(null, wgc), { state: "unconfigured", versions: [] });
});

test("concurrent running, queued and waiting versions are deduplicated by run id", () => {
  const first = run();
  const second = run(nootify, { id: 125, head_branch: "v0.3.0", status: "queued" });
  const third = run(nootify, { id: 126, head_branch: "main", event: "workflow_dispatch", status: "waiting" });
  assert.deepEqual(normalizeReleasing([runs(first), runs(first, second), runs(third)], nootify), {
    state: "active", versions: [
      { version: "v0.2.2", url: first.html_url, state: "running" },
      { version: "v0.3.0", url: second.html_url, state: "queued" },
      { version: null, url: third.html_url, state: "waiting" },
    ],
  });
});

test("completed, failed and cancelled runs never appear, including query races", () => {
  const finished = ["success", "failure", "cancelled", "timed_out", "skipped"].map((conclusion, index) =>
    run(nootify, { id: 100 + index, status: "completed", conclusion }));
  assert.deepEqual(normalizeReleasing(activePages(...finished), nootify), { state: "none", versions: [] });
  const done = run(nootify, { status: "completed", conclusion: "success" });
  for (const pages of [[runs(run()), runs(done), runs()], [runs(done), runs(run()), runs()]]) {
    assert.deepEqual(normalizeReleasing(pages, nootify), { state: "none", versions: [] });
  }
});

test("active targets and published releases remain independent", () => {
  const result = normalizeProject(nootify, responses(), now);
  assert.equal(result.releasing.versions[0].version, "v0.2.2");
  assert.equal(result.release.tagName, "v0.2.1");
  assert.deepEqual(result.errors, []);
});

test("fallback skips drafts and component tags, keeps GitHub order and identifies prereleases", () => {
  for (const [project, prefix] of [[gizclaw, "monitor-v"], [gizos, "gizloader-"]]) {
    const result = normalizeRelease([
      release(project, { tag_name: `${prefix}99` }), release(project, { draft: true }),
      release(project, { prerelease: true, published_at: "2026-10-01T00:00:00Z" }),
      release(project, { published_at: "2026-11-01T00:00:00Z" }),
    ], project, [], { fallback: true });
    assert.equal(result.tagName, "v0.2.1");
    assert.equal(result.prerelease, true);
    assert.equal(result.publishedAt, "2026-10-01T00:00:00.000Z");
  }
  assert.equal(normalizeRelease([release(nootify, { draft: true })], nootify, [], { fallback: true }).state, "none");
  assert.equal(normalizeRelease([], nootify, [], { fallback: true }).state, "none");
});

test("an active-query failure never hides a valid published release", () => {
  for (const status of ACTIVE_RELEASE_STATUSES) {
    for (const failure of [{ status: 403 }, { status: 404 }, { status: null, error: "timeout" }, undefined]) {
      const result = normalizeProject(nootify, responses(nootify, { [status]: failure }), now);
      assert.deepEqual(result.releasing, { state: "unavailable", versions: [] });
      assert.equal(result.release.state, "published");
    }
  }
});

test("truncated and malformed responses cannot be mistaken for no active release", () => {
  for (const data of [
    null, {}, { total_count: 1, workflow_runs: [] }, runs(null),
    { total_count: 31, workflow_runs: Array.from({ length: 30 }, (_, id) => run(nootify, { id: id + 1 })) },
    runs(run(nootify, { id: -1 })), runs(run(nootify, { head_sha: "wrong" })),
    runs(run(nootify, { status: "future" })), runs(run(nootify, { conclusion: "failure" })),
    runs(run(nootify, { path: ".github/workflows/ci.yml" })),
    runs(run(nootify, { repository: { full_name: "other/repo", private: false } })),
    runs(run(nootify, { html_url: "https://github.com/idy/nootify/actions/runs/456" })),
  ]) {
    const result = normalizeProject(nootify, responses(nootify, { in_progress: ok(data) }), now);
    assert.equal(result.releasing.state, "unavailable");
    assert.equal(result.release.state, "published");
  }
  for (const data of [null, {}, [], release(nootify, { published_at: "bad" }), release(nootify, { draft: true }), release(nootify, { assets: null })]) {
    const result = normalizeProject(nootify, responses(nootify, { release: ok(data) }), now);
    assert.equal(result.release.state, "unavailable");
    assert.equal(result.releasing.state, "active");
  }
});

test("private repository evidence suppresses both channels", () => {
  const result = normalizeProject(nootify, responses(nootify, {
    queued: ok(runs(run(nootify, { repository: { full_name: nootify.repository, private: true } }))),
  }), now);
  assert.equal(result.releasing.state, "unavailable");
  assert.equal(result.release.state, "unavailable");
});

test("unsafe URLs and mismatched release assets never become downloads", () => {
  for (const url of [
    "javascript:alert(1)", "https://github.com.evil.example/idy/nootify/releases/tag/v0.2.1",
    "https://name:secret@github.com/idy/nootify/releases/tag/v0.2.1",
    "https://github.com/idy/nootify-other/releases/tag/v0.2.1",
    "https://github.com/idy/nootify/releases/tag/v0.2.1?secret=value",
    "https://github.com/idy/nootify/releases/tag/%2e%2e/v0.2.1",
    "https://github.com/idy/nootify/releases/tag/%5cevil",
  ]) assert.equal(safeRepositoryUrl(url, nootify.repository), null);
  const asset = { name: "app.zip", state: "uploaded", size: 456,
    browser_download_url: "https://github.com/idy/nootify/releases/download/v0.2.1/app.zip" };
  const result = normalizeRelease(release(nootify, {
    zipball_url: "https://evil.example/archive.zip",
    assets: [asset, { ...asset, name: "wrong.zip" }, { ...asset, browser_download_url: "https://evil.example/app.zip" }, null],
  }), nootify);
  assert.equal(result.assets[0].browser_download_url, asset.browser_download_url);
  assert.equal(result.assets[1].browser_download_url, null);
  assert.equal(result.assets[2].browser_download_url, null);
  assert.equal(result.zipball_url, null);
});

test("direct requests use public GitHub API without credentials, with cancellation and fresh reads", async () => {
  const calls = [];
  const request = githubRequest({ fetcher: api({}, (url, options) => calls.push({ url, options })) });
  await fetchProject(nootify, { request, now: () => now });
  await fetchProject(nootify, { request, now: () => now });
  assert.equal(calls.length, 8, "each read must query GitHub again");
  for (const { url, options } of calls) {
    assert.ok(url.startsWith("https://api.github.com/repos/idy/nootify/"));
    assert.equal(options.credentials, "omit");
    assert.equal(options.headers.Authorization, undefined);
    assert.equal(options.cache, "no-cache");
    assert.equal(options.redirect, "error");
    assert.ok(options.signal instanceof AbortSignal);
  }
});

test("latest-release fallback happens only on 404, never on rate limits or server errors", async () => {
  for (const status of [200, 404, 403, 429, 500]) {
    const calls = [];
    const request = githubRequest({ fetcher: api({ release: status === 200 ? ok(release()) : { status } }, (url) => calls.push(url)) });
    const result = await fetchProject(nootify, { request, now: () => now });
    assert.equal(calls.length, status === 404 ? 5 : 4);
    assert.equal(result.release.state, status === 200 ? "published" : status === 404 ? "none" : "unavailable");
  }
});

test("active queries find releases beyond thirty newer completed runs", async () => {
  const history = [...Array.from({ length: 35 }, (_, id) => run(nootify, { id: 200 + id, status: "completed", conclusion: "success" })), run()];
  const result = await fetchProject(nootify, { now: () => now, request: async (endpoint) => {
    if (endpoint.endsWith("/releases/latest")) return ok(release());
    const status = new URL(endpoint, "https://api.github.com").searchParams.get("status");
    return ok(runs(...history.filter((entry) => entry.status === status).slice(0, 30)));
  } });
  assert.equal(result.releasing.versions[0].version, "v0.2.2");
});

test("each untracked project queries only its own release endpoint", async () => {
  for (const project of PROJECTS.filter((entry) => !entry.releaseWorkflow)) {
    const calls = [];
    const result = await fetchProject(project, { request: async (endpoint) => { calls.push(endpoint); return ok(release(project)); }, now: () => now });
    assert.deepEqual(calls, [projectEndpoints(project).release]);
    assert.equal(result.releasing.state, "unconfigured");
  }
});

test("rate limits, malformed JSON, offline failures and aborted requests remain explicit", async () => {
  for (const [status, headers] of [[403, { "x-ratelimit-remaining": "0" }], [429, {}]]) {
    const request = githubRequest({ fetcher: async () => new Response("{}", { status, headers }) });
    const result = await fetchProject(nootify, { request, now: () => now });
    assert.deepEqual(result.errors, ["releasing: rate-limit", "release: rate-limit"]);
  }
  const malformed = githubRequest({ fetcher: async () => new Response("invalid") });
  assert.equal((await malformed(projectEndpoints(nootify).release)).error, "invalid-json");
  const offline = await fetchProject(nootify, { request: async () => { throw new Error("private diagnostics"); }, now: () => now });
  assert.deepEqual(offline.errors, ["releasing: network", "release: network"]);
  assert.doesNotMatch(JSON.stringify(offline), /private diagnostics/);
  const controller = new AbortController();
  controller.abort();
  const aborted = githubRequest({ signal: controller.signal, fetcher: async (_, options) => { options.signal.throwIfAborted(); } });
  assert.equal((await aborted(projectEndpoints(nootify).release)).error, "network");
});
