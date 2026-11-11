# idy.dev Site SDK

Shared typography, layouts, page elements, and browser behavior for `idy.dev` and its project websites. The package preserves the existing Monda body, Montserrat heading, Lato supporting-text roles, light/dark palette, and header interactions.

This is a website kit. [Magpie](https://magpie-design-system.idy.dev/) remains a separate kit for desktop panels and application shells.

## Status and installation

Version `0.1.0` is prepared locally. It has not been published to npm or deployed by this change. The npm scope's publishing rights have not been verified. The SDK source license is still undecided (`UNLICENSED` in package metadata); bundled fonts and icons retain their licenses in `dist/assets/`.

From the repository root:

```bash
npm ci
npm run build
npm test
npm pack --workspace @idy/site-sdk
```

Install the resulting `idy-site-sdk-0.1.0.tgz` into a consuming project, or use the npm workspace directly in this repository. After publication:

```bash
npm install @idy/site-sdk@0.1.0
```

### npm / ESM

```js
import '@idy/site-sdk/style.css';
import { initSite, createHeader, createFooter, enhance } from '@idy/site-sdk';

const site = initSite({
  en: { heading: 'Projects' },
  zh: { heading: '项目' },
});
const header = createHeader({
  siteName: 'TailSplit',
  siteHref: '/',
  navLinks: [
    { label: 'Install', href: '#install' },
    { label: 'Documentation', href: 'https://github.com/idy/tailsplit/blob/main/docs/guide.md' },
  ],
  action: { label: 'Source', href: 'https://github.com/idy/tailsplit', icon: 'github-logo' },
});
document.body.prepend(header);
document.body.append(createFooter());
enhance();
```

Importing the JavaScript is safe during SSR; call DOM functions only after a document is available. Framework components can call `enhance(element)` after mounting. The SDK does not own rendering or replace your framework tree. Prefer authored semantic HTML for essential navigation so it remains usable without JavaScript.

### CDN / script tag

After this site's `docs/` directory is deployed, its versioned files are available at:

```html
<script src="https://idy.dev/sdk/0.1.0/idy-site.min.js"></script>
<link rel="stylesheet" href="https://idy.dev/sdk/0.1.0/idy-site.css">
<!-- Site-specific overrides come after the SDK. -->
<link rel="stylesheet" href="styles.css">
<script src="page.js" defer></script>
```

After npm publication, equivalent version-pinned CDN URLs are:

```html
<script src="https://cdn.jsdelivr.net/npm/@idy/site-sdk@0.1.0/dist/idy-site.min.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@idy/site-sdk@0.1.0/dist/idy-site.css">
```

UNPKG uses the same paths under `https://unpkg.com/@idy/site-sdk@0.1.0/dist/`. These public URLs are publication targets, not claims of current availability.

The classic browser script auto-initializes `window.IdySite` before the first paint and exposes the full API as `window.IdySiteSDK`. Put it in the head before styles without `async` or `defer` to avoid a theme flash. The stylesheet is an explicit link; JavaScript does not inject CSS or rewrite your page structure.

### Download and self-host

Copy **all of `packages/site-sdk/dist/`**, or `package/dist/` from the npm tarball, into your site's asset folder. It contains browser JS, ESM JS, CSS, TypeScript declarations, fonts, and licenses. Link `idy-site.min.js` and `idy-site.css` with relative paths. Preserve the adjacent `assets/` directory; downloading only CSS omits its fonts.

The component catalogue at `/sdk/` includes direct JS/CSS download links. All three delivery methods use the same build; no build tool is required in a consuming static website.

## Typography and layout

Add `class="idy-site"` to the body to enable the base page styles, focus treatment, selection colors, and box sizing. Existing shared font, header, and footer rules remain global for compatibility; load this full stylesheet once per page, not inside an isolated application widget.

| Class | Purpose |
| --- | --- |
| `idy-title` | Main page title; responsive display scale |
| `idy-section-title` | Section heading |
| `idy-subheading` | Subsection or project heading |
| `idy-lead` | Introductory paragraph |
| `idy-caption` | Supporting text and caveats |
| `idy-prose` | Readable long-form content, up to 70ch |
| `idy-container` | Centered content with mobile gutters |
| `idy-section` | Vertical section rhythm and separators |
| `idy-hero` | Page introduction spacing |
| `idy-stack` | Vertical grouping |
| `idy-cluster` | Wrapping actions or related items |
| `idy-split` | Two columns, stacked below 760px |
| `idy-grid` | Content-driven responsive columns |

Use semantic headings independently of their visual class. A subheading style does not prescribe a heading level.

```html
<body class="idy-site">
  <a class="idy-skip-link" href="#main">Skip to content</a>
  <main id="main" class="idy-container">
    <section class="idy-hero idy-split">
      <h1 class="idy-title">Your project name</h1>
      <div class="idy-stack">
        <p class="idy-lead">What the project makes possible.</p>
        <div class="idy-cluster">
          <a class="idy-button" href="#download">Downloads</a>
          <a href="#guide">Read the guide</a>
        </div>
      </div>
    </section>
  </main>
</body>
```

## Elements and interaction

| Component | Contract |
| --- | --- |
| Header/footer | `createHeader`, `createFooter`, or existing `.idy-header.compact-header` / `.idy-footer` HTML |
| Buttons | `.idy-button`, optional `.idy-button--secondary`; use buttons for actions and links for navigation |
| Project directory | `.idy-project-row` with heading, description, `.idy-project-links`, and optional `.idy-release` |
| Release area | `.idy-release`, `.idy-downloads`; keep project-specific release rendering and asset rules local |
| Copyable code | `.idy-code` containing `code`, a `button[data-idy-copy]`, and optional `[data-idy-copy-status]` |
| Notice | `.idy-notice` with semantic heading/content |
| FAQ | Native `details.idy-faq` and `summary`; works without JS |
| Tables | `.idy-table` inside focusable `.idy-table-scroll`; `.idy-numeric` for numeric cells |

Disabled buttons use the native `disabled` attribute. `aria-busy="true"` provides a visual busy state. `aria-disabled` alone does not disable a link: omit `href` or prevent activation in your application.

```html
<div class="idy-code">
  <div class="idy-code-row">
    <code>brew tap idy/homebrew https://github.com/idy/homebrew</code>
    <button class="idy-button idy-button--secondary" data-idy-copy hidden>Copy</button>
  </div>
  <p data-idy-copy-status role="status" aria-live="polite"></p>
</div>
```

The copy control appears after enhancement; failed clipboard access selects the code for manual copying. Feedback and control labels follow the language preference. Dynamically inserted content needs `enhance(container)`; there is no whole-page mutation observer.

### JavaScript API

- `initSite(translations?)` returns a document singleton and merges page dictionaries. Repeated calls do not duplicate event handlers or controls.
- `enhance(root = document)` translates and enhances authored or newly inserted content. It also works on elements and document fragments belonging to the current document.
- `setTheme('system' | 'light' | 'dark')` and `setLanguage('auto' | 'en' | 'zh')` update controls and preferences.
- `createHeader(options?)` / `createFooter(options?)` return inert DOM elements. Insert them, then call `enhance()`. Full option and return types ship in `index.d.ts`.
- `loadRelease('owner/repository')` reads GitHub's latest release, falls back to published releases on 404, and rejects invalid responses, HTTP failures, and requests exceeding eight seconds.
- `asset(release, /pattern/)` returns a validated uploaded asset or `undefined`. Applications must keep a link to GitHub Releases when metadata or an asset is unavailable.

The legacy `IdySite.init`, `t`, `language`, `loadRelease`, `asset`, `data-i18n*` attributes, and `idy:languagechange` event remain supported. `data-i18n-html` accepts **trusted, locally authored HTML only**; never put remote release content or user input into those dictionaries.

Preferences use the existing `idy-theme` and `idy-language` local-storage keys. They are per origin, not shared across `*.idy.dev`. The SDK sends no analytics, sets no cross-domain cookies, and makes no release requests until your page calls `loadRelease`.

## Customization

Sites can override the browser chrome color for each theme on the existing meta tag. The SDK applies these colors during early initialization, manual switching, and system-theme changes; missing overrides keep the SDK defaults.

```html
<meta name="theme-color" content="#0b5cad"
  data-idy-theme-color-light="#0b5cad"
  data-idy-theme-color-dark="#0b3d73">
```

Use the shared defaults first, then override semantic tokens in site CSS:

```css
:root {
  --idy-page-width: 75rem;
  --idy-section-space: clamp(3rem, 6vw, 5rem);
}
.install-section { --idy-gap: var(--idy-space-4); }
```

Color roles are `--idy-bg`, `--idy-surface`, `--idy-ink`, `--idy-muted`, `--idy-line`, and `--idy-accent`. Font roles are `--idy-font`, `--idy-heading`, `--idy-small`, and `--idy-font-code`. Shared scales cover `--idy-space-1` through `--idy-space-6`, text sizes, leading, radii, page width/gutters, and the readable measure. A color override needs both light and dark values and contrast verification.

## Migration

1. Replace copied `shared/idy.js` and `shared/header.js` with the browser entry, or use ESM explicitly.
2. Replace `shared/idy.css` and `shared/header.css` links with the SDK stylesheet. Load project-specific styles after it; remove copied global font, theme, and shell rules after checking their overrides.
3. Keep real page copy, project-specific diagrams, release asset patterns, and documentation links. Existing `IdySite` calls still work.
4. Adopt typography/layout/element classes incrementally. Migrate copy buttons to the code-block contract, removing their old handlers.
5. Check English/Chinese, both themes, keyboard controls, mobile widths, disabled JavaScript, and unavailable GitHub metadata.

The `idy.dev` directory and 404 page in this checkout have been migrated. Other project repositories have not been changed. Nootify, WGC, and TailSplit already share the shell conventions; sing-box-flutter has a different current shell and needs an explicit visual migration.

## Development and versioning

`npm run build` emits identical npm assets into `packages/site-sdk/dist/` and committed GitHub Pages assets into `docs/sdk/<version>/`. `npm run check:dist` detects stale committed bundles. Build sources are `src/` plus the canonical identity/fonts in `../../docs/shared/`; consumers receive a standalone distribution.

Pin the same version for JS and CSS. Before updating an already published release, increment `package.json` rather than replacing that version's files; the build retains other version directories. Publish only after choosing the source license, verifying scope ownership, and explicitly authorizing npm/GitHub publication.
