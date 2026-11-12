import assert from "node:assert/strict";
import test from "node:test";
import {
  createGithubCache, fetchProject, githubRequest, projectEndpoints,
  RELEASE_CACHE_TTL, RELEASING_CACHE_TTL,
} from "../docs/project-status.js";
import { api, memoryStorage, nootify, now, ok, release, run, runs } from "./helpers/github.mjs";

const start = Date.parse(now);
const endpoints = projectEndpoints(nootify);
const settings = (clock, request) => ({ request, now: () => new Date(clock()).toISOString() });

test("localStorage reuses successful requests across page instances and force refresh replaces them", async () => {
  const storage = memoryStorage();
  let time = start;
  let calls = 0;
  let tag = "v0.2.1";
  const clock = () => time;
  const raw = githubRequest({ now: clock, fetcher: api((_, kind) => kind === "release" ? ok(release(nootify, { tag_name: tag })) : undefined, () => calls++) });
  const firstCache = createGithubCache({ storage, now: clock });
  const first = await fetchProject(nootify, settings(clock, firstCache.wrap(raw)));
  assert.equal(calls, 4);
  assert.equal(first.cached, false);
  assert.equal(storage.data.size, 4);
  time += 60000;
  tag = "v0.3.0";
  const secondCache = createGithubCache({ storage, now: clock });
  const second = await fetchProject(nootify, settings(clock, secondCache.wrap(raw)));
  assert.equal(calls, 4);
  assert.equal(second.release.tagName, "v0.2.1");
  assert.equal(second.cached, true);
  assert.equal(second.checkedAt, now);
  const refreshed = await fetchProject(nootify, settings(clock, secondCache.wrap(raw, { force: true })));
  assert.equal(calls, 8);
  assert.equal(refreshed.release.tagName, "v0.3.0");
  assert.equal(refreshed.checkedAt, new Date(time).toISOString());
});

test("active-release entries expire sooner without refetching a valid published release", async () => {
  const storage = memoryStorage();
  let time = start;
  const clock = () => time;
  const calls = [];
  const raw = githubRequest({ now: clock, fetcher: api({}, (url) => calls.push(url)) });
  const cache = createGithubCache({ storage, now: clock });
  await fetchProject(nootify, settings(clock, cache.wrap(raw)));
  time += RELEASING_CACHE_TTL + 1;
  await fetchProject(nootify, settings(clock, cache.wrap(raw)));
  assert.equal(calls.length, 7);
  assert.ok(calls.slice(4).every((url) => url.includes("/actions/")));
  time = start + RELEASE_CACHE_TTL + 1;
  await fetchProject(nootify, settings(clock, cache.wrap(raw)));
  assert.equal(calls.length, 11);
});

test("expired successes survive offline refreshes with their original observation times", async () => {
  const storage = memoryStorage();
  let time = start;
  const clock = () => time;
  const cache = createGithubCache({ storage, now: clock });
  const raw = githubRequest({ now: clock, fetcher: api({ in_progress: ok(runs(run())) }) });
  await fetchProject(nootify, settings(clock, cache.wrap(raw)));
  const before = [...storage.data];
  time += RELEASING_CACHE_TTL + 1;
  const offline = githubRequest({ now: clock, fetcher: async () => { throw new Error("offline"); } });
  const fallback = await fetchProject(nootify, settings(clock, cache.wrap(offline)));
  assert.equal(fallback.release.tagName, "v0.2.1");
  assert.equal(fallback.releasing.versions[0].version, "v0.2.2");
  assert.deepEqual(fallback.staleFields, ["releasing"]);
  assert.equal(fallback.checkedAt, now);
  assert.deepEqual([...storage.data], before, "a failure must not overwrite a success or advance its timestamp");
});

test("GitHub reset times persist across pages and suppress even forced requests during cooldown", async () => {
  const storage = memoryStorage();
  let time = start;
  const clock = () => time;
  const cache = createGithubCache({ storage, now: clock });
  const raw = githubRequest({ now: clock, fetcher: api({ in_progress: ok(runs(run())) }) });
  await fetchProject(nootify, settings(clock, cache.wrap(raw)));
  const reset = start + 3600000;
  let limitedCalls = 0;
  const limited = githubRequest({ now: clock, fetcher: async () => {
    limitedCalls++;
    return new Response("{}", { status: 403, headers: {
      "x-ratelimit-remaining": "0", "x-ratelimit-reset": String(reset / 1000),
    } });
  } });
  const failed = await cache.wrap(limited, { force: true })(endpoints.release);
  assert.equal(limitedCalls, 1);
  assert.equal(failed.cached, true);
  assert.equal(failed.retryAt, reset);
  assert.equal(failed.refreshError, "rate-limit");
  time += 60000;
  const newPage = createGithubCache({ storage, now: clock });
  let freshCalls = 0;
  const fresh = githubRequest({ now: clock, fetcher: api({}, () => freshCalls++) });
  const blocked = await fetchProject(nootify, settings(clock, newPage.wrap(fresh, { force: true })));
  assert.equal(freshCalls, 0);
  assert.equal(blocked.release.tagName, "v0.2.1");
  assert.equal(blocked.retryAt, reset);
  assert.deepEqual(blocked.staleFields, ["release", "releasing"]);
  time = reset + 1;
  const recovered = await fetchProject(nootify, settings(clock, newPage.wrap(fresh, { force: true })));
  assert.equal(freshCalls, 4);
  assert.deepEqual(recovered.staleFields, []);
});

test("429 Retry-After and secondary-limit headers determine cooldowns", async () => {
  for (const status of [403, 429]) {
    const request = githubRequest({ now: () => start, fetcher: async () =>
      new Response("{}", { status, headers: { "retry-after": "120" } }) });
    const response = await request(endpoints.release);
    assert.equal(response.error, "rate-limit");
    assert.equal(response.retryAt, start + 120000);
  }
});

test("negative latest-release lookups and prerelease fallbacks are cached together", async () => {
  const storage = memoryStorage();
  let calls = 0;
  const raw = githubRequest({ now: () => start, fetcher: api({
    release: { status: 404 }, fallback: ok([release(nootify, { prerelease: true })]),
  }, () => calls++) });
  await fetchProject(nootify, settings(() => start, createGithubCache({ storage, now: () => start }).wrap(raw)));
  const again = await fetchProject(nootify, settings(() => start, createGithubCache({ storage, now: () => start }).wrap(raw)));
  assert.equal(calls, 5);
  assert.equal(again.release.prerelease, true);
  assert.equal(again.cached, true);
});

test("corrupt, future, obsolete and unsafe stored entries are discarded safely", async () => {
  const storage = memoryStorage();
  let calls = 0;
  const raw = githubRequest({ now: () => start, fetcher: api({}, () => calls++) });
  const cachedRequest = () => createGithubCache({ storage, now: () => start }).wrap(raw);
  await cachedRequest()(endpoints.release);
  const key = [...storage.data.keys()][0];
  const valid = JSON.parse(storage.getItem(key));
  for (const bad of [
    "not json", JSON.stringify({ ...valid, version: 0 }),
    JSON.stringify({ version: 1, checkedAt: start }),
    JSON.stringify({ ...valid, response: null }),
    JSON.stringify({ ...valid, checkedAt: start + 3600000 }),
    JSON.stringify({ ...valid, response: ok(release(nootify, { html_url: "https://other.example/version" })) }),
  ]) {
    const before = calls;
    storage.setItem(key, bad);
    const response = await cachedRequest()(endpoints.release);
    assert.equal(calls, before + 1);
    assert.equal(response.cached, undefined);
  }
});

test("blocked storage falls back to memory without breaking releases", async () => {
  const storage = {
    getItem() { throw new Error("denied"); }, setItem() { throw new Error("quota"); }, removeItem() { throw new Error("denied"); },
  };
  let calls = 0;
  const cache = createGithubCache({ storage, now: () => start });
  const raw = githubRequest({ now: () => start, fetcher: api({}, () => calls++) });
  await fetchProject(nootify, settings(() => start, cache.wrap(raw)));
  const again = await fetchProject(nootify, settings(() => start, cache.wrap(raw)));
  assert.equal(calls, 4);
  assert.equal(again.cached, true);
});

test("malformed refreshes retain valid cache but permission failures invalidate it", async () => {
  const storage = memoryStorage();
  const cache = createGithubCache({ storage, now: () => start });
  await cache.wrap(async () => ok(release()))(endpoints.release);
  const bad = await cache.wrap(async () => ok({}), { force: true })(endpoints.release);
  assert.equal(bad.cached, true);
  assert.equal(bad.refreshError, "invalid-json");
  const forbidden = await cache.wrap(async () => ({ status: 403 }), { force: true })(endpoints.release);
  assert.equal(forbidden.cached, undefined);
  assert.equal(forbidden.status, 403);
  assert.equal(storage.data.size, 0);
});
