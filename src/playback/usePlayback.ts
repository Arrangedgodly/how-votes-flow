import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { Candidate, CountResult } from '../engine/index.ts'
import { pluralityLeader } from '../scenarios/index.ts'
import {
  beatLabel as beatLabelOf,
  initialPlaybackState,
  playbackReducer,
  stepOf,
} from './machine.ts'
import { ribbonForSetup, ribbonForStep } from './narration.ts'
import {
  beatDurationMs,
  buildTimeline,
  landedPerStream,
  type PlaybackStepKind,
  type TransferStream,
} from './timeline.ts'

/**
 * usePlayback (T6) — the clock that walks the pure machine through the pure
 * timeline and derives everything the board renders mid-beat.
 *
 * One accumulated-time clock drives the whole run: beat holds, chunk landings,
 * and the strike/transfer/winner visuals all read the same `elapsed`, which
 * only advances while playing and unpaused. That single rule makes pause a
 * true freeze (streams and digits stop mid-air), makes skips clean (the clock
 * resets on every beat change), and keeps reduced-motion an instant-swap
 * path: the same beats at the same reading cadence, nothing flying, the
 * ribbon carrying the identical story.
 */

export type MotionPref = 'auto' | 'reduced' | 'full'

/**
 * The round-1 leader worth framing as winner-take-all: the unique top tally
 * of the first count, or null when the lead itself is tied (a tied frame has
 * no single lane to mark — the ribbon says it instead).
 */
function frameLeaderId(result: CountResult<Candidate>): string | null {
  const { tiedIds } = pluralityLeader(result)
  return tiedIds.length === 1 ? tiedIds[0] : null
}

export interface UsePlaybackOptions {
  autostart?: boolean
  /** Capture/determinism hook: jump straight to a beat (paused) or verdict. */
  pin?: { kind: PlaybackStepKind | 'verdict'; roundNumber?: number; atMs?: number }
  initialMotion?: MotionPref
}

/** What the board needs to know about the current beat. */
export interface PlaybackOverlay {
  /** The lane struck this round (strike + transfer beats), else null. */
  struckNowId: string | null
  /**
   * Narrative (T8): during the round-1 open beat, the unique plurality
   * leader's id — the board marks that lane "if we stopped here". Null when
   * the first count is tied at the top (the ribbon handles that framing) or
   * round 1 already declared a winner (nothing to set up).
   */
  stoppedHereId: string | null
  /** 1-based round number the strike belongs to. */
  struckRound: number | null
  /** Absolute displayed tallies while transfer digits tick (else null). */
  displayedVotes: ReadonlyMap<string, number> | null
  /** Hold the winner mark back until the declaration beat. */
  suppressWinner: boolean
  /** Motion devices are allowed (not reduced motion). */
  animate: boolean
  /** One flash on the strike (strike beat, motion only). */
  flash: boolean
  /** One amber pulse on the winning tally (winner beat, motion only). */
  pulse: boolean
  /** Transfer streams in flight (transfer beat, motion only). */
  streams: readonly TransferStream[] | null
  /** Ballots switching off during the current transfer beat. */
  exhaustedNow: number
  /** The shared elapsed-time clock the transfer layer reads (ms into the beat). */
  clock: { readonly elapsed: number }
  /** Landed votes per stream (pinned counts + digit ticks). */
  landed: readonly number[] | null
}

export function usePlayback<TCandidate extends Candidate>(
  result: CountResult<TCandidate>,
  options: UsePlaybackOptions = {},
) {
  const timeline = useMemo(() => buildTimeline(result), [result])
  const reducer = useCallback(
    (state: Parameters<typeof playbackReducer>[0], action: Parameters<typeof playbackReducer>[1]) =>
      playbackReducer(state, action, timeline),
    [timeline],
  )
  const [state, dispatch] = useReducer(reducer, initialPlaybackState)

  /* ————— reduced motion: the OS preference, plus a manual override ————— */
  const [motionPref, setMotionPref] = useState<MotionPref>(options.initialMotion ?? 'auto')
  const [systemReduced, setSystemReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (event: MediaQueryListEvent) => setSystemReduced(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  const reduced = motionPref === 'reduced' ? true : motionPref === 'full' ? false : systemReduced

  /** Clicking the toggle always overrides; from auto it follows the system. */
  const toggleReduced = useCallback(() => {
    setMotionPref(reduced ? 'full' : 'reduced')
  }, [reduced])

  /* ————— the one clock ————— */
  const clock = useRef({ elapsed: 0 })
  const step = stepOf(timeline, state)
  const [landed, setLanded] = useState<readonly number[] | null>(null)
  // The clock resets when the BEAT changes — never on pause/resume, so a
  // frozen stream resumes exactly where it stopped.
  const stepKey = `${state.phase}:${state.stepIndex}`
  const liveStepKey = useRef('')

  useEffect(() => {
    if (state.phase !== 'playing' || state.paused || !step) return
    if (liveStepKey.current !== stepKey) {
      liveStepKey.current = stepKey
      clock.current.elapsed = 0
      setLanded(null)
    }
    let frame = 0
    let last = performance.now()
    const tick = (now: number) => {
      clock.current.elapsed += now - last
      last = now

      if (step.kind === 'transfer' && !reduced) {
        const streams = timeline.streamsByRound.get(step.roundIndex) ?? []
        if (streams.length > 0) {
          const signature = landedPerStream(streams, clock.current.elapsed).join(',')
          setLanded((previous) =>
            previous?.join(',') === signature ? previous : signature.split(',').map(Number),
          )
        }
      }

      if (clock.current.elapsed >= beatDurationMs(step, timeline, reduced)) {
        dispatch({ type: 'beat-complete' })
        return // re-render swaps the step; the next effect starts the next clock
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [state.phase, state.paused, state.stepIndex, stepKey, reduced, step, timeline])

  /* ————— boot wiring: autostart / pinned captures (mount only) ————— */
  const pin = options.pin
  useEffect(() => {
    if (pin?.kind === 'verdict') {
      dispatch({ type: 'replay' })
      for (let index = 0; index < timeline.steps.length; index++) dispatch({ type: 'beat-complete' })
      return
    }
    if (pin) {
      const stepIndex = timeline.steps.findIndex(
        (candidate) => candidate.kind === pin.kind && candidate.roundIndex === (pin.roundNumber ?? 1) - 1,
      )
      if (stepIndex >= 0) dispatch({ type: 'jump', stepIndex })
      return
    }
    if (options.autostart) dispatch({ type: 'start' })
    // Boot-time only; re-created options objects must never re-fire the boot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // A pinned beat is paused, so no clock ever runs: set its elapsed time and
  // landed digits synchronously for a deterministic capture.
  useEffect(() => {
    if (!pin || pin.kind === 'verdict' || state.phase !== 'playing' || !step) return
    if (step.kind !== pin.kind || step.roundIndex !== (pin.roundNumber ?? 1) - 1) return
    const atMs = pin.atMs ?? 600
    clock.current.elapsed = atMs
    liveStepKey.current = `${state.phase}:${state.stepIndex}` // already live: do not re-zero
    if (step.kind === 'transfer') {
      setLanded(landedPerStream(timeline.streamsByRound.get(step.roundIndex) ?? [], atMs))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.stepIndex])

  /* ————— board derivation ————— */
  const streams =
    step?.kind === 'transfer' && !reduced
      ? (timeline.streamsByRound.get(step.roundIndex) ?? [])
      : null
  const landedNow =
    step?.kind === 'transfer'
      ? reduced
        ? (timeline.streamsByRound.get(step.roundIndex) ?? []).map((stream) => stream.votes)
        : landed
      : null

  const displayedVotes = useMemo(() => {
    if (step?.kind !== 'transfer' || !landedNow) return null
    const round = result.rounds[step.roundIndex]
    const map = new Map<string, number>(
      round.tallies.map((tally) => [tally.candidateId, tally.votes]),
    )
    const allStreams = timeline.streamsByRound.get(step.roundIndex) ?? []
    allStreams.forEach((stream, index) => {
      map.set(stream.toId, (map.get(stream.toId) ?? 0) + (landedNow[index] ?? 0))
    })
    return map
  }, [step, landedNow, result, timeline])

  const elimination = step ? result.rounds[step.roundIndex].elimination : null
  // The round-1 winner-take-all frame: mark the (unique) plurality leader's
  // lane for the reveal's setup beat — only while round 1 stands open and
  // undecided; once the count moves on, the mark goes with it.
  const stoppedHereId =
    step?.kind === 'round-open' && step.roundIndex === 0 && !step.final
      ? frameLeaderId(result)
      : null
  const overlay: PlaybackOverlay = {
    struckNowId:
      step && (step.kind === 'strike' || step.kind === 'transfer') && elimination
        ? elimination.eliminatedId
        : null,
    stoppedHereId,
    struckRound: step ? step.roundIndex + 1 : null,
    displayedVotes,
    suppressWinner: state.phase === 'idle' || (step?.kind === 'round-open' && step.final),
    animate: !reduced,
    flash: step?.kind === 'strike' && !reduced,
    pulse: step?.kind === 'winner' && !reduced,
    streams,
    exhaustedNow:
      step?.kind === 'transfer' ? (timeline.exhaustedByRound.get(step.roundIndex) ?? 0) : 0,
    clock: clock.current,
    landed: landedNow,
  }

  const ribbon =
    state.phase === 'idle' || !step ? ribbonForSetup(result) : ribbonForStep(result, step)

  return {
    state,
    step,
    beatLabel: beatLabelOf(timeline, state),
    roundIndex: step ? step.roundIndex : 0,
    totalRounds: result.rounds.length,
    ribbon,
    overlay,
    reduced,
    motionPref,
    toggleReduced,
    start: useCallback(() => dispatch({ type: 'start' }), []),
    togglePause: useCallback(() => dispatch({ type: 'toggle-pause' }), []),
    skipRound: useCallback(() => dispatch({ type: 'skip-round' }), []),
    skipToResult: useCallback(() => dispatch({ type: 'skip-to-result' }), []),
    replay: useCallback(() => dispatch({ type: 'replay' }), []),
    reset: useCallback(() => dispatch({ type: 'reset' }), []),
  }
}

export type PlaybackController = ReturnType<typeof usePlayback>
