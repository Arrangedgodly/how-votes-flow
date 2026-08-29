import type { Scenario } from '../../scenarios/index.ts'
import { blankCustomScenario, PRESETS } from '../../scenarios/index.ts'

/**
 * The starting-lineup chips (T7): the four authored recipes plus Custom,
 * rendered as pressed-state toggles, and Surprise Me — a die, not a radio:
 * every click rolls a fresh field, even when a surprise is already loaded.
 *
 * Picking a chip loads a CLONE onto the board (authored data never mutates)
 * and re-primes it at round 1 — from the verdict state too, which is the
 * instant-rerun path.
 */

interface PresetChipsProps {
  /** The working scenario's id — marks the chip whose field is loaded. */
  activeId: string
  /** Load a starting point (preset or the Custom blank). */
  onPick: (scenario: Scenario) => void
  /** Roll a fresh Surprise Me field into setup. */
  onSurprise: () => void
}

const chipBase =
  'rounded-full border px-3 py-1.5 font-display text-xs font-semibold uppercase tracking-[0.12em] transition-colors'
const chipIdle = 'border-ground-500 bg-ground-700 text-ink-body hover:border-ground-400 hover:text-ink-bright'
const chipActive = 'border-ink-bright bg-ground-600 text-ink-bright'

export function PresetChips({ activeId, onPick, onSurprise }: PresetChipsProps) {
  const fixed: readonly { id: string; label: string; load: () => Scenario }[] = [
    ...PRESETS.map((preset) => ({ id: preset.id, label: preset.title, load: () => preset })),
    { id: 'custom', label: 'Custom', load: blankCustomScenario },
  ]

  return (
    <div role="group" aria-label="Starting lineups" className="flex flex-wrap items-center gap-2">
      {fixed.map((chip) => {
        const active = activeId === chip.id
        return (
          <button
            key={chip.id}
            type="button"
            aria-pressed={active}
            onClick={() => {
              if (!active) onPick(chip.load())
            }}
            className={`${chipBase} ${active ? chipActive : chipIdle}`}
          >
            {chip.label}
          </button>
        )
      })}
      <button
        type="button"
        onClick={onSurprise}
        title="Roll a fresh random field onto the board"
        className={`${chipBase} ${chipIdle}`}
      >
        Surprise me
      </button>
    </div>
  )
}
