import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import type { PlaybackController } from './usePlayback.ts'

/**
 * The playback controls (T6): pause/resume, skip round, skip to result,
 * replay — plus the reduced-motion switch, always reachable. Plain buttons
 * (native keyboard operability, world focus ring from the base layer); T9
 * owns the full keyboard-journey pass, this only guarantees the controls are
 * operable and focus survives the phase swaps.
 */

const chip =
  'rounded-full border px-3 py-1.5 font-display text-xs font-semibold uppercase tracking-[0.12em] transition-colors'
const chipIdle = 'border-ground-500 bg-ground-700 text-ink-body hover:border-ground-400 hover:text-ink-bright'
const primary =
  'bg-ink-bright px-5 py-2 font-display text-sm font-semibold uppercase tracking-[0.14em] text-ground-950 transition-transform hover:-translate-y-0.5'

interface ControlsProps {
  controller: PlaybackController
  /** Setup gate (T7): block TIP OFF while the lineup is not runnable. */
  startDisabled?: boolean
  /** The blocking reason, shown beside a disabled TIP OFF. */
  startReason?: string
  /**
   * TIP OFF's node, handed to the lineup editor (T10 focus residual):
   * "Spread the unplaced" always self-disables on success, and the deliberate
   * seat is this primary action that the success just armed. Attachment only —
   * no focus happens here outside the interaction-gated phase-swap below.
   */
  tipOffRef?: RefObject<HTMLButtonElement | null>
}

export function Controls({ controller, startDisabled = false, startReason, tipOffRef }: ControlsProps) {
  const { state, beatLabel, totalRounds, reduced, toggleReduced, start, togglePause, skipRound, skipToResult, replay } =
    controller
  const firstActionRef = useRef<HTMLButtonElement>(null)
  const interactedRef = useRef(false)

  // Focus continuity across phase swaps: the primary action of the NEXT phase
  // receives focus — but only once a real person has interacted, so autoplay
  // boots (pins, autostart) never paint a focus ring on a untouched page.
  useEffect(() => {
    const mark = () => {
      interactedRef.current = true
    }
    window.addEventListener('pointerdown', mark)
    window.addEventListener('keydown', mark)
    return () => {
      window.removeEventListener('pointerdown', mark)
      window.removeEventListener('keydown', mark)
    }
  }, [])

  useEffect(() => {
    if (state.phase !== 'idle' && interactedRef.current) firstActionRef.current?.focus()
  }, [state.phase])

  return (
    <div role="group" aria-label="Playback controls" className="flex flex-wrap items-center gap-2">
      {state.phase === 'idle' && (
        <>
          <button
            ref={(node) => {
              firstActionRef.current = node
              if (tipOffRef) tipOffRef.current = node
            }}
            type="button"
            onClick={start}
            disabled={startDisabled}
            className={`${primary} disabled:pointer-events-none disabled:bg-ground-600 disabled:text-ink-mute`}
          >
            Tip off
          </button>
          {startDisabled && startReason && (
            <p className="max-w-[52ch] text-xs leading-snug text-ink-mute">{startReason}</p>
          )}
        </>
      )}

      {state.phase === 'playing' && (
        <>
          <span
            aria-hidden="true"
            className="tally rounded-none border border-ground-500 bg-ground-700 px-2.5 py-1 text-xs font-bold text-ink-bright"
          >
            {beatLabel} / R{totalRounds}
          </span>
          <button
            ref={firstActionRef}
            type="button"
            onClick={togglePause}
            aria-label={state.paused ? 'Resume the count' : 'Pause the count'}
            className={`${chip} ${chipIdle}`}
          >
            {state.paused ? 'Resume' : 'Pause'}
          </button>
          <button type="button" onClick={skipRound} className={`${chip} ${chipIdle}`}>
            Skip round
          </button>
          <button type="button" onClick={skipToResult} className={`${chip} ${chipIdle}`}>
            Skip to result
          </button>
        </>
      )}

      {state.phase === 'done' && (
        <button ref={firstActionRef} type="button" onClick={replay} className={primary}>
          Replay
        </button>
      )}

      {(state.phase === 'playing' || state.phase === 'done') && (
        <span className="mx-1 h-5 w-px bg-ground-500" aria-hidden="true" />
      )}

      <button
        type="button"
        onClick={toggleReduced}
        aria-pressed={reduced}
        className={`${chip} ${
          reduced
            ? 'border-ink-bright bg-ground-600 text-ink-bright'
            : 'border-ground-500 bg-ground-700 text-ink-body hover:border-ground-400 hover:text-ink-bright'
        }`}
      >
        Reduced motion
      </button>
    </div>
  )
}
