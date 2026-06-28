---
name: Moggle (Boggle.WEB)
description: An intellectual-play word game with a tournament-table soul — baize green, brass gold, letterpressed tiles.
colors:
  baize-green: "#1A3C34"
  baize-deep: "#111F1C"
  brass-gold: "#D4AF37"
  brass-gold-dark: "#C5A028"
  parchment: "#F9F7F1"
  parchment-raised: "#FFFFFF"
  parchment-sunk: "#F0EEE6"
  cream-divider: "#E6E4DD"
  soft-black: "#1A1A1A"
  cream-ink: "#EDE8DF"
  muted-ink: "#666666"
  muted-stone: "#8A8A8A"
  felt-green: "#2D6A4F"
  oxblood: "#9B2226"
  graphite-bg: "#1C1915"
  graphite-card: "#221E19"
  graphite-raised: "#2A2520"
  graphite-border: "#2F2A23"
typography:
  display:
    fontFamily: "Fraunces, Georgia, 'Times New Roman', serif"
    fontSize: "clamp(2rem, 4vw, 3.375rem)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.5625rem"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "0.18em"
rounded:
  xs: "4px"
  sm: "8px"
  md: "10px"
  lg: "14px"
  xl: "18px"
  modal: "20px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.brass-gold}"
    textColor: "{colors.baize-deep}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "13px 22px"
  button-primary-hover:
    backgroundColor: "{colors.brass-gold}"
    textColor: "{colors.baize-deep}"
  button-secondary:
    backgroundColor: "{colors.baize-green}"
    textColor: "{colors.cream-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "11px 18px"
  card:
    backgroundColor: "{colors.parchment-raised}"
    textColor: "{colors.soft-black}"
    rounded: "{rounded.lg}"
    padding: "18px"
  tile:
    backgroundColor: "{colors.parchment}"
    textColor: "{colors.soft-black}"
    typography: "{typography.headline}"
    rounded: "{rounded.sm}"
    height: "64px"
    width: "64px"
  tile-active:
    backgroundColor: "{colors.baize-green}"
    textColor: "{colors.parchment}"
    rounded: "{rounded.sm}"
  badge:
    backgroundColor: "{colors.brass-gold}"
    textColor: "{colors.baize-deep}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "2px 6px"
  input-underline:
    backgroundColor: "{colors.parchment-sunk}"
    textColor: "{colors.soft-black}"
    typography: "{typography.body}"
    rounded: "{rounded.xs}"
    padding: "5px 0"
---

# Design System: Moggle (Boggle.WEB)

## 1. Overview

**Creative North Star: "The Tournament Table"**

Moggle is a competitive word game dressed as a club games table. The surface is felt-green baize and warm parchment; the scorekeeping is brass; the letters sit in the grid like worn ivory tiles pressed into the cloth. It is unmistakably a place to *compete* — ranks, timers, daily boards — but it carries that competition with a composed, literary calm rather than arcade noise. The energy lives in the board and the scoreboard; everything around them stays quiet so the play reads first.

The system is built from three materials: **deep Baize Green** (`#1A3C34`) for structure and authority — sidebar, hero, active states; **Brass Gold** (`#D4AF37`) as the single accent that marks what matters — rank, the primary action, the live moment; and **warm Parchment** (`#F9F7F1`) as the table itself, the ground everything rests on. Type does the talking: Fraunces, a literary serif, for every heading, score, and tile letter; Geist Mono for the small brass-labelled scorekeeping (timestamps, ranks, badges). A faint fractal-noise overlay gives the whole surface a paper tooth.

This system explicitly **rejects** generic SaaS dashboards (hero-metric templates, endless identical icon-card grids), loud gamified "casual game" aesthetics (Candy-Crush juice, confetti, cartoon mascots), and cluttered ad-heavy puzzle portals. Distinctiveness must come from the board, the type, and the letterpress materiality — never from decorative gloss or from the warm background alone.

**Key Characteristics:**
- Baize green + brass gold + parchment — a three-material "games table" palette.
- Fraunces serif carries the identity from hero headline down to the individual tile letter.
- Brass gold is rationed: it signals, it never decorates.
- Tiles are letterpressed — a hard offset shadow makes them feel physically set into the board.
- The board and the scoreboard are the heroes; chrome recedes to baize and parchment.

## 2. Colors

A warm three-material palette — felt-green baize, brass, and parchment — with a deep "aged library" dark mode that keeps the cream board as the brightest object in the room.

### Primary
- **Baize Green** (`#1A3C34`): The structural authority color. Sidebar accents, the daily-challenge hero gradient, active nav indicators, primary scores, secondary buttons. The felt of the table.
- **Baize Deep** (`#111F1C`): The darkest green, used for the full-height navigation sidebar and top header — a near-black green that frames the parchment play area.

### Secondary
- **Brass Gold** (`#D4AF37`, dark-mode `#C5A028`): The single accent. Primary CTAs, rank markers, the "you" highlight, live/active dots, the daily-hero hairline. Treated as precious — see The Brass Rule.

### Tertiary
- **Felt Green** (`#2D6A4F`): Success and "online" status — a lighter felt than the structural baize.
- **Oxblood** (`#9B2226`): Errors, the "Blitz" fast mode, and unread-mail counts. The one hot color, used sparingly.

### Neutral
- **Parchment** (`#F9F7F1`): The body background and the resting tile face — the table surface.
- **Parchment Raised** (`#FFFFFF`): Cards and panels that sit above the table.
- **Parchment Sunk** (`#F0EEE6`): Recessed wells — empty tiles, inset fields.
- **Cream Divider** (`#E6E4DD`): Borders, hairlines, dividers throughout the light theme.
- **Soft Black** (`#1A1A1A`): Primary text on parchment.
- **Cream Ink** (`#EDE8DF`): Primary text on baize/graphite (reversed-out type).
- **Muted Ink** (`#666666`) / **Muted Stone** (`#8A8A8A`): Secondary and tertiary text. *Use the darker `#666666` for any text that must meet AA on parchment; `#8A8A8A` is for large/decorative labels only.*
- **Graphite ramp** (dark mode): `#1C1915` ground → `#221E19` card → `#2A2520` raised, bordered by `#2F2A23`. A warm "aged library at midnight" charcoal, not a neutral gray.

### Named Rules
**The Brass Rule.** Brass Gold signals, it never decorates. It is reserved for rank, the single primary action on a screen, the active/live state, and achievement. If gold is doing decoration — a hairline for prettiness, a kicker for rhythm — it is wrong. Its rarity is what makes a gold element mean "this is the thing."

**The Baize-Frames-Parchment Rule.** Navigation and chrome are deep green; the play and content area is parchment. The green frames, the parchment holds. Never invert this (no green content wells on a parchment chrome).

## 3. Typography

**Display Font:** Fraunces (with Georgia, Times New Roman, serif)
**Body Font:** Geist (with system-ui, sans-serif)
**Label/Mono Font:** Geist Mono (with ui-monospace, monospace)

**Character:** A literary serif paired against a clean modern sans and a technical mono — contrast on the serif/sans axis, not similarity. Fraunces brings the bookish, composed authority ("Intellectual Play"); Geist keeps interface text neutral and legible; Geist Mono is the brass scorekeeping voice — small, tracked, uppercase, used for the things you *count*.

### Hierarchy
- **Display** (Fraunces 700, `clamp(2rem, 4vw, 3.375rem)`, line-height 1, `-0.04em`): The big number — final scores, the 54px daily score, hero stat figures. Where the game shouts.
- **Headline** (Fraunces 600, `1.75rem`/28px, line-height 1.15, `-0.02em`): Hero titles ("Today's Moggle Board"), the Leaderboard page H1, tile letters.
- **Title** (Fraunces 600, `1.125rem`/18px, `-0.01em`): Section headers ("Game Modes", "Recent Games"), card titles.
- **Body** (Geist 400–500, `0.8125rem`/13px, line-height 1.5): Descriptions, prose, list rows. Cap measure at 65–75ch.
- **Label** (Geist Mono 600–700, `0.5625rem`–`0.625rem`/9–10px, `0.15em`–`0.2em`, UPPERCASE): Eyebrows, badges, stat captions, ranks, timestamps, nav section labels — the brass scorekeeping voice.

### Named Rules
**The Mono-Counts-Things Rule.** Geist Mono is for values you count or track: scores, ranks, times, dates, counts, badges. It is never used for reading prose or for headings. If mono is set in a sentence, it's wrong.

**The Fraunces-Everywhere-It-Leads Rule.** Every heading, every score, and every tile letter is Fraunces. The serif is the through-line from the page title down to the single ivory tile — it is the brand, not a decoration.

## 4. Elevation

Tactile and letterpressed. Depth in this system is *physical*, not floaty — surfaces feel printed and set rather than hovering in space. The signature is the tile: a hard, un-blurred offset shadow (`2px 2px 0`) that reads as a letterpress impression, as if each tile were pressed into the board. Cards and panels add only a whisper of soft ambient shadow to lift them off the parchment. A global fractal-noise overlay (`mix-blend-multiply`, ~15–40% opacity) gives every surface a faint paper tooth. In dark mode, shadow gives way to tonal layering (ground → card → raised).

### Shadow Vocabulary
- **Letterpress** (`box-shadow: 2px 2px 0 0 rgba(26,60,52,0.1), inset 0 -2px 0 rgba(0,0,0,0.05)`): Tiles at rest. The hard offset + inner bottom-lip is the signature — never blur it.
- **Card-soft** (`box-shadow: 0 1px 3px rgba(26,25,21,0.04)`): Resting cards and panels. Barely there.
- **Card-hover** (`box-shadow: 0 4px 16px -4px rgba(26,25,21,0.12)`): Interactive cards on hover, paired with a `-2px` translate.
- **Hero-lift** (`box-shadow: 0 8px 32px -4px rgba(26,25,21,0.18)`): The daily-challenge hero and modals — the one place real depth is allowed.
- **Active-tile** (`box-shadow: 0 4px 14px -2px rgba(26,60,52,0.5)`): A selected/lit tile — the only shadow that uses green light.

### Named Rules
**The Never-Blur-the-Press Rule.** The tile's offset shadow is hard-edged (`0` blur) on purpose — it's a print impression, not a drop shadow. Adding blur turns the games table into a generic 2014 card UI.

**The Flat-Until-It-Matters Rule.** Cards rest nearly flat (`0 1px 3px`). Real elevation is rationed to heroes, modals, and active tiles — the moments that earn it.

## 5. Components

### Buttons
- **Shape:** Softly rounded (10–12px; `{rounded.md}`).
- **Primary:** Brass Gold (`#D4AF37`) fill, Baize-Deep (`#111F1C`) text, bold, `13px 22px` padding. This is the "play" action — one per screen (The Brass Rule).
- **Secondary:** Baize Green (`#1A3C34`) fill, Cream-Ink (`#EDE8DF`) text, `11px 18px`. For "Join", "Create Account", in-hero secondary actions.
- **Ghost:** Transparent / `rgba(255,255,255,0.06)` with a hairline border, on dark chrome.
- **Hover / Focus:** Primary brightens (`brightness-110`) and lifts (`-1px`); secondary darkens to `#142E28`. Active presses to `scale(0.97)`. All transitions ~120–220ms on the standard ease.

### Chips / Badges
- **Style:** Geist Mono, 9–10px, UPPERCASE, tracked `0.1em`, pill or 4–6px radius. Tag tints are role-based: gold for "Ranked/Beta", felt-green for "Free", baize for "Practice".
- **State:** Static labels; the gold-fill badge is reserved for "Beta"/"New"/notification counts.

### Cards / Containers
- **Corner Style:** `{rounded.lg}` (14px); heroes/modals step up to 18–20px.
- **Background:** Parchment-Raised (`#FFFFFF`) on the parchment ground; dark mode `#221E19`.
- **Shadow Strategy:** Card-soft at rest, Card-hover on interactive lift (see Elevation).
- **Border:** Always a Cream-Divider (`#E6E4DD`) hairline — cards are defined by border + tiny shadow, not heavy shadow.
- **Internal Padding:** 16–18px (`{spacing.md}`–18px).

### Inputs / Fields
- **Style:** Underline-first — sunk parchment well (`#F0EEE6` / `rgba(26,25,21,0.04)`), no full box, a single bottom hairline. Quiet and editorial.
- **Focus:** Border shifts toward Baize Green; placeholder is `#B8B4AE`. *Ensure placeholder meets 4.5:1.*
- **Disabled:** `opacity: 0.5`, not-allowed cursor.

### Navigation
- **Style:** Full-height Baize-Deep (`#111F1C`) sidebar, ~230px. Items are Geist 13px on `rgba(237,232,223,0.6)`; section labels are mono uppercase brass-quiet captions.
- **Active state:** A gold (`#D4AF37`) left indicator bar (3px) + `bg-white/5` + cream text. Collapsing sub-groups animate open.
- **Mobile treatment:** **Must collapse to an off-canvas drawer below `md`.** The fixed-width sidebar is desktop-only today and is a known defect — see Don'ts.

### Signature Component — The Board & Tile
The 4×4 grid is the hero. Each tile is a Fraunces letter on parchment with the Letterpress shadow; `Q` renders as `Qu`. On selection a tile flips to Baize Green with cream type, scales to `1.08`, and lights with the Active-tile green shadow; an SVG pathfinder line (`#1A3C34`, 4px, 55% opacity) draws the word trail between selected tiles. This letterpress-and-trail behavior is the most distinctive pattern in the product — protect it.

## 6. Do's and Don'ts

### Do:
- **Do** treat Brass Gold as precious — rank, one primary CTA, active/live state, achievement, and nothing else (The Brass Rule).
- **Do** set every heading, score, and tile letter in Fraunces; keep Geist Mono for things you count.
- **Do** keep the tile's offset shadow hard-edged (`2px 2px 0`, zero blur) — it's a letterpress impression.
- **Do** frame with deep green chrome and hold content on parchment; never invert.
- **Do** define cards with a Cream-Divider hairline + a whisper of shadow, not a heavy drop shadow.
- **Do** use the darker muted ink (`#666666`) for any body/secondary text that must pass AA on parchment, and verify dark-mode muted text hits 4.5:1 on its surface.
- **Do** let the board, the type, and the letterpress materiality carry the brand.

### Don't:
- **Don't** ship the hero-metric template (big number, small label, gradient accent) or endless identical icon-card grids — these are the SaaS-cliché anti-references from PRODUCT.md.
- **Don't** add Candy-Crush juice, confetti, or cartoon mascots; the competition is composed, not arcade.
- **Don't** lean the brand on the warm cream background alone — that's the "premium template" read. Warmth is carried by type, board, and brass, not by parchment-by-default.
- **Don't** use `border-left`/`border-right` greater than 1px as a colored stripe on cards or list rows (the current Leaderboard "you" row violates this — use a full background tint instead).
- **Don't** blur the tile press shadow into a generic soft card shadow — that turns the games table into a 2014 app.
- **Don't** spend gold on decoration (kickers, hairlines for rhythm). If removing it loses no meaning, it shouldn't be gold.
- **Don't** rely on color alone for status (online dots, win/loss) — pair with an icon or label.
- **Don't** render the fixed-width desktop sidebar on phones; it must become an off-canvas drawer below `md`.
