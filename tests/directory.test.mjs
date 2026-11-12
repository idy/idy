import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";
import { startDirectory, githubLink } from "../docs/directory.js";
import { asset } from "../packages/site-sdk/src/runtime.js";
import { api, nootify, now, ok, release, run, runs } from "./helpers/github.mjs";

const html = await readFile(new URL("../docs/index.html", import.meta.url), "utf8");
async function setup(t, overrides = { in_progress: ok(runs(run())) }, fetcher, wait = true) {
  const dom = new JSDOM(html, { url: "https://idy.dev/" });
  let dictionaries;
  const site = {
    language: "en", asset,
    t: (key) => dictionaries?.[site.language]?.[key] ?? dictionaries?.en?.[key] ?? { releases: "Releases" }[key] ?? key,
    init(value) { dictionaries = value; },
  };
  const controller = startDirectory(dom.window.document, site, fetcher ?? api(overrides), () => Date.parse(now));
  t.after(() => { controller.dispose(); dom.window.close(); });
  if (wait) await controller.ready;
  return { dom, document: dom.window.document, site, controller,
    row: dom.window.document.querySelector('[data-repository="idy/nootify"]') };
}

test("cards and table render direct GitHub releases without CI fields", async (t) => {
  const calls = [];
  const { row, document } = await setup(t, undefined, api({ in_progress: ok(runs(run())) }, (url) => calls.push(url)));
  assert.equal(row.querySelector("[data-release-link]").textContent, "v0.2.1");
  assert.equal(row.querySelector(".releasing-version").textContent, "v0.2.2");
  assert.equal(row.querySelector(".releasing-note").textContent, "Releasing");
  assert.equal(document.querySelector(".workflow-cell"), null);
  assert.deepEqual([...document.querySelectorAll("thead th")].map((e) => e.textContent.trim()), ["Project", "Released", "Releasing"]);
  assert.equal(calls.length, 30);
  assert.ok(calls.every((url) => url.startsWith("https://api.github.com/repos/")));
  assert.match(document.querySelector("#release-check-time").textContent, /^Checked GitHub/);
});

test("no active release shows a dash; untracked projects keep a distinct explanation", async (t) => {
  const { row, document } = await setup(t, {});
  assert.equal(row.querySelector("[data-releasing-empty]").textContent, "—");
  assert.equal(row.querySelector("[data-releasing-empty]").title, "No release in progress");
  assert.equal(row.querySelector(".releasing-version"), null);
  assert.match(document.querySelector('[data-repository="idy/wgc"] [data-releasing-empty]').getAttribute("aria-label"), /not tracked/);
});

test("unknown target cannot be rendered as a guessed branch or version", async (t) => {
  const { row } = await setup(t, { in_progress: ok(runs(run(nootify, { event: "workflow_dispatch", head_branch: "main" }))) });
  assert.equal(row.querySelector(".releasing-version").textContent, "Version not confirmed");
  assert.doesNotMatch(row.querySelector(".releasing-cell").textContent, /main|abcdef123/);
});

test("concurrent release versions remain visible and completed entries are excluded", async (t) => {
  const { row } = await setup(t, {
    in_progress: ok(runs(run(), run(nootify, { id: 126, status: "completed", conclusion: "success" }))),
    queued: ok(runs(run(nootify, { id: 125, head_branch: "v0.3.0", status: "queued" }))),
  });
  assert.deepEqual([...row.querySelectorAll(".releasing-version")].map((e) => e.textContent), ["v0.2.2", "v0.3.0"]);
  assert.equal(row.querySelectorAll(".releasing-note")[1].textContent, "Queued");
});

test("each project renders before slower projects finish and refresh stays disabled until done", async (t) => {
  let finish;
  let received;
  const waiting = new Promise((resolve) => { received = resolve; });
  const slow = new Promise((resolve) => { finish = resolve; });
  const fetcher = api(async (project, kind) => {
    if (project === nootify && kind === "release") { received(); await slow; }
  });
  const { document, controller, row } = await setup(t, {}, fetcher, false);
  await waiting;
  assert.equal(document.querySelector('[data-repository="GizClaw/gizclaw"] [data-release-link]').textContent, "v0.2.1");
  assert.equal(row.querySelector("[data-release-status]").textContent, "Loading…");
  assert.equal(document.querySelector("#refresh-status").disabled, true);
  finish();
  await controller.ready;
  assert.equal(row.querySelector("[data-release-link]").textContent, "v0.2.1");
  assert.equal(document.querySelector("#refresh-status").disabled, false);
});

test("a project failure does not hide another project's release", async (t) => {
  const { row, document } = await setup(t, { release: { status: 503 }, queued: { status: 503 } });
  assert.equal(row.querySelector("[data-releasing-empty]").textContent, "Unavailable");
  assert.equal(row.querySelector("[data-release-status]").textContent, "Version unavailable");
  assert.equal(document.querySelector('[data-repository="GizClaw/gizclaw"] [data-release-link]').textContent, "v0.2.1");
  assert.match(document.querySelector("#release-check-time").textContent, /^Some GitHub requests failed/);
});

test("offline errors are unavailable rather than a claimed empty release", async (t) => {
  const { row, document } = await setup(t, {}, async () => { throw new Error("offline"); });
  assert.equal(row.querySelector("[data-releasing-empty]").textContent, "Unavailable");
  assert.equal(row.querySelector("[data-release-status]").textContent, "Version unavailable");
  assert.match(document.querySelector("#release-check-time").textContent, /^GitHub unavailable/);
  assert.equal(document.querySelectorAll("tr.project:not([hidden])").length, 12);
});

test("manual refresh reads newer releases directly and clears finished releasing versions", async (t) => {
  let refreshed = false;
  let requests = 0;
  const fetcher = api((project, kind) => {
    if (project !== nootify) return;
    if (kind === "release") return ok(release(nootify, { tag_name: refreshed ? "v0.2.2" : "v0.2.1" }));
    if (kind === "in_progress") return ok(refreshed ? runs() : runs(run()));
  }, () => requests++);
  const { row, controller, document } = await setup(t, {}, fetcher);
  assert.equal(row.querySelector(".releasing-version").textContent, "v0.2.2");
  refreshed = true;
  document.querySelector("#refresh-status").click();
  // Calling reload while the button's request is in progress must not duplicate it.
  await controller.reload();
  await new Promise((resolve) => {
    const observer = new document.defaultView.MutationObserver(() => {
      if (!document.querySelector("#refresh-status").disabled) { observer.disconnect(); resolve(); }
    });
    observer.observe(document.querySelector("#refresh-status"), { attributes: true });
    if (!document.querySelector("#refresh-status").disabled) { observer.disconnect(); resolve(); }
  });
  assert.equal(row.querySelector("[data-release-link]").textContent, "v0.2.2");
  assert.equal(row.querySelector(".releasing-version"), null);
  assert.equal(requests, 60);
});

test("failed refresh removes old active data instead of presenting it as current", async (t) => {
  let offline = false;
  const publicApi = api({ in_progress: ok(runs(run())) });
  const { row, controller } = await setup(t, {}, async (...args) => {
    if (offline) throw new Error("offline");
    return publicApi(...args);
  });
  offline = true;
  await controller.reload();
  assert.equal(row.querySelector(".releasing-version"), null);
  assert.equal(row.querySelector("[data-release-link]").textContent, "Releases");
  assert.equal(row.querySelector("[data-release-status]").textContent, "Version unavailable");
});

test("rate limits explain the failure and keep GitHub fallback links", async (t) => {
  const limited = { status: 403, headers: { "x-ratelimit-remaining": "0" } };
  const { row, document } = await setup(t, { release: limited, queued: limited });
  assert.equal(row.querySelector("[data-release-status]").textContent, "GitHub request limit reached");
  assert.equal(row.querySelector("[data-releasing-empty]").textContent, "GitHub request limit reached");
  assert.equal(row.querySelector("[data-release-link]").href, "https://github.com/idy/nootify/releases");
  assert.match(document.querySelector("#release-check-time").textContent, /request limit reached/);
});

test("validated release assets and source archives still provide downloads", async (t) => {
  const { row, document } = await setup(t, (project, kind) => {
    if (kind !== "release") return;
    return ok(release(project, { assets: [{ name: "Nootify_0.2.1_arm64.dmg", state: "uploaded", size: 123,
      browser_download_url: `https://github.com/${project.repository}/releases/download/v0.2.1/Nootify_0.2.1_arm64.dmg` }] }));
  });
  assert.equal(row.querySelector("[data-downloads] a").href, "https://github.com/idy/nootify/releases/download/v0.2.1/Nootify_0.2.1_arm64.dmg");
  assert.equal(document.querySelector('[data-repository="idy/wgc"] [data-downloads] a').href, "https://api.github.com/repos/idy/wgc/zipball/v0.2.1");
});

test("search, categories, table view and clear preserve the same project rows", async (t) => {
  const { document, dom } = await setup(t);
  const search = document.querySelector("#project-search");
  search.value = "sing box";
  search.dispatchEvent(new dom.window.Event("input"));
  assert.deepEqual([...document.querySelectorAll("tr.project:not([hidden])")].map((row) => row.dataset.repository), ["idy/tailsplit", "idy/wgc-ne", "idy/sing-box-flutter"]);
  document.querySelector('button[data-view="table"]').click();
  assert.equal(document.querySelector(".directory").dataset.view, "table");
  search.value = "no-such-project";
  search.dispatchEvent(new dom.window.Event("input"));
  assert.equal(document.querySelector(".empty-state").hidden, false);
  document.querySelector("#clear-filters").click();
  assert.equal(document.querySelectorAll("tr.project:not([hidden])").length, 12);
  document.querySelector('button[data-category="devices"]').click();
  assert.equal(document.querySelectorAll("tr.project:not([hidden])").length, 4);
  assert.equal(document.querySelector("tbody tr").dataset.repository, "GizClaw/gizclaw");
});

test("language switches translate direct-query controls without changing versions", async (t) => {
  const { document, dom, site, row } = await setup(t);
  site.language = "zh";
  document.dispatchEvent(new dom.window.CustomEvent("idy:languagechange"));
  assert.equal(row.querySelector(".releasing-version").textContent, "v0.2.2");
  assert.equal(row.querySelector(".releasing-note").textContent, "发布中");
  assert.equal(document.querySelector("#refresh-status").textContent, "刷新发布信息");
  assert.match(document.querySelector("#release-check-time").textContent, /^已查询 GitHub/);
  assert.doesNotMatch(document.querySelector(".directory").textContent, /快照|状态待更新|15 分钟/);
});

test("version labels remain inert and unsafe URLs cannot become links", async (t) => {
  const { row } = await setup(t, {
    in_progress: ok(runs(run(nootify, { head_branch: "v1<img>" }))),
    release: ok(release(nootify, { html_url: "https://github.com/other/repo/releases/tag/v1" })),
  });
  assert.equal(row.querySelector(".releasing-cell img"), null);
  assert.equal(row.querySelector(".releasing-version").textContent, "v1<img>");
  assert.equal(row.querySelector("[data-release-status]").textContent, "Version unavailable");
  assert.equal(githubLink("https://github.com.evil.test/idy/nootify/actions/runs/7", "idy/nootify", "run"), null);
});
