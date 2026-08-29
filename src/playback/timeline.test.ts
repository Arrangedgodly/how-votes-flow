import { describe, expect, it } from 'vitest'
import { blankCustomScenario, presetById, runScenario } from '../scenarios/index.ts'
import {
  BEAT_MS,
  CHUNK_STAGGER_MS,
  CHUNK_TRAVEL_MS,
  beatDurationMs,
  buildTimeline,
  chunkLandTimeMs,
  chunkVotes,
  landedPerStream,
  landedVotes,
  transferDurationMs,
} from './timeline.ts'

const spoiler = runScenario(presetById('spoiler')!)
const nailBiter = runScenario(presetById('nail-biter')!)
const custom = runScenario(blankCustomScenario())

const kinds = (result: typeof spoiler) => buildTimeline(result).steps.map((step) => step.kind)

describe('timeline — beat grammar', () => {
  it('walks The Spoiler: open → strike → transfer per round, winner last', () => {
    expect(kinds(spoiler)).toEqual([
      'round-open', // R1 tallies
      'strike', // Eli out
      'transfer', // 14 → Nia
      'round-open', // R2 tallies
      'strike', // Theo out
      'transfer', // 18 → Nia
      'round-open', // final count
      'winner',
    ])
  })

  it('flags only the last round-open as final', () => {
    const timeline = buildTimeline(spoiler)
    const opens = timeline.steps.filter((step) => step.kind === 'round-open')
    expect(opens.map((step) => (step as { final: boolean }).final)).toEqual([false, false, true])
  })

  it('carries the engine transfer counts as streams keyed by round', () => {
    const timeline = buildTimeline(spoiler)
    expect(timeline.streamsByRound.get(0)).toEqual([
      { fromId: 'eli', toId: 'nia', votes: 14, chunks: [5, 5, 4] },
    ])
    expect(timeline.streamsByRound.get(1)).toEqual([
      { fromId: 'theo', toId: 'nia', votes: 18, chunks: [5, 5, 5, 3] },
    ])
    expect(timeline.exhaustedByRound.get(0)).toBe(0)
  })

  it('multi-stream rounds keep destinations separate (Nail-Biter round 2)', () => {
    const timeline = buildTimeline(nailBiter)
    expect(timeline.streamsByRound.get(1)).toEqual([
      { fromId: 'nia', toId: 'ada', votes: 14, chunks: [5, 5, 4] },
      { fromId: 'nia', toId: 'eli', votes: 7, chunks: [5, 2] },
    ])
    expect(timeline.exhaustedByRound.get(0)).toBe(6)
    expect(timeline.exhaustedByRound.get(1)).toBe(9)
  })

  it('keeps a transfer beat for pure-exhaustion eliminations (Custom round 1)', () => {
    const timeline = buildTimeline(custom)
    expect(timeline.streamsByRound.get(0)).toEqual([]) // 25 bullet ballots, no next choices
    expect(timeline.exhaustedByRound.get(0)).toBe(25)
    expect(timeline.steps.some((step) => step.kind === 'transfer' && step.roundIndex === 0)).toBe(true)
  })
})

describe('timeline — chunking and landing schedule', () => {
  it('chunks into groups of five with a remainder tail', () => {
    expect(chunkVotes(0)).toEqual([])
    expect(chunkVotes(1)).toEqual([1])
    expect(chunkVotes(5)).toEqual([5])
    expect(chunkVotes(6)).toEqual([5, 1])
    expect(chunkVotes(14)).toEqual([5, 5, 4])
    expect(chunkVotes(18)).toEqual([5, 5, 5, 3])
    expect(() => chunkVotes(10, 0)).toThrow()
  })

  it('lands chunks staggered, so only a few are in flight per stream', () => {
    expect(chunkLandTimeMs(0)).toBe(CHUNK_TRAVEL_MS)
    expect(chunkLandTimeMs(2)).toBe(2 * CHUNK_STAGGER_MS + CHUNK_TRAVEL_MS)

    const stream = { fromId: 'eli', toId: 'nia', votes: 14, chunks: [5, 5, 4] }
    expect(landedVotes(stream, 0)).toBe(0)
    expect(landedVotes(stream, CHUNK_TRAVEL_MS - 1)).toBe(0)
    expect(landedVotes(stream, CHUNK_TRAVEL_MS)).toBe(5)
    expect(landedVotes(stream, chunkLandTimeMs(2))).toBe(14)
    expect(landedPerStream([stream], chunkLandTimeMs(1))).toEqual([10])
  })

  it('transfer duration covers the last landing plus the settle hold', () => {
    const streams = [{ fromId: 'theo', toId: 'nia', votes: 18, chunks: [5, 5, 5, 3] }]
    const ms = transferDurationMs(streams, 0)
    expect(ms).toBe(chunkLandTimeMs(3) + 850)
    // With at most 2-3 chunks airborne per stream (travel > stagger), a
    // two-stream round never exceeds a few chunks in flight total.
    expect(CHUNK_TRAVEL_MS / CHUNK_STAGGER_MS).toBeLessThanOrEqual(3)
  })

  it('beat durations are readable, and reduced mode never speeds the story', () => {
    const timeline = buildTimeline(spoiler)
    const open = timeline.steps[0] as { kind: 'round-open'; roundIndex: number; final: boolean }
    expect(beatDurationMs(open, timeline, false)).toBe(BEAT_MS['round-open'] + 900)
    expect(beatDurationMs(open, timeline, true)).toBe(BEAT_MS['round-open'] + 900)
    const transfer = timeline.steps[2]
    const motionMs = beatDurationMs(transfer, timeline, false)
    expect(motionMs).toBe(chunkLandTimeMs(2) + 850) // 3 chunks of [5,5,4]
    expect(beatDurationMs(transfer, timeline, true)).toBeGreaterThanOrEqual(BEAT_MS.transfer)
  })
})
