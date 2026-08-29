import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { CAST } from '../scenarios/cast.ts'
import { CAST_IDS, COLOR_TOKENS, GROUND } from './arena.ts'
import { contrast, deltaE76, deltaE76Cvd } from './color.ts'

/**
 * Arena Board token gates (T4) — rerun on every `npm test`, so a palette
 * change that breaks colorblind safety or WCAG AA fails the build.
 *
 * Method: WCAG 2.x relative-luminance contrast; dichromacy simulated per
 * Viénot, Brettel & Mollon (1999) at severity 1.0 (HPE LMS), then pairwise
 * CIE76 deltas among the perceived colors.
 */

const css = readFileSync(fileURLToPath(new URL('../index.css', import.meta.url)), 'utf8')

const cssTokens: Record<string, string> = {}
for (const m of css.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)) {
  cssTokens[m[1]] = m[2]
}

const inks = CAST_IDS.map((id) => ({ id, hex: COLOR_TOKENS[id] }))
// T9: ground-950 joined the gate — the page backdrop carries real text of its
// own (token-field labels, the blocked-reason line, editor footnotes), and
// disabled controls bed on ground-600 (below).
const boardSurfaces = [
  ['ground-950', GROUND[950]], // page backdrop (T9: courtside labels, blocked reason)
  ['ground-900', GROUND[900]], // arena floor — board
  ['ground-800', GROUND[800]], // lane bed
  ['ground-700', GROUND[700]], // raised strip (ribbon / chip beds)
] as const

const pairsOf = <T,>(xs: readonly T[]): [T, T][] =>
  xs.flatMap((a, i) => xs.slice(i + 1).map((b) => [a, b] as [T, T]))

describe('arena theme: CSS/TS sync', () => {
  it('every @theme color token in index.css matches COLOR_TOKENS exactly', () => {
    expect(Object.keys(cssTokens).sort()).toEqual(Object.keys(COLOR_TOKENS).sort())
    for (const [name, hex] of Object.entries(COLOR_TOKENS)) {
      expect(cssTokens[name]?.toLowerCase(), `token --color-${name}`).toBe(hex.toLowerCase())
    }
  })

  it('cast ink keys are exactly the declared cast, in order', () => {
    expect([...CAST_IDS]).toEqual(CAST.map((m) => m.id))
  })

  it('buzzer and strike channels are distinct from every cast ink', () => {
    for (const { hex } of inks) {
      expect(hex).not.toBe(COLOR_TOKENS.buzzer)
      expect(hex).not.toBe(COLOR_TOKENS.strike)
    }
  })
})

describe('arena theme: WCAG AA contrast on the ground', () => {
  it.each(boardSurfaces)('every cast ink passes 4.5:1 as text on %s (body-size safe)', (name, surface) => {
    for (const { id, hex } of inks) {
      expect(contrast(hex, surface), `${id} on ${name}`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it.each(boardSurfaces)('buzzer amber passes 4.5:1 as text on %s', (name, surface) => {
    expect(contrast(COLOR_TOKENS.buzzer, surface), `buzzer on ${name}`).toBeGreaterThanOrEqual(4.5)
  })

  it.each(boardSurfaces)('text inks pass 4.5:1 on %s', (name, surface) => {
    for (const token of ['ink-bright', 'ink-body', 'ink-mute'] as const) {
      expect(contrast(COLOR_TOKENS[token], surface), `${token} on ${name}`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('cast inks on ground-600 (press/hover) stay above the 3:1 large-mark floor', () => {
    for (const { id, hex } of inks) {
      expect(contrast(hex, GROUND[600]), `${id} on ground-600`).toBeGreaterThanOrEqual(3)
    }
  })

  // T9: the sunken-disabled grammar — a disabled TIP OFF beds muted text on
  // ground-600 (the deepest press surface used for text). Disabled steppers
  // and chips bed ink-mute on ground-800, already covered by the loop above.
  it('ink-mute on ground-600 (disabled primary action) passes 4.5:1', () => {
    expect(contrast(COLOR_TOKENS['ink-mute'], GROUND[600])).toBeGreaterThanOrEqual(4.5)
  })

  it('records the full contrast matrix (evidence for the production log)', () => {
    const rows = [...inks.map(({ id, hex }) => [id, hex] as const), ['buzzer', COLOR_TOKENS.buzzer] as const,
      ['ink-bright', COLOR_TOKENS['ink-bright']] as const, ['ink-body', COLOR_TOKENS['ink-body']] as const,
      ['ink-mute', COLOR_TOKENS['ink-mute']] as const]
    const lines = rows.map(([name, hex]) =>
      `${name.padEnd(10)} ${hex}  ` + boardSurfaces.map(([s, g]) => `${s}:${contrast(hex, g).toFixed(2)}`).join('  '))
    console.log(['WCAG contrast vs ground surfaces —', ...lines].join('\n'))
    expect(true).toBe(true)
  })
})

describe('arena theme: colorblind safety (Viénot 1999 simulation)', () => {
  const MIN_INK_DELTA = { deuteranopia: 22, protanopia: 30 } as const
  const MIN_BUZZER_DELTA = { deuteranopia: 24, protanopia: 30 } as const

  it.each(['deuteranopia', 'protanopia'] as const)(
    'the four cast inks stay pairwise distinct under %s',
    (mode) => {
      let worst = Infinity
      for (const [a, b] of pairsOf(inks)) {
        const d = deltaE76Cvd(a.hex, b.hex, mode)
        worst = Math.min(worst, d)
        expect(d, `${a.id} vs ${b.id} under ${mode}`).toBeGreaterThanOrEqual(MIN_INK_DELTA[mode])
      }
      console.log(`min pairwise dE76 among cast inks under ${mode}: ${worst.toFixed(1)}`)
    },
  )

  it.each(['deuteranopia', 'protanopia'] as const)(
    'the reserved buzzer stays distinct from every cast ink under %s',
    (mode) => {
      for (const { id, hex } of inks) {
        expect(deltaE76Cvd(COLOR_TOKENS.buzzer, hex, mode), `buzzer vs ${id} under ${mode}`).toBeGreaterThanOrEqual(
          MIN_BUZZER_DELTA[mode],
        )
      }
    },
  )

  it('records the CVD delta matrices (evidence for the production log)', () => {
    const channels = [...inks.map(({ id, hex }) => [id, hex] as const), ['buzzer', COLOR_TOKENS.buzzer] as const]
    for (const mode of ['deuteranopia', 'protanopia'] as const) {
      const lines = pairsOf(channels).map(
        ([a, b]) => `  ${a[0].padEnd(6)} vs ${b[0].padEnd(6)} sim dE76 ${deltaE76Cvd(a[1], b[1], mode).toFixed(1)}  (normal ${deltaE76(a[1], b[1]).toFixed(1)})`,
      )
      console.log([`pairwise deltas under ${mode} simulation —`, ...lines].join('\n'))
    }
    expect(true).toBe(true)
  })
})
