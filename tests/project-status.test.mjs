import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  ACTIVE_RELEASE_STATUSES, PROJECTS, createSnapshot, hasUsableData,
  normalizeProject, normalizeRelease, normalizeReleasing, projectEndpoints, safeRepositoryUrl,
} from "../scripts/project-status.mjs";
import { collectSnapshot, githubRequest, parseGhResponse, writeSnapshot } from "../scripts/sync-project-status.mjs";

const now = "2026-11-11T08:00:00.000Z";
const nootify = PROJECTS.find((project) => project.repository === "idy/nootify");
const gizclaw = PROJECTS.find((project) => project.repository === "GizClaw/gizclaw");
const gizmoth = PROJECTS.find((project) => project.repository === "GizClaw/gizmoth");
const gizos = PROJECTS.find((project) => project.repository === "GizClaw/gizos");
const wgc = PROJECTS.find((project) => project.repository === "idy/wgc");
const ok = (data) => ({ status: 200, data });
const runs = (...workflow_runs) => ({ total_count: workflow_runs.length, workflow_runs });
const run = (project = nootify, overrides = {}) => ({
  id: 123, name: "Release", path: ".github/workflows/release.yml", head_branch: "v2.1.0", head_sha: "a".repeat(40),
  event: "push", status: "in_progress", conclusion: null,
  html_url: `https://github.com/${project.repository}/actions/runs/${overrides.id ?? 123}`,
  repository: { full_name: project.repository, private: false }, ...overrides,
});
const release = (project = nootify, overrides = {}) => ({
  tag_name: "v2.0.0", draft: false, prerelease: false, published_at: "2026-11-10T08:00:00Z",
  html_url: `https://github.com/${project.repository}/releases/tag/v2.0.0`,
  zipball_url: `https://api.github.com/repos/${project.repository}/zipball/v2.0.0`,
  assets: [{ name: "app.zip", browser_download_url: `https://github.com/${project.repository}/releases/download/v2.0.0/app.zip`, state: "uploaded", size: 456 }],
  ...overrides,
});
const responses = (project = nootify, overrides = {}) => ({
  in_progress: ok(runs(run(project))), queued: ok(runs()), waiting: ok(runs()),
  release: ok(release(project)), ...overrides,
});
const activePages = (...items) => [runs(...items), runs(), runs()];

test("configuration names exactly twelve public projects, six primary workflows and five proven tag-push triggers", () => {
  assert.deepEqual(PROJECTS.map((project) => project.repository), [
    "GizClaw/gizclaw", "GizClaw/gizmoth", "GizClaw/gizos", "idy/nootify", "idy/ch348-macos", "idy/tailsplit",
    "idy/tailrelay", "idy/wgc", "idy/wgc-ne", "idy/sing-box-flutter", "idy/magpie-design-system", "idy/homebrew",
  ]);
  assert.deepEqual(PROJECTS.filter((project) => project.releaseWorkflow).map((project) => project.repository), [
    "GizClaw/gizclaw", "GizClaw/gizmoth", "GizClaw/gizos", "idy/nootify", "idy/tailsplit", "idy/tailrelay",
  ]);
  assert.deepEqual(PROJECTS.filter((project) => project.tagPushOnly).map((project) => project.repository), [
    "GizClaw/gizclaw", "GizClaw/gizmoth", "idy/nootify", "idy/tailsplit", "idy/tailrelay",
  ]);
  assert.ok(PROJECTS.filter((project) => project.releaseWorkflow).every((project) => project.releaseWorkflow === ".github/workflows/release.yml"));
  assert.deepEqual(ACTIVE_RELEASE_STATUSES, ["in_progress", "queued", "waiting"]);
});

test("only proven tag pushes identify an active version; dispatch and arbitrary branches remain unknown", () => {
  for (const project of PROJECTS.filter((item) => item.releaseWorkflow)) {
    for (const event of ["push", "workflow_dispatch", "release", "workflow_run", "repository_dispatch"]) {
      const result = normalizeReleasing(activePages(run(project, { event })), project);
      assert.equal(result.state, "active");
      assert.equal(result.versions[0].version, project.tagPushOnly && event === "push" ? "v2.1.0" : null);
    }
    for (const head_branch of ["main", "feature/v2.1.0", "v2/feature", "vNext", "v2 beta", "a".repeat(40)]) {
      assert.equal(normalizeReleasing(activePages(run(project, { head_branch })), project).versions[0].version, null);
    }
  }
  assert.equal(normalizeReleasing(activePages(run(nootify, { head_branch: "v2.1.0-rc.1" })), nootify).versions[0].version, "v2.1.0-rc.1");
  assert.equal(normalizeReleasing(activePages(run(gizos, { head_branch: "v20261111-080000" })), gizos).versions[0].version, null);
  assert.deepEqual(normalizeReleasing(null, wgc), { state: "unconfigured", versions: [] });
});

test("concurrent running, queued and waiting versions survive deduplication by run id", () => {
  const first = run();
  const second = run(nootify, { id: 124, head_branch: "v2.2.0", status: "queued" });
  const third = run(nootify, { id: 125, head_branch: "main", event: "workflow_dispatch", status: "waiting" });
  const result = normalizeReleasing([runs(first), runs(first, second), runs(third)], nootify);
  assert.deepEqual(result, {
    state: "active", versions: [
      { version: "v2.1.0", url: first.html_url, state: "running" },
      { version: "v2.2.0", url: second.html_url, state: "queued" },
      { version: null, url: third.html_url, state: "waiting" },
    ],
  });
  const sameTag = normalizeReleasing(activePages(first, run(nootify, { id: 126 })), nootify);
  assert.equal(sameTag.versions.length, 2, "different runs of the same tag must retain their own links");
});

test("completed, failed and cancelled runs never appear as releasing, including query races", () => {
  const finished = ["success", "failure", "cancelled", "timed_out", "skipped"].map((conclusion, index) =>
    run(nootify, { id: 100 + index, status: "completed", conclusion }));
  assert.deepEqual(normalizeReleasing(activePages(...finished), nootify), { state: "none", versions: [] });
  const done = run(nootify, { status: "completed", conclusion: "success" });
  for (const pages of [[runs(run()), runs(done), runs()], [runs(done), runs(run()), runs()]]) {
    assert.deepEqual(normalizeReleasing(pages, nootify), { state: "none", versions: [] });
  }
  assert.deepEqual(normalizeReleasing(activePages(), nootify), { state: "none", versions: [] });
});

test("active release targets and already published releases remain independent", () => {
  const project = normalizeProject(nootify, responses(), now);
  assert.equal(project.releasing.state, "active");
  assert.equal(project.releasing.versions[0].version, "v2.1.0");
  assert.deepEqual(project.release, normalizeRelease(release(), nootify));
  assert.equal(project.release.tagName, "v2.0.0");
  assert.deepEqual(project.errors, []);
});

test("successful draft-only workflow does not create a published or releasing version", () => {
  const project = normalizeProject(gizmoth, responses(gizmoth, {
    in_progress: ok(runs(run(gizmoth, { status: "completed", conclusion: "success" }))),
    release: { status: 404 }, fallback: ok([release(gizmoth, { draft: true })]),
  }), now);
  assert.deepEqual(project.releasing, { state: "none", versions: [] });
  assert.equal(project.release.state, "none");
  assert.equal(project.release.tagName, null);
  assert.deepEqual(project.release.assets, []);
});

test("fallback ignores drafts and components and keeps API order rather than sorting timestamps", () => {
  for (const [project, prefix] of [[gizclaw, "monitor-v"], [gizos, "gizloader-"]]) {
    const result = normalizeRelease([
      release(project, { tag_name: `${prefix}99`, prerelease: false }),
      release(project, { draft: true }),
      release(project, { prerelease: true, published_at: "2026-10-01T00:00:00Z" }),
      release(project, { published_at: "2026-11-01T00:00:00Z" }),
    ], project, [], { fallback: true });
    assert.equal(result.tagName, "v2.0.0");
    assert.equal(result.prerelease, true);
    assert.equal(result.publishedAt, "2026-10-01T00:00:00.000Z");
    assert.equal(normalizeRelease([release(project, { tag_name: `${prefix}99` })], project, [], { fallback: true }).state, "none");
  }
  assert.equal(normalizeRelease([], nootify, [], { fallback: true }).state, "none");
});

test("any failed active query makes releasing unavailable without hiding a valid published release", () => {
  for (const status of ACTIVE_RELEASE_STATUSES) {
    for (const failure of [{ status: 403 }, { status: 404 }, { status: null, error: "timeout" }, undefined]) {
      const result = normalizeProject(nootify, responses(nootify, { [status]: failure }), now);
      assert.deepEqual(result.releasing, { state: "unavailable", versions: [] });
      assert.deepEqual(result.release, normalizeRelease(release(), nootify));
      assert.equal(result.errors.length, 1);
      assert.ok(result.errors[0].startsWith("releasing: "));
    }
  }
  const missing = normalizeProject(nootify, responses(nootify, { release: { status: 404 }, fallback: { status: 500 } }), now);
  assert.equal(missing.release.state, "unavailable");
  assert.equal(missing.releasing.state, "active");
  assert.deepEqual(missing.errors, ["release: HTTP 500"]);
});

test("truncated active results are unavailable even when the first page contains valid versions", () => {
  for (const data of [
    { total_count: 1, workflow_runs: [] },
    { total_count: 31, workflow_runs: Array.from({ length: 30 }, (_, id) => run(nootify, { id: id + 1 })) },
  ]) {
    const result = normalizeProject(nootify, responses(nootify, { in_progress: ok(data) }), now);
    assert.deepEqual(result.releasing, { state: "unavailable", versions: [] });
    assert.equal(result.release.state, "published");
    assert.deepEqual(result.errors, ["releasing: incomplete active release runs"]);
  }
});

test("malformed lists, primary workflow identities, state and release bodies cannot masquerade as no data", () => {
  for (const data of [
    null, {}, { total_count: 0, workflow_runs: [run()] }, runs(null),
    runs(run(nootify, { id: -1 })), runs(run(nootify, { head_sha: "wrong" })),
    runs(run(nootify, { event: null })), runs(run(nootify, { status: "future" })),
    runs(run(nootify, { conclusion: "failure" })), runs(run(nootify, { path: ".github/workflows/ci.yml" })),
    runs(run(nootify, { path: ".github/workflows/monitor-release.yml" })),
    runs(run(nootify, { repository: { full_name: "other/repo", private: false } })),
    runs(run(nootify, { html_url: "https://github.com/other/repo/actions/runs/123" })),
    runs(run(nootify, { html_url: "https://github.com/idy/nootify/actions/runs/456" })),
  ]) {
    const result = normalizeProject(nootify, responses(nootify, { in_progress: ok(data) }), now);
    assert.equal(result.releasing.state, "unavailable");
    assert.equal(result.release.state, "published");
  }
  for (const invalidRelease of [null, {}, [], release(nootify, { published_at: "bad" }), release(nootify, { prerelease: true }), release(nootify, { draft: true }), release(nootify, { assets: null }), release(nootify, { html_url: "https://github.com/other/repo/releases/tag/v2.0.0" })]) {
    const result = normalizeProject(nootify, responses(nootify, { release: ok(invalidRelease) }), now);
    assert.equal(result.release.state, "unavailable");
    assert.equal(result.releasing.state, "active");
  }
  const malformedFallback = normalizeProject(nootify, responses(nootify, { release: { status: 404 }, fallback: ok([{}, release()]) }), now);
  assert.equal(malformedFallback.release.state, "unavailable");
  assert.throws(() => normalizeReleasing([runs()], nootify));
});

test("private-repository evidence suppresses every status channel even when another query fails", () => {
  for (const overrides of [
    { in_progress: ok(runs(run(nootify, { repository: { full_name: nootify.repository, private: true } }))) },
    { in_progress: { status: 403 }, queued: ok(runs(run(nootify, { repository: { full_name: nootify.repository, private: true } }))) },
    { release: ok(release(nootify, { repository: { full_name: nootify.repository, visibility: "private" } })) },
    { release: { status: 404 }, fallback: ok([release(nootify, { repository: { private: true } })]) },
  ]) {
    const result = normalizeProject(nootify, responses(nootify, overrides), now);
    assert.equal(result.releasing.state, "unavailable");
    assert.equal(result.release.state, "unavailable");
    assert.deepEqual(result.errors, ["repository: private repository excluded"]);
  }
});

test("unsafe and mismatched links cannot enter the snapshot", () => {
  for (const url of [
    "javascript:alert(1)", "https://github.com.evil.example/idy/nootify/releases/tag/v2.0.0",
    "https://name:secret@github.com/idy/nootify/releases/tag/v2.0.0", "https://github.com/idy/nootify-other/releases/tag/v2.0.0",
    "https://github.com/idy/nootify/releases/tag/v2.0.0?secret=value", "https://github.com/idy/nootify/releases/tag/v2.0.0#anchor",
    "https://github.com/idy/nootify/releases/tag/%2e%2e/v2.0.0", "https://github.com/idy/other/../nootify/releases/tag/v2.0.0",
    "https://github.com/idy/nootify/releases/tag/%5cevil", "https://github.com/idy/nootify/releases/tag/%00evil",
  ]) assert.equal(safeRepositoryUrl(url, nootify.repository), null, url);
  const errors = [];
  const result = normalizeRelease(release(nootify, {
    zipball_url: "https://evil.example/archive.zip",
    assets: [
      ...release().assets,
      { ...release().assets[0], name: "wrong.zip" },
      { ...release().assets[0], browser_download_url: "https://evil.example/app.zip" },
      { ...release().assets[0], size: -1 }, null,
    ],
  }), nootify, errors);
  assert.equal(result.state, "published");
  assert.equal(result.assets.length, 3);
  assert.equal(result.assets[0].browser_download_url, release().assets[0].browser_download_url);
  assert.equal(result.assets[1].browser_download_url, null);
  assert.equal(result.assets[2].browser_download_url, null);
  assert.equal(result.zipball_url, null);
  assert.ok(errors.length > 0);
});

test("snapshot contains exactly schema version 2 and drops upstream and CI fields", () => {
  const project = normalizeProject(nootify, responses(nootify, {
    release: ok(release(nootify, { body: "private text", author: { email: "secret" }, token: "never copy" })),
  }), now);
  const snapshot = createSnapshot([project], now);
  assert.equal(snapshot.schemaVersion, 2);
  assert.deepEqual(Object.keys(snapshot), ["schemaVersion", "generatedAt", "projects"]);
  assert.deepEqual(Object.keys(project), ["repository", "checkedAt", "release", "releasing", "errors"]);
  assert.deepEqual(Object.keys(project.releasing), ["state", "versions"]);
  assert.deepEqual(Object.keys(project.releasing.versions[0]), ["version", "url", "state"]);
  assert.deepEqual(Object.keys(project.release), ["state", "tagName", "url", "prerelease", "publishedAt", "assets", "zipball_url"]);
  assert.deepEqual(Object.keys(project.release.assets[0]), ["name", "browser_download_url", "state", "size"]);
  assert.equal(snapshot.generatedAt, now);
  assert.equal(project.checkedAt, now);
  assert.ok(!JSON.stringify(snapshot).includes("secret"));
  assert.throws(() => createSnapshot([], "invalid"));
});

test("collection queries only primary active releases without branch filters and falls back only on 404", async () => {
  const endpoints = projectEndpoints(nootify);
  assert.deepEqual(endpoints.releasing, {
    in_progress: "/repos/idy/nootify/actions/workflows/release.yml/runs?status=in_progress&per_page=30",
    queued: "/repos/idy/nootify/actions/workflows/release.yml/runs?status=queued&per_page=30",
    waiting: "/repos/idy/nootify/actions/workflows/release.yml/runs?status=waiting&per_page=30",
  });
  for (const status of [200, 404, 403, 500]) {
    const seen = [];
    const result = await collectSnapshot({ projects: [nootify], now: () => now, request: async (endpoint) => {
      seen.push(endpoint);
      if (Object.values(endpoints.releasing).includes(endpoint)) return ok(runs());
      if (endpoint === endpoints.release) return status === 200 ? ok(release()) : { status };
      if (endpoint === endpoints.fallback) return ok([]);
      throw new Error("unexpected endpoint");
    } });
    assert.equal(result.requestCount, status === 404 ? 5 : 4);
    assert.equal(seen.includes(endpoints.fallback), status === 404);
    assert.equal(result.snapshot.projects[nootify.repository].release.state, status === 200 ? "published" : status === 404 ? "none" : "unavailable");
    assert.deepEqual(result.snapshot.projects[nootify.repository].releasing, { state: "none", versions: [] });
  }
});

test("filtered queries find an active release older than the latest thirty completed runs", async () => {
  const history = [
    ...Array.from({ length: 35 }, (_, index) => run(nootify, { id: 200 + index, status: "completed", conclusion: "success" })),
    run(nootify, { id: 100 }),
    run(nootify, { id: 101, head_branch: "v2.2.0", status: "queued" }),
  ];
  const seen = [];
  const { snapshot } = await collectSnapshot({ projects: [nootify], now: () => now, request: async (endpoint) => {
    seen.push(endpoint);
    if (endpoint.endsWith("/releases/latest")) return ok(release());
    const url = new URL(endpoint, "https://api.github.com");
    const status = url.searchParams.get("status");
    return ok(runs(...history.filter((item) => !status || item.status === status).slice(0, 30)));
  } });
  assert.deepEqual(snapshot.projects[nootify.repository].releasing.versions.map((item) => item.version), ["v2.1.0", "v2.2.0"]);
  assert.equal(seen.length, 4);
  assert.ok(seen.filter((endpoint) => endpoint.includes("/actions/")).every((endpoint) => /\/actions\/workflows\/release\.yml\/runs\?status=(in_progress|queued|waiting)&per_page=30$/.test(endpoint)));
});

test("all twelve projects use only release data and unconfigured projects make no Actions calls", async () => {
  const seen = [];
  const { snapshot, requestCount } = await collectSnapshot({ now: () => now, request: async (endpoint) => {
    seen.push(endpoint);
    if (endpoint.includes("/actions/")) return ok(runs());
    const project = PROJECTS.find((item) => endpoint === projectEndpoints(item).release);
    return ok(release(project));
  } });
  assert.equal(requestCount, 30);
  for (const project of PROJECTS) {
    const requests = seen.filter((endpoint) => endpoint.startsWith(`/repos/${project.repository}/`));
    assert.equal(requests.length, project.releaseWorkflow ? 4 : 1);
    assert.equal(snapshot.projects[project.repository].releasing.state, project.releaseWorkflow ? "none" : "unconfigured");
    if (!project.releaseWorkflow) {
      assert.equal(projectEndpoints(project).releasing, null);
      assert.ok(requests.every((endpoint) => !endpoint.includes("/actions/")));
    }
  }
});

test("collection marks overflow unavailable without exceeding the bounded active query budget", async () => {
  const { snapshot, requestCount } = await collectSnapshot({ projects: [nootify], now: () => now, request: async (endpoint) => {
    if (endpoint.endsWith("/releases/latest")) return ok(release());
    return ok({ total_count: 31, workflow_runs: Array.from({ length: 30 }, (_, id) => run(nootify, { id: id + 1 })) });
  } });
  assert.equal(requestCount, 4);
  assert.equal(snapshot.projects[nootify.repository].releasing.state, "unavailable");
  assert.equal(snapshot.projects[nootify.repository].release.state, "published");
});

test("collection caps all requests at forty-five and concurrent work at three", async () => {
  let active = 0;
  let peak = 0;
  let count = 0;
  const { snapshot, requestCount } = await collectSnapshot({ projects: [...PROJECTS, nootify], now: () => now, request: async (endpoint) => {
    count += 1;
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setImmediate(resolve));
    active -= 1;
    if (endpoint.endsWith("/releases/latest")) return { status: 404 };
    return ok(endpoint.includes("/actions/") ? runs() : []);
  } });
  assert.equal(requestCount, 45);
  assert.equal(count, 45);
  assert.equal(peak, 3);
  assert.ok(Object.values(snapshot.projects).some((project) => project.errors.some((error) => error.includes("request-limit"))));
});

test("thrown transport errors are recorded without leaking error text or tokens", async () => {
  const { snapshot } = await collectSnapshot({ projects: [nootify, wgc], now: () => now, request: async () => { throw new Error("TOKEN-MUST-NOT-LEAK"); } });
  assert.equal(hasUsableData(snapshot), false);
  assert.ok(!JSON.stringify(snapshot).includes("TOKEN-MUST-NOT-LEAK"));
  assert.deepEqual(snapshot.projects[nootify.repository].errors, ["releasing: network", "release: network"]);
  assert.equal(snapshot.projects[wgc.repository].releasing.state, "unconfigured");
});

test("gh HTTP parsing recognizes 404 bodies and malformed JSON without exposing diagnostics", () => {
  assert.deepEqual(parseGhResponse('HTTP/2.0 200 OK\r\nContent-Type: application/json\r\n\r\n{"value":1}'), { status: 200, data: { value: 1 } });
  assert.deepEqual(parseGhResponse('HTTP/2.0 404 Not Found\nContent-Type: application/json\n\n{"message":"secret"}'), { status: 404 });
  assert.deepEqual(parseGhResponse('HTTP/2.0 200 OK\nX: y\n\nmalformed'), { status: 200, error: "invalid-json" });
  assert.deepEqual(parseGhResponse("sensitive diagnostics"), { status: null, error: "network" });
});

test("token transport uses only GitHub API with timeouts and refuses credential-bearing redirects", async (t) => {
  const replies = [new Response('{"total_count":0,"workflow_runs":[]}', { status: 200 }), new Response('secret upstream message', { status: 403 })];
  const called = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    called.push({ url, options });
    return replies.shift();
  });
  const request = githubRequest({ token: "test-token" });
  assert.deepEqual(await request(projectEndpoints(nootify).releasing.in_progress), ok(runs()));
  assert.deepEqual(await request(projectEndpoints(nootify).release), { status: 403 });
  assert.ok(called.every(({ url, options }) => url.startsWith("https://api.github.com/repos/idy/nootify/")
    && options.redirect === "error" && options.signal instanceof AbortSignal && options.headers.Authorization === "Bearer test-token"));
  await assert.rejects(request("https://evil.example/repos/idy/nootify/releases"), /Unexpected/);
  assert.equal(called.length, 2);
});

test("atomic writing keeps good data on total failure and accepts independent partial successes", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "project-status-write-"));
  const file = path.join(directory, "project-status.json");
  try {
    const good = createSnapshot([normalizeProject(nootify, responses(), now)], now);
    await writeSnapshot(file, good);
    const before = await fs.readFile(file, "utf8");
    const { snapshot: failed } = await collectSnapshot({ projects: [nootify, wgc], now: () => now, request: async () => ({ status: 503 }) });
    await assert.rejects(writeSnapshot(file, failed), /left unchanged/);
    assert.equal(await fs.readFile(file, "utf8"), before);
    for (const overrides of [{ queued: { status: 403 } }, { release: { status: 500 } }]) {
      const partial = createSnapshot([normalizeProject(nootify, responses(nootify, overrides), now)], now);
      await writeSnapshot(file, partial);
      assert.deepEqual(JSON.parse(await fs.readFile(file, "utf8")), partial);
    }
    assert.deepEqual(await fs.readdir(directory), ["project-status.json"]);
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
});

test("CLI --gh writes a full snapshot and preserves it when gh fails", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "project-status-cli-"));
  const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../scripts");
  try {
    await fs.mkdir(path.join(directory, "scripts"));
    await fs.mkdir(path.join(directory, "docs"));
    await fs.mkdir(path.join(directory, "bin"));
    for (const name of ["project-status.mjs", "sync-project-status.mjs"]) await fs.copyFile(path.join(source, name), path.join(directory, "scripts", name));
    await fs.writeFile(path.join(directory, "bin/gh"), `#!/usr/bin/env node
if (process.env.FAKE_GH_FAILURE) { process.stderr.write('secret credentials'); process.exit(1); }
const endpoint = process.argv.find((arg) => arg.startsWith('/repos/'));
const status = endpoint.endsWith('/releases/latest') ? 404 : 200;
const data = endpoint.includes('/actions/') ? {total_count:0,workflow_runs:[]} : [];
process.stdout.write('HTTP/2.0 ' + status + ' OK\\r\\nContent-Type: application/json\\r\\n\\r\\n' + JSON.stringify(data));
if (status === 404) process.exitCode = 1;
`, { mode: 0o755 });
    const invoke = (failure = false, args = ["--gh"]) => spawnSync(process.execPath, [path.join(directory, "scripts/sync-project-status.mjs"), ...args], {
      encoding: "utf8", env: { ...process.env, PATH: `${directory}/bin${path.delimiter}${process.env.PATH}`, FAKE_GH_FAILURE: failure ? "1" : "" },
    });
    const success = invoke();
    assert.equal(success.status, 0, success.stderr);
    const file = path.join(directory, "docs/project-status.json");
    const before = await fs.readFile(file, "utf8");
    const snapshot = JSON.parse(before);
    assert.equal(Object.keys(snapshot.projects).length, 12);
    assert.equal(snapshot.schemaVersion, 2);
    assert.ok(success.stdout.includes("42/45"));
    const failure = invoke(true);
    assert.notEqual(failure.status, 0);
    assert.ok(failure.stderr.includes("left unchanged"));
    assert.ok(!failure.stderr.includes("secret"));
    assert.equal(await fs.readFile(file, "utf8"), before);
    assert.notEqual(invoke(false, ["--invalid"]).status, 0);
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
});
