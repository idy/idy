import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";
import { startDirectory, githubLink } from "../docs/directory.js";
import { asset } from "../packages/site-sdk/src/runtime.js";
import { api, memoryStorage, nootify, now, ok, release, run, runs } from "./helpers/github.mjs";

const html = await readFile(new URL("../docs/index.html", import.meta.url), "utf8");
async function setup(t, overrides = { in_progress: ok(runs(run())) }, fetcher, wait = true, options = {}) {
  const dom = new JSDOM(html, { url: "https://idy.dev/" });
  if (options.storage) Object.defineProperty(dom.window, "localStorage", { value: options.storage });
  let dictionaries;
  const site = {
    language: "en", asset,
    t: (key) => dictionaries?.[site.language]?.[key] ?? dictionaries?.en?.[key] ?? { releases: "Releases" }[key] ?? key,
    init(value) { dictionaries = value; },
  };
  const controller = startDirectory(dom.window.document, site, fetcher ?? api(overrides), options.now ?? (() => Date.parse(now)));
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
  assert.equal(calls.length, 34);
  assert.ok(calls.every((url) => url.startsWith("https://api.github.com/repos/")));
  assert.match(document.querySelector("#release-check-time").textContent, /^Checked GitHub/);
});

test("page reloads reuse localStorage while the refresh button fetches new versions", async (t) => {
  const storage = memoryStorage();
  let calls = 0;
  let updated = false;
  const fetcher = api((project, kind) => project === nootify && kind === "release"
    ? ok(release(nootify, { tag_name: updated ? "v0.3.0" : "v0.2.1" })) : undefined, () => calls++);
  await setup(t, {}, fetcher, true, { storage });
  assert.equal(calls, 34);
  updated = true;
  const page = await setup(t, {}, fetcher, true, { storage });
  assert.equal(calls, 34, "a new page must read stored responses without any GitHub requests");
  assert.equal(page.row.querySelector("[data-release-link]").textContent, "v0.2.1");
  assert.match(page.document.querySelector("#release-check-time").textContent, /^Local cache · checked/);
  page.site.language = "zh";
  page.document.dispatchEvent(new page.dom.window.CustomEvent("idy:languagechange"));
  assert.match(page.document.querySelector("#release-check-time").textContent, /^本地缓存 · 上次查询/);
  await page.controller.reload();
  assert.equal(calls, 68);
  assert.equal(page.row.querySelector("[data-release-link]").textContent, "v0.3.0");
});

test("rate-limited refreshes keep cached versions and persist the retry pause across pages", async (t) => {
  const storage = memoryStorage();
  let limited = false;
  let calls = 0;
  const reset = Date.parse(now) + 3600000;
  const normal = api({ in_progress: ok(runs(run())) });
  const fetcher = async (...args) => {
    calls++;
    return limited ? new Response("{}", { status: 403, headers: {
      "x-ratelimit-remaining": "0", "x-ratelimit-reset": String(reset / 1000),
    } }) : normal(...args);
  };
  const first = await setup(t, {}, fetcher, true, { storage });
  limited = true;
  await first.controller.reload();
  assert.equal(first.row.querySelector("[data-release-link]").textContent, "v0.2.1");
  assert.equal(first.row.querySelector(".releasing-note").textContent, "Last observed: Releasing");
  assert.match(first.document.querySelector("#release-check-time").textContent, /request limit reached · cached data from/);
  const before = calls;
  const reloaded = await setup(t, {}, fetcher, true, { storage });
  await reloaded.controller.reload();
  assert.equal(calls, before, "neither page reload nor forced refresh may make requests during cooldown");
  assert.equal(reloaded.row.querySelector("[data-release-link]").textContent, "v0.2.1");
  assert.match(reloaded.document.querySelector("#release-check-time").textContent, /retry after/);
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
  assert.equal(document.querySelector("#release-check-time").classList.contains("has-status-error"), true);
});

test("download validation warnings do not misreport successful requests as failures", async (t) => {
  for (const warning of [
    { zipball_url: null },
    { zipball_url: "https://other.example/source.zip" },
    { assets: [null] },
    { assets: [{ name: "Nootify_0.2.1_arm64.dmg", state: "uploaded", size: 123,
      browser_download_url: "https://other.example/Nootify_0.2.1_arm64.dmg" }] },
  ]) {
    const { row, document } = await setup(t, { release: ok(release(nootify, warning)) });
    const status = document.querySelector("#release-check-time");
    assert.equal(row.querySelector("[data-release-link]").textContent, "v0.2.1");
    assert.match(status.textContent, /^Checked GitHub/);
    assert.equal(status.classList.contains("has-status-error"), false);
    assert.equal(row.querySelector("[data-download-note]").hidden, false);
    assert.equal(row.querySelector('[data-downloads] a[href^="https://other.example"]'), null);
  }
});

test("offline errors are unavailable rather than a claimed empty release", async (t) => {
  const { row, document } = await setup(t, {}, async () => { throw new Error("offline"); });
  assert.equal(row.querySelector("[data-releasing-empty]").textContent, "Unavailable");
  assert.equal(row.querySelector("[data-release-status]").textContent, "Version unavailable");
  assert.match(document.querySelector("#release-check-time").textContent, /^GitHub unavailable/);
  assert.equal(document.querySelectorAll("tr.project:not([hidden])").length, 13);
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
  assert.equal(requests, 68);
});

test("failed refresh preserves versions and labels active data as a cached observation", async (t) => {
  let offline = false;
  const publicApi = api({ in_progress: ok(runs(run())) });
  const { row, controller, document } = await setup(t, {}, async (...args) => {
    if (offline) throw new Error("offline");
    return publicApi(...args);
  });
  offline = true;
  await controller.reload();
  assert.equal(row.querySelector(".releasing-version").textContent, "v0.2.2");
  assert.equal(row.querySelector(".releasing-note").textContent, "Last observed: Releasing");
  assert.equal(row.querySelector("[data-release-link]").textContent, "v0.2.1");
  assert.match(document.querySelector("#release-check-time").textContent, /^Refresh failed · cached data from/);
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

test("yesman matches published installers without exposing updater deltas", async (t) => {
  const names = [
    "yesman-0.1.4-arm64.dmg", "yesman-0.1.4-amd64.dmg",
    "yesman-setup-0.1.4-arm64.exe", "yesman-setup-0.1.4-amd64.exe",
    "yesman-0.1.4-linux-arm64.tar.gz", "yesman-0.1.4-linux-amd64.tar.gz",
    "yesman-0.1.2-to-0.1.4-darwin-arm64.delta", "update-darwin-arm64.json",
  ];
  const { document } = await setup(t, (project, kind) => {
    if (project.repository !== "idy/yesman" || kind !== "release") return;
    return ok(release(project, { tag_name: "v0.1.4", assets: names.map(name => ({
      name, state: "uploaded", size: 123,
      browser_download_url: `https://github.com/idy/yesman/releases/download/v0.1.4/${name}`,
    })) }));
  });
  const row = document.querySelector('[data-repository="idy/yesman"]');
  assert.deepEqual([...row.querySelectorAll('[data-downloads] a')].map(link => link.href.split('/').pop()), names.slice(0, 6));
  assert.equal(row.querySelector('h2').textContent.trim(), "yesman");
  assert.ok(row.querySelector('a[href="https://github.com/idy/yesman/releases/latest"]'));
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
  assert.equal(document.querySelectorAll("tr.project:not([hidden])").length, 13);
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
