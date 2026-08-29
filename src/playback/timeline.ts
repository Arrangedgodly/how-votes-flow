import type { CountResult } from '../engine/index.ts'

/**
 * The playback timeline — T6's pure derivation of playable beats from an
 * engine `CountResult`. No React, no clock: this module only decides WHAT the
 * beats are and WHAT each stream carries. `usePlayback` owns WHEN.
 *
 * Beat grammar per counted round (the design brief's cadence):
 *
 *   round-open  the round's tallies stand on the board; the ribbon reads them
 *   strike      the round's elimination lands (one flash in motion mode)
 *   transfer    the struck lane's ballots stream to survivors in grouped
 *               chunks, every stream pinned with its own count; exhausted
 *               ballots (if any) switch off
 *   winner      only after the final round-open: the declaration beats the
 *               buzzer (one amber pulse)
 *
 * A round whose elimination moves nothing (no transfers, no exhaustion) skips
 * its transfer beat — a zero-vote event is not an event, same rule as the
 * engine's transfer list.
 */

/** One playable beat. `roundIndex` is 0-based into `result.rounds`. */
export type PlaybackStep =
  | { kind: 'round-open'; roundIndex: number; final: boolean }
  | { kind: 'strike'; roundIndex: number }
  | { kind: 'transfer'; roundIndex: number }
  | { kind: 'winner'; roundIndex: number }

export type PlaybackStepKind = PlaybackStep['kind']

/**
 * One transfer stream: N votes from the struck lane to one receiving lane,
 * chunked into groups (the chunk is the counting unit — never 100 loose
 * sprites). `chunks` always sums to `votes`.
 */
export interface TransferStream {
  fromId: string
  toId: string
  votes: number
  chunks: number[]
}

export interface PlaybackTimeline {
  /** Every beat in play order; the last is always the winner declaration. */
  steps: readonly PlaybackStep[]
  /** Streams by roundIndex — absent for rounds with nothing in flight. */
  streamsByRound: ReadonlyMap<number, readonly TransferStream[]>
  /** Ballots that stopped counting at each roundIndex's elimination. */
  exhaustedByRound: ReadonlyMap<number, number>
}

/** Votes move in groups of this size (last chunk takes the remainder). */
export const CHUNK_SIZE = 5

/** Split `votes` into chunks (e.g. 14 → [5, 5, 4]). */
export function chunkVotes(votes: number, size: number = CHUNK_SIZE): number[] {
  if (size < 1) throw new Error(`chunk size must be ≥1 (got ${size})`)
  const chunks: number[] = []
  for (let remaining = votes; remaining > 0; remaining -= size) {
    chunks.push(Math.min(size, remaining))
  }
  return chunks
}

/** Derive the full playable timeline from a count result. Pure. */
export function buildTimeline(result: CountResult): PlaybackTimeline {
  const steps: PlaybackStep[] = []
  const streamsByRound = new Map<number, readonly TransferStream[]>()
  const exhaustedByRound = new Map<number, number>()
  const finalIndex = result.rounds.length - 1

  result.rounds.forEach((round, roundIndex) => {
    steps.push({ kind: 'round-open', roundIndex, final: roundIndex === finalIndex })

    const elimination = round.elimination
    if (elimination) {
      steps.push({ kind: 'strike', roundIndex })

      const streams = elimination.transfers.map((transfer) => ({
        fromId: elimination.eliminatedId,
        toId: transfer.toId,
        votes: transfer.votes,
        chunks: chunkVotes(transfer.votes),
      }))
      const exhausted = elimination.exhausted
      if (streams.length > 0 || exhausted > 0) {
        streamsByRound.set(roundIndex, streams)
        exhaustedByRound.set(roundIndex, exhausted)
        steps.push({ kind: 'transfer', roundIndex })
      }
    }

    if (roundIndex === finalIndex) {
      steps.push({ kind: 'winner', roundIndex })
    }
  })

  return { steps, streamsByRound, exhaustedByRound }
}

/* ————— cadence constants — one readable rhythm, no speed control ————— */

/** Flight time of one chunk along its arc (exponential ease-out). */
export const CHUNK_TRAVEL_MS = 640
/** Departure stagger between consecutive chunks of the same stream. */
export const CHUNK_STAGGER_MS = 300
/** Hold after the last chunk lands, so the settled count can be read. */
export const TRANSFER_SETTLE_MS = 850
/** When the exhausted switch-off starts within the transfer beat. */
export const EXHAUST_DELAY_MS = 220
/** Duration of the exhausted sink. */
export const EXHAUST_DURATION_MS = 520

/** Absolute time at which chunk `chunkIndex` of a stream lands. */
export function chunkLandTimeMs(chunkIndex: number): number {
  return chunkIndex * CHUNK_STAGGER_MS + CHUNK_TRAVEL_MS
}

/** Votes of `stream` landed by absolute time `elapsedMs`. Pure. */
export function landedVotes(stream: TransferStream, elapsedMs: number): number {
  let landed = 0
  stream.chunks.forEach((chunk, index) => {
    if (elapsedMs >= chunkLandTimeMs(index)) landed += chunk
  })
  return landed
}

/** Landed votes per stream (same order as `streams`) at `elapsedMs`. */
export function landedPerStream(
  streams: readonly TransferStream[],
  elapsedMs: number,
): number[] {
  return streams.map((stream) => landedVotes(stream, elapsedMs))
}

/** Total length of a transfer beat in motion mode. */
export function transferDurationMs(streams: readonly TransferStream[], exhausted: number): number {
  const maxChunks = streams.reduce((max, stream) => Math.max(max, stream.chunks.length), 0)
  const chunksEnd = maxChunks > 0 ? chunkLandTimeMs(maxChunks - 1) : 0
  const exhaustEnd = exhausted > 0 ? EXHAUST_DELAY_MS + EXHAUST_DURATION_MS : 0
  return Math.max(chunksEnd, exhaustEnd) + TRANSFER_SETTLE_MS
}

/** Reading holds per beat (ms). Reduced motion swaps states instantly but the
 *  ribbon still needs its reading time — the story is identical either way. */
export const BEAT_MS = {
  'round-open': 2500,
  strike: 1150,
  transfer: 1900,
  winner: 2300,
} as const satisfies Record<PlaybackStepKind, number>

/** Extra hold on the round-1 narration (it frames winner-take-all). */
export const ROUND_1_EXTRA_MS = 900
/** Extra hold before the buzzer (the final tallies stand, then it hits). */
export const FINAL_HOLD_EXTRA_MS = 500

/** Duration of one beat, reduced or not. Pure. */
export function beatDurationMs(
  step: PlaybackStep,
  timeline: PlaybackTimeline,
  reduced: boolean,
): number {
  let ms: number
  if (step.kind === 'transfer') {
    if (reduced) {
      // Nothing flies, but the ribbon still states every number — hold the
      // reading time.
      ms = Math.max(TRANSFER_SETTLE_MS + 800, BEAT_MS.transfer)
    } else {
      const streams = timeline.streamsByRound.get(step.roundIndex) ?? []
      ms = transferDurationMs(streams, timeline.exhaustedByRound.get(step.roundIndex) ?? 0)
    }
  } else {
    ms = BEAT_MS[step.kind]
  }
  if (step.kind === 'round-open') {
    if (step.roundIndex === 0) ms += ROUND_1_EXTRA_MS
    if (step.final) ms += FINAL_HOLD_EXTRA_MS
  }
  return ms
}
