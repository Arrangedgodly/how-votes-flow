import { describe, expect, it } from 'vitest'
import { presetById, runScenario } from '../scenarios/index.ts'
import { buildTimeline } from './timeline.ts'
import {
  beatLabel,
  initialPlaybackState,
  playbackReducer,
  stepOf,
  type PlaybackAction,
  type PlaybackState,
} from './machine.ts'

const spoiler = runScenario(presetById('spoiler')!)
const timeline = buildTimeline(spoiler)
// Spoiler steps: 0 open R1 · 1 strike · 2 transfer · 3 open R2 · 4 strike ·
// 5 transfer · 6 open final · 7 winner
const LAST = timeline.steps.length - 1

function run(start: PlaybackState, ...actions: PlaybackAction[]): PlaybackState {
  return actions.reduce((state, action) => playbackReducer(state, action, timeline), start)
}

describe('machine — app arc', () => {
  it('starts from idle into the first beat, unpaused', () => {
    const state = run(initialPlaybackState, { type: 'start' })
    expect(state).toEqual({ phase: 'playing', stepIndex: 0, paused: false })
    expect(stepOf(timeline, state)?.kind).toBe('round-open')
  })

  it('is inert before the count starts', () => {
    expect(run(initialPlaybackState, { type: 'pause' })).toEqual(initialPlaybackState)
    expect(run(initialPlaybackState, { type: 'skip-round' })).toEqual(initialPlaybackState)
    expect(run(initialPlaybackState, { type: 'beat-complete' })).toEqual(initialPlaybackState)
    expect(run(initialPlaybackState, { type: 'start' }, { type: 'start' }).stepIndex).toBe(0)
  })

  it('auto-advances beat by beat into the verdict, and stays there', () => {
    let state = run(initialPlaybackState, { type: 'start' })
    for (let i = 0; i < LAST; i++) state = playbackReducer(state, { type: 'beat-complete' }, timeline)
    expect(state).toEqual({ phase: 'playing', stepIndex: LAST, paused: false })
    expect(stepOf(timeline, state)?.kind).toBe('winner')
    state = playbackReducer(state, { type: 'beat-complete' }, timeline)
    expect(state).toEqual({ phase: 'done', stepIndex: LAST, paused: false })
    expect(playbackReducer(state, { type: 'beat-complete' }, timeline)).toEqual(state)
  })
})

describe('machine — pause / resume', () => {
  it('freezes and unfreezes without moving the beat', () => {
    let state = run(initialPlaybackState, { type: 'start' }, { type: 'beat-complete' })
    state = playbackReducer(state, { type: 'pause' }, timeline)
    expect(state).toEqual({ phase: 'playing', stepIndex: 1, paused: true })
    state = playbackReducer(state, { type: 'beat-complete' }, timeline)
    expect(state.stepIndex).toBe(1) // a paused clock never completes a beat
    state = playbackReducer(state, { type: 'resume' }, timeline)
    expect(state).toEqual({ phase: 'playing', stepIndex: 1, paused: false })
  })

  it('toggles', () => {
    const state = run(initialPlaybackState, { type: 'start' }, { type: 'toggle-pause' })
    expect(state.paused).toBe(true)
    expect(playbackReducer(state, { type: 'toggle-pause' }, timeline).paused).toBe(false)
  })
})

describe('machine — skips land on structural beats', () => {
  it('skip-round exits the current round wherever it is caught', () => {
    expect(
      run(initialPlaybackState, { type: 'start' }, { type: 'skip-round' }).stepIndex,
    ).toBe(3) // R1 open → R2 open
    expect(
      run(initialPlaybackState, { type: 'start' }, { type: 'beat-complete' }, { type: 'skip-round' }).stepIndex,
    ).toBe(3) // mid-strike → R2 open
    expect(
      run(initialPlaybackState, { type: 'start' }, { type: 'beat-complete' }, { type: 'beat-complete' }, { type: 'skip-round' }).stepIndex,
    ).toBe(3) // mid-transfer → R2 open
    expect(
      run(initialPlaybackState, { type: 'start' }, { type: 'skip-round' }, { type: 'skip-round' }).stepIndex,
    ).toBe(6) // R2 open → final open
    expect(
      run(initialPlaybackState, { type: 'start' }, { type: 'skip-round' }, { type: 'skip-round' }, { type: 'skip-round' }).stepIndex,
    ).toBe(7) // final open → winner declaration
  })

  it('skip-round clears pause (the visitor asked to go somewhere and watch)', () => {
    const state = run(initialPlaybackState, { type: 'start' }, { type: 'pause' }, { type: 'skip-round' })
    expect(state).toEqual({ phase: 'playing', stepIndex: 3, paused: false })
  })

  it('skip-round from the declaration lands on the verdict', () => {
    const state = run(initialPlaybackState, { type: 'start' }, { type: 'skip-to-result' }, { type: 'skip-round' })
    expect(state.phase).toBe('done')
  })

  it('skip-to-result jumps straight to the winner declaration', () => {
    const state = run(initialPlaybackState, { type: 'start' }, { type: 'beat-complete' }, { type: 'skip-to-result' })
    expect(state).toEqual({ phase: 'playing', stepIndex: LAST, paused: false })
    expect(stepOf(timeline, state)?.kind).toBe('winner')
    expect(run(initialPlaybackState, { type: 'start' }, { type: 'skip-to-result' }, { type: 'skip-to-result' }).phase).toBe('done')
  })
})

describe('machine — replay / reset / jump', () => {
  it('replays from the verdict back to the first beat', () => {
    let state = run(initialPlaybackState, { type: 'start' })
    for (let i = 0; i <= LAST; i++) state = playbackReducer(state, { type: 'beat-complete' }, timeline)
    expect(state.phase).toBe('done')
    expect(playbackReducer(state, { type: 'replay' }, timeline)).toEqual({
      phase: 'playing',
      stepIndex: 0,
      paused: false,
    })
  })

  it('resets to setup', () => {
    const state = run(initialPlaybackState, { type: 'start' }, { type: 'reset' })
    expect(state).toEqual(initialPlaybackState)
    expect(stepOf(timeline, state)).toBeNull()
  })

  it('jumps (paused) to a pinned beat, ignoring out-of-range indices', () => {
    expect(run(initialPlaybackState, { type: 'jump', stepIndex: 2 })).toEqual({
      phase: 'playing',
      stepIndex: 2,
      paused: true,
    })
    expect(run(initialPlaybackState, { type: 'jump', stepIndex: 99 })).toEqual(initialPlaybackState)
  })
})

describe('machine — beat labels for the control bar', () => {
  it('names the beat in scoreboard grammar', () => {
    expect(beatLabel(timeline, initialPlaybackState)).toBe('setup')
    expect(beatLabel(timeline, run(initialPlaybackState, { type: 'start' }))).toBe('R1 · count')
    expect(beatLabel(timeline, run(initialPlaybackState, { type: 'start' }, { type: 'jump', stepIndex: 1 }))).toBe('R1 · elimination')
    expect(beatLabel(timeline, run(initialPlaybackState, { type: 'start' }, { type: 'jump', stepIndex: 2 }))).toBe('R1 · transfer')
    expect(beatLabel(timeline, run(initialPlaybackState, { type: 'start' }, { type: 'jump', stepIndex: LAST }))).toBe('R3 · final')
    expect(beatLabel(timeline, { phase: 'done', stepIndex: LAST, paused: false })).toBe('final')
  })
})
