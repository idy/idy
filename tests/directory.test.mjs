import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";
import { startDirectory, isStale, githubLink } from "../docs/directory.js";
import { asset } from "../packages/site-sdk/src/runtime.js";

const html = await readFile(
  new URL("../docs/index.html", import.meta.url),
  "utf8",
);
const now = Date.parse("2026-11-11T12:00:00Z");
const version = (overrides = {}) => ({
  version: "v0.2.2",
  url: "https://github.com/idy/nootify/actions/runs/124",
  state: "running",
  ...overrides,
});
const record = (overrides = {}) => ({
  repository: "idy/nootify",
  checkedAt: new Date(now).toISOString(),
  releasing: { state: "active", versions: [version()] },
  release: {
    state: "published",
    tagName: "v0.2.1",
    url: "https://github.com/idy/nootify/releases/tag/v0.2.1",
    prerelease: false,
    publishedAt: "2026-11-10T12:00:00Z",
    assets: [],
  },
  ...overrides,
});
const snapshot = (data) => ({
  schemaVersion: 2,
  generatedAt: new Date(now).toISOString(),
  projects: { "idy/nootify": record(data) },
});
async function setup(t, payload = snapshot(), fetcher) {
  const dom = new JSDOM(html, { url: "https://idy.dev/" });
  let dictionaries;
  const site = {
    language: "en",
    asset,
    t: (key) =>
      dictionaries?.[site.language]?.[key] ?? dictionaries?.en?.[key] ?? key,
    init(value) {
      dictionaries = value;
    },
  };
  const controller = startDirectory(
    dom.window.document,
    site,
    fetcher || (async () => ({ ok: true, json: async () => payload })),
    () => now,
  );
  t.after(() => {
    controller.dispose();
    dom.window.close();
  });
  await controller.ready;
  return {
    dom,
    document: dom.window.document,
    site,
    controller,
    row: dom.window.document.querySelector('[data-repository="idy/nootify"]'),
  };
}

test("cards and table show only Released and Releasing versions, with no CI fields", async (t) => {
  const { row, document } = await setup(t);
  assert.equal(row.querySelector("[data-release-link]").textContent, "v0.2.1");
  assert.equal(row.querySelector(".releasing-version").textContent, "v0.2.2");
  assert.equal(row.querySelector(".releasing-note").textContent, "Releasing");
  assert.equal(document.querySelector('[data-kind="actions"]'), null);
  assert.equal(document.querySelector(".workflow-cell"), null);
  assert.deepEqual(
    [...document.querySelectorAll("thead th")].map((e) => e.textContent.trim()),
    ["Project", "Released", "Releasing"],
  );
});

test("no active release shows a dash and never a historical build result", async (t) => {
  const { row } = await setup(
    t,
    snapshot({ releasing: { state: "none", versions: [] } }),
  );
  assert.equal(row.querySelector("[data-releasing-empty]").textContent, "—");
  assert.equal(
    row.querySelector("[data-releasing-empty]").title,
    "No release in progress",
  );
  assert.equal(row.querySelector(".releasing-version"), null);
  assert.equal(row.querySelector("[data-release-link]").textContent, "v0.2.1");
  assert.doesNotMatch(
    row.textContent,
    /Workflow completed|Failed|Passed|Draft build/,
  );
});

test("unknown target cannot be rendered as a guessed version or branch", async (t) => {
  const { row } = await setup(
    t,
    snapshot({
      releasing: {
        state: "active",
        versions: [
          version({ version: null, branch: "main", sha: "abcdef123" }),
        ],
      },
    }),
  );
  assert.equal(
    row.querySelector(".releasing-version").textContent,
    "Version not confirmed",
  );
  assert.doesNotMatch(
    row.querySelector(".releasing-cell").textContent,
    /main|abcdef123/,
  );
});

test("concurrent release versions remain visible and completed entries are excluded", async (t) => {
  const { row } = await setup(
    t,
    snapshot({
      releasing: {
        state: "active",
        versions: [
          version(),
          version({
            version: "v0.3.0",
            state: "queued",
            url: "https://github.com/idy/nootify/actions/runs/125",
          }),
          version({ version: "v0.1.0", state: "success" }),
        ],
      },
    }),
  );
  assert.deepEqual(
    [...row.querySelectorAll(".releasing-version")].map((e) => e.textContent),
    ["v0.2.2", "v0.3.0"],
  );
  assert.equal(
    row.querySelectorAll(".releasing-note")[1].textContent,
    "Queued",
  );
});

test("stale releasing versions are historical rather than claimed current", async (t) => {
  const data = snapshot({ checkedAt: "2026-11-10T12:00:00Z" });
  data.generatedAt = "2026-11-10T12:00:00Z";
  const { row, document } = await setup(t, data);
  assert.equal(
    row.querySelector(".releasing-note").textContent,
    "Last observed",
  );
  assert.match(
    document.querySelector("#snapshot-time").textContent,
    /^Older snapshot/,
  );
  assert.equal(isStale("not-a-date", now), true);
});

test("untracked and confirmed empty releasing fields are not confused", async (t) => {
  const { row } = await setup(
    t,
    snapshot({ releasing: { state: "unconfigured", versions: [] } }),
  );
  assert.equal(row.querySelector("[data-releasing-empty]").textContent, "—");
  assert.match(
    row.querySelector("[data-releasing-empty]").getAttribute("aria-label"),
    /not tracked/,
  );
});

test("snapshot failure is unavailable, not an empty releasing state", async (t) => {
  const { row, document } = await setup(t, null, async () => {
    throw new Error("offline");
  });
  assert.equal(
    row.querySelector("[data-releasing-empty]").textContent,
    "Unavailable",
  );
  assert.equal(
    row.querySelector("[data-release-status]").textContent,
    "Version unavailable",
  );
  assert.equal(
    document.querySelectorAll("tr.project:not([hidden])").length,
    12,
  );
});

test("reload failure preserves published version and reports stale refresh", async (t) => {
  let calls = 0;
  const { row, controller, document } = await setup(t, null, async () => {
    if (++calls > 1) throw new Error("offline");
    return { ok: true, json: async () => snapshot() };
  });
  await controller.reload();
  assert.equal(row.querySelector("[data-release-link]").textContent, "v0.2.1");
  assert.match(
    document.querySelector("#snapshot-time").textContent,
    /^Reload failed/,
  );
});

test("search, family tabs, view switching and clear preserve shared rows", async (t) => {
  const { document, dom } = await setup(t);
  const search = document.querySelector("#project-search");
  const change = (element) =>
    element.dispatchEvent(new dom.window.Event("change"));
  search.value = "sing box";
  search.dispatchEvent(new dom.window.Event("input"));
  assert.deepEqual(
    [...document.querySelectorAll("tr.project:not([hidden])")].map(
      (row) => row.dataset.repository,
    ),
    ["idy/tailsplit", "idy/wgc-ne", "idy/sing-box-flutter"],
  );
  document.querySelector('button[data-view="table"]').click();
  assert.equal(document.querySelector(".directory").dataset.view, "table");
  search.value = "no-such-project";
  search.dispatchEvent(new dom.window.Event("input"));
  assert.equal(document.querySelector(".empty-state").hidden, false);
  document.querySelector("#clear-filters").click();
  assert.equal(
    document.querySelectorAll("tr.project:not([hidden])").length,
    12,
  );
  const tab = (value) =>
    document.querySelector(`button[data-category="${value}"]`);
  tab("devices").click();
  assert.equal(document.querySelectorAll("tr.project:not([hidden])").length, 4);
  assert.equal(tab("devices").getAttribute("aria-pressed"), "true");
  assert.equal(tab("all").getAttribute("aria-pressed"), "false");
  search.value = "zzz";
  search.dispatchEvent(new dom.window.Event("input"));
  document.querySelector("#clear-filters").click();
  assert.equal(tab("all").getAttribute("aria-pressed"), "true");
  assert.equal(
    document.querySelectorAll("tr.project:not([hidden])").length,
    12,
  );
  assert.equal(document.querySelector("#project-sort"), null);
  assert.equal(
    document.querySelector("tbody tr").dataset.repository,
    "GizClaw/gizclaw",
  );
});

test("language changes translate releasing explanations without changing version tags", async (t) => {
  const { document, dom, site, row } = await setup(t);
  site.language = "zh";
  document.dispatchEvent(new dom.window.CustomEvent("idy:languagechange"));
  assert.equal(row.querySelector(".releasing-version").textContent, "v0.2.2");
  assert.equal(row.querySelector(".releasing-note").textContent, "发布中");
  assert.match(
    document.querySelector("#project-count").textContent,
    /12 \/ 12/,
  );
});

test("release version text is inert and foreign/active URLs never become links", async (t) => {
  const data = snapshot({
    releasing: {
      state: "active",
      versions: [
        version({ version: "<img src=x onerror=alert(1)>" }),
        version({ url: "javascript:alert(1)" }),
      ],
    },
    release: {
      state: "published",
      tagName: "v1",
      url: "https://github.com/other/repo/releases/tag/v1",
    },
  });
  const { row } = await setup(t, data);
  assert.equal(row.querySelector(".releasing-cell img"), null);
  assert.equal(row.querySelectorAll(".releasing-version").length, 1);
  assert.match(row.querySelector(".releasing-version").textContent, /<img/);
  assert.equal(
    row.querySelector("[data-release-status]").textContent,
    "Version unavailable",
  );
  assert.equal(
    githubLink(
      "https://github.com.evil.test/idy/nootify/actions/runs/7",
      "idy/nootify",
      "run",
    ),
    null,
  );
});
