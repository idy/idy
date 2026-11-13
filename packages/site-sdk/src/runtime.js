import { createHeaderEnhancer, elementsWithin } from "./header.js";

const stateKey = Symbol.for("idy.site-sdk.document-state.v1");
const defaults = {
  en: {
    language: "Language", theme: "Theme", automatic: "Auto", system: "System",
    light: "Light", dark: "Dark", source: "Source", releases: "Releases",
    allProjects: "All projects", footerNote: "Independent tools. Open source.",
    skipContent: "Skip to content", navigation: "Main navigation", projectLinks: "Project links",
    loadingRelease: "Checking the latest release…", releaseUnavailable: "Release information is unavailable. Browse GitHub Releases for downloads.",
    stableRelease: "Stable release", previewRelease: "Preview release", viewRelease: "View release",
    copy: "Copy", copyCode: "Copy code", copied: "Copied.",
    copySelected: "Code selected. Copy it manually.", copyManual: "Select the code and copy it manually.",
  },
  zh: {
    language: "语言", theme: "主题", automatic: "自动", system: "跟随系统",
    light: "浅色", dark: "深色", source: "源代码", releases: "发布版本",
    allProjects: "所有项目", footerNote: "独立开发，开放源代码。",
    skipContent: "跳转到正文", navigation: "主导航", projectLinks: "项目链接",
    loadingRelease: "正在获取最新版本…", releaseUnavailable: "暂时无法获取版本信息，请前往 GitHub Releases 下载。",
    stableRelease: "稳定版", previewRelease: "预发布版", viewRelease: "查看发布版本",
    copy: "复制", copyCode: "复制代码", copied: "已复制。",
    copySelected: "已选中代码，请手动复制。", copyManual: "请选中代码并手动复制。",
  },
};

function currentDocument() {
  const document = globalThis.document || globalThis.window?.document;
  if (!document?.defaultView) throw new Error("idy.dev site SDK requires a browser document. Importing the SDK is safe during SSR; call initSite after mounting.");
  return document;
}

function normalizedTheme(value) { return value === "light" || value === "dark" ? value : "system"; }
function normalizedLanguage(value) { return value === "en" || value === "zh" ? value : "auto"; }

function createSite(document) {
  const window = document.defaultView;
  const root = document.documentElement;
  const media = window.matchMedia?.("(prefers-color-scheme: dark)");
  const read = (key, fallback) => {
    try { return window.localStorage.getItem(key) || fallback; } catch { return fallback; }
  };
  const save = (key, value) => {
    try { window.localStorage.setItem(key, value); } catch { /* Preferences still work for this visit. */ }
  };
  let themePreference = normalizedTheme(read("idy-theme", "system"));
  let languagePreference = normalizedLanguage(read("idy-language", "auto"));
  const dictionaries = {
    en: Object.assign(Object.create(null), defaults.en),
    zh: Object.assign(Object.create(null), defaults.zh),
  };
  const copyButtons = new WeakSet();
  const copying = new WeakSet();
  let headers;

  function browserLanguage() {
    for (const locale of window.navigator.languages || [window.navigator.language || "en"]) {
      const primary = locale.toLowerCase().split(/[-_]/)[0];
      if (primary === "zh" || primary === "en") return primary;
    }
    return "en";
  }
  let language = languagePreference === "auto" ? browserLanguage() : languagePreference;
  const translatedString = key => dictionaries[language][key] ?? dictionaries.en[key];
  const t = key => translatedString(key) ?? key;

  function syncPreferences(scope) {
    elementsWithin(scope, "select[data-idy-language]").forEach(select => { select.value = languagePreference; });
    elementsWithin(scope, "select[data-idy-theme]").forEach(select => { select.value = themePreference; });
  }

  function applyTheme() {
    const theme = themePreference === "system" ? (media?.matches ? "dark" : "light") : themePreference;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    const themeColor = document.querySelector('meta[name="theme-color"]');
    const pageColor = themeColor?.getAttribute(`data-idy-theme-color-${theme}`)?.trim();
    themeColor?.setAttribute("content", pageColor || (theme === "dark" ? "#0b3d73" : "#0b5cad"));
    syncPreferences(document);
    headers?.render();
  }

  function translate(scope = document) {
    root.lang = language === "zh" ? "zh-CN" : "en";
    for (const node of elementsWithin(scope, "[data-i18n]")) {
      const value = translatedString(node.dataset.i18n);
      if (value !== undefined) node.textContent = value;
    }
    // Explicitly opted-in, locally authored translations may include HTML.
    // Never pass untrusted release or user data as a translation dictionary.
    for (const node of elementsWithin(scope, "[data-i18n-html]")) {
      const value = translatedString(node.dataset.i18nHtml);
      if (value !== undefined) node.innerHTML = value;
    }
    for (const attribute of ["aria-label", "title", "alt"]) {
      for (const node of elementsWithin(scope, `[data-i18n-${attribute}]`)) {
        const value = translatedString(node.getAttribute(`data-i18n-${attribute}`));
        if (value !== undefined) node.setAttribute(attribute, value);
      }
    }
    if (dictionaries[language].pageTitle) {
      document.title = t("pageTitle");
      document.querySelector('meta[property="og:title"]')?.setAttribute("content", t("pageTitle"));
    }
    if (dictionaries[language].pageDescription) {
      for (const selector of ['meta[name="description"]', 'meta[property="og:description"]']) {
        document.querySelector(selector)?.setAttribute("content", t("pageDescription"));
      }
    }
    syncPreferences(scope);
    renderCopy(scope);
    headers?.render(scope);
  }

  function notifyLanguage() {
    document.dispatchEvent(new window.CustomEvent("idy:languagechange", { detail: { language } }));
  }

  function renderCopy(scope) {
    for (const button of elementsWithin(scope, "button[data-idy-copy]")) {
      if (!copyButtons.has(button)) continue;
      const label = button.querySelector("[data-idy-copy-label]");
      if (label) label.textContent = t(label.dataset.i18n || "copy");
      else if (!button.children.length) button.textContent = t(button.dataset.i18n || "copy");
      button.setAttribute("aria-label", t(button.getAttribute("data-i18n-aria-label") || "copyCode"));
    }
    for (const status of elementsWithin(scope, "[data-idy-copy-status][data-idy-copy-message]")) {
      status.textContent = t(status.dataset.idyCopyMessage);
    }
  }

  function enhanceCopy(scope) {
    for (const button of elementsWithin(scope, "button[data-idy-copy]")) {
      const block = button.closest(".idy-code");
      if (!block?.querySelector("code")) continue;
      button.type = "button";
      copyButtons.add(button);
      let status = block.querySelector("[data-idy-copy-status]");
      if (!status) {
        status = document.createElement("p");
        status.className = "copy-status";
        status.setAttribute("data-idy-copy-status", "");
        block.append(status);
      }
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");
      status.setAttribute("aria-atomic", "true");
      button.hidden = false;
    }
    renderCopy(scope);
  }

  async function copy(event) {
    const button = event.target.closest?.("button[data-idy-copy]");
    if (!button || !copyButtons.has(button) || button.disabled || copying.has(button)) return;
    const block = button.closest(".idy-code");
    const code = block?.querySelector("code");
    const status = block?.querySelector("[data-idy-copy-status]");
    if (!code || !status) return;
    copying.add(button);
    button.setAttribute("aria-busy", "true");
    let message = "copied";
    try {
      if (!window.navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await window.navigator.clipboard.writeText(code.textContent || "");
    } catch {
      message = "copyManual";
      try {
        const selection = window.getSelection();
        if (selection) {
          const range = document.createRange();
          range.selectNodeContents(code);
          selection.removeAllRanges();
          selection.addRange(range);
          message = "copySelected";
        }
      } catch { /* Keep the manual-copy instruction if selection is unavailable. */ }
    } finally {
      copying.delete(button);
      button.removeAttribute("aria-busy");
    }
    status.dataset.idyCopyMessage = message;
    status.textContent = t(message);
  }

  const site = {
    get language() { return language; },
    get theme() { return root.dataset.theme; },
    t, loadRelease, asset,
    init(translations = {}) {
      let changed = false;
      for (const locale of ["en", "zh"]) {
        for (const [key, value] of Object.entries(translations?.[locale] || {})) {
          if (typeof value === "string" && dictionaries[locale][key] !== value) {
            dictionaries[locale][key] = value;
            changed = true;
          }
        }
      }
      site.enhance();
      if (changed) notifyLanguage();
      return site;
    },
    setTheme(preference) {
      themePreference = normalizedTheme(preference);
      save("idy-theme", themePreference);
      applyTheme();
    },
    setLanguage(preference) {
      languagePreference = normalizedLanguage(preference);
      save("idy-language", languagePreference);
      language = languagePreference === "auto" ? browserLanguage() : languagePreference;
      translate();
      notifyLanguage();
    },
    enhance(scope = document) {
      if (scope !== document && scope.ownerDocument !== document) throw new TypeError("Enhancement root must belong to this document");
      translate(scope);
      headers.enhance(scope);
      enhanceCopy(scope);
      if (document.readyState !== "loading") delete root.dataset.idyHeaderPending;
      return site;
    },
  };

  // Delegation keeps native selects functional when inserted after DOMContentLoaded.
  document.addEventListener("change", event => {
    const select = event.target;
    if (select.matches?.("select[data-idy-language]")) site.setLanguage(select.value);
    if (select.matches?.("select[data-idy-theme]")) site.setTheme(select.value);
  });
  document.addEventListener("click", copy);
  headers = createHeaderEnhancer(document, site);
  if (media?.addEventListener) media.addEventListener("change", applyTheme);
  else media?.addListener?.(applyTheme);
  window.addEventListener("languagechange", () => {
    if (languagePreference === "auto") {
      language = browserLanguage();
      translate();
      notifyLanguage();
    }
  });
  window.addEventListener("storage", event => {
    if (event.storageArea) {
      try { if (event.storageArea !== window.localStorage) return; } catch { return; }
    }
    if (event.key === "idy-theme" || event.key === null) {
      themePreference = normalizedTheme(event.key === null ? read("idy-theme", "system") : event.newValue);
      applyTheme();
    }
    if (event.key === "idy-language" || event.key === null) {
      languagePreference = normalizedLanguage(event.key === null ? read("idy-language", "auto") : event.newValue);
      language = languagePreference === "auto" ? browserLanguage() : languagePreference;
      translate();
      notifyLanguage();
    }
  });
  if (document.readyState === "loading") {
    root.dataset.idyHeaderPending = "true";
    document.addEventListener("DOMContentLoaded", () => {
      applyTheme();
      site.enhance();
      delete root.dataset.idyHeaderPending;
      notifyLanguage();
    }, { once: true });
    window.addEventListener("load", () => { delete root.dataset.idyHeaderPending; }, { once: true });
  }
  root.lang = language === "zh" ? "zh-CN" : "en";
  applyTheme();
  return site;
}

function siteFor(document) {
  if (!document[stateKey]) {
    Object.defineProperty(document, stateKey, { value: createSite(document) });
  }
  const site = document[stateKey];
  document.defaultView.IdySite = site;
  return site;
}

export function initSite(translations = {}) {
  return siteFor(currentDocument()).init(translations);
}

export function enhance(root = currentDocument()) {
  const document = root.nodeType === 9 ? root : root.ownerDocument;
  if (!document?.defaultView) throw new TypeError("Enhancement requires a browser document, element, or document fragment");
  return siteFor(document).enhance(root);
}

export function setTheme(preference) { siteFor(currentDocument()).setTheme(preference); }
export function setLanguage(preference) { siteFor(currentDocument()).setLanguage(preference); }

function validRepository(repository) {
  return typeof repository === "string" && /^[\w.-]+\/[\w.-]+$/.test(repository) &&
    repository.split("/").every(part => part !== "." && part !== "..");
}

function validRelease(release, repository) {
  return release && !release.draft && typeof release.tag_name === "string" && release.tag_name.length > 0 &&
    Array.isArray(release.assets) && typeof release.html_url === "string" &&
    release.html_url.startsWith(`https://github.com/${repository}/releases/tag/`) &&
    release.html_url.length > `https://github.com/${repository}/releases/tag/`.length;
}

export async function loadRelease(repository) {
  if (!validRepository(repository)) throw new Error("Invalid repository");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  const request = path => fetch(`https://api.github.com/repos/${repository}/${path}`, {
    headers: { Accept: "application/vnd.github+json" }, credentials: "omit", signal: controller.signal,
  });
  try {
    let response = await request("releases/latest");
    if (response.status === 404) {
      response = await request("releases?per_page=100");
      if (!response.ok) throw new Error(`Releases: ${response.status}`);
      const releases = await response.json();
      if (!Array.isArray(releases)) throw new Error("Invalid release list");
      const published = releases.filter(release => validRelease(release, repository))
        .filter(release => Number.isFinite(Date.parse(release.published_at)))
        .sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at));
      const release = published.find(item => !item.prerelease) || published[0];
      if (!release) throw new Error("No published releases");
      return release;
    }
    if (!response.ok) throw new Error(`Releases: ${response.status}`);
    const release = await response.json();
    if (!validRelease(release, repository)) throw new Error("Invalid release");
    return release;
  } finally {
    clearTimeout(timeout);
  }
}

export function asset(release, pattern) {
  if (!release || typeof release.html_url !== "string" || typeof release.tag_name !== "string" || !release.tag_name ||
      !Array.isArray(release.assets) || !pattern || typeof pattern.test !== "function") return undefined;
  const match = /^https:\/\/github\.com\/([\w.-]+\/[\w.-]+)\/releases\/tag\/.+/.exec(release.html_url);
  if (!match || !validRepository(match[1])) return undefined;
  const encodeSegment = value => {
    if (value === "." || value === "..") return undefined;
    try { return encodeURIComponent(value); } catch { return undefined; }
  };
  const tag = encodeSegment(release.tag_name);
  if (tag === undefined) return undefined;
  const prefix = `https://github.com/${match[1]}/releases/download/${tag}/`;
  return release.assets.find(item => {
    pattern.lastIndex = 0;
    if (!item || item.state !== "uploaded" || !Number.isFinite(item.size) || item.size <= 0 ||
        typeof item.name !== "string" || !item.name || !pattern.test(item.name)) return false;
    const name = encodeSegment(item.name);
    return name !== undefined && item.browser_download_url === prefix + name;
  });
}
