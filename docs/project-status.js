const PRIMARY_RELEASE = ".github/workflows/release.yml";
export const ACTIVE_RELEASE_STATUSES = Object.freeze(["in_progress", "queued", "waiting"]);

// Only these primary workflows are configured. tagPushOnly records a known
// tag-only push trigger; dispatch runs never prove their target version.
export const PROJECTS = Object.freeze([
  ["GizClaw/gizclaw", true, true, ["monitor-v"]],
  ["GizClaw/gizmoth", true, true],
  ["GizClaw/gizos", true, false, ["gizloader-"]],
  ["idy/yesman", true, true],
  ["idy/nootify", true, true],
  ["idy/ch348-macos", false],
  ["idy/tailsplit", true, true],
  ["idy/tailrelay", true, true],
  ["idy/wgc", false],
  ["idy/wgc-ne", false],
  ["idy/sing-box-flutter", false],
  ["idy/magpie-design-system", false],
  ["idy/homebrew", false],
].map(([repository, configured, tagPushOnly = false, prefixes = []]) => Object.freeze({
  repository,
  releaseWorkflow: configured ? PRIMARY_RELEASE : null,
  tagPushOnly,
  excludedReleasePrefixes: Object.freeze(prefixes),
})));

export class InvalidResponse extends Error {}
export class PrivateRepository extends InvalidResponse {}
const invalid = () => { throw new InvalidResponse("malformed GitHub response"); };
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const text = (value) => typeof value === "string" && value.trim().length > 0 && !/[\u0000-\u001f\u007f]/.test(value);
const positiveId = (value) => Number.isSafeInteger(value) && value > 0;

function iso(value) {
  if (typeof value !== "string" || !/^\d{4}-\d\d-\d\dT/.test(value) || !Number.isFinite(Date.parse(value))) invalid();
  return new Date(value).toISOString();
}

// Return only canonical HTTPS links on the expected GitHub host/repository.
// Reject credentials, query strings, fragments, path traversal and lookalikes.
export function safeRepositoryUrl(value, repository, { api = false, suffix } = {}) {
  if (typeof value !== "string" || /[\\\s\u0000-\u001f\u007f]/.test(value)) return null;
  let url;
  try {
    if (decodeURIComponent(value).split(/[/?#]/).some((part) => part === "." || part === "..")) return null;
    url = new URL(value);
  } catch { return null; }
  const origin = api ? "https://api.github.com" : "https://github.com";
  if (url.origin !== origin || url.username || url.password || url.search || url.hash) return null;
  let decoded;
  try { decoded = decodeURIComponent(url.pathname); } catch { return null; }
  if (/[\\\u0000-\u001f\u007f]/.test(decoded) || decoded.split("/").some((part) => part === "." || part === "..")) return null;
  const prefix = `${api ? "/repos" : ""}/${repository}`;
  if (decoded.slice(0, prefix.length).toLowerCase() !== prefix.toLowerCase()) return null;
  const rest = decoded.slice(prefix.length);
  if (!rest.startsWith("/") || (suffix && !suffix.test(rest))) return null;
  return url.href;
}

function emptyReleasing(state) {
  return { state, versions: [] };
}

export function emptyRelease(state) {
  return { state, tagName: null, url: null, prerelease: null, publishedAt: null, assets: [], zipball_url: null };
}

function checkRepositoryEvidence(value, repository) {
  if (!isObject(value)) return;
  if (value.private === true || value.visibility === "private") throw new PrivateRepository("private repository excluded");
  if (value.full_name !== undefined && (typeof value.full_name !== "string" || value.full_name.toLowerCase() !== repository.toLowerCase())) invalid();
}

function checkPrivateEvidence(data, repository) {
  if (!isObject(data)) return;
  const candidates = [data, data.repository, ...(Array.isArray(data.workflow_runs) ? data.workflow_runs.map((run) => run?.repository) : [])];
  for (const candidate of candidates) {
    if (candidate?.private === true || candidate?.visibility === "private") throw new PrivateRepository("private repository excluded");
  }
}

function releaseRunList(data, repository) {
  checkPrivateEvidence(data, repository);
  if (!isObject(data) || !Number.isSafeInteger(data.total_count) || data.total_count < 0
    || !Array.isArray(data.workflow_runs) || data.workflow_runs.length > 30 || data.workflow_runs.length > data.total_count) invalid();
  // A bounded first page must be complete. Do not claim there are no other
  // active versions when GitHub reports more runs than this page contains.
  if (data.total_count !== data.workflow_runs.length) throw new InvalidResponse("incomplete active release runs");
  for (const run of data.workflow_runs) {
    if (!isObject(run) || !text(run.path) || !text(run.head_branch)) invalid();
    checkRepositoryEvidence(run.repository, repository);
  }
  return data.workflow_runs;
}

export function normalizeReleasing(data, project) {
  if (!project.releaseWorkflow) return emptyReleasing("unconfigured");
  if (!Array.isArray(data) || data.length !== ACTIVE_RELEASE_STATUSES.length) invalid();
  const versions = new Map();
  const completed = new Set();
  for (const page of data) {
    for (const run of releaseRunList(page, project.repository)) {
      if (run.path !== project.releaseWorkflow || !positiveId(run.id) || !text(run.name) || !text(run.event)
        || !/^[0-9a-f]{40,64}$/i.test(run.head_sha) || !isObject(run.repository) || run.repository.private !== false
        || run.repository.full_name?.toLowerCase() !== project.repository.toLowerCase()) invalid();
      const url = safeRepositoryUrl(run.html_url, project.repository, { suffix: new RegExp(`^/actions/runs/${run.id}(?:/attempts/[1-9][0-9]*)?$`) });
      if (!url) invalid();
      // Runs can finish or move between statuses while the three queries run.
      if (run.status === "completed") {
        completed.add(run.id);
        versions.delete(run.id);
        continue;
      }
      if (!ACTIVE_RELEASE_STATUSES.includes(run.status) || run.conclusion != null) invalid();
      if (completed.has(run.id)) continue;
      const version = project.tagPushOnly && run.event === "push" && /^v\d[^\s/]*$/.test(run.head_branch)
        ? run.head_branch : null;
      versions.set(run.id, { version, url, state: run.status === "in_progress" ? "running" : run.status });
    }
  }
  return { state: versions.size ? "active" : "none", versions: [...versions.values()] };
}

function releaseIdentity(release) {
  if (!isObject(release) || !text(release.tag_name) || typeof release.draft !== "boolean" || typeof release.prerelease !== "boolean") invalid();
}

export function normalizeRelease(data, project, errors = [], { fallback = false } = {}) {
  let release = data;
  if (fallback) {
    if (!Array.isArray(data)) invalid();
    for (const item of data) releaseIdentity(item);
    // Keep GitHub's order; never derive a product version from timestamps,
    // workflow success, branch names, or component release tags.
    release = data.find((item) => !item.draft && !project.excludedReleasePrefixes.some((prefix) => item.tag_name.startsWith(prefix)));
    if (!release) return emptyRelease("none");
  }
  releaseIdentity(release);
  checkPrivateEvidence(release, project.repository);
  if (release.draft || (!fallback && release.prerelease) || !Array.isArray(release.assets)) invalid();
  const url = safeRepositoryUrl(release.html_url, project.repository, { suffix: /^\/releases\/tag\/.+$/ });
  if (!url || decodeURIComponent(new URL(url).pathname).split("/releases/tag/")[1] !== release.tag_name) invalid();
  const publishedAt = iso(release.published_at);
  const zipball_url = safeRepositoryUrl(release.zipball_url, project.repository, { api: true, suffix: /^\/zipball\/.+$/ });
  if (!zipball_url) errors.push("release: unsafe or missing source archive URL omitted");
  const assets = [];
  for (const asset of release.assets) {
    if (!isObject(asset) || !text(asset.name) || !["uploaded", "open"].includes(asset.state)
      || !Number.isSafeInteger(asset.size) || asset.size < 0) {
      errors.push("release: malformed asset omitted");
      continue;
    }
    const browser_download_url = safeRepositoryUrl(asset.browser_download_url, project.repository, { suffix: /^\/releases\/download\/.+\/.+$/ });
    const expectedSuffix = `/releases/download/${release.tag_name}/${asset.name}`;
    const download = browser_download_url && decodeURIComponent(new URL(browser_download_url).pathname).slice(project.repository.length + 1) === expectedSuffix
      ? browser_download_url : null;
    if (!download) errors.push("release: unsafe or mismatched asset URL omitted");
    assets.push({ name: asset.name, browser_download_url: download, state: asset.state, size: asset.size });
  }
  return { state: "published", tagName: release.tag_name, url, prerelease: release.prerelease, publishedAt, assets, zipball_url };
}

export function projectEndpoints(project) {
  const base = `/repos/${project.repository}`;
  return {
    releasing: project.releaseWorkflow ? Object.fromEntries(ACTIVE_RELEASE_STATUSES.map((status) => [status,
      `${base}/actions/workflows/${encodeURIComponent(project.releaseWorkflow.split("/").at(-1))}/runs?status=${status}&per_page=30`,
    ])) : null,
    release: `${base}/releases/latest`,
    fallback: `${base}/releases?per_page=30`,
  };
}

function responseError(response) {
  if (response?.error) return ["timeout", "network", "invalid-json", "rate-limit"].includes(response.error) ? response.error : "request failed";
  return Number.isInteger(response?.status) ? `HTTP ${response.status}` : "request failed";
}

export function normalizeProject(project, responses, checkedAt) {
  const result = {
    repository: project.repository,
    checkedAt: iso(checkedAt),
    release: emptyRelease("unavailable"),
    releasing: emptyReleasing(project.releaseWorkflow ? "unavailable" : "unconfigured"),
    errors: [],
  };
  try {
    for (const response of Object.values(responses)) {
      if (Array.isArray(response?.data)) {
        for (const data of response.data) checkPrivateEvidence(data, project.repository);
      } else checkPrivateEvidence(response?.data, project.repository);
    }
  } catch (error) {
    if (error instanceof PrivateRepository) {
      result.errors.push("repository: private repository excluded");
      return result;
    }
    // Other malformed responses are handled independently below.
  }
  const read = (key, response, normalize) => {
    if (response?.status !== 200 || response?.error) {
      result.errors.push(`${key}: ${responseError(response)}`);
      return;
    }
    try { result[key] = normalize(response.data); } catch (error) {
      if (!(error instanceof InvalidResponse)) throw error;
      result.errors.push(`${key}: ${error.message}`);
    }
  };
  if (project.releaseWorkflow) {
    const active = ACTIVE_RELEASE_STATUSES.map((status) => responses[status]);
    const failed = active.findIndex((response) => response?.status !== 200 || response?.error);
    read("releasing", failed === -1 ? { status: 200, data: active.map((response) => response.data) } : active[failed],
      (data) => normalizeReleasing(data, project));
  }
  const fallback = responses.release?.status === 404 && !responses.release?.error;
  read("release", fallback ? responses.fallback : responses.release, (data) => normalizeRelease(data, project, result.errors, { fallback }));
  result.errors = [...new Set(result.errors)];
  return result;
}

// Public requests originate in the visitor's browser and never send a token.
export function githubRequest({ fetcher = globalThis.fetch, signal, now = Date.now } = {}) {
  return async (endpoint) => {
    const timeout = AbortSignal.timeout(10000);
    const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
    try {
      const response = await fetcher(`https://api.github.com${endpoint}`, {
        credentials: "omit",
        redirect: "error",
        cache: "no-cache",
        headers: { Accept: "application/vnd.github+json" },
        signal: requestSignal,
      });
      if (response.status !== 200) {
        const retryAfter = response.headers?.get("retry-after");
        const limited = response.status === 429 || (response.status === 403 &&
          (response.headers?.get("x-ratelimit-remaining") === "0" || retryAfter != null));
        if (limited) {
          const delay = retryAfter == null ? NaN : /^\d+$/.test(retryAfter)
            ? now() + Number(retryAfter) * 1000 : Date.parse(retryAfter);
          const reset = Number(response.headers?.get("x-ratelimit-reset")) * 1000;
          const retryTimes = [delay, reset].filter((time) => Number.isFinite(time) && time > now());
          return { status: response.status, error: "rate-limit",
            retryAt: retryTimes.length ? Math.max(...retryTimes) : now() + 60000 };
        }
        return { status: response.status };
      }
      try { return { status: 200, data: await response.json() }; }
      catch { return { status: 200, error: timeout.aborted ? "timeout" : "invalid-json" }; }
    } catch {
      return { status: null, error: timeout.aborted ? "timeout" : "network" };
    }
  };
}

const CACHE_PREFIX = "idy.github-releases.v1:";
const COOLDOWN_KEY = `${CACHE_PREFIX}retry-at`;
export const RELEASE_CACHE_TTL = 60 * 60 * 1000;
export const RELEASING_CACHE_TTL = 5 * 60 * 1000;

function cacheable(endpoint, response) {
  const project = PROJECTS.find((item) => endpoint.startsWith(`/repos/${item.repository}/`));
  if (!project || !isObject(response) || response.error) return false;
  const endpoints = projectEndpoints(project);
  if (response.status === 404) return endpoint === endpoints.release;
  if (response.status !== 200) return false;
  try {
    if (endpoint === endpoints.release || endpoint === endpoints.fallback) {
      normalizeRelease(response.data, project, [], { fallback: endpoint === endpoints.fallback });
    } else if (Object.values(endpoints.releasing ?? {}).includes(endpoint)) {
      normalizeReleasing([response.data, { total_count: 0, workflow_runs: [] }, { total_count: 0, workflow_runs: [] }], project);
    } else return false;
    return true;
  } catch { return false; }
}

export function createGithubCache({ storage, now = Date.now } = {}) {
  const memory = new Map();
  let retryAt = 0;
  const read = (endpoint) => {
    const key = CACHE_PREFIX + endpoint;
    let entry = memory.get(key);
    try {
      const saved = JSON.parse(storage?.getItem(key) ?? "null");
      if (saved && (!entry || saved.checkedAt >= entry.checkedAt)) entry = saved;
    } catch { /* Corrupt or unavailable storage must not break releases. */ }
    if (!entry || entry.version !== 1 || !Number.isFinite(entry.checkedAt) ||
      entry.checkedAt < 0 || entry.checkedAt > now() + 60000 || !cacheable(endpoint, entry.response)) return null;
    memory.set(key, entry);
    return entry;
  };
  const until = () => {
    try {
      const saved = Number(storage?.getItem(COOLDOWN_KEY));
      if (Number.isFinite(saved) && saved <= now() + 24 * 60 * 60 * 1000) retryAt = Math.max(retryAt, saved);
    } catch { /* The in-memory cooldown still applies. */ }
    return retryAt > now() ? retryAt : 0;
  };
  const cachedResponse = (entry, extra = {}) => ({
    ...entry.response, checkedAt: entry.checkedAt, cached: true, ...extra,
  });
  return {
    wrap(request, { force = false } = {}) {
      return async (endpoint) => {
        const entry = read(endpoint);
        const blockedUntil = until();
        const ttl = endpoint.includes("/actions/") ? RELEASING_CACHE_TTL : RELEASE_CACHE_TTL;
        if (entry && !force && now() - entry.checkedAt < ttl) {
          return cachedResponse(entry, { retryAt: blockedUntil });
        }
        let response;
        if (blockedUntil) response = { status: 429, error: "rate-limit", retryAt: blockedUntil };
        else {
          try { response = await request(endpoint); }
          catch { response = { status: null, error: "network" }; }
        }
        if (response.error === "rate-limit") {
          retryAt = Math.min(now() + 24 * 60 * 60 * 1000,
            Math.max(until(), response.retryAt || now() + 60000));
          try { storage?.setItem(COOLDOWN_KEY, String(retryAt)); } catch { /* Keep the in-memory cooldown. */ }
        }
        if (cacheable(endpoint, response)) {
          const next = { version: 1, checkedAt: now(), response: { status: response.status, data: response.data } };
          memory.set(CACHE_PREFIX + endpoint, next);
          try { storage?.setItem(CACHE_PREFIX + endpoint, JSON.stringify(next)); } catch { /* Quota or storage denial: cache for this visit. */ }
          return { ...response, checkedAt: next.checkedAt };
        }
        // Permission/not-found responses do not revive saved repository data.
        const recoverable = response.error || response.status >= 500 || response.status === 200;
        if (entry && recoverable) return cachedResponse(entry, {
          stale: true, refreshError: response.error || (response.status === 200 ? "invalid-json" : `HTTP ${response.status}`),
          retryAt: until(),
        });
        if (entry && !recoverable) {
          memory.delete(CACHE_PREFIX + endpoint);
          try { storage?.removeItem(CACHE_PREFIX + endpoint); } catch { /* Storage may be blocked. */ }
        }
        return { ...response, retryAt: until() };
      };
    },
  };
}

export async function fetchProject(project, {
  request = githubRequest(), now = () => new Date().toISOString(),
} = {}) {
  const endpoints = projectEndpoints(project);
  const read = async (endpoint) => {
    try { return await request(endpoint); }
    catch { return { status: null, error: "network" }; }
  };
  const [release, active] = await Promise.all([
    (async () => {
      const response = await read(endpoints.release);
      if (response.status === 404 && !response.error) {
        return { release: response, fallback: await read(endpoints.fallback) };
      }
      return { release: response };
    })(),
    Promise.all(Object.entries(endpoints.releasing ?? {}).map(async ([status, endpoint]) =>
      [status, await read(endpoint)])),
  ]);
  const result = normalizeProject(project, { ...release, ...Object.fromEntries(active) }, now());
  result.cached = false;
  result.staleFields = [];
  result.retryAt = 0;
  const times = [];
  for (const [kind, replies] of Object.entries({
    release: [release.fallback ?? release.release], releasing: active.map(([, response]) => response),
  })) {
    result.cached ||= replies.some((response) => response.cached);
    if (replies.some((response) => response.stale)) result.staleFields.push(kind);
    for (const response of replies) {
      if (Number.isFinite(response.checkedAt)) times.push(response.checkedAt);
      if (response.refreshError) result.errors.push(`${kind}: ${response.refreshError}`);
      result.retryAt = Math.max(result.retryAt, response.retryAt || 0);
    }
  }
  if (times.length) result.checkedAt = new Date(Math.min(...times)).toISOString();
  result.errors = [...new Set(result.errors)];
  return result;
}
