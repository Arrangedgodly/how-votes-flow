import type { PlaybackStep, PlaybackTimeline } from './timeline.ts'

/**
 * The playback phase machine (T6) — a pure reducer over the timeline.
 *
 * App-level arc: idle (setup, board loaded) → playing (auto-advance through
 * beats) → done (verdict + replay). `paused` freezes the clock inside any
 * playing beat. Skips land on the next structural beat, never mid-visual:
 *   skip-round      the next round-open (or the winner declaration)
 *   skip-to-result  the winner declaration
 *
 * No timers live here — the machine only decides WHERE; `usePlayback` owns
 * WHEN. Asserted by machine.test.ts.
 */

export type PlaybackPhase = 'idle' | 'playing' | 'done'

export interface PlaybackState {
  phase: PlaybackPhase
  /** Index into timeline.steps; -1 before the count starts. */
  stepIndex: number
  paused: boolean
}

export type PlaybackAction =
  | { type: 'start' }
  | { type: 'beat-complete' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'toggle-pause' }
  | { type: 'skip-round' }
  | { type: 'skip-to-result' }
  | { type: 'replay' }
  | { type: 'reset' }
  /** Test/capture hook: jump straight to a beat (paused) or to the verdict. */
  | { type: 'jump'; stepIndex: number }

export const initialPlaybackState: PlaybackState = {
  phase: 'idle',
  stepIndex: -1,
  paused: false,
}

const playing = (stepIndex: number, paused: boolean): PlaybackState => ({
  phase: 'playing',
  stepIndex,
  paused,
})

/** Advance the machine one beat. Pure. */
export function playbackReducer(
  state: PlaybackState,
  action: PlaybackAction,
  timeline: PlaybackTimeline,
): PlaybackState {
  const steps = timeline.steps
  const last = steps.length - 1

  switch (action.type) {
    case 'start':
      return state.phase === 'idle' && steps.length > 0 ? playing(0, false) : state

    case 'beat-complete': {
      // A paused clock never completes a beat — the guard lives here too, not
      // only in the timer, so a stray dispatch cannot advance a frozen board.
      if (state.phase !== 'playing' || state.paused) return state
      const next = state.stepIndex + 1
      return next > last
        ? { phase: 'done', stepIndex: last, paused: false }
        : playing(next, state.paused)
    }

    case 'pause':
      return state.phase === 'playing' ? { ...state, paused: true } : state

    case 'resume':
      return state.phase === 'playing' ? { ...state, paused: false } : state

    case 'toggle-pause':
      return state.phase === 'playing' ? { ...state, paused: !state.paused } : state

    case 'skip-round': {
      if (state.phase !== 'playing') return state
      // The remainder of the current round: the next round-open or the
      // declaration. From the declaration itself, land on the verdict.
      const target = steps.findIndex(
        (step, index) => index > state.stepIndex && (step.kind === 'round-open' || step.kind === 'winner'),
      )
      return target === -1 ? { phase: 'done', stepIndex: last, paused: false } : playing(target, false)
    }

    case 'skip-to-result': {
      if (state.phase !== 'playing') return state
      const winnerIndex = steps.findIndex((step) => step.kind === 'winner')
      if (winnerIndex === -1 || winnerIndex === state.stepIndex) {
        return { phase: 'done', stepIndex: last, paused: false }
      }
      return playing(winnerIndex, false)
    }

    case 'replay':
      return steps.length > 0 ? playing(0, false) : state

    case 'reset':
      return initialPlaybackState

    case 'jump': {
      if (action.stepIndex < 0 || action.stepIndex > last) return state
      return playing(action.stepIndex, true)
    }
  }
}

/** The step a state points at (null before the count starts / after reset). */
export function stepOf(timeline: PlaybackTimeline, state: PlaybackState): PlaybackStep | null {
  if (state.stepIndex < 0 || state.stepIndex >= timeline.steps.length) return null
  return timeline.steps[state.stepIndex]
}

/** Human label for the current beat, shown on the control bar. */
export function beatLabel(timeline: PlaybackTimeline, state: PlaybackState): string {
  const step = stepOf(timeline, state)
  if (state.phase === 'idle' || !step) return 'setup'
  if (state.phase === 'done') return 'final'
  const roundNumber = step.roundIndex + 1
  switch (step.kind) {
    case 'round-open':
      return `R${roundNumber} · count`
    case 'strike':
      return `R${roundNumber} · elimination`
    case 'transfer':
      return `R${roundNumber} · transfer`
    case 'winner':
      return `R${roundNumber} · final`
  }
}
