# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary audience is people exploring idy's open-source tools. They need to understand what each project does and quickly reach its downloads, documentation, or source code. This audience and priority were confirmed during initialization.

The existing website supports English and Simplified Chinese readers on desktop and mobile browsers.

## Product Purpose

idy.dev is the public directory for idy's open-source projects. It connects concise project descriptions to project websites, source repositories, release information, installation instructions, and community channels.

Success means a visitor can identify a relevant project and reach the appropriate next resource without searching across unrelated repositories. Quantitative success metrics are not yet defined.

## Positioning

The directory brings together idy's own tools for connected devices, macOS, and networking, alongside supporting libraries and design resources. Its value is a direct route from a named project to its actual documentation, source, and published releases.

It is part of the same public repository as idy's GitHub profile and public pinned-project snapshot. Those are distinct surfaces: the profile uses GitHub Markdown, and the website is maintained separately in `docs/`.

## Operating Context

- Visitors browse project descriptions, then follow project, source, documentation, release, or download links.
- macOS users can copy Homebrew commands for Nootify and TailSplit from the directory. Installation happens on the visitor's machine.
- Discord links provide community discussion and feedback channels; the website itself does not host those conversations.
- GitHub supplies release metadata and downloadable artifacts. Project repositories and their documentation remain the authorities for installation, compatibility, and usage.
- Maintainers edit the static website in `docs/`. `REPOSITORY.md` describes local preview, GitHub Pages configuration, and snapshot maintenance.

## Capabilities and Constraints

### Existing functionality to preserve during refinements

- Plain HTML, CSS, and JavaScript with no application backend. Committed SDK assets allow static serving without a build; changing SDK sources requires the Node-based build. The documented publishing target is GitHub Pages, serving `docs/` at `idy.dev`.
- Project descriptions and essential outbound links are authored in HTML and remain available without JavaScript.
- English and Simplified Chinese, with automatic browser-language selection and a manual override.
- System, light, and dark theme preferences. Language and theme selections use local storage when available and remain usable for the current visit if storage is unavailable.
- A cards-first repository directory with search, category filters, sorting, and a table alternative on every screen size; phones show the table as a compact list of names and versions.
- Each project shows only its current Released version and active Releasing versions. General CI results, completed or failed workflows, branch names, and commit hashes are not part of the directory.
- A dated public GitHub snapshot separates published versions from active release targets. Only confirmed target tags may be displayed as version numbers; unknown targets are labeled as unconfirmed. Unavailable or stale information must remain qualified.
- Validated release assets supply platform-specific download links. Failed lookups retain a link to GitHub Releases; unavailable assets must not become invented download links.
- Homebrew command copying with success or failure feedback, plus selectable command text.
- A dedicated not-found page with a route back to the homepage.

### Content and scope boundaries

- Preserve project names, repository ownership, destination URLs, platform distinctions, and documented limitations unless updated against authoritative project information.
- `pinned-projects.json` is a separate public snapshot sourced from GitHub profile pins. The current website does not render it; the hand-authored directory must not be described as automatically synchronized from profile pins.
- The shared website SDK serves `*.idy.dev` project pages through npm, browser/CDN scripts, or downloaded local files. Its scope includes typography, layout, page elements, and common interactions. Preserve project-specific content and functionality during adoption; Magpie's desktop application design system remains separate.

## Brand Commitments

Use `idy.dev` for the website and preserve the proper names of individual projects. Existing public copy describes the work as “Independent tools. Open source.” and emphasizes concrete capabilities.

No new voice, aesthetic, or cross-project branding mandate was established during initialization.

## Evidence on Hand

- `docs/index.html`: the current project directory, descriptions, source and documentation destinations, community links, and Homebrew instructions.
- `docs/theme.js`: English and Chinese project descriptions and shared page copy.
- `docs/directory.js` and `docs/downloads.js`: filtering, view switching, Released/Releasing version presentation, and project-specific download matching.
- `scripts/project-status.mjs` and `docs/project-status.json`: explicit release-workflow configuration and timestamped GitHub observations.
- `packages/site-sdk/src/runtime.js`: shared language and theme behavior, command-copy feedback, release lookup, and release-asset validation.
- `packages/site-sdk/README.md`: SDK contracts, distribution formats, component usage, and migration boundaries.
- `docs/sdk/index.html`: a working catalogue of typography, layout, and page elements.
- `README.md`: the separately maintained GitHub profile overview.
- `REPOSITORY.md`: repository purpose, preview instructions, publishing configuration, and pinned-project snapshot behavior.
- `pinned-projects.json`: public repository pins; not a complete catalogue or evidence of usage.
- `docs/favicon.svg` and `docs/apple-touch-icon.png`: existing site identity assets.

No testimonials, adoption metrics, customer claims, or universal compatibility guarantees were established. Future content must use real evidence for such claims. In particular, retain the CH348 project's distinction between verified eight-channel communication and ongoing broader compatibility testing.

## Product Principles

1. Help visitors recognize the right tool and reach its useful resources quickly.
2. Describe each project through concrete capabilities and accurately scoped platform support.
3. Keep essential discovery and navigation useful when scripts or external release services are unavailable.
4. Preserve English and Chinese access, device adaptability, and explicit user preferences.
5. Ground release, download, installation, and compatibility information in the actual project sources.

## Accessibility & Inclusion

Preserve the existing keyboard-accessible navigation, skip links, visible focus indicators, labeled controls, semantic headings, status announcements, and reduced-motion handling. Language changes should continue to update the document language and translated control labels.

A formal accessibility conformance target and any additional audience-specific accommodations remain open decisions; this record does not claim an accessibility audit has passed.
