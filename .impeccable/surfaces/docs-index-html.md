---
version: 1
slug: "docs-index-html"
primary_target: "docs/index.html"
related_targets: ["docs/styles.css","docs/directory.js"]
---

# Project directory

Scope: `docs/index.html`, `docs/styles.css`, `docs/directory.js`, `docs/project-status.json`. Homepage only; the shared site SDK and other `*.idy.dev` pages keep their incumbent identity.
Visitor mode: Operate. Visitors find a project fast and read its current Released version and any active Releasing version. Confirmed: cards default with a table switch; Released/Releasing and the view switch must stay; search, category, Homebrew, and community may be simplified.

## Direction contract

THESIS: Every project is documented like an electronic part in a datasheet: name, family, one-line function, and a revision table. It refuses the rounded developer-portfolio card grid with badges.

OWN-WORLD: Datasheet blue masthead (#0B5CAD light / #6FA8E8 dark) over a white or deep navy sheet, ink #1A1A1A, pale spec-table fill #E8EEF4, ruled 1px blue-grey lines, 2px ink top rule per part, 2px corners. One variable family, Archivo, set wide for body and narrow (wdth 75) for labels, tabs, and table heads; tabular figures for every version and date.

STORY: Scan part names and families, narrow by family tab or search, compare revision tables, then open the project, source, release, or download.

FIRST VIEWPORT: 48px blue masthead with wordmark, nav, preferences, and follow; compact title and line; one bordered selector bar (search | family tabs | Cards/Table); a meta line with count and snapshot time; then three columns of datasheet blocks at desktop width, two at tablet, one on phones. Signature move: each block ends in a ruled revision table (Status | Version | Date) where an active Releasing row carries a blue marker cell.

FORM: Component Datasheet, my top-ranked grounded candidate, chosen by the user over the assigned Swiss Index. seed:7f623ffbaebc0b67. Code-led; the chosen decision sketch is `.impeccable/mocks/decision/model-pick.html`.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Data constraints

Show dated public snapshots, not a false live label. Completed and failed workflows are not shown. Active targets must be proven version tags or explicitly marked unconfirmed; branch names and commit hashes never substitute for versions. No secrets in browser assets. Preserve project descriptions, project-specific links, translations, download fallback, and static no-JavaScript navigation.
