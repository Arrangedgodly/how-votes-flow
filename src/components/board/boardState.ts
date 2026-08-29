import type { CountResult, RoundResult, WinnerDeclaration } from '../../engine/index.ts'
import type { CastMember } from '../../scenarios/index.ts'

/**
 * Pure derivation of presentation state from an engine result — the only layer
 * between `CountResult` and the board components. Everything here is
 * recomputable from the round record: which lanes stand, which are struck,
 * what tally a struck lane froze at, where the majority line sits, and how the
 * 100 courtside tokens are allocated this round. No React, no side effects;
 * asserted by boardState.test.ts.
 */

/** A lane's life at the rendered round. */
export type LaneStatus = 'active' | 'eliminated' | 'winner'

/** One team lane, ready to render. */
export interface LaneView {
  member: CastMember
  /**
   * Tally shown on the lane: the round's live count while standing, or the
   * count the candidate held in the round that eliminated them once struck —
   * a struck lane freezes at its last standing number, it never zeroes.
   */
  votes: number
  status: LaneStatus
  /** On struck lanes: the round whose count produced the elimination. */
  eliminatedInRound: number | null
  /** Present only on the winner lane in the declaring round. */
  winner: WinnerDeclaration | null
}

/** One allocation row of the courtside token field. */
export interface TokenAllocationRow {
  member: CastMember
  votes: number
}

/** The full board state for one rendered round. */
export interface BoardView {
  round: RoundResult
  /** All cast members in declaration order — one lane each, every round. */
  lanes: LaneView[]
  /** Continuing candidates in candidate order (their tokens are theirs). */
  allocation: TokenAllocationRow[]
  /** Ballots with no continuing preference — tokens no candidate owns. */
  exhausted: number
  /** True when the rendered round is the round that declared the winner. */
  decided: boolean
  winner: WinnerDeclaration | null
}

function tallyOf(round: RoundResult, candidateId: string): number {
  return round.tallies.find((tally) => tally.candidateId === candidateId)?.votes ?? 0
}

/**
 * Derive the board state for `roundIndex` (0-based into `result.rounds`,
 * clamped). The engine already guarantees every number; this only reads.
 */
export function boardViewForRound(
  result: CountResult<CastMember>,
  roundIndex: number,
): BoardView {
  const index = Math.min(Math.max(roundIndex, 0), result.rounds.length - 1)
  const round = result.rounds[index]
  const decided = result.winner.round === round.round

  const lanes: LaneView[] = result.candidates.map((member) => {
    if (round.continuingIds.includes(member.id)) {
      const isWinner = decided && result.winner.candidateId === member.id
      return {
        member,
        votes: tallyOf(round, member.id),
        status: isWinner ? 'winner' : 'active',
        eliminatedInRound: null,
        winner: isWinner ? result.winner : null,
      }
    }
    // Struck before this round: freeze at the tally of the round that cut them.
    const outRound = result.rounds.find(
      (candidate) => candidate.elimination?.eliminatedId === member.id,
    )
    return {
      member,
      votes: outRound ? tallyOf(outRound, member.id) : 0,
      status: 'eliminated',
      eliminatedInRound: outRound?.round ?? null,
      winner: null,
    }
  })

  const memberById = new Map(result.candidates.map((member) => [member.id, member]))
  const allocation = round.continuingIds.map((id) => ({
    member: memberById.get(id)!,
    votes: tallyOf(round, id),
  }))

  return {
    round,
    lanes,
    allocation,
    exhausted: round.exhaustedVotes,
    decided,
    winner: decided ? result.winner : null,
  }
}
