import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * Accessibility coverage gates (T9) — static source assertions over the
 * cross-cutting contract the hardening pass established. They are deliberately
 * grep-shaped: the behavioral proof (keyboard journey, axe, focus-visible
 * captures) is recorded in the production log; these tests keep the next edit
 * from silently regressing the structure that proof rests on.
 *
 * Covered here:
 *  - focus-visible in the world grammar (one global ring, nothing outline-less)
 *  - reduced motion: OS media query AND the manual-toggle data-motion backstop
 *  - exactly one live region (the ribbon) announcing each state change
 *  - every form control labeled; stateful controls carry their aria state
 *  - landmarks (banner + main) and a single h1; no rogue tabIndex
 */

const read = (path: string): string =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8')

const SOURCES = [
  'App.tsx',
  'components/board/ArenaBoard.tsx',
  'components/board/Ribbon.tsx',
  'components/board/ScoreLane.tsx',
  'components/board/TokenField.tsx',
  'components/editor/LineupEditor.tsx',
  'components/editor/PresetChips.tsx',
  'components/verdict/Term.tsx',
  'components/verdict/VerdictCard.tsx',
  'playback/Controls.tsx',
  'playback/TransferLayer.tsx',
] as const

const sourceOf = new Map(SOURCES.map((file) => [file, read(file)]))

/** Every opening tag `tag` in a source, as full attribute strings. */
function openingTags(source: string, tag: string): string[] {
  return [...source.matchAll(new RegExp(`<${tag}\\b([^>]*)>`, 'g'))].map((m) => m[1])
}

describe('a11y gates: focus-visible in the world grammar', () => {
  it('the base layer draws one keyboard focus ring from the world ink', () => {
    const css = read('index.css')
    expect(css).toContain(':focus-visible')
    expect(css).toMatch(/:focus-visible\s*{[^}]*outline:\s*2px solid var\(--color-ink-bright\)/)
    expect(css).toMatch(/:focus-visible\s*{[^}]*outline-offset:\s*2px/)
  })

  it('no source or utility removes the outline', () => {
    const all = [...sourceOf.values()].join('\n') + read('index.css')
    expect(all).not.toMatch(/outline-(none|hidden)/)
    expect(all).not.toMatch(/outline:\s*(none|0)\b/)
  })

  it('focus is never re-ordered or programmatically painted at boot', () => {
    const all = [...sourceOf.values()].join('\n')
    expect(all).not.toContain('tabIndex')
    expect(all).not.toContain('autoFocus')
    // The only programmatic focus calls are interaction-gated (autoplay and
    // capture boots never paint a ring):
    //   1. the phase-swap continuity in Controls (gated by interactedRef),
    //   2–3. the T10 self-disable seats in the lineup editor — a control that
    //        disables itself on success (Spread, Add, Remove, a floor/ceiling
    //        stepper) natively drops focus to <body>; the seat is staked only
    //        inside click handlers.
    expect(all.match(/\.focus\(\)/g) ?? []).toHaveLength(3)
    expect(read('playback/Controls.tsx')).toContain('interactedRef.current')
    const editor = read('components/editor/LineupEditor.tsx')
    expect(editor).toContain('seatAfterEdit.current?.current?.focus()')
    expect(editor).toContain('const selfDisables = delta < 0 ? weight <= 2 : pool <= 1')
  })
})

describe('a11y gates: reduced motion covers everything, twice', () => {
  const css = read('index.css')

  it('the OS media query is respected app-wide (every animation/transition zeroed)', () => {
    const media = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'))
    expect(media).toContain('animation-duration: 0.01ms !important')
    expect(media).toContain('animation-iteration-count: 1 !important')
    expect(media).toContain('transition-duration: 0.01ms !important')
  })

  it('the manual toggle reaches the same CSS via [data-motion="reduced"]', () => {
    const attr = css.slice(css.indexOf("[data-motion='reduced']"))
    expect(attr).toContain('animation-duration: 0.01ms !important')
    expect(attr).toContain('transition-duration: 0.01ms !important')
  })

  it('App mirrors the RESOLVED preference (system or manual) onto the tree', () => {
    const app = read('App.tsx')
    expect(app).toContain("data-motion={playback.reduced ? 'reduced' : 'full'}")
  })

  it('every authored motion device in the CSS has a JS gate (no ungated keyframes)', () => {
    // The three authored keyframe devices (strike, buzzer, stream) are applied
    // only through playback props that are false under reduced motion.
    const usePlayback = read('playback/usePlayback.ts')
    for (const gate of ['flash: step?.kind', 'pulse: step?.kind', 'animate: !reduced']) {
      expect(usePlayback).toContain(gate)
    }
    const overlay = usePlayback.slice(
      usePlayback.indexOf('const overlay'),
      usePlayback.indexOf('const ribbon'),
    )
    expect(overlay).toContain('!reduced')
  })
})

describe('a11y gates: one live region, one announcement per state change', () => {
  it('the ribbon is the app’s only announcer (role=status, polite)', () => {
    const all = [...sourceOf.values()].join('\n')
    expect(all.match(/aria-live/g) ?? []).toHaveLength(1)
    const ribbon = read('components/board/Ribbon.tsx')
    expect(ribbon).toContain('role="status"')
    expect(ribbon).toContain('aria-live="polite"')
  })

  it('the decorative beat indicator does not double-announce the ribbon', () => {
    expect(read('playback/Controls.tsx')).toMatch(/aria-hidden="true"[^>]*>\s*\{beatLabel\}/)
  })
})

describe('a11y gates: every control labeled, every state spoken', () => {
  it('every <select> and <input> opens with an accessible name', () => {
    for (const [file, source] of sourceOf) {
      for (const tag of ['select', 'input']) {
        for (const attrs of openingTags(source, tag)) {
          expect(attrs, `${file}: <${tag} ${attrs}>"`).toMatch(/aria-label=/)
        }
      }
    }
  })

  it('icon-only steppers name their action', () => {
    const editor = read('components/editor/LineupEditor.tsx')
    expect(editor).toContain('aria-label={`Return one vote from ${blocLabel} to the unplaced pool`}')
    expect(editor).toContain('aria-label={`Place one of the unplaced votes on ${blocLabel}`}')
    expect(editor).toContain('aria-label={`Remove ${bloc.label}`}')
  })

  it('the pause/resume button names its current action', () => {
    const controls = read('playback/Controls.tsx')
    expect(controls).toContain("aria-label={state.paused ? 'Resume the count' : 'Pause the count'}")
  })

  it('toggle-style chips carry their pressed state', () => {
    expect(read('components/editor/PresetChips.tsx')).toContain('aria-pressed={active}')
    expect(read('playback/Controls.tsx')).toContain('aria-pressed={reduced}')
  })

  it('the tooltip states its expansion and always controls a real node', () => {
    const term = read('components/verdict/Term.tsx')
    expect(term).toContain('aria-expanded={open}')
    expect(term).toContain('aria-controls={panelId}')
    expect(term).toContain('role="tooltip"')
    expect(term).toContain('hidden={!open}')
    // Keyboard activation must not close what focus opened (Enter on a
    // focus-opened panel would toggle it shut); only pointer clicks toggle.
    expect(term).toContain('if (event.detail > 0) setOpen((value) => !value)')
  })

  it('tallies speak their unit as content, not paragraph aria-labels (prohibited naming)', () => {
    const lane = read('components/board/ScoreLane.tsx')
    expect(lane).not.toContain('aria-label')
    expect(lane).toMatch(/sr-only">\{votes === 1 \? ' vote' : ' votes'\}/)
    expect(read('components/verdict/VerdictCard.tsx')).toMatch(
      /sr-only">\{side\.votes === 1 \? ' vote' : ' votes'\}/,
    )
  })
})

describe('a11y gates: landmarks and heading structure', () => {
  it('the marquee is a banner outside <main>; one h1 in the app', () => {
    const app = read('App.tsx')
    expect(app.indexOf('<header')).toBeLessThan(app.indexOf('<main'))
    expect(app).toContain('</header>')
    const all = [...sourceOf.values()].join('\n')
    expect(all.match(/<h1\b/g) ?? []).toHaveLength(1)
  })

  it('the document declares its language and title', () => {
    const html = read('../index.html')
    expect(html).toMatch(/<html lang="en">/)
    expect(html).toMatch(/<title>How Votes Flow/)
  })
})
