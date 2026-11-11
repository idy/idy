import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { JSDOM } from "jsdom";
import { build } from "esbuild";
import { initSite, enhance, createHeader, createFooter, loadRelease, asset } from "../packages/site-sdk/src/index.js";

const entry = new URL("../packages/site-sdk/src/index.js", import.meta.url);
const browserEntry = fileURLToPath(new URL("../packages/site-sdk/src/browser.js", import.meta.url));

function fixture(t, html = "", { dark = false, languages = ["en-US"], url = "https://example.test/" } = {}) {
  const dom = new JSDOM(`<!doctype html><html><head><meta name="theme-color" content="initial"></head><body>${html}</body></html>`, { url });
  const { window } = dom;
  const previous = { window: globalThis.window, document: globalThis.document };
  globalThis.window = window;
  globalThis.document = window.document;
  const media = new window.EventTarget();
  media.matches = dark;
  let subscriptions = 0;
  const listen = media.addEventListener.bind(media);
  media.addEventListener = (...args) => { subscriptions++; listen(...args); };
  window.matchMedia = () => media;
  Object.defineProperty(window.navigator, "languages", { configurable: true, value: languages });
  t.after(() => {
    window.close();
    for (const key of ["window", "document"]) {
      if (previous[key] === undefined) delete globalThis[key];
      else globalThis[key] = previous[key];
    }
  });
  return { window, document: window.document, media, subscriptions: () => subscriptions };
}

async function ready(document) {
  if (document.readyState !== "loading") return;
  await new Promise(resolve => document.addEventListener("DOMContentLoaded", resolve, { once: true }));
}

const tick = () => new Promise(resolve => setImmediate(resolve));
function key(window, node, value) {
  node.dispatchEvent(new window.KeyboardEvent("keydown", { key: value, bubbles: true, cancelable: true }));
}
function change(window, select, value) {
  select.value = value;
  select.dispatchEvent(new window.Event("change", { bubbles: true }));
}
function panelFor(document, trigger) { return document.getElementById(trigger.getAttribute("aria-controls")); }

const codeBlock = '<div class="idy-code"><pre><code>npm install @idy/site-sdk\nnext command</code></pre><button data-idy-copy hidden>Copy</button><p data-idy-copy-status></p></div>';

test("ESM is safe to import without browser globals and has no automatic initialization", t => {
  const output = execFileSync(process.execPath, ["--input-type=module", "-e", `
    import assert from 'node:assert/strict';
    const sdk = await import(${JSON.stringify(entry.href)});
    assert.equal(typeof globalThis.window, 'undefined');
    assert.equal(typeof sdk.initSite, 'function');
    assert.throws(() => sdk.initSite(), /browser document/);
    assert.throws(() => sdk.createHeader(), /requires a document/);
    console.log('SSR import passed');
  `], { encoding: "utf8" });
  assert.match(output, /SSR import passed/);
  const { document, window } = fixture(t);
  assert.equal(window.IdySite, undefined);
  assert.equal(document.documentElement.hasAttribute("data-theme"), false);
  const header = createHeader();
  assert.equal(window.IdySite, undefined);
  assert.equal(header.querySelectorAll(".header-controls").length, 0);
});

test("early initialization applies stored preferences synchronously and enhances parsed content once", async t => {
  const { document, window, subscriptions } = fixture(t, '<h1 data-i18n="title">Fallback</h1>');
  window.localStorage.setItem("idy-theme", "dark");
  window.localStorage.setItem("idy-language", "zh");
  assert.equal(document.readyState, "loading");
  const site = initSite({ en: { title: "English title" }, zh: { title: "中文标题" } });
  assert.equal(document.documentElement.dataset.theme, "dark");
  assert.equal(document.documentElement.lang, "zh-CN");
  assert.equal(document.documentElement.style.colorScheme, "dark");
  assert.equal(document.querySelector('meta[name="theme-color"]').content, "#142033");
  assert.equal(window.IdySite, site);
  document.body.append(createHeader());
  await ready(document);
  assert.equal(document.querySelector("h1").textContent, "中文标题");
  assert.equal(document.querySelectorAll(".header-controls").length, 1);
  assert.equal(document.documentElement.hasAttribute("data-idy-header-pending"), false);
  assert.strictEqual(initSite(), site);
  site.enhance();
  assert.equal(subscriptions(), 1);
  assert.equal(document.querySelectorAll(".header-controls").length, 1);
});

test("page theme colors survive early initialization and explicit or system theme changes", t => {
  const { document, window, media } = fixture(t);
  const meta = document.querySelector('meta[name="theme-color"]');
  meta.setAttribute("data-idy-theme-color-light", "#0b5cad");
  meta.setAttribute("data-idy-theme-color-dark", "#0b3d73");
  window.localStorage.setItem("idy-theme", "dark");
  const site = initSite();
  assert.equal(meta.content, "#0b3d73");
  site.setTheme("light");
  assert.equal(meta.content, "#0b5cad");
  site.setTheme("system");
  assert.equal(meta.content, "#0b5cad");
  media.matches = true;
  media.dispatchEvent(new window.Event("change"));
  assert.equal(meta.content, "#0b3d73");
  initSite();
  assert.equal(meta.content, "#0b3d73");
});

test("missing page theme-color overrides retain SDK defaults and optional meta behavior", t => {
  const { document } = fixture(t);
  const meta = document.querySelector('meta[name="theme-color"]');
  meta.setAttribute("data-idy-theme-color-light", "#ffffff");
  const site = initSite();
  assert.equal(meta.content, "#ffffff");
  site.setTheme("dark");
  assert.equal(meta.content, "#142033");
  meta.setAttribute("data-idy-theme-color-light", "  ");
  site.setTheme("light");
  assert.equal(meta.content, "#f7f9fc");
  meta.remove();
  assert.doesNotThrow(() => site.setTheme("dark"));
});

test("late and dynamic enhancement is idempotent with globally unique accessible menu IDs", async t => {
  const { document, window, subscriptions } = fixture(t);
  await ready(document);
  const site = initSite();
  const headers = [createHeader(), createHeader({ projectName: "Demo", projectHref: "/demo" })];
  document.body.append(...headers);
  enhance(document);
  enhance(headers[0]);
  initSite();
  assert.equal(subscriptions(), 1);
  assert.equal(document.querySelectorAll(".header-controls").length, 2);
  const triggers = [...document.querySelectorAll("[data-preference]")];
  const ids = triggers.flatMap(trigger => [trigger.id, trigger.getAttribute("aria-controls")]);
  assert.equal(new Set(ids).size, ids.length);
  for (const trigger of triggers) {
    const panel = panelFor(document, trigger);
    assert.equal(panel.getAttribute("aria-labelledby"), trigger.id);
    assert.equal(panel.getAttribute("role"), "menu");
  }
  let changes = 0;
  document.addEventListener("idy:languagechange", () => changes++);
  const select = headers[1].querySelector("[data-idy-language]");
  change(window, select, "zh");
  assert.equal(changes, 1, "a single native change has one effect after duplicate initialization");
  assert.equal(site.language, "zh");
  assert.equal(headers[0].querySelector("[data-idy-language]").value, "zh");
  const third = createHeader();
  document.body.append(third);
  // Even a new select that has not been enhanced is bound through delegation.
  change(window, third.querySelector("[data-idy-theme]"), "dark");
  assert.equal(site.theme, "dark");
  enhance(third);
  assert.match(third.querySelector('[data-preference="theme"]').ariaLabel, /主题: 深色/);
  assert.equal(window.localStorage.getItem("idy-theme"), "dark");
  assert.equal(document.cookie, "");
});

test("menus retain keyboard navigation, synchronized selection, and outside dismissal", async t => {
  const { document, window } = fixture(t);
  await ready(document);
  const first = createHeader();
  const second = createHeader();
  const outside = document.createElement("button");
  outside.textContent = "Outside";
  document.body.append(first, second, outside);
  const site = initSite();
  const theme = first.querySelector('[data-preference="theme"]');
  const language = first.querySelector('[data-preference="language"]');
  const themePanel = panelFor(document, theme);
  const languagePanel = panelFor(document, language);
  theme.focus();
  key(window, theme, "ArrowDown");
  assert.equal(themePanel.hidden, false);
  assert.equal(document.activeElement.dataset.value, "system");
  key(window, document.activeElement, "End");
  assert.equal(document.activeElement.dataset.value, "dark");
  key(window, document.activeElement, "ArrowDown");
  assert.equal(document.activeElement.dataset.value, "system");
  key(window, document.activeElement, "ArrowUp");
  assert.equal(document.activeElement.dataset.value, "dark");
  key(window, document.activeElement, "Home");
  assert.equal(document.activeElement.dataset.value, "system");
  key(window, document.activeElement, "ArrowDown");
  document.activeElement.click();
  assert.equal(site.theme, "light");
  assert.equal(window.localStorage.getItem("idy-theme"), "light");
  assert.equal(themePanel.hidden, true);
  assert.strictEqual(document.activeElement, theme);
  assert.equal(second.querySelector('[data-preference="theme"]').ariaLabel, "Theme: Light");
  key(window, language, "ArrowUp");
  assert.equal(document.activeElement.dataset.value, "zh");
  document.activeElement.click();
  assert.equal(site.language, "zh");
  assert.equal(document.documentElement.lang, "zh-CN");
  assert.equal(languagePanel.querySelector('[data-value="zh"]').getAttribute("aria-checked"), "true");
  assert.equal(window.localStorage.getItem("idy-language"), "zh");
  theme.click();
  key(window, document.activeElement, "Escape");
  assert.equal(themePanel.hidden, true);
  assert.strictEqual(document.activeElement, theme);
  theme.click();
  outside.focus();
  assert.equal(themePanel.hidden, true);
  theme.click();
  outside.dispatchEvent(new window.Event("pointerdown", { bubbles: true }));
  assert.equal(themePanel.hidden, true);
  theme.click();
  key(window, document.activeElement, "Tab");
  assert.equal(themePanel.hidden, true);
  assert.strictEqual(document.activeElement, theme);
  theme.click();
  const otherTheme = second.querySelector('[data-preference="theme"]');
  otherTheme.click();
  assert.equal(themePanel.hidden, true);
  assert.equal(panelFor(document, otherTheme).hidden, false);
  window.dispatchEvent(new window.Event("blur"));
  assert.equal(panelFor(document, otherTheme).hidden, true);
  const mobile = first.querySelector(".idy-mobile");
  mobile.open = true;
  key(window, mobile.querySelector("summary"), "Escape");
  assert.equal(mobile.open, false);
  assert.strictEqual(document.activeElement, mobile.querySelector("summary"));
  mobile.open = true;
  mobile.querySelector("a").addEventListener("click", event => event.preventDefault());
  mobile.querySelector("a").click();
  assert.equal(mobile.open, false);
});

test("system detection, storage changes, and denied storage keep preferences usable", async t => {
  const { document, window, media } = fixture(t, '<p data-i18n="allProjects"></p>', { dark: true, languages: ["fr", "zh-TW"] });
  await ready(document);
  const site = initSite();
  assert.equal(site.theme, "dark");
  assert.equal(site.language, "zh");
  media.matches = false;
  media.dispatchEvent(new window.Event("change"));
  assert.equal(site.theme, "light");
  site.setTheme("dark");
  media.dispatchEvent(new window.Event("change"));
  assert.equal(site.theme, "dark");
  Object.defineProperty(window.navigator, "languages", { configurable: true, value: ["en-US"] });
  window.dispatchEvent(new window.Event("languagechange"));
  assert.equal(site.language, "en");
  window.dispatchEvent(new window.StorageEvent("storage", { key: "idy-theme", newValue: "system", storageArea: window.localStorage }));
  assert.equal(site.theme, "light");
  window.dispatchEvent(new window.StorageEvent("storage", { key: "idy-language", newValue: "zh", storageArea: window.localStorage }));
  assert.equal(site.language, "zh");
  window.dispatchEvent(new window.StorageEvent("storage", { key: "idy-language", newValue: "en", storageArea: window.sessionStorage }));
  assert.equal(site.language, "zh", "session storage does not change origin preferences");
  t.mock.method(window.Storage.prototype, "setItem", () => { throw new Error("storage denied"); });
  site.setTheme("light");
  site.setLanguage("en");
  assert.equal(site.theme, "light");
  assert.equal(site.language, "en");
});

test("translations retain authored fallback and update metadata and trusted local HTML", async t => {
  const { document } = fixture(t, '<h1 data-i18n="missing">Authored fallback</h1><p data-i18n="englishOnly">Fallback</p><div data-i18n-html="rich">Fallback</div><img data-i18n-alt="imageAlt" alt="Fallback">');
  await ready(document);
  const site = initSite({ en: { englishOnly: "English fallback", rich: "<strong>Trusted</strong>", imageAlt: "An image" }, zh: { pageTitle: "标题" } });
  site.setLanguage("zh");
  assert.equal(document.querySelector("h1").textContent, "Authored fallback");
  assert.equal(document.querySelector("p").textContent, "English fallback");
  assert.equal(document.querySelector("strong").textContent, "Trusted");
  assert.equal(document.querySelector("img").alt, "An image");
  assert.equal(document.title, "标题");
  assert.equal(site.t("unknown"), "unknown");
  site.init({ zh: { missing: "已翻译" } });
  assert.equal(document.querySelector("h1").textContent, "已翻译");
});

test("copy enhancement is idempotent, translates labels, and writes exactly once", async t => {
  const { document, window } = fixture(t, codeBlock);
  await ready(document);
  const button = document.querySelector("[data-idy-copy]");
  const status = document.querySelector("[data-idy-copy-status]");
  assert.equal(button.hidden, true);
  const writes = [];
  Object.defineProperty(window.navigator, "clipboard", { value: { writeText: async text => { writes.push(text); } } });
  const site = initSite();
  enhance();
  initSite();
  assert.equal(button.hidden, false);
  assert.equal(button.type, "button");
  assert.equal(status.getAttribute("role"), "status");
  assert.equal(status.getAttribute("aria-live"), "polite");
  button.click();
  button.click();
  await tick();
  assert.deepEqual(writes, ["npm install @idy/site-sdk\nnext command"]);
  assert.equal(status.textContent, "Copied.");
  assert.equal(button.hasAttribute("aria-busy"), false);
  site.setLanguage("zh");
  assert.equal(button.textContent, "复制");
  assert.equal(button.getAttribute("aria-label"), "复制代码");
  assert.equal(status.textContent, "已复制。");
  document.body.insertAdjacentHTML("beforeend", codeBlock);
  enhance(document.body.lastElementChild);
  assert.equal(document.querySelectorAll("[data-idy-copy-status]").length, 2);
  document.body.lastElementChild.querySelector("button").click();
  await tick();
  assert.equal(writes.length, 2);
});

test("clipboard denial selects code and reports manual recovery in the current language", async t => {
  const { document, window } = fixture(t, codeBlock);
  await ready(document);
  Object.defineProperty(window.navigator, "clipboard", { value: { writeText: async () => { throw new Error("denied"); } } });
  const site = initSite();
  site.setLanguage("zh");
  const button = document.querySelector("[data-idy-copy]");
  button.click();
  await tick();
  assert.equal(window.getSelection().toString(), document.querySelector("code").textContent);
  assert.equal(document.querySelector("[data-idy-copy-status]").textContent, "已选中代码，请手动复制。");
  window.getSelection = () => null;
  button.click();
  await tick();
  assert.equal(document.querySelector("[data-idy-copy-status]").textContent, "请选中代码并手动复制。");
});

test("late copy controls create one live status and preserve icon markup without a clipboard", async t => {
  const { document, window } = fixture(t);
  await ready(document);
  const site = initSite();
  site.setLanguage("zh");
  document.body.insertAdjacentHTML("beforeend", '<div class="idy-code"><pre><code>brew install demo</code></pre><button data-idy-copy hidden><i aria-hidden="true"></i><span data-idy-copy-label>Copy</span></button></div>');
  const block = document.body.lastElementChild;
  enhance(block);
  enhance(block);
  assert.equal(block.querySelectorAll("[data-idy-copy-status]").length, 1);
  assert.equal(block.querySelector("[data-idy-copy-label]").textContent, "复制");
  assert.ok(block.querySelector("i"));
  block.querySelector("button").click();
  await tick();
  assert.equal(window.getSelection().toString(), "brew install demo");
  assert.equal(block.querySelector("[data-idy-copy-status]").textContent, "已选中代码，请手动复制。");
});

test("DOM factories keep malicious strings inert and reject active or credentialed URLs", t => {
  const { document } = fixture(t);
  const hostile = '<img src=x onerror="window.pwned=true">';
  const header = createHeader({ siteName: hostile, siteHref: "/home", projectName: hostile, projectHref: "#project", navLinks: [{ label: hostile, href: "https://example.test/", ariaLabel: hostile, newTab: true }], action: { label: hostile, href: "mailto:hello@example.test", icon: "github-logo" } });
  const footer = createFooter({ siteName: hostile, projectName: "Example", note: hostile, links: [{ label: hostile, href: "tel:+1234" }] });
  document.body.append(header, footer);
  assert.equal(document.querySelector("img"), null);
  assert.equal(header.querySelector(".idy-home").textContent, hostile);
  assert.equal(header.querySelector(".idy-action-pill span").textContent, hostile);
  assert.equal(footer.querySelector("p").textContent, hostile);
  assert.equal(header.querySelector(".idy-nav a").rel, "noopener noreferrer");
  assert.equal(header.querySelector(".idy-nav a").getAttribute("aria-label"), hostile);
  for (const href of ["javascript:alert(1)", "JaVaScRiPt:alert(1)", "java\nscript:alert(1)", "data:text/html,bad", "vbscript:bad", "https://user:password@example.test/", "", "file:///etc/passwd"]) {
    assert.throws(() => createHeader({ siteHref: href }), TypeError);
    assert.throws(() => createFooter({ links: [{ label: "Bad", href }] }), TypeError);
  }
  assert.throws(() => createHeader({ action: { label: "Bad", href: "/", icon: 'x" onclick="bad' } }), TypeError);
  const minimal = createHeader({ navLinks: [], action: null, preferences: false });
  assert.equal(minimal.querySelector("nav"), null);
  assert.equal(minimal.querySelector(".header-actions"), null);
});

test("browser IIFE exposes the API and synchronously initializes preferences in head", async t => {
  const result = await build({ entryPoints: [browserEntry], bundle: true, write: false, format: "iife", globalName: "IdySiteSDK", target: "es2020" });
  const source = result.outputFiles[0].text;
  const dom = new JSDOM(`<!doctype html><html><head><script>${source}</script><script>window.firstTheme = document.documentElement.dataset.theme; window.firstLanguage = document.documentElement.lang;</script></head><body><p data-i18n="allProjects">Fallback</p></body></html>`, {
    url: "https://browser.test/", runScripts: "dangerously",
    beforeParse(window) { window.localStorage.setItem("idy-theme", "dark"); window.localStorage.setItem("idy-language", "zh"); },
  });
  t.after(() => dom.window.close());
  await ready(dom.window.document);
  assert.equal(dom.window.firstTheme, "dark");
  assert.equal(dom.window.firstLanguage, "zh-CN");
  assert.equal(dom.window.document.querySelector("p").textContent, "所有项目");
  assert.equal(typeof dom.window.IdySiteSDK.createHeader, "function");
  const site = dom.window.IdySite;
  dom.window.eval(source);
  assert.strictEqual(dom.window.IdySite, site, "loading the bundle twice shares the document singleton");
  dom.window.document.body.append(dom.window.IdySiteSDK.createHeader());
  dom.window.IdySite.enhance();
  assert.strictEqual(enhance(dom.window.document), site, "ESM and IIFE entries share the same document singleton");
  assert.equal(dom.window.document.querySelectorAll(".header-controls").length, 1);
});

const release = (tag, extra = {}) => ({ tag_name: tag, html_url: `https://github.com/idy/demo/releases/tag/${tag}`, assets: [], draft: false, prerelease: false, published_at: "2026-01-01T00:00:00Z", ...extra });
const response = (status, data) => ({ status, ok: status >= 200 && status < 300, json: async () => data });

test("release requests validate repository, request options, and latest payload", async t => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (...args) => { calls.push(args); return response(200, release("v1")); });
  for (const repository of ["bad", "a/b/c", "../demo", "idy/..", "https://github.com/idy/demo", "idy/demo?token=x"]) {
    await assert.rejects(loadRelease(repository), /Invalid repository/);
  }
  assert.equal(calls.length, 0);
  assert.equal((await loadRelease("idy/demo")).tag_name, "v1");
  assert.equal(calls[0][0], "https://api.github.com/repos/idy/demo/releases/latest");
  assert.equal(calls[0][1].credentials, "omit");
  assert.equal(calls[0][1].headers.Accept, "application/vnd.github+json");
  assert.ok(calls[0][1].signal instanceof AbortSignal);
});

test("404 fallback prefers newest stable release, then newest preview, and excludes invalid entries", async t => {
  let releases = [
    release("preview", { prerelease: true, published_at: "2026-10-01" }),
    release("old", { published_at: "2025-01-01" }),
    release("stable", { published_at: "2026-03-01" }),
    release("draft", { draft: true, published_at: "2026-11-01" }),
    release("invalid-date", { published_at: "yesterday" }),
    release("evil", { html_url: "https://evil.test/", published_at: "2026-11-01" }),
  ];
  const calls = [];
  t.mock.method(globalThis, "fetch", async url => { calls.push(url); return url.endsWith("/latest") ? response(404) : response(200, releases); });
  assert.equal((await loadRelease("idy/demo")).tag_name, "stable");
  assert.equal(calls[1], "https://api.github.com/repos/idy/demo/releases?per_page=100");
  releases = [release("preview-old", { prerelease: true }), release("preview-new", { prerelease: true, published_at: "2026-05-01" })];
  assert.equal((await loadRelease("idy/demo")).tag_name, "preview-new");
  releases = [];
  await assert.rejects(loadRelease("idy/demo"), /No published releases/);
  releases = {};
  await assert.rejects(loadRelease("idy/demo"), /Invalid release list/);
});

test("release failures surface without an unrelated fallback request", async t => {
  let data = response(503);
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => { calls++; return data; });
  await assert.rejects(loadRelease("idy/demo"), /Releases: 503/);
  assert.equal(calls, 1);
  for (const invalid of [null, release(""), release("v1", { draft: true }), release("v1", { assets: null }), release("v1", { html_url: "https://github.com.evil.test/idy/demo/releases/tag/v1" })]) {
    data = response(200, invalid);
    await assert.rejects(loadRelease("idy/demo"), /Invalid release/);
  }
  t.mock.method(globalThis, "fetch", async url => url.endsWith("/latest") ? response(404) : response(403));
  await assert.rejects(loadRelease("idy/demo"), /Releases: 403/);
  t.mock.method(globalThis, "fetch", async () => { throw new Error("Network offline"); });
  await assert.rejects(loadRelease("idy/demo"), /Network offline/);
});

test("release timeout aborts a stalled request", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let signal;
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    signal = options.signal;
    return new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(new DOMException("Request aborted", "AbortError")), { once: true }));
  });
  const pending = loadRelease("idy/demo");
  t.mock.timers.tick(8000);
  await assert.rejects(pending, { name: "AbortError" });
  assert.equal(signal.aborted, true);
});

test("asset selection rejects foreign URLs and invalid assets and handles global regexes", () => {
  const good = { name: "demo mac.zip", state: "uploaded", size: 42, browser_download_url: "https://github.com/idy/demo/releases/download/v1%2Fnext/demo%20mac.zip" };
  const data = release("v1/next", { assets: [
    { ...good, state: "new" }, { ...good, size: 0 }, { ...good, size: "42" },
    { ...good, browser_download_url: "https://evil.test/demo%20mac.zip" },
    { ...good, browser_download_url: `${good.browser_download_url}?token=bad` }, good,
  ] });
  const pattern = /\.zip$/g;
  assert.strictEqual(asset(data, pattern), good);
  assert.strictEqual(asset(data, pattern), good);
  assert.equal(asset(data, /\.dmg$/), undefined);
  assert.equal(asset({ ...data, html_url: "https://github.com.evil.test/idy/demo/releases/tag/v1" }, pattern), undefined);
  assert.equal(asset({ ...data, html_url: "https://github.com/../demo/releases/tag/v1" }, pattern), undefined);
  assert.equal(asset(null, pattern), undefined);
  assert.equal(asset({ ...data, assets: null }, pattern), undefined);
  assert.equal(asset({ ...data, tag_name: "\ud800" }, pattern), undefined);
  assert.equal(asset({ ...data, assets: [{ ...good, name: "\ud800.zip" }] }, pattern), undefined);
  assert.equal(asset({ ...data, assets: [{ ...good, name: "..", browser_download_url: "https://github.com/idy/demo/releases/download/v1%2Fnext/.." }] }, /.*/), undefined);
});
