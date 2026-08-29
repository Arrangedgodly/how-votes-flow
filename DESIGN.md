---
name: How Votes Flow
description: The election as a live arena game — one board, LED tallies, a ribbon that narrates every count.
colors:
  ground-950: "#06080C"
  ground-900: "#0B0E14"
  ground-800: "#12161F"
  ground-700: "#1A1F2B"
  ground-600: "#232A39"
  ground-500: "#303A4F"
  ground-400: "#47536D"
  ada: "#8AD4F7"
  eli: "#009E73"
  nia: "#E8EC33"
  theo: "#C467AE"
  ink-bright: "#EEF2F8"
  ink-body: "#C7CEDC"
  ink-mute: "#96A0B4"
  buzzer: "#FF6A00"
  strike: "#E9EDF5"
typography:
  led:
    fontFamily: "Doto Variable, Barlow Condensed, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "normal"
    fontFeature: "tnum"
  display:
    fontFamily: "Barlow Condensed, Barlow, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "0.12em"
  body:
    fontFamily: "Barlow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
    fontFeature: "tnum"
  label:
    fontFamily: "Barlow Condensed, Barlow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.14em"
  # The built type ramp — every size step the app renders, with each step's
  # roles in the Hierarchy section below. Roles above carry the register
  # defaults; this scale is the enumerated truth the build is held to.
  scale:
    micro: "11px"
    tag: "12px"
    name: "13px"
    copy: "14px"
    copy-wide: "15px"
    count: "16px"
    chip: "18px"
    marquee: "24px"
    marquee-wide: "30px"
    verdict: "48px"
    tally: "60px"
    tally-wide: "72px"
    tally-max: "96px"
rounded:
  none: "0px"
  token: "3px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  page: "12px / 24px at ≥640px"
components:
  button-primary:
    backgroundColor: "{colors.ink-bright}"
    textColor: "{colors.ground-950}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "8px 20px"
  chip:
    backgroundColor: "{colors.ground-700}"
    textColor: "{colors.ink-body}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
  chip-active:
    backgroundColor: "{colors.ground-600}"
    textColor: "{colors.ink-bright}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
  stepper:
    backgroundColor: "{colors.ground-700}"
    textColor: "{colors.ink-body}"
    rounded: "{rounded.none}"
    size: "2rem"
  input-weight:
    backgroundColor: "{colors.ground-800}"
    textColor: "{colors.ink-bright}"
    typography: "{typography.led}"
    rounded: "{rounded.none}"
    padding: "4px"
    width: "3.5rem"
  panel-board:
    backgroundColor: "{colors.ground-900}"
    rounded: "{rounded.none}"
    padding: "12px / 16px at ≥640px"
  panel-disclosure:
    backgroundColor: "{colors.ground-900}"
    textColor: "{colors.ink-body}"
    rounded: "{rounded.none}"
    padding: "10px 12px"
  transfer-pin:
    # Text color is the RECEIVING candidate's cast ink (set by id) — never a
    # static token, so it carries no textColor ref.
    backgroundColor: "{colors.ground-700}"
    typography: "{typography.led}"
    rounded: "{rounded.none}"
    padding: "2px 6px"
---

# Design System: How Votes Flow

## Overview

**Creative North Star: "The Arena Board"**

The election is a live game on one board. A near-black arena ground carries four team lanes with huge lamp-lit tallies, a physical majority line drawn at 51, a ribbon caption strip that narrates every change, and the 100 ballots massed courtside as physical tokens. There is no explainer chrome, no Sankey diagram, no setup wizard: the board is edited by hand (one board, two grips), the count is performed on it, and the strike — one bold diagonal — kills an eliminated lane. Every number on the page is a scoreboard digit; every sentence the board speaks runs through the ribbon.

The system is dark because the subject is a scoreboard at night, not because dark mode was chosen by category. Every surface is a step of a single cool near-black ramp (ground 950 → 400); text inks are tinted from the ground hue and never gray. The four candidate inks are Okabe-Ito-derived and pairwise distinct under deuteranopia and protanopia (gated by test at every run); a candidate is the same ink everywhere — lane, chips, streams, verdict. Buzzer amber is a reserved channel: the majority line, the buzzer mark, and exactly two elements on a changed verdict. Nothing else may spend it.

Depth is tonal, not shadowed: panels are flat fields separated by hairline rules and one inset top light (`lane-rule`, `strip-surface`), and drop shadows exist only on objects that physically float above the floor — the strike bar and the glossary tooltip's definition panel. Corners are square — the court is a floor plan — with exactly two exceptions: 3px on the finger-scale vote tokens and full pills on chip controls.

**Key Characteristics:**
- One near-black ground ramp; no surface outside it; text tinted from its hue
- One ink per candidate, colorblind-safe, everywhere that candidate appears
- LED dot-matrix numerals (Doto) for every count; signage grotesque (Barlow / Barlow Condensed) for every word
- Buzzer amber reserved for threshold moments; ink everywhere else
- The ribbon narrates; the strike decides; the tokens mass in chunks of five

## Colors

One cool ground ramp plus four cast inks, three text inks, and two reserved channels — sixteen tokens total, mirrored between `src/theme/arena.ts` and the Tailwind `@theme` block and enforced equal (with WCAG + CVD gates) by test.

### Primary
- **Buzzer Amber** (#FF6A00): the reserved threshold channel — the majority line at 51, the buzzer mark on the winner, and the two-element amber treatment on a changed verdict (headline chip + winning tally). Never on confirmed outcomes, never on decoration.

### Secondary
- **Strike White** (#E9EDF5): the lights-out diagonal bar that kills an eliminated lane — the only element allowed to cross a lane's powered block.

### Tertiary
- **Ada Sky** (#8AD4F7), **Eli Pitch Green** (#009E73), **Nia Marquee Yellow** (#E8EC33), **Theo Violet** (#C467AE): the four cast inks, one per candidate, Okabe-Ito-derived, tuned for the dark ground. A candidate's ink is set by id (`castInk`) and colors everything of that candidate — lane rail and tag, token chips, transfer streams, verdict side.

### Neutral
- **Ground 950** (#06080C): page backdrop, the dark under the stands.
- **Ground 900** (#0B0E14): arena floor — the board surface and disclosure panels.
- **Ground 800** (#12161F): lane bed — inputs and sunken disabled controls.
- **Ground 700** (#1A1F2B): raised strip — ribbon, chip beds, steppers.
- **Ground 600** (#232A39): press / hover state; disabled primary's sunken bed.
- **Ground 500** (#303A4F): the rule — hairline borders and dividers.
- **Ground 400** (#47536D): brightest line — hover borders.
- **Ink Bright** (#EEF2F8): headings, tallies, focus ring, selection.
- **Ink Body** (#C7CEDC): ribbon narration and body copy.
- **Ink Mute** (#96A0B4): secondary labels, captions, struck-lane captions — still AA at body size on 950/900.

### Named Rules
**The Buzzer Reservation Rule.** Amber appears only where a threshold is crossed: the majority line, the buzzer mark, and the changed verdict's two marks. If amber shows up anywhere else, the reveal is broken.
**The One Ink Per Candidate Rule.** Each candidate has exactly one ink keyed to their id, used in every surface they touch. Never recolor a candidate by state, mood, or chart position.
**The Never Gray Rule.** Text inks are tinted from the ground hue (`#EEF2F8` → `#96A0B4`), never neutral gray; disabled means sunken onto a deeper bed (ground-800 + ink-mute), not faded toward gray.
**The Smallest Poster Rule.** The board's poster at share scale is the favicon — an authored in-world SVG (hand-drawn for this world; no raster asset ships anywhere): the four cast inks in lane order (ada, eli, nia, theo) as a 2×2 quad of square 6px cells on ground-950, 1px gutters, no amber — the reservation holds even off the page. The link card (meta description, og:title, og:description, og:type website) and the browser chrome (theme-color = ground-950) dress from the same tokens.

## Typography

**Display Font:** Barlow Condensed (fallback Barlow)
**Body Font:** Barlow (fallback system sans)
**Label/Mono Font:** Doto Variable — the LED register (not mono as costume: it is the material of scoreboard digits, with true tabular figures)

**Character:** A dot-matrix scoreboard face for every number, a public-signage grotesque for every word — the same DNA as stadium wayfinding and broadcast score bugs. Three registers, one superfamily plus the LED, nothing else loads.

### Hierarchy
The built ramp, small to loud — every step the app renders (enumerated in the frontmatter `typography.scale`): 11 · 12 · 13 · 14 · 15 · 16 · 18 · 24 · 30 · 48 · 60 · 72 · 96px.

- **LED tally** (Doto, weight 900, 60px → 72px at ≥640px → 96px at ≥1024px, line-height 1): the lane tallies; the verdict counts run 48px → 60px. The loudest thing on the page, always with the `led-lit` bloom.
- **Marquee** (Doto, weight 900, 24px → 30px at ≥640px): the h1 page name — the scoreboard's own name, the only LED word on the page.
- **LED chip** (Doto, bold, 12–18px): the ribbon's round label (R1, FINAL, 18px), the roster's weight inputs and 100-sum readout (18px), the majority line's threshold numeral (16px), courtside counts, story tags, and transfer pins (14px), the playback beat chip (12px).
- **Display heading** (Barlow Condensed, semibold, uppercase, 12px, tracking 0.18em, ink-mute): section labels — "Courtside", "Final verdict", "Lineup".
- **Display name** (Barlow Condensed, semibold, uppercase): verdict-side names (18px, cast ink, tracking 0.04em); the lane's cast-ink short tag (14px, tracking 0.16em) over the full name (13px, medium, tracking 0.08em, ink-body).
- **Body** (Barlow, 400, 14px / 15px at ≥640px, leading snug, max-width 75ch): the ribbon narration and the verdict standfirst, which step up together at ≥640px. Story lines, disclosures, roster labels, and the ≥640px subtitle stay at 14px; personas, captions, and the subtitle at phone width run one step down (12px), and the glossary tooltip's definitions run 12px → 13px at ≥640px.
- **Label** (Barlow Condensed, semibold, uppercase): chips, token-row tags, statuses, and out-captions at 12px (tracking 0.12em); the verdict's headline, side, and disclosure labels and the majority-line caption at 11px (tracking 0.14em); the primary action (TIP OFF, Replay) runs the label register large — 14px, tracking 0.14em.

### Named Rules
**The Numbers Are LED Rule.** Every count, tally, sum, and beat label renders in the Doto register with tabular figures (`tally` utility); prose never shows a bare number in Barlow where a tally can carry it.
**The 75ch Ribbon Rule.** Narration and disclosure copy cap at 75ch; captions at 38ch. A score bug states, it does not paragraph.

## Layout

One column, max-width 72rem (max-w-6xl), page padding 12px / 24px at ≥640px. The board dominates the first viewport: marquee (h1 + subtitle, one row) → arena floor (lanes) → ribbon attached beneath the floor → courtside token field → verdict card (done state, directly beneath the board) → controls → preset chips → lineup roster. Lanes flow 2×2 below 1024px and 4-across at ≥1024px (lg), identical elements at every width; the majority line spans each lane's gauge so the row reads as one board. Spacing rhythm: 4px inside controls, 8–12px between siblings, 16–20px between regions; the mobile page never scrolls horizontally (scrollWidth = 390 at 390px, gated).

## Elevation & Depth

Tonal, not shadowed. Depth is a step of the ground ramp (950 page → 900 floor → 800 bed → 700 strip) plus two inset hairlines: `lane-rule` (1px top border in the lane's ink at 62% + a 14% inset top light) and `strip-surface` (block hairlines in ground-500 + a 6% ink inset top light). Two objects physically float over the floor and may drop a shadow: the strike bar (`0 2px 8px rgba(0,0,0,0.55)`), so the cut reads as a physical object, and the glossary tooltip's definition panel (`0 10px 28px rgba(0,0,0,0.5)`), so the floating panel clears the board beneath it.

### Shadow Vocabulary
- **The strike bar** (`box-shadow: 0 2px 8px rgba(0,0,0,0.55)`): on the diagonal that kills a lane.
- **The tooltip float** (`box-shadow: 0 10px 28px rgba(0,0,0,0.5)`): the glossary tooltip's floating definition panel — the one element that hovers above the floor.
- **LED bloom** (`text-shadow: 0 0 0.55em color-mix(in oklab, currentColor 42%, transparent)`): emitted light on tally digits, not a panel shadow.

### Named Rules
**The Flat Floor Rule.** Floor panels cast no shadows; a surface's height is its ground step. Only objects that physically float above the floor drop one: the strike and the glossary tooltip. If a card needs a shadow to separate, its ground step is wrong.

## Shapes

Square corners (0) for every panel, lane, input, stepper, and strip — the court is a floor plan. Exactly two exceptions, both at finger scale: vote tokens take 3px and chip controls are full pills. There are no card radii between 12–16px anywhere because there are no rounded cards.

### Named Rules
**The Square Court Rule.** Structure is square; only finger-scale controls may round (tokens 3px, chips pill). A rounded panel is from another world.

## Components

### Buttons
- **Shape:** square (0px radius)
- **Primary (TIP OFF):** ink-bright ground, ground-950 text, display label register, padding 8px 20px; hover lifts 2px (transform, no shadow); disabled sinks to ground-600 with ink-mute text.
- **Hover / Focus:** color steps (ground-700→600 borders) for chips; the global focus ring is 2px solid ink-bright, offset 2px, keyboard-visible only.
- **Steppers:** 2rem square, ground-700 bed, display-font glyph, disabled = sunken bed (ground-800 + ink-mute), never hidden.

### Chips
- **Style:** pill, ground-700 bed, ground-500 border, label register, ink-body text.
- **State:** active = ground-600 bed + ink-bright text + ink-bright border (`aria-pressed`); hover steps border to ground-400 and text to ink-bright. Surprise Me is a die (action), not a toggle.

### Cards / Containers
- **Corner Style:** square (0px)
- **Background:** the verdict card rides the raised strip (`strip-surface`, ground-700); disclosure panels and the roster are bordered ground-900 fields.
- **Shadow Strategy:** none — ground steps + hairline rules (see Elevation).
- **Border:** 1px ground-500 on outer fields; `lane-rule` ink rails on rows.
- **Internal Padding:** 12px, 16px at ≥640px.

### Inputs / Fields
- **Style:** square, ground-800 bed, ground-500 border; weight values render in the LED register, centered, tabular.
- **Focus:** the global 2px ink-bright offset ring.
- **Disabled:** sunken (ground-800 + ink-mute), still legible and still in the tab order's region — self-disabling controls hand focus to a deliberate neighbor (T10).

### The Glossary Tooltip
A term of art in running copy (Term), marked only by a dotted underline in the sentence's own ink and size — the arena's way of saying "ask about this one". Its plain-language definition opens as a small floating panel anchored above the term: ground-800 bed, ground-500 hairline, the tooltip-float soft drop, up to 44ch wide, body register. Accessible by construction: the trigger is a real button (hover/focus opens, Escape and blur close, a tap toggles — touch has no hover), `aria-expanded` + `aria-controls` carry the state, and the panel is a discrete state change, never an animation, so reduced motion changes nothing.

### Navigation
Not applicable — a one-page app. The marquee (h1, LED register) is the page's name; the preset chips are the closest thing to nav and are toggles, not links.

### The Score Lane (signature)
One candidate's lane: an ink rail across the top edge, short tag + full name in the display register (cast ink via `currentColor`), the huge LED tally with bloom and an sr-only " votes" unit, a status slot (buzzer mark / "if we stopped here" chip), and a 0–100 gauge whose only furnishing is the amber majority line at the threshold height. When eliminated: the powered block dims (`lane-out`: saturate 0.2, brightness 0.55), one white diagonal crosses it corner to corner, the gauge empties, and an "OUT · ROUND N" caption appears below the strike while the persona stays lit. The persona line is never clamped and never cut to an ellipsis — the cast's lines are fixed (a single source line of ≤90 characters, gated by test) and wrap in full at every lane width: three lines at phone width (2×2 lanes), two on the ≥1024px 4-across board, over a 2.6em min-height that keeps a row's lanes level while the copy reads whole.

### The Ribbon (signature)
The raised caption strip attached beneath the floor: an LED round chip (R2, FINAL), then the narration — polite live region, 75ch, ink-body. It is the accessibility channel and the narrator in one element; every board change is mirrored here exactly once.

### The Token Field (signature)
Every ballot as a physical token (10px square, 12px at ≥640px, 3px radius) tinted by the ink of the lane it currently counts for, massed in chunks of five with a 3px gap — never 100 loose sprites. Each row states its own LED count and label; exhausted ballots get their own honest muted row.

### The Strike (signature)
One bold diagonal bar (strike white, ~8px, rotated ~51–61° by breakpoint, clipped to the lane), one flash on the cut (420ms, once), the lights-out dim riding with it (360ms). Under reduced motion: instant state swap, ribbon carries the identical story.

### The Transfer Stream (signature)
The struck lane's ballots fly: dashed arcs in each receiving team's ink, drawn between measured lane anchors, with chunk sprites (five token chips — the counting unit) riding one shared clock, so pause freezes them mid-air. Every stream states its number with a pinned count (+N, LED register, 14px, strip-surface bed, receiving ink) that renders only when it has a count to state: it appears with the first chunk's landing and never as a "+0" — until then the arc flies alone — and the pin and the receiving tally tick on the same landings, so they always agree. The pin parks in the receiver's status band (the slot between tally and gauge, free by construction because winners never receive), never on a name, digit, or persona. The whole layer is decorative (aria-hidden): the ribbon narrates the identical numbers, and under reduced motion the layer never renders at all. Exhausted ballots sink from the struck lane under an honest "N stop counting" label that states its number too.

## Do's and Don'ts

### Do:
- **Do** render every count in the Doto LED register with tabular figures (`tally` + `tnum`).
- **Do** set a candidate's color only through their cast ink, by id, in every surface.
- **Do** mirror every board state change in the ribbon text — one announcer, one announcement per change.
- **Do** keep amber for thresholds only; spend it on at most two elements at the verdict.
- **Do** chunk vote tokens in groups of five; each mass states its own number.
- **Do** let the persona read in full at every lane width — it wraps (three lines at phone width, two at ≥1024px) and is never clamped.
- **Do** theme the browser's own surfaces: ink-bright selection and caret, the 2px offset focus ring, dark color-scheme, theme-color on ground-950, and the four-ink favicon at share scale.
- **Do** honor reduced motion two ways: the OS query and the in-app toggle both zero every animation and transition app-wide.

### Don't:
- **Don't** introduce a neutral gray, a shadowed panel, or a rounded card — depth is a ground step, corners are square.
- **Don't** brighten a struck lane; the dim IS the meaning ("out"), with the caption and persona carrying the legible channel.
- **Don't** add a second live region, a kicker/eyebrow label, gradient text, or glyph icons.
- **Don't** let the 100-sum drift: the editor conserved electorate (placed + pool = 100) is visual law — show the sum, gate the primary on it.
- **Don't** load a fourth type family or pull fonts from a CDN; the three registers are self-hosted.
