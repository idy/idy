import { downloads } from "./downloads.js";

const text = {
  en: {
    directoryLabel: "Project directory",
    directoryIntro: "Find a tool. Get the release. See what’s next.",
    joinCommunity: "Join the community",
    searchLabel: "Search projects",
    searchPlaceholder: "Find a project…",
    revStatus: "Status",
    revVersion: "Version",
    revDate: "Date",
    familyLabel: "Project family",
    categoryLabel: "Category",
    categoryAll: "All",
    categoryDevices: "Devices",
    categoryDesktop: "Desktop",
    categoryNetworking: "Networking",
    categoryLibraries: "Libraries & design",
    sortLabel: "Sort projects",
    sortDefault: "Project order",
    sortName: "Name A–Z",
    sortActivity: "Releasing first",
    viewLabel: "Project view",
    cardsView: "Cards",
    tableView: "Table",
    projectColumn: "Project",
    publishedLabel: "Released",
    refreshSnapshot: "Reload snapshot",
    refreshing: "Reloading…",
    snapshotLoading: "Loading GitHub snapshot…",
    snapshotUnavailable:
      "GitHub snapshot unavailable. Open each repository to check its status.",
    snapshotTime: "GitHub snapshot · {time}",
    snapshotStale: "Older snapshot · {time}",
    snapshotFailed: "Reload failed · showing {time}",
    projectsCount: "{shown} of {total} projects",
    emptyHeading: "No matching projects",
    emptyText: "Try another name or category.",
    clearFilters: "Clear filters",
    statusExplanation: "About release versions",
    statusExplanationText:
      "Released is the latest published version. Releasing lists only versions with an active release, including queued or waiting releases. A version is shown only when its target tag is confirmed; otherwise it is marked “Version not confirmed”. Completed and failed builds are not shown. Snapshots update on a 15-minute schedule and may be delayed.",
    statusLoading: "Loading…",
    statusUnavailable: "Unavailable",
    previewPublished: "Prerelease",
    noRelease: "No published release",
    unavailableRelease: "Version unavailable",
    projectDetails: "Details & links",
    homebrewQuick: "Install with Homebrew",
    shortGizclaw: "Runtime and edge server for connected devices.",
    shortGizmoth: "Pair devices. Build and deploy Lua apps.",
    shortGizos: "Portable firmware and application platform.",
    shortNootify: "Follow coding sessions and reply from Feishu.",
    shortCh348: "Native macOS drivers for eight-port USB serial.",
    shortTailsplit: "Rule-based routing with sing-box and Tailscale.",
    shortTailrelay: "Tailscale exit nodes through a SOCKS5 proxy.",
    shortWgc: "Encrypted application messages over WireGuard.",
    shortWgcne: "Flutter and Apple Network Extension SDK.",
    shortSingbox: "Native sing-box VPN for Flutter on Android and iOS.",
    shortMagpie: "CSS tokens, components, and application shells.",
    shortHomebrew: "Install Nootify and TailSplit on macOS.",
    releasingLabel: "Releasing",
    noReleasing: "No release in progress",
    untrackedReleasing: "In-progress versions are not tracked for this project",
    unknownVersion: "Version not confirmed",
    releaseInProgress: "Releasing",
    releaseQueued: "Queued",
    releaseWaiting: "Waiting",
    historicalRelease: "Last observed",
    staleReleasing: "Awaiting fresh data",
  },
  zh: {
    directoryLabel: "项目目录",
    directoryIntro: "找到工具，获取已发布版本，了解正在发布的版本。",
    joinCommunity: "加入社区",
    searchLabel: "搜索项目",
    searchPlaceholder: "搜索项目名称或用途…",
    revStatus: "状态",
    revVersion: "版本",
    revDate: "日期",
    familyLabel: "项目类别",
    categoryLabel: "项目分类",
    categoryAll: "全部",
    categoryDevices: "设备",
    categoryDesktop: "桌面",
    categoryNetworking: "网络",
    categoryLibraries: "开发库与设计",
    sortLabel: "项目排序",
    sortDefault: "默认排序",
    sortName: "名称 A–Z",
    sortActivity: "正在发布的优先",
    viewLabel: "项目视图",
    cardsView: "卡片",
    tableView: "表格",
    projectColumn: "项目",
    publishedLabel: "Released",
    refreshSnapshot: "重新载入快照",
    refreshing: "载入中…",
    snapshotLoading: "正在载入 GitHub 状态快照…",
    snapshotUnavailable: "GitHub 状态快照暂不可用，请前往对应仓库查看。",
    snapshotTime: "GitHub 快照 · {time}",
    snapshotStale: "较早的快照 · {time}",
    snapshotFailed: "刷新失败 · 显示 {time} 的快照",
    projectsCount: "显示 {shown} / {total} 个项目",
    emptyHeading: "没有匹配的项目",
    emptyText: "试试其他关键词或分类。",
    clearFilters: "清除筛选",
    statusExplanation: "关于版本信息",
    statusExplanationText:
      "Released 显示最新已发布版本，Releasing 仅列出正在发布、排队或等待中的版本。只有能确认目标标签时才显示版本号，否则标注“版本待确认”。已完成和失败的构建不会展示。快照计划每 15 分钟更新，可能有延迟。",
    statusLoading: "载入中…",
    statusUnavailable: "暂不可用",
    previewPublished: "预发布",
    noRelease: "暂无发布版本",
    unavailableRelease: "版本暂不可用",
    projectDetails: "详情与链接",
    homebrewQuick: "通过 Homebrew 安装",
    shortGizclaw: "联网设备的运行时与边缘服务器。",
    shortGizmoth: "配对设备，构建并部署 Lua 应用。",
    shortGizos: "可移植的固件与应用平台。",
    shortNootify: "在飞书跟进编程会话并回复。",
    shortCh348: "八通道 USB 串口的原生 macOS 驱动。",
    shortTailsplit: "基于 sing-box 与 Tailscale 的规则分流。",
    shortTailrelay: "通过 SOCKS5 代理运行 Tailscale 出口。",
    shortWgc: "通过 WireGuard 传输加密应用消息。",
    shortWgcne: "Flutter 与 Apple 网络扩展 SDK。",
    shortSingbox: "Android / iOS 上的 Flutter 原生 sing-box VPN。",
    shortMagpie: "CSS 变量、组件与应用布局。",
    shortHomebrew: "在 macOS 安装 Nootify 与 TailSplit。",
    releasingLabel: "Releasing",
    noReleasing: "暂无发布中版本",
    untrackedReleasing: "此项目尚未跟踪发布中的版本",
    unknownVersion: "版本待确认",
    releaseInProgress: "发布中",
    releaseQueued: "排队中",
    releaseWaiting: "等待中",
    historicalRelease: "上次观测",
    staleReleasing: "状态待更新",
  },
};

const ACTIVE = new Set(["running", "queued", "waiting"]);
export const STALE_AFTER = 30 * 60 * 1000;

export function isStale(checkedAt, now = Date.now()) {
  const time = Date.parse(checkedAt);
  return (
    !Number.isFinite(time) || time > now + 60000 || now - time > STALE_AFTER
  );
}

export function githubLink(value, repository, kind = "any") {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.origin !== "https://github.com" || url.username || url.password)
      return null;
    const base = `/${repository}/`;
    if (!url.pathname.startsWith(base)) return null;
    if (
      kind === "run" &&
      !new RegExp(
        `^/${repository.replaceAll(".", "\\.")}\/actions\/runs\/\\d+$`,
      ).test(url.pathname)
    )
      return null;
    if (kind === "release" && !url.pathname.startsWith(`${base}releases/tag/`))
      return null;
    return url.href;
  } catch {
    return null;
  }
}

export function matchesProject(row, query, category) {
  const normalize = (value) => value.toLocaleLowerCase().replace(/[-_/]/g, " ");
  const haystack = normalize(
    `${row.dataset.repository} ${row.querySelector(".project-identity").textContent}`,
  );
  return (
    (category === "all" || row.dataset.category === category) &&
    normalize(query)
      .trim()
      .split(/\s+/)
      .every((word) => haystack.includes(word))
  );
}

export function startDirectory(
  document,
  site,
  fetcher = globalThis.fetch,
  now = () => Date.now(),
) {
  const directory = document.querySelector(".directory");
  if (!directory) return;
  site.init(text);
  const rows = [...directory.querySelectorAll(".project")];
  const tbody = directory.querySelector("tbody");
  const search = directory.querySelector("#project-search");
  const tabs = [...directory.querySelectorAll("button[data-category]")];
  let category = "all";
  const selectCategory = (value) => {
    category = tabs.some((tab) => tab.dataset.category === value)
      ? value
      : "all";
    for (const tab of tabs)
      tab.setAttribute(
        "aria-pressed",
        String(tab.dataset.category === category),
      );
    filters();
  };
  const refresh = directory.querySelector("#refresh-status");
  const metadata = directory.querySelector("#snapshot-time");
  let snapshot = null;
  let loading = false;
  let failed = false;
  const t = (key, replacements = {}) =>
    Object.entries(replacements).reduce(
      (value, [name, replacement]) =>
        value.replaceAll(`{${name}}`, String(replacement)),
      site.t(key),
    );
  const day = (value) => {
    const time = Date.parse(value);
    return Number.isFinite(time)
      ? new Intl.DateTimeFormat(site.language === "zh" ? "zh-CN" : "en", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }).format(time)
      : "";
  };
  const date = (value) => {
    const time = Date.parse(value);
    return Number.isFinite(time)
      ? new Intl.DateTimeFormat(site.language === "zh" ? "zh-CN" : "en", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          year: "numeric",
        }).format(time)
      : "";
  };

  function releasing(row, record) {
    const cell = row.querySelector(".releasing-cell");
    const list = cell.querySelector("[data-releasing-list]");
    const empty = cell.querySelector("[data-releasing-empty]");
    const data = record?.releasing;
    const stale = record && isStale(record.checkedAt, now());
    list.replaceChildren();
    const versions =
      data?.state === "active" && Array.isArray(data.versions)
        ? data.versions
        : [];
    for (const entry of versions) {
      if (!entry || !ACTIVE.has(entry.state)) continue;
      const url = githubLink(entry.url, row.dataset.repository, "run");
      if (!url) continue;
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.className = "releasing-version";
      link.href = url;
      link.textContent =
        typeof entry.version === "string" && entry.version
          ? entry.version
          : t("unknownVersion");
      const state = document.createElement("span");
      state.className = "releasing-note";
      state.textContent = stale
        ? t("historicalRelease")
        : t(
            entry.state === "queued"
              ? "releaseQueued"
              : entry.state === "waiting"
                ? "releaseWaiting"
                : "releaseInProgress",
          );
      item.append(link, state);
      list.append(item);
    }
    empty.hidden = list.children.length > 0;
    list.hidden = !list.children.length;
    if (data?.state === "unconfigured") {
      empty.textContent = "—";
      empty.title = t("untrackedReleasing");
    } else if (stale) {
      empty.textContent = t("staleReleasing");
      empty.title = "";
    } else if (data?.state === "none") {
      empty.textContent = "—";
      empty.title = t("noReleasing");
    } else {
      empty.textContent = t(
        snapshot || failed ? "statusUnavailable" : "statusLoading",
      );
      empty.title = "";
    }
    empty.setAttribute("aria-label", empty.title || empty.textContent);
    // Cards collapse an idle Releasing row; the table keeps its column.
    cell.dataset.releasing = list.children.length
      ? "active"
      : empty.textContent === "—"
        ? "idle"
        : "note";
  }

  function release(row, record) {
    const data = record?.release;
    const label = row.querySelector("[data-release-status]");
    const link = row.querySelector("[data-release-link]");
    const list = row.querySelector("[data-downloads]");
    const details = row.querySelector(".download-details");
    const publishedURL = githubLink(
      data?.url,
      row.dataset.repository,
      "release",
    );
    const published =
      data?.state === "published" &&
      typeof data.tagName === "string" &&
      data.tagName &&
      publishedURL;
    label.textContent = published
      ? data.prerelease
        ? t("previewPublished")
        : ""
      : data?.state === "none"
        ? t("noRelease")
        : snapshot || failed
          ? t("unavailableRelease")
          : t("statusLoading");
    // Cards name a prerelease in the Status column; the table keeps the inline label.
    const statusCell = row.querySelector(".version-cell > .cell-label");
    const prerelease = Boolean(published && data.prerelease);
    row.dataset.prerelease = String(prerelease);
    if (statusCell)
      statusCell.textContent = t(
        prerelease ? "previewPublished" : "publishedLabel",
      );
    link.href =
      publishedURL || `https://github.com/${row.dataset.repository}/releases`;
    link.textContent = published ? data.tagName : t("releases");
    const releaseDate = row.querySelector(".release-date");
    releaseDate.textContent = published ? day(data.publishedAt) : "";
    // Full timestamp stays available without widening the revision table.
    if (published && date(data.publishedAt))
      releaseDate.title = date(data.publishedAt);
    else releaseDate.removeAttribute("title");
    list.replaceChildren();
    details.hidden = true;
    const note = row.querySelector("[data-download-note]");
    note.hidden = true;
    if (!published) return;
    const compatible = {
      html_url: publishedURL,
      tag_name: data.tagName,
      assets: Array.isArray(data.assets) ? data.assets : [],
    };
    let missing = false;
    for (const option of downloads[row.dataset.repository] || []) {
      let url;
      if (option.source) {
        try {
          const source = new URL(data.zipball_url);
          if (
            source.origin === "https://api.github.com" &&
            !source.username &&
            !source.password &&
            source.pathname.startsWith(
              `/repos/${row.dataset.repository}/zipball/`,
            )
          )
            url = source.href;
        } catch {
          /* Keep the release page as the fallback. */
        }
      } else url = site.asset(compatible, option.pattern)?.browser_download_url;
      if (!url) {
        missing = true;
        continue;
      }
      const item = document.createElement("li");
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.textContent = t(option.label);
      item.append(anchor);
      list.append(item);
    }
    note.textContent = missing ? t("downloadsIncomplete") : "";
    note.hidden = !missing;
    details.hidden = !list.children.length && !missing;
  }

  function filters() {
    let shown = 0;
    for (const row of rows) {
      row.hidden = !matchesProject(row, search.value, category);
      if (!row.hidden) shown++;
      tbody.append(row);
    }
    directory.querySelector("#project-count").textContent = t("projectsCount", {
      shown,
      total: rows.length,
    });
    directory.querySelector(".empty-state").hidden = shown !== 0;
  }

  function render() {
    search.placeholder = t("searchPlaceholder");
    for (const row of rows) {
      const record = snapshot?.projects[row.dataset.repository];
      releasing(row, record);
      release(row, record);
    }
    const timestamp = snapshot ? date(snapshot.generatedAt) : "";
    metadata.textContent = snapshot
      ? t(
          failed
            ? "snapshotFailed"
            : isStale(snapshot.generatedAt, now())
              ? "snapshotStale"
              : "snapshotTime",
          { time: timestamp },
        )
      : t(failed ? "snapshotUnavailable" : "snapshotLoading");
    metadata.classList.toggle(
      "is-stale",
      Boolean(failed || (snapshot && isStale(snapshot.generatedAt, now()))),
    );
    refresh.disabled = loading;
    refresh.textContent = t(loading ? "refreshing" : "refreshSnapshot");
    refresh.setAttribute("aria-busy", String(loading));
    filters();
  }

  async function load() {
    if (loading) return;
    loading = true;
    render();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetcher("project-status.json", {
        cache: "no-cache",
        credentials: "omit",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Snapshot: ${response.status}`);
      const value = await response.json();
      if (
        value?.schemaVersion !== 2 ||
        !Number.isFinite(Date.parse(value.generatedAt)) ||
        !value.projects ||
        typeof value.projects !== "object" ||
        Array.isArray(value.projects)
      )
        throw new Error("Invalid status snapshot");
      snapshot = value;
      failed = false;
    } catch {
      failed = true;
    } finally {
      clearTimeout(timeout);
      loading = false;
      render();
    }
  }

  function onLanguage() {
    render();
  }
  directory.querySelector("form").hidden = false;
  refresh.hidden = false;
  directory
    .querySelector("form")
    .addEventListener("submit", (event) => event.preventDefault());
  search.addEventListener("input", filters);
  for (const tab of tabs)
    tab.addEventListener("click", () => selectCategory(tab.dataset.category));
  directory.querySelectorAll("[data-view]").forEach((button) => {
    if (button.tagName !== "BUTTON") return;
    button.addEventListener("click", () => {
      directory.dataset.view = button.dataset.view;
      directory
        .querySelectorAll("button[data-view]")
        .forEach((item) =>
          item.setAttribute("aria-pressed", String(item === button)),
        );
    });
  });
  directory.querySelector("#clear-filters").addEventListener("click", () => {
    search.value = "";
    selectCategory("all");
    search.focus();
  });
  refresh.addEventListener("click", load);
  document.addEventListener("idy:languagechange", onLanguage);
  render();
  const ready = load();
  const freshnessTimer = setInterval(() => {
    if (!document.hidden) render();
  }, 60000);
  return {
    ready,
    reload: load,
    dispose() {
      clearInterval(freshnessTimer);
      document.removeEventListener("idy:languagechange", onLanguage);
    },
  };
}

if (typeof document !== "undefined" && window.IdySite)
  startDirectory(document, window.IdySite);
