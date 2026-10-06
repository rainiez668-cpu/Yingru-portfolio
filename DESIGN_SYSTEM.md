# Portfolio Design System

This document records the design system currently implemented in the portfolio codebase. It is descriptive, not aspirational: current production code is the source of truth.

Before adding new pages, project details, components, or interactions, read this file and then inspect the latest implementation.

## Color System

### Background

- Name: Warm Off-white
- HEX: `#F4F3ED`
- RGB: `244, 243, 237`
- CSS variable: `--site-background`
- Current use: page background across Home, About, Work, Lab, and Project Detail.

### Primary Blue

- Name: Site Blue
- HEX: `#65BCEB`
- RGB: `101, 188, 235`
- CSS variable: `--site-blue`
- Current use: logo, navigation, section labels, dividers, borders, links, focus outlines, project visual borders.

### Acid / Lime

- Name: Acid / Lime
- HEX: `#BEEB4F`
- CSS variable: `--site-acid`
- Current use: logo first-letter accent, hover accents, Home glow/fragment effects.
- Usage rule: accent only. Do not use as a broad background or large surface unless explicitly requested.

### Primary Ink

- HEX: `#263F49`
- Current variables:
  - `--project-ink`
  - `--about-ink`
  - `--work-ink`
  - `--lab-ink`
- Current use: primary headings, project titles, metadata values, main text emphasis.

### Muted Text

- HEX: `#4C626C`
- Current variables:
  - `--project-muted`
  - `--about-muted`
  - `--work-muted`
  - `--lab-muted`
- Current use: descriptions, secondary information, metadata body copy.

### Rules / Dividers

- Current variables:
  - `--project-rule: rgb(101 188 235 / 68%)`
  - `--about-rule: rgb(101 188 235 / 68%)`
  - `--work-rule: rgb(101 188 235 / 68%)`
  - `--lab-rule: rgb(101 188 235 / 68%)`
- Current use: Project Overview top/bottom rules, metadata dividers, About/Work/Lab structural dividers.

### Additional Current Colors

- Lab interaction note: `#8a969b`
- Anew phone shell: `#203741`
- Anew phone screen/island: `#101b21`
- Anew phone border: `rgb(38 63 73 / 88%)`
- Work visual CTA background: `rgb(244 243 237 / 90%)`
- Home has several inline glow colors based on `#BEEB4F` and `#65BCEB`.

## Color Usage Rules

- Background: use `--site-background` for page surfaces.
- Blue: use `--site-blue` for structure, navigation, labels, links, dividers, borders, and focus states.
- Dark blue-gray: use `#263F49` variables for primary text and project titles.
- Muted blue-gray: use `#4C626C` variables for descriptions and secondary information.
- Acid/lime: use sparingly for interaction accents, logo accent, and Home/Lab experimental energy.
- Do not introduce random new colors for page sections, cards, or buttons. Reuse existing variables first.

## Typography

### Logo

- CSS variable: `--site-logo-serif`
- Stack: `"Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif`
- Logo font-size: `clamp(50px, 7.4vw, 76px)`
- Mobile logo font-size: `clamp(42px, 18vw, 59px)`
- Weight: `400`
- Line-height: `0.9`
- Letter-spacing: `-0.055em`
- First letter of Yingru:
  - Font stack: `"Pinyon Script", "Snell Roundhand", "Brush Script MT", cursive`
  - Color: `--site-acid`
  - Size: `1.4286em`

### Navigation / UI

- CSS variable: `--site-nav-sans`
- Stack: `Arial, Helvetica, sans-serif`
- Global nav desktop base:
  - `font-size: 20px`
  - In `@media (min-width: 761px)`: `18px`
  - Mobile: `14px`
  - Weight: `400`
  - Active weight: `600`
  - Gap: base `38px`, desktop media `34px`, mobile `16px`
- Section labels and metadata labels:
  - Work/Lab common labels: `12px`, `600`, `letter-spacing: 0.12em`
  - Project Detail labels: `14px`, `600`, `letter-spacing: 0.1em`
  - About contact labels: `11px`, `600`, `letter-spacing: 0.11em`
- Project back link:
  - `14px`, `600`, `letter-spacing: 0.11em`
  - Official Project Detail label: `← BACK`
  - All Work Project Detail pages should use `← BACK`.
  - Reuse the current `.project-back` font, font-size, font-weight, letter-spacing, color, hover, spacing, and position.

### Chinese Body

- Stack used on About, Work, Project Detail, and Lab experiment details:
  - `"Noto Sans SC"`
  - `"Source Han Sans SC"`
  - `"PingFang SC"`
  - `"Microsoft YaHei"`
  - `sans-serif`

### English / UI Body

- Site UI stack: `Arial, Helvetica, sans-serif`
- Some subtitles use: `"Helvetica Neue", Helvetica, Arial, sans-serif`
- Home animation uses inline monospace for fragments:
  - `Consolas, "Lucida Console", "DejaVu Sans Mono", monospace`

### Project Title

- Selector: `.project-title`
- Used by: Anew, Nugget
- Font-family: `var(--site-logo-serif)`
- Font-size: `clamp(40px, 3vw, 72px)`
- Mobile font-size: `clamp(40px, 12vw, 54px)`
- Weight: `500`
- Letter-spacing: `-0.065em`
- Line-height: `0.9`

### Work Index Project Title

- Selector: `.work-project__header h2`
- Font-family: `var(--site-logo-serif)`
- Font-size: `clamp(20px, 2vw, 30px)`
- Weight: `500`
- Letter-spacing: `-0.03em`
- Line-height: `1.16`

### Intro Titles

- Work intro:
  - Font-family: `var(--site-nav-sans)`
  - Desktop media font-size: `clamp(35px, 4vw, 48px)`
  - Base font-size: `clamp(38px, 4.4vw, 53px)`
  - Weight: `400`
  - Letter-spacing: `-0.045em`
  - Line-height: `1.04`
- Lab intro mirrors this scale.

## Layout

### Main Widths

- Header logo/nav/rule are absolute-positioned globally.
- Page outer max width:
  - About/Lab base: `min(100%, 1472px)`
  - Work base: `min(100%, 1472px)`
  - Project Detail: `min(100%, 1325px)`
- Common desktop content width:
  - `1152px` is the dominant refined content width in desktop media queries.
  - About content/work/tools, Lab intro/experiments, Work intro/filter/projects, Project Overview, and Nugget hero visual all use or align with `1152px`.
- Earlier/base widths also exist:
  - `1280px` for About/Work/Lab content before desktop media overrides.

### Padding

- About/Lab/Work base page padding: `clamp(210px, 29vh, 290px)` top and `clamp(25px, 5vw, 96px)` sides.
- Desktop media top padding for About/Lab/Work: `clamp(190px, 26vh, 260px)`.
- Desktop media side padding: `clamp(23px, 4.5vw, 86px)`.
- Project Detail padding: `clamp(195px, 26vh, 255px) clamp(23px, 4.5vw, 86px) clamp(90px, 11vw, 170px)`.
- Mobile side padding:
  - Project Detail: `25px`
  - About/Lab/Work top: `160px` or near equivalent

### Breakpoints

- Main CSS breakpoint:
  - `@media (min-width: 761px)`
  - `@media (max-width: 760px)`
- Home has additional inline `@media (max-width: 600px)` rules.

## Project Detail Template

Current template is shared by Anew and Nugget:

1. Header
2. Back link
3. Hero visual
4. Project name
5. Project Overview
6. Later case study content

### Header

- Reuses `.site-logo`, `.site-nav`, `.site-navigation-rule`.
- Work is active on project detail pages: `(WORK)`.

### Hero

- Selector: `.project-hero`
- Layout: vertical flex, centered.
- Hero visual comes before project title.
- `.project-title` appears below the visual.

### Hero Visual Variants

- Anew uses `.project-phone` with an embedded video.
- Nugget currently uses `.project-hero-visual`:
  - `width: min(100%, 1152px)`
  - `aspect-ratio: 16 / 10`
  - `border: 1px solid var(--project-rule)`
- Do not use the Anew phone mockup for desktop web products unless explicitly requested.

### Project Overview

- Selector: `.project-overview`
- Width: `min(100%, 1152px)`
- Desktop layout: `grid-template-columns: minmax(0, 1.85fr) minmax(260px, 1fr)`
- Left column:
  - `项目简介`
  - Statement
  - Description
  - CTA group, when real URLs exist
- Right column:
  - 角色
  - 时间线
  - 项目类型
  - 状态
- Divider:
  - Top border: `1px solid var(--project-rule)`
  - Bottom border: `1px solid var(--project-rule)`
  - Right metadata column has `border-left: 1px solid var(--project-rule)`
  - Metadata items use horizontal dividers.
- Mobile:
  - Single column
  - Metadata moves below description
  - Vertical divider removed
  - Metadata gets top border

## Work Index

### Category Language

- WORK filter display labels: `（全部）`、`产品设计`、`体验设计`、`创意技术`.
- Keep the filter implementation values in English: `all`、`product`、`experience`、`creative-tech`.
- Work project category labels use: `产品设计`、`体验设计`、`创意技术`.
- LAB category navigation uses: `（交互海报） 视觉研究` on the default Interactive Posters page, and `交互海报 （视觉研究）` on Visual Studies.
- Main navigation remains `ABOUT / WORK / LAB`; project names retain their original English names.
- Categories and other functional information should use Chinese for the Chinese recruiting context.

### Project Row

- Selector: `.work-project`
- Desktop grid:
  - Areas: visual left, header/details right
  - Columns: `minmax(0, 5fr) minmax(240px, 4fr)`
  - Desktop media columns: `minmax(0, 5fr) minmax(220px, 4fr)`
- Current layout is not reversed: all project visuals are left, information is right.
- Visual top aligns with project number/category; visual bottom aligns visually with metadata area.

### Visual

- Selector: `.work-project__visual`
- Aspect ratio: `16 / 10`
- Max width: `640px`
- Border: `2px solid var(--site-blue)`
- Padding: `0`
- Background: `transparent`
- Linked visuals use semantic anchors.
- Work Index detail links:
  - Anew: `work/anew/`
  - Nugget: `work/nugget/`

### Work Visual Hover CTA

- Selector: `.work-project__visual-entry`
- Text: `查看项目 ↗`
- Position:
  - Desktop: `left: 18px`, `bottom: 18px`
  - Mobile: `left: 14px`, `bottom: 14px`
- Desktop style:
  - `display: inline-flex`
  - `padding: 8px 11px`
  - `font-family: var(--site-nav-sans)`
  - `font-size: 12px`
  - `font-weight: 600`
  - `letter-spacing: 0.02em`
  - `line-height: 1`
  - `color: var(--work-ink)`
  - `background: rgb(244 243 237 / 90%)`
  - `border: 1px solid var(--site-blue)`
  - `border-radius: 0`
- Default:
  - `opacity: 0`
  - `transform: translateY(3px)`
- Hover/focus:
  - `opacity: 1`
  - `transform: translateY(0)`
- CTA hover:
  - `background: var(--site-blue)`
  - `color: var(--site-background)`
- Touch devices:
  - CTA is always visible via `@media (pointer: coarse)`.

## Buttons & Links

### Project Detail CTA

- Selector: `.project-action`
- Used for:
  - `在线体验 ↗`
  - `原型体验 ↗`
  - `查看源码 ↗`
- Container: `.project-actions`
  - `display: flex`
  - `flex-wrap: wrap`
  - `gap: 12px`
  - `margin-top: auto`
  - `padding-top: clamp(34px, 4vw, 54px)`
- Button/link style:
  - `padding: 10px 16px`
  - `font-family: var(--site-nav-sans)`
  - `font-size: 13px`
  - `font-weight: 600`
  - `letter-spacing: 0.03em`
  - `line-height: 1.2`
  - `border: 1px solid var(--site-blue)`
  - `border-radius: 0`
  - `background: transparent`
  - `color: var(--site-blue)`
- Hover:
  - `background: var(--site-blue)`
  - `color: var(--site-background)`
  - `transform: translateY(-1px)`
- Focus:
  - `outline: 1px solid var(--site-blue)`
  - `outline-offset: 4px`
- External project links should use:
  - `target="_blank"`
  - `rel="noopener noreferrer"`

### Inline / Editorial Links

- Avoid large filled buttons unless hover state requires it.
- Prefer text links or thin bordered CTA elements.
- Use site blue, acid hover, and small directional movement sparingly.

## Lines & Dividers

- Header rule:
  - `.site-navigation-rule`
  - Height: `1.34px`
  - Color: `var(--site-blue)`
  - Slight rotation: `rotate(0.2deg)`
- Project Overview:
  - `1px solid var(--project-rule)`
  - top/bottom rules and right-column vertical divider.
- Work visual:
  - `2px solid var(--site-blue)`
- About photo:
  - `2px solid var(--site-blue)`
- About/Work/Lab internal rules:
  - generally `1px solid var(--*-rule)`
  - selected headings may use `1.34px solid var(--site-blue)`.

Do not use dividers as decorative boxes. Use lines to structure information, not to turn sections into cards.

## Visual Principles

Current visual language:

- Editorial
- Swiss-inspired
- Post-digital
- Technical
- Minimal
- Typography-led

Current constraints:

- Warm off-white background.
- Thin blue structural rules.
- Large but controlled whitespace.
- Structured grids.
- Minimal decoration.
- Sharp or near-zero-radius UI.
- Clear information hierarchy through type, alignment, spacing, and rules.
- Avoid generic template aesthetics.

Avoid:

- SaaS-style rounded cards.
- Large rounded rectangles.
- Heavy shadows.
- Glassmorphism.
- Gradients as page decoration.
- Excessive pills.
- Random new colors.
- Decorative icons without functional purpose.
- Copying the Anew phone mockup into unrelated project types.

## Spacing

The project does not currently enforce a strict spacing token scale.

Use existing nearby components as references instead of inventing a new spacing system.

Current recurring values:

- Work project gap: `clamp(99px, 10.35vw, 124px)`
- Work project mobile gap: `88px`
- Work projects top margin: `clamp(62px, 7vw, 96px)`
- Work filter top margin: `clamp(30px, 3.5vw, 44px)`
- Project Overview margin-top: `clamp(38px, 4.7vw, 62px)`
- Project Overview padding-block: `clamp(34px, 4vw, 52px)`
- Project actions gap: `12px`
- Project metadata item padding: `20px 0`
- Mobile project metadata item padding: `18px 0`
- Lab experiment gap desktop media: `clamp(90px, 9vw, 108px)`
- Lab mobile experiment gap: `88px`

When adding a new page, reference the closest existing pattern rather than creating a new spacing rhythm.

## Responsive Rules

- Primary breakpoint is `760px`.
- Desktop:
  - Work Index: two-column visual/info grid.
  - Project Detail Overview: two-column overview and metadata.
  - Lab: visual and metadata side by side, with selected reversed experiments.
  - About: photo/details and grids.
- Mobile:
  - Work Index: header, visual, details stack in one column.
  - Project Detail Overview: single column; metadata below content.
  - Lab: preview then metadata in one column.
  - About: photo and details stack; grids become single column.
- Home has its own experimental inline responsive rules and should be treated as an exception.

## Assets

Current asset structure:

- `public/assets/images/work/anew/anew-cover.webp`
- `public/assets/videos/anew-demo1.mp4`
- `public/assets/hands/hand_01.webp` through `hand_20.webp`
- `assets/images/about/yingru-portrait.jpg`
- Lab experiments live under:
  - `public/experiments/poster-01/`
  - `public/experiments/poster-02/`
  - `public/experiments/poster-03/`

Recommended future pattern:

- Work covers: `public/assets/images/work/{project-name}/{project-name}-cover.webp`
- Project videos: `public/assets/videos/{project-name}-demo.mp4`
- Do not move existing assets only for documentation consistency.

## Interaction

Current interaction language:

- Subtle.
- Short transitions.
- Clear affordance.
- Motion communicates clickability or state.
- Avoid animation that competes with content.

Current transition durations:

- Global nav item: `160ms`
- Project back hover: `160ms`
- Project CTA hover: `180ms`
- Work filter: `180ms`
- Work project filter animation: `200ms`
- Work visual cover opacity: `220ms`
- Work visual transform: `220ms cubic-bezier(0.22, 1, 0.36, 1)`
- Lab preview transform: `260ms cubic-bezier(0.22, 1, 0.36, 1)`
- Lab entry fade: `180ms`
- Home navigation fade: `600ms`

Home is an intentional exception: it uses experiential scroll, hand-frame animation, fragment release, idle drift, magnetic attraction, glow, and decode interactions. Work, About, Lab, and Project Detail should remain more restrained.

## Design Rule Layers

### Global Rules

These should remain consistent across the site unless explicitly changed:

- Site colors and CSS variables.
- Global header, logo, navigation, active navigation language, and blue header rule.
- Typography roles: logo, navigation/UI, Chinese body, project title, Work Index title, metadata labels.
- Project Detail information hierarchy:
  - Header
  - `← BACK`
  - Hero visual
  - Project name
  - Project Overview
  - Later case study content
- Project Detail back navigation:
  - Official label: `← BACK`
  - Reuse `.project-back`.
- Project Overview structure:
  - Left: section label, statement, description, optional CTA group.
  - Right: role, timeline, project type, status.
- Metadata system: label/value hierarchy, right-column dividers, mobile single-column behavior.
- CTA styling: `.project-actions` and `.project-action`.
- Divider language: thin blue rules, no decorative boxed cards.
- Work Index project row system: visual + project information, 16:10 visuals, hover CTA language.

### Project-Specific Variations

These may change according to the project content and medium:

- Hero media format.
- Hero composition.
- Case study middle-section storytelling layout.
- Project-specific imagery, video, prototype media, or physical documentation.
- Detail pages may use different hero types:
  - Anew: Phone / Video Hero.
  - Nugget: 16:10 Desktop Web Hero.
  - Future projects may use desktop UI, mobile UI, installation photography, video, physical prototype imagery, or another medium-specific visual format.

The goal is consistency of visual language and hierarchy, not identical page layouts.

### Intentional Exceptions

These are allowed exceptions, not design conflicts:

- Home is an experiential entry page. It may use its own interaction and visual system, including scroll interaction, hand-frame animation, fragment release, idle drift, magnetic attraction, glow, and decode effects.
- Lab is an experimental page. It may use local typography and presentation variations when they support the experimental work, while still retaining the shared header, colors, and overall site language.

## Instructions For AI / Codex

Before implementing any new page or component:

1. Read this `DESIGN_SYSTEM.md` first.
2. Inspect the latest existing implementation before editing.
3. Reuse existing CSS variables and components whenever possible.
4. Do not introduce a new color if an existing token can serve the purpose.
5. Do not introduce a new font without explicit instruction.
6. Do not duplicate Project Detail styles.
7. Do not redesign existing components unless explicitly requested.
8. Preserve user-adjusted spacing and typography.
9. Prefer extending the existing visual language over creating isolated styles.
10. If `DESIGN_SYSTEM.md` conflicts with the current production code, current code is the source of truth; report the discrepancy instead of silently overwriting it.
