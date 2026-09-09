---
name: Buriccat
description: A dark, gold-rimmed casino HUD wrapped around a real 3D Punto Banco table.
colors:
  stage-near-black: "#07080b"
  bg: "#0b0d13"
  felt-green-glow: "rgba(11, 107, 58, 0.32)"
  navy-glow: "rgba(5, 10, 33, 0.96)"
  accent: "#d6a22b"
  accent-bright: "#e8be5a"
  accent-deep: "#a1730f"
  accent-bg: "rgba(214, 162, 43, 0.12)"
  accent-border: "rgba(214, 162, 43, 0.55)"
  border: "rgba(214, 162, 43, 0.4)"
  text: "#cfc9d6"
  text-h: "#f5eac2"
  code-bg: "#12131a"
  win: "#1f9d55"
  lose: "#e0433c"
  neutral-white: "#fff"
  neutral-white-dashed: "rgba(255, 255, 255, 0.6)"
  neutral-white-faint: "rgba(255, 255, 255, 0.35)"
  neutral-white-track: "rgba(255, 255, 255, 0.08)"
  chip-1-grey: "#6b6b6b"
  chip-5-red: "#c0392b"
  chip-100-charcoal: "#1f1f24"
  chip-500-purple: "#7d3ac1"
  chip-25000-black: "#232323"
typography:
  display:
    fontFamily: "Cinzel, Georgia, 'Times New Roman', serif"
    fontSize: "56px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-1.68px"
  headline:
    fontFamily: "Cinzel, Georgia, 'Times New Roman', serif"
    fontSize: "24px"
    fontWeight: 500
    lineHeight: "118%"
    letterSpacing: "-0.24px"
  label-heading:
    fontFamily: "Cinzel, Georgia, 'Times New Roman', serif"
    fontSize: "15px"
    fontWeight: 700
    letterSpacing: "0.06em"
  body:
    fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "18px"
    lineHeight: "145%"
    letterSpacing: "0.18px"
  data-mono:
    fontFamily: "ui-monospace, Consolas, monospace"
    fontSize: "14px"
  emphasis-lg:
    fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "22px"
    fontWeight: 700
  emphasis:
    fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "20px"
    fontWeight: 700
  display-mobile:
    fontFamily: "Cinzel, Georgia, 'Times New Roman', serif"
    fontSize: "36px"
    description: "Display's <=1024px step-down (56px desktop -> 36px)."
  body-mobile:
    fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "16px"
    description: "Body's <=1024px step-down (18px desktop -> 16px); also the general 16px UI-chrome step (menu actions, settings inputs)."
  ui-chrome-lg:
    fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "13px"
  ui-chrome-md:
    fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "12px"
  ui-chrome-sm:
    fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "11px"
  micro-lg:
    fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "10.5px"
  micro-md:
    fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "9.5px"
  micro-sm:
    fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "8.5px"
  micro-xs:
    fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "7.5px"
  micro-xxs:
    fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "6px"
    description: "The tie-slash mark only - the floor of the whole type system."
rounded:
  xs: "4px"
  sm: "8px"
  md: "10px"
  circle-badge: "12px"
  lg: "14px"
  xl: "16px"
  pill: "999px"
  dock-top: "18px 18px 0 0"
  dock-radius: "18px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "linear-gradient(135deg, #e8be5a, #a1730f)"
    textColor: "#1a1305"
    typography: "{typography.label-heading}"
    rounded: "{rounded.pill}"
    padding: "15px 22px"
  button-primary-hover:
    backgroundColor: "linear-gradient(135deg, #e8be5a, #a1730f)"
    textColor: "#1a1305"
  button-ghost:
    backgroundColor: "rgba(10, 12, 16, 0.55)"
    textColor: "{colors.text-h}"
    typography: "{typography.label-heading}"
    rounded: "{rounded.pill}"
    padding: "15px 22px"
  bet-spot:
    backgroundColor: "radial-gradient(ellipse at 50% 32%, rgba(11,107,58,0.95) 0%, rgba(5,10,33,0.96) 82%)"
    textColor: "{colors.text-h}"
    rounded: "50%"
---

# Design System: Buriccat

## Overview

**Creative North Star: "The Broadcast Table"**

Buriccat is a single, continuous casino HUD stretched over a real 3D felt table, not a document-style app with a game embedded in it. Every screen - Loading, Menu, Settings, the table itself - is staged as if a sports-broadcast overlay had been laid on top of the same physical room: a deep near-black stage, a felt-green-to-navy radial glow breathing up from below, and a gold rim marking every actionable edge. There is no light mode and none is planned; `color-scheme: dark` and a single always-on palette are load-bearing, not a placeholder for a future toggle - a real table doesn't relight itself for a browser setting.

The system is full-bleed and atmospheric rather than paneled: no screen is a centered document column with side margins, and no breakpoint collapses the table-plus-HUD structure into a stacked page. Density is generous at rest (buttons, bet spots, and cards keep real breathing room) and tightens only where information genuinely needs it (roadmap ticks, chip tray, payout tables).

**Key Characteristics:**
- Deep near-black stage (#07080b / #0b0d13) with a felt-green-to-navy radial glow, never a flat solid background on a primary screen.
- Gold (#d6a22b → #e8be5a) is the single accent family, reserved for interactive edges, primary actions, and headings.
- Cinzel (self-hosted via Google Fonts) is the display voice for headings, button labels, and the loading label only; everything else reads in system-ui.
- Pill-shaped buttons and circular bet spots are the dominant silhouette; document-style cards use soft rectangular radii instead.
- Dark permanence: no `prefers-color-scheme` branch exists anywhere in the app.

## Colors

The palette is a single dark/gold world used identically across every screen - there is no light theme and no per-surface recolor.

### Primary
- **Casino Gold** (`#d6a22b`): the one interactive accent - button borders/fills, focus rings, selection highlight, scrollbar thumb, active states, chip-tray gold denominations, roadmap toggle hover.
- **Bright Gold** (`#e8be5a`): the lighter end of the gold gradient/glow - hover border color on buttons and bet spots, the primary-button gradient's light stop, logo drop-shadow glow.
- **Deep Gold** (`#a1730f`): the gradient's dark stop on gold-filled elements (primary menu button, chip-1000, loading bar fill).

### Neutral
- **Stage Black** (`#07080b`): the base background for the 3D stage, Menu screen, and Loading screen - the darkest layer everything else glows against.
- **Panel Ink** (`#0b0d13`): the app-wide `--bg` used for document-style surfaces (Settings, result overlay, game-over card) that sit outside the felt-table illusion.
- **Cream Heading** (`#f5eac2`, token `text-h`): headings, button/label text on dark chips, HUD balance amount, bet-spot labels - the primary "readable in gold light" text color.
- **Body Lilac-Grey** (`#cfc9d6`, token `text`): body copy, secondary labels, How-to-Play prose, roadmap captions.
- **Felt Green Glow** (`rgba(11,107,58,0.32–0.95)`): the radial glow inside bet spots and the Menu/Loading backdrop - the "felt" half of the felt-to-navy fill.
- **Navy Depth** (`rgba(5,10,33,0.96)`): the far end of that same radial fill, and the base of the 5000-chip gradient.
- **Win Green** (`#1f9d55`) / **Lose Red** (`#e0433c`): positive/negative net-result and roadmap-outcome color only - never used decoratively.

### Neutral White (utility family, not brand)
A small, deliberate set of plain whites - `#fff`, and translucent steps at 0.6/0.35/0.08 opacity - used only where a *neutral* (non-gold, non-cream) mark is structurally required: the dashed rim and denomination text on poker chips (chips carry their own bright, denomination-specific colors and would clash with a gold rim), the hover border on the camera-switch button, and the indeterminate-progress-bar track. Never used for HUD text, headings, or anything that could instead read in `text-h`/`text`/accent gold.

### Chip Denominations (closed palette)
The five bet-tray chip colors that aren't already brand tones (chip-1000 reuses the gold gradient, chip-5000 reuses navy, chip-25 reuses Win Green) are their own small, closed, real-casino-chip-color enumeration - grey (`#6b6b6b`, $1), red (`#c0392b`, $5), charcoal (`#1f1f24`, $100), purple (`#7d3ac1`, $500), near-black (`#232323`, $25000, gold-bordered). This set is only ever extended for a new denomination, never borrowed for other UI.

### Named Rules
**The One World Rule.** Menu, Loading, Settings, and the in-game HUD all draw from the same `--bg`/`--accent`/`--text-h` tokens and the same felt-green/navy radial glow; no screen gets a competing background treatment.

**The No-Toggle Rule.** There is no `prefers-color-scheme` branch and no light variant anywhere in the app - `color-scheme: dark` is permanent, not a default awaiting a light mode.

## Typography

**Display Font:** Cinzel (self-hosted via Google Fonts `@import`, weights 600/700), falling back to Georgia, 'Times New Roman', serif
**Body Font:** system-ui, 'Segoe UI', Roboto, sans-serif
**Label/Mono Font:** ui-monospace, Consolas, monospace

**Character:** Cinzel's engraved-Roman-capital letterforms carry every heading, button label, and the loading status line as an "engraved-on-the-table" display voice; the system sans stays invisible underneath for anything a player reads quickly (body copy, balance figures via mono, hint text).

### Hierarchy
- **Display** (500, 56px / 36px at ≤1024px, letter-spacing -1.68px): page-level `h1`, Cinzel.
- **Headline** (500, 24px / 20px at ≤1024px, letter-spacing -0.24px): section `h2` (How to Play, Settings, game-over card), Cinzel.
- **Label (button/action)** (700, 15px, letter-spacing 0.06em, uppercase): menu actions and skip/deal buttons, Cinzel.
- **Body** (400, 18px/145%, letter-spacing 0.18px, 16px at ≤1024px): running prose, system sans.
- **Data label** (600, 11–14px, mono): balances, chip denominations, payout-table figures - `var(--mono)`, always tabular where numeric.
- **Emphasis** (700, 20–22px, system sans): the result-overlay winner banner and HUD balance amount - the one place body-family text gets headline-scale weight without switching to Cinzel (a live number, not a heading).
- **UI/Chrome** (11–16px, system sans, 400–700 weight): the workhorse tier below Body for everything that isn't running prose or a Cinzel heading - hint captions, toggle labels, form labels, bet-spot odds text, board-action buttons. Steps in active use: 11, 12, 13, 16px.
- **Micro** (6–10.5px, system sans): reserved strictly for the tightest HUD sub-elements where even the 11px UI floor doesn't fit - side-bet-spot labels/hints inside a 68px-wide circle, the tie-slash mark, the side-bet-toggle caption. Do not use outside those specific cramped contexts.

### Named Rules
**The Cinzel-Is-Ceremony Rule.** Cinzel is reserved for headings, button/action labels, and the loading status line - never for body copy or data figures; those stay in system-ui or mono so the display face keeps its weight.

## Layout

Every screen is a full-bleed `100svh` viewport (`svh`, not `dvh`, so the layout holds steady while mobile browser chrome shows/hides) with no centered document column and no side margins at any width - `#root` is a flex column that never scrolls as a page. HUD-bearing screens (the table, Menu backdrop) layer controls as absolutely-positioned overlays on top of a full-bleed background rather than reflowing into a stacked document at narrow widths; only internal HUD element sizes and the betting board's grid adapt at 900px/720px/560px breakpoints. Settings and the result/game-over cards are the exception: bounded to `max-width: 640px`/`360px` and centered, since they're deliberately document-like surfaces rather than table overlays.

## Elevation & Depth

Depth is conveyed through translucent glass layering (backdrop-filter blur + low-opacity dark fills) and gold-glow rings, not literal drop shadows on flat cards. Ambient shadows exist only as soft diffusion under raised, physically-implied elements (buttons, chips, the frosted HUD bars), always dark and low-contrast rather than hard-edged.

### Shadow Vocabulary
- **Ambient card** (`--shadow`: `rgba(0,0,0,0.5) 0 10px 25px -5px, rgba(0,0,0,0.35) 0 8px 10px -6px`): result overlay, game-over card, chips.
- **HUD glass lift** (`0 2px 10px rgba(0,0,0,0.35)`): menu buttons, how-to-play panel, roadmap panel, betting board.
- **Gold focus ring** (`0 0 0 3px rgba(214,162,43,0.18–0.28)`): hover state on menu buttons and bet spots, layered on top of the ambient shadow rather than replacing it.

### Named Rules
**The Glass-Over-Glow Rule.** HUD chrome (topbar, bottom dock, menu buttons, roadmap panel) is always `backdrop-filter: blur(...)` over a translucent dark fill, never an opaque card, so the felt/glow behind it stays visible.

## Shapes

Two silhouettes carry the whole system: **pill** (999px radius) for every button and toggle, and **circle/oval** for every betting spot, chip, and the loading chip disc. Document-style containers (How to Play, Settings cards, result overlay, game-over card, roadmap panel) use a softer rectangular radius instead, from a small `xs`(4px, inline `<code>`)/`sm`(8px)/`md`(10px)/`circle-badge`(12px, the big-road mark and tie-slash badge)/`lg`(14px)/`xl`(16px) scale. The betting board itself is the one deliberately asymmetric shape - flat bottom, rounded top only (`18px 18px 0 0`, the `dock-top` token), since it's a dock fused to the viewport edge, not a floating card. Borders are consistently a thin (1–2px) gold-tinted line at 35–55% opacity; there is no heavy black outline or hard-offset shadow anywhere in the system.

## Components

### Buttons
- **Shape:** pill (999px radius), consistent across menu actions, skip button, camera switch, chip-selected outline.
- **Primary:** gold gradient fill (`linear-gradient(135deg, #e8be5a, #a1730f)`), `#1a1305` text, 15px/22px padding, Cinzel label text - used once per screen (Play, Deal).
- **Ghost/secondary:** translucent dark fill (`rgba(10,12,16,0.55)`) with a 1.5px gold-tinted border (`rgba(214,162,43,0.45)`), cream text - Settings/How-to-Play menu actions, camera switch, board actions.
- **Hover/Focus:** border brightens to `#e8be5a` and a soft gold ring (`0 0 0 3px rgba(214,162,43,0.18-0.28)`) appears alongside the ambient shadow; `:active` scales to 0.97-0.98. Global `:focus-visible` gets a 2px solid gold outline with 2px offset on every interactive element.

### Chips (bet-board denominations)
- **Style:** 36px circular discs, dashed white border, denomination-specific fill (grey/red/green/black/purple/gold-gradient/navy-gradient/black-gold per value) - a literal casino chip-rack vocabulary, not a generic tag chip.
- **State:** selected chip gets a gold outline ring (`outline-color: var(--accent)`); hover lifts 2px.

### Cards / Containers
- **Corner Style:** 10-16px radius (How to Play, ruleset cards, result overlay, game-over card, roadmap panel).
- **Background:** translucent dark glass (`rgba(6,8,14,0.72)`) with blur, or the flat panel-ink `--bg` for the more document-like Settings/result/game-over surfaces.
- **Shadow Strategy:** see Elevation & Depth - ambient card shadow, no hard offset.
- **Border:** 1px gold-tinted (`var(--border)` / `rgba(214,162,43,0.35)`).
- **Internal Padding:** 14-32px depending on card weight (ruleset card 14/16px, game-over card 32/28px).

### Inputs / Fields
- **Style:** 2px solid `var(--border)` gold-tinted stroke, `var(--code-bg)` fill, 8px radius, mono numerals (balance input, radio accent-color gold).
- **Focus:** border shifts to solid `var(--accent)`, no glow/box-shadow added.

### Navigation
- **Style:** the top bar is a translucent dark-to-transparent gradient strip (`linear-gradient(to bottom, rgba(4,5,9,0.82)…transparent)`) holding a text-only back link and mute toggle; hover on both shifts text to gold. No icon-only nav items; every control carries a text label.

### The Betting Board (signature component)
The table's core interaction surface: a glass HUD bar docked to the viewport bottom, its rounded-top-only shape fusing it to the screen edge. Bet spots inside it are circular/oval, filled with the same felt-green-to-navy radial gradient as the 3D felt itself (not a flat color), rimmed in gold, with a gold-gradient pill badge overlapping the bottom edge to show a staged wager - the one place a HUD element deliberately breaks its own container bounds, because it's standing in for a physical stacked chip.

## Do's and Don'ts

### Do:
- **Do** keep every screen full-bleed `100svh` with no side margins or centered document column - this is a game stage, not a docs site (`#root` rule in `src/index.css`).
- **Do** treat gold (`#d6a22b`/`#e8be5a`) as the single accent reserved for interactive/actionable elements - never as a decorative fill on inert text or backgrounds.
- **Do** use Cinzel only for headings, button/action labels, and the loading status line; everything else stays in system-ui or mono.
- **Do** build bet spots and chips from the felt-green-to-navy radial gradient and dashed/solid gold rim vocabulary already established in `.bet-spot`/`.chip`, not a literal red-felt casino cliché.
- **Do** back real, byte-tracked loading progress (`EngineLoadingScreen`'s `known`/`percent` split) with an honest indeterminate sweep when the total is unknown - never fabricate a percentage.

### Don't:
- **Don't** introduce a light theme or a `prefers-color-scheme` branch anywhere - dark is permanent by product decision, not a default awaiting a toggle.
- **Don't** give a HUD chrome element (topbar, bottom dock, menu button, roadmap panel) an opaque fill - it must stay translucent-blurred glass so the felt/glow reads through.
- **Don't** add a hard, offset drop shadow (e.g. a flat black `4px 4px 0` neobrutalist-style shadow) to any card or button - this world's depth language is ambient diffusion and gold glow rings only.
- **Don't** reflow a HUD-bearing screen (table, Menu) into a stacked document layout at narrow widths - only internal HUD sizes and the betting-board grid may adapt.
