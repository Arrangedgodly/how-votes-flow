import type { Candidate, CountResult, RoundResult, TieBreakEvent } from '../engine/index.ts'
import { roundOneCrossedFrame, winnerTakeAllFrame } from '../copy/copy.ts'
import type { PlaybackStep } from './timeline.ts'

/**
 * Ribbon narration (T6 wiring, T8 copy) — every board state change stated in
 * text.
 *
 * The ribbon is the accessibility channel AND the narrator (one element, both
 * jobs): in reduced-motion mode these strings carry the identical story with
 * no motion-only information anywhere — counts, eliminations, transfers,
 * exhaustion, threshold changes, and the winner are all stated here, per
 * round, before or as they happen on the board.
 *
 * Pure functions of the engine result: the same result + step always yields
 * the same string (asserted by narration.test.ts). Wording follows the R1
 * terminology record (docs/ultron/research/R1-rcv-rules.md): "ballots still
 * counting", "stopped counting / exhausted", the tie-break names lot as the
 * real-world method, and round 1 is framed as what winner-take-all would do
 * (the reveal's setup line lives in src/copy/copy.ts with the card copy).
 */

/* ————— small copy helpers ————— */

function memberOf(result: CountResult<Candidate>, id: string): Candidate {
  return result.candidates.find((candidate) => candidate.id === id)!
}

/** First name for tally lists (scoreboard register); full names in sentences. */
function firstNames(result: CountResult<Candidate>): (id: string) => string {
  return (id: string) => memberOf(result, id).name.split(' ')[0]
}

function votesWord(count: number): string {
  return `${count} ${Math.abs(count) === 1 ? 'vote' : 'votes'}`
}

function ballotsWord(count: number): string {
  return `${count} ${Math.abs(count) === 1 ? 'ballot' : 'ballots'}`
}

/** "9 more ballots" — the follow-up exhaustion count. */
function moreBallotsWord(count: number): string {
  return `${count} more ${Math.abs(count) === 1 ? 'ballot' : 'ballots'}`
}

/** "A", "A and B", "A, B, and C" — list grammar that holds at any length. */
function joinWords(words: readonly string[]): string {
  if (words.length === 1) return words[0]
  if (words.length === 2) return `${words[0]} and ${words[1]}`
  return `${words.slice(0, -1).join(', ')}, and ${words[words.length - 1]}`
}

/** "a to X, b to Y, and c to Z" — the per-destination transfer statement. */
function destinations(result: CountResult<Candidate>, entries: readonly { toId: string; votes: number }[]): string {
  const fullName = (id: string) => memberOf(result, id).name
  const parts = entries.map((entry) => `${entry.votes} to ${fullName(entry.toId)}`)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`
}

/** Tallies read in rank order (first-max policy, like the engine's leader). */
function tallyList(round: RoundResult, firstName: (id: string) => string): string {
  const ordered = [...round.tallies].sort((a, b) => b.votes - a.votes)
  return ordered.map((tally) => `${firstName(tally.candidateId)} ${tally.votes}`).join(', ')
}

/**
 * The tie-break method in plain words: the deterministic earlier-count rule
 * first (the prior-round-total framing R1 asked for), the roster order only
 * as the named last resort.
 */
function tieRuleWords(tie: TieBreakEvent): string {
  return tie.resolvedBy === 'first-round' ? 'the earlier count' : 'the roster order as a last resort'
}

/* ————— beat narration ————— */

/** Setup phase: the board is loaded, the count has not started. */
export function ribbonForSetup(result: CountResult<Candidate>): string {
  return `${result.totalBallots} ballots, ${result.candidates.length} candidates. Tip off to start the count — round 1 is first choices only.`
}

function ribbonRoundOne(result: CountResult<Candidate>, final: boolean): string {
  const round = result.rounds[0]
  const firstName = firstNames(result)
  const tallyLine = tallyList(round, firstName)

  const framing = final ? roundOneCrossedFrame(result) : winnerTakeAllFrame(result)
  const crossing = final ? '' : ' Nobody has crossed it.'

  return `Round 1 — first choices only: ${tallyLine}. The majority line sits at ${round.majorityThreshold}.${crossing} ${framing}`
}

function ribbonRoundOpen(result: CountResult<Candidate>, roundIndex: number, final: boolean): string {
  const round = result.rounds[roundIndex]
  if (roundIndex === 0) return ribbonRoundOne(result, final)
  const firstName = firstNames(result)
  const tallyLine = tallyList(round, firstName)

  const elimination = result.rounds[roundIndex - 1].elimination
  const recap = elimination ? `After ${memberOf(result, elimination.eliminatedId).name}'s elimination, ` : ''

  const previousExhausted = result.rounds[roundIndex - 1].exhaustedVotes
  const lineWord =
    round.majorityThreshold < result.rounds[0].majorityThreshold ? 'drops to' : 'sits at'
  const exhaustion =
    round.exhaustedVotes > previousExhausted
      ? `${ballotsWord(round.exhaustedVotes)} have now stopped counting, so the majority line ${lineWord} ${round.majorityThreshold}.`
      : `The majority line ${lineWord} ${round.majorityThreshold}.`
  const crossing = final ? '' : ' Nobody has crossed it.'

  const opener = final ? 'Final count' : `Round ${round.round}`
  return `${opener} — ${recap}ballots counting: ${tallyLine}. ${exhaustion}${crossing}`
}

function ribbonStrike(result: CountResult<Candidate>, roundIndex: number): string {
  const round = result.rounds[roundIndex]
  const elimination = round.elimination!
  const eliminated = memberOf(result, elimination.eliminatedId)
  const votes = round.tallies.find((tally) => tally.candidateId === eliminated.id)?.votes ?? 0

  const tie = elimination.tieBreak
  if (tie) {
    const names = joinWords(tie.tiedIds.map((id) => firstNames(result)(id)))
    return `Round ${round.round} — a tie for last place: ${names} at ${votes} each. Real elections often settle ties by lot — a coin flip or a drawn name. This simulator keeps every rerun identical, so the tie-break uses ${tieRuleWords(tie)} instead: ${eliminated.name} is eliminated.`
  }
  return `Round ${round.round} — ${eliminated.name} has the fewest votes (${votes}) and is eliminated.`
}

/** Has any ballot exhausted before this round's elimination? (first-use gloss) */
function exhaustedBefore(result: CountResult<Candidate>, roundIndex: number): boolean {
  return result.rounds
    .slice(0, roundIndex)
    .some((round) => (round.elimination?.exhausted ?? 0) > 0)
}

function ribbonTransfer(result: CountResult<Candidate>, roundIndex: number): string {
  const elimination = result.rounds[roundIndex].elimination!
  const eliminated = memberOf(result, elimination.eliminatedId)
  const total = elimination.transfers.reduce((sum, transfer) => sum + transfer.votes, 0)

  const movement =
    elimination.transfers.length > 0
      ? `${ballotsWord(total)} move to their next choices: ${destinations(result, elimination.transfers)}.`
      : ''

  // First exhaustion of the run carries the plain-language gloss of the term
  // of art (R1: "exhausted", with why it no longer counts).
  const exhaustion =
    elimination.exhausted > 0
      ? exhaustedBefore(result, roundIndex)
        ? `${elimination.transfers.length > 0 ? ' And ' : ''}${moreBallotsWord(elimination.exhausted)} listed no next choice and stop counting.`
        : `${elimination.transfers.length > 0 ? ' And ' : ''}${ballotsWord(elimination.exhausted)} listed no next choice — everyone they ranked is now out, so they are exhausted and stop counting.`
      : ''

  return `${eliminated.name}'s ${movement}${exhaustion}`.trim().replace(/\s+/g, ' ')
}

function ribbonWinner(result: CountResult<Candidate>): string {
  const winner = result.winner
  const round = result.rounds[result.rounds.length - 1]
  const name = memberOf(result, winner.candidateId).name

  if (winner.method === 'majority') {
    return `Final — ${name} crosses the majority line with ${votesWord(winner.votes)} of the ${round.activeVotes} still counting, past the line of ${round.majorityThreshold}. ${name} wins.`
  }

  if (winner.tieBreak) {
    return `Final two — nobody crosses the line of ${round.majorityThreshold}: an exact tie. This simulator's fixed tie-break decides it, and ${name} wins.`
  }

  const firstName = firstNames(result)
  const [a, b] = round.tallies
  return `Final two — nobody crosses the line of ${round.majorityThreshold}. ${firstName(a.candidateId)} ${a.votes}, ${firstName(b.candidateId)} ${b.votes}, with ${ballotsWord(round.exhaustedVotes)} no longer counting. With two left, the leader wins — real ranked-choice elections count it the same way: ${name}.`
}

/**
 * The ribbon string for any beat of the count. Deterministic given the
 * engine result — motion or not, skipped or watched, the same story.
 */
export function ribbonForStep(result: CountResult<Candidate>, step: PlaybackStep): string {
  switch (step.kind) {
    case 'round-open':
      return ribbonRoundOpen(result, step.roundIndex, step.final)
    case 'strike':
      return ribbonStrike(result, step.roundIndex)
    case 'transfer':
      return ribbonTransfer(result, step.roundIndex)
    case 'winner':
      return ribbonWinner(result)
  }
}
