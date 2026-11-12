import { PROJECTS, projectEndpoints } from "../../docs/project-status.js";

export const nootify = PROJECTS.find((project) => project.repository === "idy/nootify");
export const now = "2026-11-12T08:00:00.000Z";
export function memoryStorage() {
  const data = new Map();
  return { data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}
export const ok = (data) => ({ status: 200, data });
export const runs = (...workflow_runs) => ({ total_count: workflow_runs.length, workflow_runs });
export const run = (project = nootify, overrides = {}) => ({
  id: 124, name: "Release", path: ".github/workflows/release.yml",
  head_branch: "v0.2.2", head_sha: "a".repeat(40),
  event: "push", status: "in_progress", conclusion: null,
  html_url: `https://github.com/${project.repository}/actions/runs/${overrides.id ?? 124}`,
  repository: { full_name: project.repository, private: false }, ...overrides,
});
export const release = (project = nootify, overrides = {}) => {
  const tag = overrides.tag_name ?? "v0.2.1";
  return {
    tag_name: tag, draft: false, prerelease: false, published_at: "2026-11-10T08:00:00Z",
    html_url: `https://github.com/${project.repository}/releases/tag/${tag}`,
    zipball_url: `https://api.github.com/repos/${project.repository}/zipball/${tag}`,
    assets: [], ...overrides,
  };
};
export const responses = (project = nootify, overrides = {}) => ({
  in_progress: ok(runs(run(project))), queued: ok(runs()), waiting: ok(runs()),
  release: ok(release(project)), ...overrides,
});

// Exercise the same public HTTP interface as the browser, without network access.
export function api(overrides = {}, observe = () => {}) {
  return async (url, options) => {
    observe(url, options);
    const parsed = new URL(url);
    if (parsed.origin !== "https://api.github.com") throw new Error(`Unexpected origin: ${url}`);
    const project = PROJECTS.find((item) => parsed.pathname.startsWith(`/repos/${item.repository}/`));
    if (!project) throw new Error(`Unexpected project: ${url}`);
    const endpoint = parsed.pathname + parsed.search;
    const endpoints = projectEndpoints(project);
    const kind = Object.keys(endpoints.releasing ?? {}).find((key) => endpoints.releasing[key] === endpoint)
      ?? (endpoint === endpoints.release ? "release" : endpoint === endpoints.fallback ? "fallback" : null);
    if (!kind) throw new Error(`Unexpected endpoint: ${url}`);
    const custom = typeof overrides === "function" ? await overrides(project, kind, url) : project === nootify ? overrides[kind] : undefined;
    const reply = custom ?? (kind === "release" ? ok(release(project)) : kind === "fallback" ? ok([]) : ok(runs()));
    return new Response(JSON.stringify(reply.data ?? {}), { status: reply.status, headers: reply.headers });
  };
}
