import type {
  BallotBloc,
  Candidate,
  CountResult,
  CountRules,
  ElectionInput,
  Elimination,
  RoundResult,
  RoundTally,
  TieBreakEvent,
  WinnerDeclaration,
} from './types.ts'
import { defaultCountRules, resolveTieBreak, votesNeeded } from './rules.ts'

/**
 * Single-winner instant-runoff (RCV) count over weighted ranked blocs.
 *
 * Deterministic and pure: the same input + rules always produce the same
 * result, and the input is never mutated. Ballots always count toward their
 * highest-ranked continuing candidate, so every round is recomputed from the
 * original rankings — there is no hidden carry-over state to get wrong.
 *
 * Decision order each round (adopted defaults, see ./rules.ts):
 *   1. A candidate past the majority threshold (default denominator: ballots
 *      still counting) wins outright.
 *   2. If only two remain with no majority, the leader wins, explicitly
 *      flagged; an exact tie is resolved by the deterministic tie-break and
 *      disclosed on the winner.
 *   3. Otherwise eliminate the candidate with the fewest votes (ties broken
 *      deterministically) and record where every one of those votes went —
 *      transfers per destination plus newly exhausted ballots.
 */
export function runInstantRunoff<TCandidate extends Candidate>(
  input: ElectionInput<TCandidate>,
  overrides: Partial<CountRules> = {},
): CountResult<TCandidate> {
  validateInput(input)
  const rules: CountRules = { ...defaultCountRules, ...overrides }

  const candidateOrder: string[] = input.candidates.map((candidate) => candidate.id)
  const totalBallots = input.blocs.reduce((sum, bloc) => sum + bloc.weight, 0)
  const firstRoundTallies = tallyRound(input.blocs, candidateOrder)

  const rounds: RoundResult[] = []
  const tieBreaks: TieBreakEvent[] = []
  let continuing = [...candidateOrder]
  let winner: WinnerDeclaration | null = null

  // Each iteration either declares a winner or eliminates one candidate, so the
  // loop terminates within `candidates.length` rounds; the +1 is a bug guard.
  for (let roundNumber = 1; roundNumber <= input.candidates.length + 1; roundNumber++) {
    const continuingSet = new Set(continuing)
    const tallies = tallyRound(input.blocs, continuing)
    const activeVotes = continuing.reduce((sum, id) => sum + (tallies.get(id) ?? 0), 0)
    const exhaustedVotes = totalBallots - activeVotes

    const denominator = rules.majorityDenominator === 'active' ? activeVotes : totalBallots
    const majorityThreshold = votesNeeded(denominator)

    const leaderId = leaderOf(continuing, tallies)
    const leaderVotes = tallies.get(leaderId) ?? 0

    const roundBase = {
      round: roundNumber,
      continuingIds: [...continuing],
      tallies: continuing.map<RoundTally>((id) => ({ candidateId: id, votes: tallies.get(id) ?? 0 })),
      activeVotes,
      exhaustedVotes,
      totalBallots,
      majorityThreshold,
    }

    // 1) Majority of the denominator wins outright.
    if (leaderVotes >= majorityThreshold) {
      rounds.push({ ...roundBase, elimination: null })
      winner = {
        candidateId: leaderId,
        method: 'majority',
        round: roundNumber,
        wonWithoutMajority: false,
        votes: leaderVotes,
        tieBreak: null,
      }
      break
    }

    // 2) Final two with no majority: the leader wins, flagged. Under the active
    //    denominator this branch is reachable only through an exact tie, which
    //    the deterministic tie-break resolves; under a total-ballot denominator
    //    it also covers a plain leader held below half of all votes cast.
    if (continuing.length <= 2 && rules.declareFinalTwoLeader) {
      const tiedIds = continuing.filter((id) => (tallies.get(id) ?? 0) === leaderVotes)
      let winnerId = leaderId
      let tieBreak: TieBreakEvent | null = null
      if (tiedIds.length > 1) {
        const resolved = resolveTieBreak({ round: roundNumber, purpose: 'final-winner', tiedIds, firstRoundTallies })
        tieBreaks.push(resolved)
        tieBreak = resolved
        winnerId = tiedIds.find((id) => id !== resolved.loserId) ?? leaderId
      }
      rounds.push({ ...roundBase, elimination: null })
      winner = {
        candidateId: winnerId,
        method: 'final-two-leader',
        round: roundNumber,
        wonWithoutMajority: true,
        votes: tallies.get(winnerId) ?? 0,
        tieBreak,
      }
      break
    }

    // 3) Eliminate the candidate with the fewest votes; a tie for fewest goes
    //    through the deterministic tie-break and is disclosed.
    const fewestVotes = Math.min(...continuing.map((id) => tallies.get(id) ?? 0))
    const tiedFewest = continuing.filter((id) => (tallies.get(id) ?? 0) === fewestVotes)
    let eliminatedId: string
    let tieBreak: TieBreakEvent | null = null
    if (tiedFewest.length === 1) {
      eliminatedId = tiedFewest[0]
    } else {
      tieBreak = resolveTieBreak({ round: roundNumber, purpose: 'elimination', tiedIds: tiedFewest, firstRoundTallies })
      tieBreaks.push(tieBreak)
      eliminatedId = tieBreak.loserId
    }

    const survivors = continuing.filter((id) => id !== eliminatedId)
    const survivorSet = new Set(survivors)
    const transferTotals = new Map(survivors.map((id) => [id, 0]))
    let exhaustedNow = 0
    for (const bloc of input.blocs) {
      if (topChoice(bloc.ranking, continuingSet) !== eliminatedId) continue
      const next = topChoice(bloc.ranking, survivorSet)
      if (next === undefined) {
        exhaustedNow += bloc.weight
      } else {
        transferTotals.set(next, (transferTotals.get(next) ?? 0) + bloc.weight)
      }
    }
    const transfers = survivors
      .map((toId) => ({ toId, votes: transferTotals.get(toId) ?? 0 }))
      .filter((transfer) => transfer.votes > 0)

    const elimination: Elimination = {
      round: roundNumber,
      eliminatedId,
      tieBreak,
      transfers,
      exhausted: exhaustedNow,
    }
    rounds.push({ ...roundBase, elimination })
    continuing = survivors
  }

  if (winner === null) {
    throw new Error('count did not terminate: no winner declared within the round bound')
  }

  return { candidates: input.candidates, totalBallots, rounds, tieBreaks, winner, rules }
}

/** The bloc's highest-ranked continuing candidate, or undefined if none. */
function topChoice(ranking: readonly string[], continuing: ReadonlySet<string>): string | undefined {
  return ranking.find((id) => continuing.has(id))
}

/** Tallies every bloc toward its highest-ranked continuing candidate. */
function tallyRound(blocs: readonly BallotBloc[], continuing: readonly string[]): Map<string, number> {
  const continuingSet = new Set(continuing)
  const tallies = new Map(continuing.map((id) => [id, 0]))
  for (const bloc of blocs) {
    const top = topChoice(bloc.ranking, continuingSet)
    if (top !== undefined) {
      tallies.set(top, (tallies.get(top) ?? 0) + bloc.weight)
    }
  }
  return tallies
}

/** The leader in stable candidate order (the first candidate holding the max). */
function leaderOf(continuing: readonly string[], tallies: ReadonlyMap<string, number>): string {
  let leader = continuing[0]
  for (const id of continuing) {
    if ((tallies.get(id) ?? 0) > (tallies.get(leader) ?? 0)) leader = id
  }
  return leader
}

function validateInput(input: ElectionInput): void {
  const { candidates, blocs } = input
  if (candidates.length < 2) {
    throw new Error('election input must list at least two candidates')
  }
  const knownIds = new Set<string>()
  for (const candidate of candidates) {
    if (candidate.id === '') {
      throw new Error('candidate id must be a non-empty string')
    }
    if (knownIds.has(candidate.id)) {
      throw new Error(`duplicate candidate id: '${candidate.id}'`)
    }
    knownIds.add(candidate.id)
  }
  if (blocs.length < 1) {
    throw new Error('election input must include at least one ballot bloc')
  }
  blocs.forEach((bloc, index) => {
    if (!Number.isInteger(bloc.weight) || bloc.weight <= 0) {
      throw new Error(`bloc ${index}: weight must be a positive integer (got ${bloc.weight})`)
    }
    if (bloc.ranking.length < 1) {
      throw new Error(`bloc ${index}: ranking must list at least one candidate`)
    }
    if (bloc.ranking.length > candidates.length) {
      throw new Error(
        `bloc ${index}: ranking has ${bloc.ranking.length} entries, more than the ${candidates.length} candidates`,
      )
    }
    const seen = new Set<string>()
    for (const id of bloc.ranking) {
      if (!knownIds.has(id)) {
        throw new Error(`bloc ${index}: ranking references unknown candidate id '${id}'`)
      }
      if (seen.has(id)) {
        throw new Error(`bloc ${index}: ranking lists candidate '${id}' more than once`)
      }
      seen.add(id)
    }
  })
}
