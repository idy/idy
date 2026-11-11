---
name: "idy.dev"
description: "Homepage project directory set as a component datasheet: parts, families, and revision tables."
colors:
  datasheet-blue: "#0b5cad"
  masthead-blue: "#0b5cad"
  on-blue: "#ffffff"
  sheet: "#ffffff"
  ink: "#1a1a1a"
  body-ink: "#333333"
  muted-ink: "#4a4a4a"
  ruled-line: "#b9c6d3"
  hairline-rule: "#dce3ea"
  spec-fill: "#e8eef4"
  datasheet-blue-dark: "#8db8ee"
  masthead-blue-dark: "#0b3d73"
  sheet-dark: "#121b26"
  ink-dark: "#e8eef4"
  body-ink-dark: "#c9d3de"
  muted-ink-dark: "#a9b6c4"
  ruled-line-dark: "#33465b"
  hairline-rule-dark: "#263546"
  spec-fill-dark: "#1b2838"
typography:
  display:
    fontFamily: "Archivo, \"PingFang SC\", \"Microsoft YaHei\", system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: "40px"
    letterSpacing: "-0.01em"
  display-phone:
    fontFamily: "Archivo, \"PingFang SC\", \"Microsoft YaHei\", system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: "34px"
    letterSpacing: "-0.01em"
  wordmark:
    fontFamily: "Archivo, \"PingFang SC\", \"Microsoft YaHei\", system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: "44px"
    letterSpacing: "0.01em"
    fontVariation: "\"wdth\" 75"
  part-name:
    fontFamily: "Archivo, \"PingFang SC\", \"Microsoft YaHei\", system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: "24px"
    letterSpacing: "-0.005em"
  lead:
    fontFamily: "Archivo, \"PingFang SC\", \"Microsoft YaHei\", system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
  body:
    fontFamily: "Archivo, \"PingFang SC\", \"Microsoft YaHei\", system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  description:
    fontFamily: "Archivo, \"PingFang SC\", \"Microsoft YaHei\", system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
  label-tab:
    fontFamily: "Archivo, \"PingFang SC\", \"Microsoft YaHei\", system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.02em"
    fontVariation: "\"wdth\" 75"
  label-link:
    fontFamily: "Archivo, \"PingFang SC\", \"Microsoft YaHei\", system-ui, sans-serif"
    fontSize: "13.5px"
    fontWeight: 600
    lineHeight: "20px"
    letterSpacing: "0.02em"
    fontVariation: "\"wdth\" 75"
  label-family:
    fontFamily: "Archivo, \"PingFang SC\", \"Microsoft YaHei\", system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: "16px"
    letterSpacing: "0.06em"
    fontVariation: "\"wdth\" 75"
  table-head:
    fontFamily: "Archivo, \"PingFang SC\", \"Microsoft YaHei\", system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: "18px"
    letterSpacing: "0.04em"
    fontVariation: "\"wdth\" 75"
  revision:
    fontFamily: "Archivo, \"PingFang SC\", \"Microsoft YaHei\", system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "18px"
    fontFeature: "\"tnum\" 1, \"lnum\" 1"
  meta:
    fontFamily: "Archivo, \"PingFang SC\", \"Microsoft YaHei\", system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "20px"
    fontFeature: "\"tnum\" 1, \"lnum\" 1"
rounded:
  part: "2px"
spacing:
  cell: "8px"
  grid-gap-phone: "12px"
  grid-gap-tablet: "16px"
  part-inset-phone: "16px"
  gutter-phone: "16px"
  part-inset: "20px"
  grid-gap: "24px"
  gutter: "48px"
components:
  masthead:
    backgroundColor: "{colors.masthead-blue}"
    textColor: "{colors.on-blue}"
    typography: "{typography.wordmark}"
    height: "52px"
  masthead-dark:
    backgroundColor: "{colors.masthead-blue-dark}"
    textColor: "{colors.on-blue}"
    typography: "{typography.wordmark}"
    height: "52px"
  selector-bar:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.part}"
    height: "46px"
  search-input:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    typography: "{typography.description}"
    padding: "0 14px 0 38px"
    height: "44px"
  family-tab:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    typography: "{typography.label-tab}"
    padding: "0 18px"
    height: "44px"
  family-tab-active:
    backgroundColor: "{colors.spec-fill}"
    textColor: "{colors.datasheet-blue}"
    typography: "{typography.label-tab}"
    padding: "0 18px"
    height: "44px"
  view-switch-button:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    typography: "{typography.label-tab}"
    rounded: "{rounded.part}"
    padding: "0 12px"
    height: "30px"
  view-switch-button-active:
    backgroundColor: "{colors.masthead-blue}"
    textColor: "{colors.on-blue}"
    typography: "{typography.label-tab}"
    rounded: "{rounded.part}"
    padding: "0 12px"
    height: "30px"
  view-switch-button-active-dark:
    backgroundColor: "{colors.masthead-blue-dark}"
    textColor: "{colors.on-blue}"
    typography: "{typography.label-tab}"
    rounded: "{rounded.part}"
    padding: "0 12px"
    height: "30px"
  part:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.body-ink}"
    rounded: "{rounded.part}"
    padding: "14px 20px"
  part-dark:
    backgroundColor: "{colors.sheet-dark}"
    textColor: "{colors.body-ink-dark}"
    rounded: "{rounded.part}"
    padding: "14px 20px"
  revision-head:
    backgroundColor: "{colors.spec-fill}"
    textColor: "{colors.ink}"
    typography: "{typography.table-head}"
    padding: "4px 8px"
  revision-row:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    typography: "{typography.revision}"
    padding: "6px 8px"
  revision-row-releasing:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.datasheet-blue}"
    typography: "{typography.revision}"
    padding: "6px 8px"
  revision-row-releasing-dark:
    backgroundColor: "{colors.sheet-dark}"
    textColor: "{colors.datasheet-blue-dark}"
    typography: "{typography.revision}"
    padding: "6px 8px"
  revision-marker-active:
    backgroundColor: "{colors.datasheet-blue}"
    width: "4px"
  downloads-disclosure:
    textColor: "{colors.datasheet-blue}"
    typography: "{typography.label-link}"
  selector-table-head:
    backgroundColor: "{colors.spec-fill}"
    textColor: "{colors.ink}"
    typography: "{typography.table-head}"
    padding: "8px 16px"
---

# Design System: idy.dev

## Overview

**Creative North Star: "Component Datasheet"**

The idy.dev homepage documents every project the way an electronics catalogue documents a part: a name, a family designator, one line of function, and a revision table. A solid datasheet-blue masthead sits over a white sheet (deep navy in dark mode); everything below it is ruled, not raised. Parts sit in a dense, even grid so a visitor can scan names, narrow by family, compare revisions, and leave for the project, source, release, or download.

The world is built from one variable family, Archivo, used at two widths: normal width for reading and 75% width for anything that labels. Structure comes from lines (2px ink at the top of every part, 1px blue-grey rules within), pale spec-table fill for heads and selected states, and 2px corners. The blue is reserved for links, the pressed state, focus, and active releases, so a blue marker in a revision table reads as a signal and not decoration. The design rejects rounded developer-portfolio card grids with badges.

Scope: this system governs the homepage (`docs/index.html`, `docs/styles.css`, `docs/directory.js`) and the 404 page, which shares its stylesheet. The shared site SDK in `packages/site-sdk` and other `*.idy.dev` pages keep their own identity. The homepage maps the SDK shell's `--idy-*` variables onto `--ds-*` for this page only; SDK defaults are not tokens of this system.

**Key Characteristics:**
- One blue masthead and white or deep navy sheet, with no other color fields.
- Archivo only: normal width for reading, 75% width for labels, tabs, and table heads.
- Tabular lining figures for every version, date, and count.
- Every part opens with a 2px ink top rule; 1px ruled lines do the rest; 2px corners; no shadows.
- The revision table is the signature component, with a blue marker cell on active Releasing rows.

## Colors

The palette is a datasheet in two inks, blue and near-black, on a white sheet, with a pale blue-grey spec fill and two weights of ruled line. Dark mode keeps the same roles on a deep navy sheet. Each `--ds-*` custom property switches between its light and `-dark` value through `data-theme="dark"` or, when no theme is set, `prefers-color-scheme: dark`.

### Primary
- **Datasheet Blue** (`datasheet-blue`; `datasheet-blue-dark`): links, the active family tab's text and 3px underline, focus outlines (2px, offset 2px), the Downloads disclosure, the Homebrew copy action, and the marker cell and label on an active Releasing row. In dark mode it lifts to a light, legible blue because it sits as text on the navy sheet.
- **Masthead Blue** (`masthead-blue`; `masthead-blue-dark`): the masthead band, the pressed Cards/Table button, and text selection. In light mode it is the same blue as Datasheet Blue. In dark mode it deepens instead of lightening, because it carries white text.
- **On Blue** (`on-blue`): wordmark, navigation, follow pill, and pressed-switch text on masthead blue in both modes.

### Neutral
- **Sheet** (`sheet`; `sheet-dark`): page ground and every part, bar, and panel. There is no separate surface tone; parts are separated by rules, not tints.
- **Ink** (`ink`; `ink-dark`): headings, part names, the 2px top rule, column heads, and Status labels.
- **Body Ink** (`body-ink`; `body-ink-dark`): running text and part descriptions.
- **Muted Ink** (`muted-ink`; `muted-ink-dark`): family designators, dates, meta lines, placeholders, Prerelease and stage notes, and empty values.
- **Ruled Line** (`ruled-line`; `ruled-line-dark`): 1px outer borders of parts, the selector bar and its dividers, revision-table head borders, and the footer rule.
- **Hairline Rule** (`hairline-rule`; `hairline-rule-dark`): 1px internal rules between revision rows, under the part heading, between family tabs, and between table rows.
- **Spec Fill** (`spec-fill`; `spec-fill-dark`): table and revision heads, the selected family tab, hover on tabs and table rows, and the Homebrew command well.

### Named Rules
**The One Blue Rule.** Blue appears as a field in only two places: the masthead and the pressed view switch. Everywhere else it is a line or text that marks an action, focus, or an active release.

**The Two Rules Rule.** Use Ruled Line for edges and Hairline Rule for divisions inside an edge. Do not add a third line color.

## Typography

**Display Font:** Archivo (self-hosted variable `fonts/archivo-latin.woff2`, weight 100–900, width 62–125%, OFL), falling back to PingFang SC, Microsoft YaHei, system-ui, sans-serif
**Body Font:** Archivo, same file
**Label Font:** Archivo at `font-stretch: 75%` (the `--ds-narrow` token)

**Character:** Archivo is a single grotesque that works as both a reading face and a condensed catalogue label, so the page reads like a printed datasheet without a second family. Chinese text falls back to PingFang SC or Microsoft YaHei.

### Hierarchy
- **Display** (700, 32px/40px, -0.01em; 28px/34px on phones): the page title only.
- **Wordmark** (700, 22px/44px, 75% width): the masthead's `idy.dev`. Masthead navigation uses 600 15px at 75% width and 0.02em tracking.
- **Part Name** (700, 18px/24px, -0.005em; 16px in the phone list): the project name at the head of each part.
- **Lead** (400, 16px/24px; 15px on phones): the single intro line under the title, in Muted Ink.
- **Body** (400, 15px/1.5): page default.
- **Description** (400, 14px/20px, `text-wrap: pretty`): the part's one-line function, and search input text.
- **Label: Tab** (600, 14px, 0.02em, 75% width): family tabs and the community link. The view switch uses the same voice at 13px.
- **Label: Link** (600, 13.5px/20px, 0.02em, 75% width): project links and the Downloads summary (13px).
- **Label: Family** (600, 12px/16px, 0.06em, uppercase, 75% width): the family designator on the same baseline as the part name, and the Homebrew panel caption.
- **Table Head** (700, 12px, 0.04em, 75% width): revision-table heads. The desktop selector-table heads use 13px/18px.
- **Revision** (400, 13px/18px, tabular lining figures): revision rows. Versions are 600 (Released) or 700 (Releasing); Status labels are 500 at 75% width.
- **Meta** (400, 13px/20px, tabular lining figures): the project count and snapshot time.

### Named Rules
**The Two Widths Rule.** Read at normal width; label at 75% width. Any text that names a column, a tab, a family, or a link set is narrow. Any text that is read as a sentence is not.

**The Tabular Figures Rule.** Versions, dates, and counts always use `tabular-nums lining-nums` so figures align down a revision column.

## Layout

The page is a single centered sheet with a maximum width of 84rem, inset by 48px gutters (16px at 760px and below). The masthead, page, and footer share this width. The masthead is at least 52px tall.

The first viewport stacks a compact title block (title, intro line, and a community link at the far right, bottom-aligned), one bordered selector bar, a meta line (count left, snapshot time and reload right), and then the parts grid.

- **Parts grid:** 3 columns with 24px gaps above 1200px, 2 columns with 16px gaps from 761px to 1200px, and 1 column with 12px gaps at 760px and below.
- **Shared rows:** where `subgrid` is supported, each part spans three row tracks (identity, Released, Releasing), so revision tables start on the same line across a grid row no matter how long the descriptions are.
- **Part interior:** identity inset 14px 20px (16px horizontal on phones); revision tables inset 20px (16px) from the part edges; rows padded 6px 8px.
- **Selector bar:** one row (search | family tabs | Cards/Table) above 900px. The search field narrows at 1040px. At 900px and below, search takes its own row and the family tabs scroll horizontally beside the view switch. On phones the switch keeps its icons and moves the text labels to screen readers only.
- **Table view:** above 760px, a full product-selector table (Project 56%, Released 22%, Releasing 22%). At 760px and below, a compact ruled list with only Project and Released columns. An active Releasing row appears below its project as a full-width line.

**The Shared Row Rule.** Revision tables in the same grid row must begin at the same height. Align them with subgrid row tracks, not fixed heights.

## Elevation & Depth

The system is flat. No element has a drop shadow, a lift on hover, or a tonal surface level. Depth is drawn: a 2px ink rule caps every part, a 1px Ruled Line outlines it, and Spec Fill marks heads and selected or hovered states. The only `box-shadow` declarations are inset rules standing in for borders: the 3px underline on the active family tab and the 3px or 4px blue marker on active Releasing rows in table view. None of the homepage rules declare transitions or animations; state changes are immediate. The only movement is the disclosure chevron's rotation, which also has no transition.

**The Ruled, Not Raised Rule.** If a surface needs separation, draw a rule or fill it with Spec Fill. Never cast a shadow.

## Shapes

Corners are nearly square: 2px for parts, the selector bar, the view switch's outer ends, the table, panels, the command well, the follow pill, and header popovers. Joined controls share edges; the second view-switch button drops its left border so the pair reads as one segmented control. Icons are simple inline SVG strokes (1.5–1.7px): the search lens, the card/table glyphs, and a single drawn chevron for every disclosure.

**The Ink Top Rule.** Every part-level container (project part, selector table, phone list, empty state, Homebrew panel) opens with a 2px Ink top border over 1px Ruled Line sides.

## Components

### Masthead
A solid blue band. The wordmark is at 75% width; navigation links are On Blue at 0.86 opacity, reaching full opacity with an underline on hover or focus. The follow action is a 2px-cornered outline pill (1px white at 72% opacity) that fills with white at 14% opacity on hover, the same as the header icon buttons. Header focus outlines switch to On Blue.

### Selector Bar
- **Style:** one 1px Ruled Line frame with 2px corners on Sheet, at least 46px tall. Its three zones (search, family tabs, view switch) are divided by 1px Ruled Line.
- **Search:** borderless input with a 16px stroked lens inset 14px; Muted Ink placeholder; focus outline drawn inside the field (offset -2px).
- **Family tabs:** narrow 600-weight labels divided by Hairline Rule. Hover fills with Spec Fill. The pressed tab fills with Spec Fill, turns Datasheet Blue, and carries a 3px blue underline.
- **View switch:** a two-button segmented control with icon and label. The pressed button fills with Masthead Blue and On Blue text; an unpressed button fills with Spec Fill on hover.

### Parts (Cards / Containers)
- **Corner Style:** 2px.
- **Background:** Sheet.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Border:** 2px Ink top, 1px Ruled Line elsewhere.
- **Internal Padding:** identity 14px 20px, with 16px at the bottom of the part.
- **Content order:** heading row (part name left, family designator right, Hairline Rule under it), one-line description, project links, then the Downloads disclosure under the links, then the revision table. The part name is an Ink link that turns Datasheet Blue with an underline on hover.

### Revision Table (Signature Component)
The datasheet's revision history in miniature: a four-column grid with a 4px marker column, Status (6.5rem; 5.5rem on phones), Version, and a right-aligned Date.
- **Head:** a Spec Fill strip between 1px Ruled Line borders reading Status | Version | Date in Table Head type. It spans the marker column, which stays empty.
- **Released row:** Status label in Ink; version as a 600-weight link; date in Muted Ink; Hairline Rule beneath. A prerelease shows "Prerelease" in the Status column instead of "Released".
- **Releasing row:** appears on a part only when it has something to say. When an active, confirmed target exists, the marker cell fills with Datasheet Blue, the Status label turns bold Datasheet Blue, and each target version is bold with a muted stage note at the right. Idle Releasing rows (an em dash) are omitted on cards; notes such as an unconfirmed target or untracked releases remain visible, unmarked.
- **Phones:** every cell stretches to a 44px tap-target height.

**The Marker Rule.** The blue marker cell means one thing: a release is in progress. Don't use it for emphasis, selection, or hover.

### Downloads Disclosure
A narrow Datasheet Blue summary under the project links, led by a 14px drawn chevron that rotates 90° when open. Download links list beneath it at a 32px minimum height. When release lookup fails, it falls back to a GitHub Releases link and a muted note. The Homebrew panel and status explainer use the same drawn chevron; the Homebrew panel's 18px chevron rotates 180°. Native disclosure triangles are hidden everywhere.

### Table View
- **Desktop (above 760px):** one framed table with the Ink top rule. Heads are on Spec Fill; rows are separated by Hairline Rule and fill with Spec Fill on hover. Cells are padded 14px 16px. The revision-table head, Status labels, and marker column are hidden. Released stacks version over date. An active Releasing cell carries a 4px blue inset marker on its left.
- **Phones (760px and below):** a compact ruled list headed Project | Released on Spec Fill. Each row shows the part name (16px) and Released version only. An active release adds a full-width line with a 3px blue inset marker; idle and note-only Releasing rows are hidden.

### Text Actions and Panels
- **Text button** (Reload snapshot): underlined Datasheet Blue text with no box; 0.6 opacity while busy.
- **Homebrew panel:** a part-style container with the Ink top rule. A 48px summary row has a bold title, a narrow uppercase caption, and the chevron. Commands sit in Spec Fill wells with 1px Ruled Line borders and 2px corners. The copy action is Datasheet Blue text on a transparent ground; on hover its ground becomes Sheet.
- **Empty state:** a part-style frame, centered, with a 20px/28px bold heading and muted text.

## Do's and Don'ts

### Do:
- **Do** cap every part-level container with a 2px Ink top rule over 1px Ruled Line sides, with 2px corners.
- **Do** set labels, tabs, family designators, link sets, and table heads in Archivo at 75% width, and keep running text at normal width.
- **Do** use tabular lining figures for every version, date, and count.
- **Do** keep blue fields to the masthead and the pressed view switch; use Datasheet Blue for links, focus, the active tab, and active Releasing markers only.
- **Do** align revision tables across a grid row with subgrid tracks.
- **Do** use Masthead Blue, not Datasheet Blue, wherever white text sits on blue in dark mode (#8db8ee fails contrast against white).
- **Do** use one drawn SVG chevron for every disclosure and hide native markers.
- **Do** keep tap targets at a minimum of 44px on phones.

### Don't:
- **Don't** use drop shadows, hover lifts, or tonal surface steps. Draw a rule or use Spec Fill instead.
- **Don't** round corners beyond 2px or turn parts into pill-shaped badges.
- **Don't** add a second typeface. Archivo carries display, body, and labels.
- **Don't** use the blue marker cell for anything but an active, in-progress release.
- **Don't** show idle Releasing rows on cards.
- **Don't** apply these `--ds-*` tokens, the 84rem page, or the parts grid as defaults for the shared site SDK or other `*.idy.dev` pages.
- **Don't** add icon-font glyphs to new components. Icons are inline SVG strokes.
