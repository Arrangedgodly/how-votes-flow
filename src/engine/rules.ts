import type {
  CountRules,
  TieBreakEvent,
  TieBreakPurpose,
  TieBreakResolution,
} from './types.ts'

/**
 * Domain defaults adopted at Town Hall (docs/ultron/town-hall.md, MVP item 6):
 *  - the majority threshold is measured over votes still counting;
 *  - if the final two remain with ballots exhausted and no majority, the
 *    leader wins (explicitly flagged);
 *  - elimination ties break deterministically and are disclosed when they fire.
 *
 * These defaults are the build contract. The research track (R1) may contradict
 * them; every rule-shaped decision lives in this module (plus the decision order
 * documented in ./count.ts) so a contradiction is a localized fix, not a rewrite.
 */

/** The adopted domain rules. */
export const defaultCountRules: CountRules = {
  majorityDenominator: 'active',
  declareFinalTwoLeader: true,
}

/** Smallest vote count that strictly crosses half of `denominator`. */
export function votesNeeded(denominator: number): number {
  return Math.floor(denominator / 2) + 1
}

export interface TieBreakArgs {
  /** Round in which the tie arose. */
  round: number
  purpose: TieBreakPurpose
  /**
   * The tied candidate ids in stable candidate order (the order declared on the
   * election input) — the fallback rule depends on it.
   */
  tiedIds: readonly string[]
  /** Round-1 tallies keyed by candidate id. */
  firstRoundTallies: ReadonlyMap<string, number>
}

/**
 * Deterministic tie-break cascade for candidates tied on the deciding tally:
 * fewest first-round votes loses; if that is still tied, the candidate first in
 * stable candidate order loses. `resolvedBy` names the rule that made the
 * outcome unique, so the UI can disclose exactly what happened.
 */
export function resolveTieBreak(args: TieBreakArgs): TieBreakEvent {
  const { round, purpose, tiedIds, firstRoundTallies } = args
  if (tiedIds.length < 2) {
    throw new Error('tie-break requires at least two tied candidates')
  }

  const firstRoundVotes = (id: string): number => firstRoundTallies.get(id) ?? 0
  const fewestFirstRound = Math.min(...tiedIds.map(firstRoundVotes))
  const narrowed = tiedIds.filter((id) => firstRoundVotes(id) === fewestFirstRound)

  const resolvedBy: TieBreakResolution = narrowed.length === 1 ? 'first-round' : 'candidate-order'
  return {
    round,
    purpose,
    tiedIds: [...tiedIds],
    loserId: narrowed[0],
    resolvedBy,
  }
}
