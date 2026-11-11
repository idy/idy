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

Canonical runtime and component sources live in `packages/site-sdk/src/`. The existing identity styles and licensed fonts in `docs/shared/` are bundled into the package. `scripts/build-site-sdk.mjs` produces npm distribution files and matching versioned GitHub Pages assets under `docs/sdk/<version>/`; rebuild after changing either source area. Keep old published version directories intact and bump the package version before changing a published release.

The current site consumes `docs/sdk/0.1.0/`. Other project repositories have not been migrated. No npm publication or website deployment is performed by building locally.

## Project directory and repository status

The homepage defaults to project cards, with a table comparison view on desktop and a single card column on mobile. Search, category filters, and sorting use the same semantic rows. Full descriptions, project links, release downloads, and Homebrew commands remain available through native disclosures.

`docs/directory.js` reads `docs/project-status.json`, a public snapshot collected by `scripts/sync-project-status.mjs`. The explicit repository and primary release-workflow configuration lives in `scripts/project-status.mjs`. Refresh it locally with authenticated GitHub CLI access:

```sh
node scripts/sync-project-status.mjs --gh
```

The scheduled workflow `.github/workflows/project-status.yml` refreshes the snapshot every 15 minutes, subject to GitHub scheduling delays. It commits only the snapshot when `main` has not advanced, then explicitly requests a branch-based GitHub Pages build: commits made with `GITHUB_TOKEN` alone do not trigger Pages. The scheduled job and Pages request require validation after merging; local collection has been verified with `--gh`. No token ships to browsers. Reloading in the UI retrieves the saved snapshot; it does not run a collector or trigger a release. Snapshots older than 30 minutes are marked as historical.

The directory displays only **Released** and **Releasing** versions. Schema v2 does not collect general CI status. Explicit primary release workflows are queried for running, queued, and waiting releases independently of completed runs. Only confirmed version-tag pushes supply a target version; manually dispatched or otherwise unproven targets display “Version not confirmed.” Concurrent active versions may appear together. Completed, failed, cancelled, and draft-only completed builds never populate Releasing. An em dash means no active version was observed or tracking is unavailable; accessible labels and tooltips distinguish those cases. API errors remain “Unavailable,” and old observations are marked historical.

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
