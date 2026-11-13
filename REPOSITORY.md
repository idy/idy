# Repository guide

This public repository contains [idy's GitHub profile](https://github.com/idy), the [idy.dev](https://idy.dev/) website, and a public snapshot of pinned projects.

## GitHub profile

GitHub displays the root `README.md` on the personal profile when this repository is public and named `idy/idy`. The profile supports GitHub Markdown; the full interactive website lives separately in `docs/`.

## Website

The static site is in `docs/`. Configure GitHub Pages to publish the `/docs` folder on the `main` branch and set the custom domain to `idy.dev` in the repository's Pages settings. The domain must first be removed from any previous Pages site. `docs/CNAME` records the custom domain for branch-based publishing.

For a local preview, run:

```sh
npm run dev
```

Open `http://localhost:8000/` for the project directory or `http://localhost:8000/sdk/` for the component catalogue. The Node preview serves only `docs/`; `.claude/launch.json` configures the same server for the app's Browser pane. A plain static server also works. Committed SDK assets let the site run without building; SDK source changes require `npm run build`.

## Product context and design workflow

[`PRODUCT.md`](PRODUCT.md) records the website's audience, purpose, existing behavior, content evidence, and open product decisions. Consult it before changing the visitor experience.

Impeccable's project default is code-first in `.impeccable/config.json`. Its live-mode configuration in `.impeccable/live/config.json` targets `docs/**/*.html`; this prepares the static pages for local visual iteration without starting a live session or changing the published pages.

## Shared website SDK

[`packages/site-sdk/README.md`](packages/site-sdk/README.md) documents `@idy/site-sdk`: typography, layout primitives, page elements, header/footer factories, themes, translations, copying, and release helpers. It includes npm, CDN, self-hosting, and migration examples.

Canonical runtime and component sources live in `packages/site-sdk/src/`. The Component Datasheet identity styles in `docs/shared/`, Archivo and its OFL in `docs/fonts/`, and the compatible header icon font are bundled into the package. `scripts/build-site-sdk.mjs` produces npm distribution files and matching versioned GitHub Pages assets under `docs/sdk/<version>/`; rebuild after changing either source area. Keep old published version directories intact and bump the package version before changing a published release.

The current site and component catalogue consume `docs/sdk/0.2.0/`, whose default Component Datasheet design is shared across `*.idy.dev`. Consumers vendor the complete SDK distribution into `shared/sdk/`, retaining `assets/` and using relative script and stylesheet links. Historical `0.1.0` assets remain intact. No npm publication or website deployment is performed by building locally.

## Project directory and repository status

The homepage includes lowercase [yesman](https://yesman.idy.dev/), an early-prototype Go/MyGo tray app with pi lead/workers, project workspaces, a shared repository pool, and shared notes. Its primary `release.yml` is tracked alongside validated downloads from GitHub Releases; the project README remains the source for platform limitations.

The homepage defaults to project cards, with a table comparison view on desktop and a single card column on mobile. Search, category filters, and sorting use the same semantic rows. Full descriptions, project links, release downloads, and Homebrew commands remain available through native disclosures.

`docs/directory.js` uses `docs/project-status.js` to read release information directly from `https://api.github.com`. Validated responses are cached per endpoint in versioned `localStorage` entries: published-release lookups last one hour and active-release lookups last five minutes. Opening or reloading the page reuses fresh entries; the refresh button bypasses their normal expiry. Each project updates independently, and requests are anonymous with no browser credentials. There is no scheduled project-status collector, committed snapshot, or automatic polling. Blocked or full storage falls back to caching in memory for the current visit.

The directory displays only **Released** and **Releasing** versions. Released uses GitHub's latest stable release; only when the latest-release endpoint returns HTTP 404 does it query published releases for a prerelease fallback. Releasing queries the configured primary release workflows in each source repository directly for running, queued, and waiting releases, independently of completed runs. Those source release workflows remain in place. Only confirmed version-tag pushes supply a target version; manually dispatched or otherwise unproven targets display “Version not confirmed.” Concurrent active versions may appear together. Completed, failed, cancelled, and draft-only completed builds never populate Releasing, and general CI status is not displayed.

Anonymous requests share GitHub's rate limits for the visitor's network. Rate-limit cooldowns use `Retry-After` or `X-RateLimit-Reset`, persist across page loads, and also block forced refreshes until retry is allowed. Network/server failures and rate limits preserve previously successful responses with their original observation times. The UI identifies cached data and marks stale active releases as last observed; it never silently presents a failed refresh as current. Without usable cache, failed fields remain unavailable. Corrupt, obsolete, future-dated, or invalid cached responses are ignored, and permission failures invalidate the affected cached entry. An em dash means no active version was observed or tracking is unavailable; accessible labels and tooltips distinguish those cases.

## Project icons

The homepage uses existing project artwork beside project names in the shared card/table markup. `docs/project-icons/` contains the original SVG files and CH348's original PNG, displayed at 28px (24px on phones). Images have empty alternative text because the adjacent project name provides the link's accessible name. Entries without a confirmed project icon stay text-only; no generated or placeholder icons are used.

`docs/project-icons/sources.json` records each source repository, path, revision, SHA-256, and project license, plus the reason for omitted icons. Full upstream license texts are retained in `docs/project-icons/licenses/`. Copy original artwork without re-encoding; keep source metadata and license notices alongside it, especially for raster files. Update the matching `<img>` in `docs/index.html` when changing a filename. Source repositories remain authoritative for artwork and licensing.

## Updating pinned projects

GitHub's profile pins are the source of truth. Use **Customize your pins** on the GitHub profile to choose and order up to six public repositories or gists. `pinned-projects.json` contains only public repository pins; gists and private repositories are not included.

The GitHub Actions workflow checks for changes hourly and publishes a changed snapshot immediately. When pins are unchanged, it refreshes the snapshot timestamp at least daily. A manual run of **Sync pinned repositories** on `main` refreshes it sooner. GitHub's schedule and raw-content cache can delay updates; scheduled workflows in inactive public repositories can also be disabled after 60 days.

The snapshot can be read without a token from `https://raw.githubusercontent.com/idy/idy/main/pinned-projects.json`. The current website does not yet display this snapshot.

GitHub does not document an API for editing a user's profile pins, so this workflow reads pins but does not change them.

## Local development

Install Node.js 22 or newer. For SDK development and tests:

```sh
npm ci
npm run build
npm test
npm run test:types
npm run check:dist
npm pack --workspace @idy/site-sdk
```

For pinned-project synchronization, also install the authenticated [GitHub CLI](https://cli.github.com/):

```sh
node scripts/sync-pins.mjs --check
node scripts/sync-pins.mjs
```

The script queries GitHub GraphQL and validates the result before replacing `pinned-projects.json`. It fails without changing the snapshot if the response is incomplete, private, malformed, or unavailable. The refresh workflow uses its repository-scoped `GITHUB_TOKEN` only for tested commits on `main`; pull-request checks run separately with read-only permissions. If `main` advances while a run is queued, the refresh job requests a new run using `actions: write`. A non-fast-forward push fails rather than overwriting a newer commit.

Limit repository branch-write access to trusted collaborators: a contributor who can alter workflow files on a same-repository branch may be able to request wider workflow permissions. Fork pull requests receive a read-only token.
