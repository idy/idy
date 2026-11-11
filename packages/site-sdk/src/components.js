function ownerDocument(options) {
  const document = options.document || globalThis.document || globalThis.window?.document;
  if (!document?.createElement) throw new Error("Creating site components requires a document; pass options.document or call after mounting.");
  return document;
}

function element(document, tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function translated(node, key, fallback) {
  node.textContent = fallback;
  if (key) node.dataset.i18n = key;
  return node;
}

function safeHref(href, document) {
  if (typeof href !== "string" || !href.trim() || /[\u0000-\u001f\u007f]/.test(href)) {
    throw new TypeError("Link href must be a nonempty HTTP(S), mailto, tel, or relative URL");
  }
  let url;
  try { url = new URL(href, document.baseURI === "about:blank" ? "https://idy.dev/" : document.baseURI); }
  catch { throw new TypeError(`Invalid link href: ${href}`); }
  if (!["https:", "http:", "mailto:", "tel:"].includes(url.protocol) || url.username || url.password) {
    throw new TypeError("Link href must use HTTP(S), mailto, tel, or a relative URL without credentials");
  }
  return href;
}

function icon(document, name) {
  if (typeof name !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) throw new TypeError("Invalid icon name");
  const node = element(document, "i", `ph ph-${name}`);
  node.setAttribute("aria-hidden", "true");
  return node;
}

function link(document, options, className = "", action = false) {
  const node = element(document, "a", className);
  node.setAttribute("href", safeHref(options.href, document));
  if (options.newTab) { node.target = "_blank"; node.rel = "noopener noreferrer"; }
  if (options.ariaLabel !== undefined) node.setAttribute("aria-label", options.ariaLabel);
  if (options.ariaLabelKey) node.setAttribute("data-i18n-aria-label", options.ariaLabelKey);
  if (action) {
    const pill = element(document, "span", "idy-action-pill");
    if (options.icon) pill.append(icon(document, options.icon));
    pill.append(translated(element(document, "span"), options.i18n, options.label));
    node.append(pill);
  } else translated(node, options.i18n, options.label);
  return node;
}

function navigation(document, links, className, key, label) {
  const nav = element(document, "nav", className);
  nav.setAttribute("aria-label", label);
  nav.setAttribute("data-i18n-aria-label", key);
  for (const item of links) nav.append(link(document, item));
  return nav;
}

function brand(document, options, container) {
  container.append(link(document, { label: options.siteName ?? "idy.dev", href: options.siteHref ?? "https://idy.dev/" }, "idy-home"));
  if (options.projectName !== undefined) {
    container.append(options.projectHref !== undefined
      ? link(document, { label: options.projectName, href: options.projectHref }, "idy-project")
      : element(document, "span", "idy-project", options.projectName));
  }
}

const defaultLinks = [
  { label: "All projects", href: "https://idy.dev/", i18n: "allProjects" },
  { label: "Discord", href: "https://discord.gg/TTyqQnw7yu" },
  { label: "GitHub", href: "https://github.com/idy" },
];

function preferences(document) {
  const wrapper = element(document, "div", "idy-preferences");
  const definitions = [
    ["language", "Language", [["auto", "Auto", "automatic"], ["en", "English"], ["zh", "中文"]]],
    ["theme", "Theme", [["system", "System", "system"], ["light", "Light", "light"], ["dark", "Dark", "dark"]]],
  ];
  for (const [kind, labelText, options] of definitions) {
    const label = element(document, "label");
    label.append(translated(element(document, "span"), kind, labelText));
    const select = element(document, "select");
    select.setAttribute(`data-idy-${kind}`, "");
    for (const [value, text, key] of options) {
      const option = translated(element(document, "option"), key, text);
      option.value = value;
      select.append(option);
    }
    label.append(select);
    wrapper.append(label);
  }
  return wrapper;
}

export function createHeader(options = {}) {
  const document = ownerDocument(options);
  const header = element(document, "header", "idy-header compact-header");
  const inner = element(document, "div", "idy-header-inner");
  brand(document, options, inner);
  const links = options.navLinks ?? defaultLinks;
  if (links.length) {
    inner.append(navigation(document, links, "idy-nav", "navigation", "Main navigation"));
    const mobile = element(document, "details", "idy-mobile");
    const summary = element(document, "summary");
    summary.setAttribute("aria-label", "Main navigation");
    summary.setAttribute("data-i18n-aria-label", "navigation");
    summary.append(icon(document, "list"));
    mobile.append(summary, navigation(document, links, "idy-mobile-panel", "navigation", "Main navigation"));
    inner.append(mobile);
  }
  const actions = element(document, "div", "header-actions");
  if (options.preferences !== false) actions.append(preferences(document));
  const action = options.action === undefined ? {
    label: "follow", href: "https://github.com/idy", newTab: true,
    ariaLabel: "Follow idy on GitHub (opens in a new tab)", icon: "github-logo",
  } : options.action;
  if (action) actions.append(link(document, action, "idy-action", true));
  if (actions.childElementCount) inner.append(actions);
  header.append(inner);
  return header;
}

export function createFooter(options = {}) {
  const document = ownerDocument(options);
  const footer = element(document, "footer", "idy-footer");
  const inner = element(document, "div", "idy-footer-inner");
  const identity = element(document, "div");
  brand(document, options, identity);
  const note = element(document, "p");
  translated(note, options.noteKey ?? (options.note === undefined ? "footerNote" : undefined), options.note ?? "Independent tools. Open source.");
  identity.append(note);
  inner.append(identity);
  const links = options.links ?? defaultLinks;
  if (links.length) inner.append(navigation(document, links, "", "projectLinks", "Project links"));
  footer.append(inner);
  return footer;
}
