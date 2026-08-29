/**
 * Arena Board — the world as data (T4).
 *
 * Single TypeScript source of truth for the raw palette mirrored into the
 * Tailwind v4 `@theme` block in `src/index.css` (CSS-first config; there is
 * deliberately no tailwind.config.js). `arena.test.ts` enforces that the two
 * never drift, and re-runs the WCAG + colorblind-safety gates that validated
 * the palette on every `npm test`.
 *
 * Type register (subject-appropriate, self-hosted via @fontsource in
 * `src/main.tsx` — no CDN at runtime, works offline once loaded):
 *
 * - `Doto` (variable, wght axis) — the LED tally numerals and the marquee
 *   title. A dot-matrix face: the material of an actual arena scoreboard
 *   digit. Not a training-data default; chosen because the tallies must read
 *   as LED board digits, and dot-matrix IS that register. The alternatives
 *   considered and rejected: 7-segment faces (DSEG — not on npm/fontsource,
 *   unmaintained upstream), pixel-CRT faces (Silkscreen, Press Start 2P —
 *   game-console pixels, a different world), and condensed grotesques
 *   (Oswald/Anton/Bebas — broadcast-caption voices, not lamp-lit digits).
 * - `Barlow` + `Barlow Condensed` — body/ribbon and lane tags. A public-
 *   signage grotesque family (drawn from California road-sign and license-
 *   plate lettering) — the same utilitarian condensed DNA as stadium
 *   wayfinding and broadcast score bugs, with true tabular figures
 *   (`tnum`) for counts. Not from the default list (Inter/Roboto/Poppins/
 *   Montserrat/Oswald/Bebas); picked as one superfamily covering both text
 *   roles so nothing else needs to load.
 */

/** Cast ids in declaration order — the vocabulary of every ranking. */
export const CAST_IDS = ['ada', 'eli', 'nia', 'theo'] as const
export type CastId = (typeof CAST_IDS)[number]

/** Register name of each cast ink (display copy; the hue, not the data). */
export const INK_HUES: Readonly<Record<CastId, string>> = {
  ada: 'sky',
  eli: 'pitch green',
  nia: 'marquee yellow',
  theo: 'violet',
}

/**
 * Raw color tokens, keyed exactly as the CSS custom properties appear in
 * `@theme` minus the `--color-` prefix. Hex case-insensitive vs the CSS.
 */
export const COLOR_TOKENS: Readonly<Record<string, string>> = {
  // the arena ground — one cool near-black ramp
  'ground-950': '#06080C', // page backdrop
  'ground-900': '#0B0E14', // arena floor / board surface
  'ground-800': '#12161F', // lane bed
  'ground-700': '#1A1F2B', // raised strip — ribbon, chip beds
  'ground-600': '#232A39', // press / hover
  'ground-500': '#303A4F', // rule
  'ground-400': '#47536D', // brightest line
  // cast inks — Okabe-Ito-derived, one per candidate
  ada: '#8AD4F7', // sky — O-I sky blue, lightened
  eli: '#009E73', // pitch — O-I bluish green, as published
  nia: '#E8EC33', // marquee — O-I yellow, nudged greener
  theo: '#C467AE', // violet — O-I reddish purple, deepened
  // text inks — tinted from the ground hue, never gray
  'ink-bright': '#EEF2F8',
  'ink-body': '#C7CEDC',
  'ink-mute': '#96A0B4',
  // reserved channels
  buzzer: '#FF6A00', // threshold/majority moments ONLY
  strike: '#E9EDF5', // the lights-out slash on an eliminated lane
}

/** The arena ground ramp, 950 (page) → 400 (brightest line). */
export const GROUND = {
  950: COLOR_TOKENS['ground-950'],
  900: COLOR_TOKENS['ground-900'],
  800: COLOR_TOKENS['ground-800'],
  700: COLOR_TOKENS['ground-700'],
  600: COLOR_TOKENS['ground-600'],
  500: COLOR_TOKENS['ground-500'],
  400: COLOR_TOKENS['ground-400'],
} as const

/** Ink hex for a cast id — the one color a candidate is rendered in, everywhere. */
export function castInk(id: CastId): string {
  return COLOR_TOKENS[id]
}

/**
 * Font register names for canvas/SVG contexts (T6 transfer streams) where a
 * CSS class cannot reach. In JSX use the Tailwind tokens: font-led /
 * font-display / font-body.
 */
export const FONT_FAMILIES = {
  led: 'Doto Variable',
  display: 'Barlow Condensed',
  body: 'Barlow',
} as const
