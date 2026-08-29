import type { Candidate, CountResult, TieBreakEvent } from '../engine/index.ts'
import { verdictOf } from '../scenarios/index.ts'

/**
 * The copy layer (T8) — every product sentence that is not a control label
 * lives here as data. Components render; they do not author prose.
 *
 * Voice (PRODUCT.md): general-public, plain language (≈8th grade), gently
 * playful arena register, zero partisanship.
 *
 * Terminology is aligned to the official plain-language usage verified by
 * research R1 (docs/ultron/research/R1-rcv-rules.md):
 *  - "ranked-choice voting (RCV)" is the primary name; "instant-runoff
 *    voting" is named once, as a synonym, inside the glossary.
 *  - "ballots still counting" for active/continuing ballots; "stopped
 *    counting" / "exhausted (inactive)" for exhausted ones.
 *  - majority = "more than half of the ballots still counting in this
 *    round" — never "more than half of the 100" after round 1.
 *  - The tie-break disclosure states that real jurisdictions break ties by
 *    LOT (Maine and Alaska law; one Maine city council race was decided by
 *    a name drawn from a bowl), and that this simulator substitutes a
 *    deterministic earlier-count rule so every rerun tells the same story.
 *  - No real-world election numbers are ever printed (R1 flagged Alaska
 *    figures as secondary-sourced). Jurisdiction names and procedure facts
 *    only, phrased generically ("some states and cities").
 *
 * Everything below is a pure function of engine output: the same result
 * always yields the same copy (asserted by copy.test.ts).
 */

/* ————— brand ————— */

export const BRAND: { title: string; subtitle: CopyPart[] } = {
  /** Rendered in the LED register (Doto) — the marquee above the board. */
  title: 'How Votes Flow',
  /** Barlow, one line, with the ranked-choice glossary term linked in. */
  subtitle: ['a ', { term: 'ranked-choice' }, ' simulator'],
}

/* ————— the jargon glossary (tooltip content) ————— */

export type GlossaryId = 'ranked-choice' | 'majority' | 'exhausted' | 'tie-break'

export interface GlossaryEntry {
  id: GlossaryId
  /** The words as they read in running copy (the tooltip's trigger). */
  term: string
  /** Plain-language definition, ≈8th grade. */
  definition: string
}

export const GLOSSARY: Readonly<Record<GlossaryId, GlossaryEntry>> = {
  'ranked-choice': {
    id: 'ranked-choice',
    term: 'ranked-choice voting',
    definition:
      'A way of voting where you rank the candidates in order — 1st, 2nd, 3rd. If your 1st choice gets eliminated, your vote moves to your next choice still in the race, so it is never wasted on a lost cause. Also called instant-runoff voting. Some states and cities in the U.S. count elections this way.',
  },
  majority: {
    id: 'majority',
    term: 'majority',
    definition:
      'More than half of the ballots still counting in the current round. Ballots that ran out of rankings stop counting, so the line can sit below half of the original 100.',
  },
  exhausted: {
    id: 'exhausted',
    term: 'exhausted',
    definition:
      'A ballot is exhausted — election offices also say inactive — when every candidate it ranked has been eliminated. It has no next choice left, so it stops counting, and it never comes back.',
  },
  'tie-break': {
    id: 'tie-break',
    term: 'tie-break',
    definition:
      'A rule for settling a tie. Real elections often settle ties by lot — a coin flip or a name drawn at random; Maine and Alaska put drawing lots in their rules. This simulator uses a fixed rule instead (the tied candidate with fewer earlier votes loses) so the same ballots always tell the same story.',
  },
}

/* ————— shared copy parts ————— */

/** A string, or a glossary term the UI renders as a tooltip. */
export type CopyPart = string | { term: GlossaryId }

/** Join parts into plain text (tests, live-region fallbacks). */
export function partsToText(parts: readonly CopyPart[]): string {
  return parts
    .map((part) => (typeof part === 'string' ? part : GLOSSARY[part.term].term))
    .join('')
}

function memberOf(result: CountResult<Candidate>, id: string): Candidate {
  return result.candidates.find((candidate) => candidate.id === id)!
}

function votesWord(count: number): string {
  return `${count} ${Math.abs(count) === 1 ? 'vote' : 'votes'}`
}

function ballotsWord(count: number): string {
  return `${count} ${Math.abs(count) === 1 ? 'ballot' : 'ballots'}`
}

/** "A", "A and B", "A, B, and C" — list grammar that holds at any length. */
function joinNames(names: readonly string[]): string {
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`
}

function nameList(result: CountResult<Candidate>, ids: readonly string[]): string {
  return joinNames(ids.map((id) => memberOf(result, id).name))
}

/** "7 to Theo Bass and 5 to Eli Park" — the compact destination statement. */
function destinationsCompact(
  result: CountResult<Candidate>,
  entries: readonly { toId: string; votes: number }[],
): string {
  const parts = entries.map((entry) => `${entry.votes} to ${memberOf(result, entry.toId).name}`)
  if (parts.length === 1) return parts[0]
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
}

/** Percentage of a share, rounded (52%, never 51.76%). */
function percentOf(share: number, of: number): number {
  return Math.round((share / of) * 100)
}

/* ————— the round-1 winner-take-all frame ————— */

/** The lane chip on the round-1 leader: the setup beat of the reveal. */
export const LANE_STOPPED_HERE = 'if we stopped here'

/** The plurality leader of round 1 (the winner-take-all candidate). */
function roundOneLeader(result: CountResult<Candidate>): {
  tiedIds: readonly string[]
  votes: number
} {
  const [round1] = result.rounds
  const top = Math.max(...round1.tallies.map((tally) => tally.votes))
  const tiedIds = round1.tallies.filter((tally) => tally.votes === top).map((tally) => tally.candidateId)
  return { tiedIds, votes: top }
}

/**
 * The reveal's setup line — the ribbon's round-1 framing: if the count
 * stopped here, winner-take-all would hand it all to the plurality leader.
 */
export function winnerTakeAllFrame(result: CountResult<Candidate>): string {
  const { tiedIds, votes } = roundOneLeader(result)
  if (tiedIds.length > 1) {
    return `If we stopped counting here, winner-take-all could not pick a winner — ${nameList(result, tiedIds)} are tied at ${votes} first choices each.`
  }
  return `If we stopped counting here, winner-take-all would hand it all to ${memberOf(result, tiedIds[0]).name} on ${votesWord(votes)}.`
}

/** The ribbon's round-1 note when the first count already crossed the line. */
export function roundOneCrossedFrame(result: CountResult<Candidate>): string {
  const { tiedIds, votes } = roundOneLeader(result)
  if (tiedIds.length > 1) {
    return `${nameList(result, tiedIds)} tie the first count at ${votes} each — winner-take-all would need a coin flip.`
  }
  return `${memberOf(result, tiedIds[0]).name} crosses it outright with ${votesWord(votes)} — winner-take-all and ranked counting agree from the start.`
}

/* ————— the verdict card ————— */

export type VerdictKind = 'changed' | 'same' | 'tied-first'

export interface VerdictSide {
  /** The small caps label above the name ("If the count stopped at round 1"). */
  label: string
  candidateId: string
  name: string
  /** The side's tally in the Doto register. */
  votes: number
  /** Caption under the tally; may carry a glossary term. */
  caption: CopyPart[]
}

export interface VerdictStoryLine {
  /** "R1"…"R3", or "Final". */
  tag: string
  text: string
}

export interface VerdictDisclosure {
  key: 'tie' | 'exhausted'
  /** Small caps strip label; may carry a glossary term. */
  label: CopyPart[]
  body: string[]
}

export interface VerdictCopy {
  /** The overall shape of the ending — drives the treatment. */
  kind: VerdictKind
  /** The reveal treatment chip ("Ranking changed the outcome"). */
  headline: string
  /** One sentence under the headline, carrying both names. */
  standfirst: string
  pluralitySide: VerdictSide
  rankedSide: VerdictSide
  storyTitle: string
  story: VerdictStoryLine[]
  disclosures: VerdictDisclosure[]
  /** The pointer at Replay and the editing grip below the card. */
  nextMoves: string
}

/** The by-round story: who was eliminated, where the votes went, the end. */
function storyLines(result: CountResult<Candidate>): VerdictStoryLine[] {
  const lines: VerdictStoryLine[] = []

  for (const round of result.rounds) {
    const elimination = round.elimination
    if (!elimination) continue
    const eliminated = memberOf(result, elimination.eliminatedId)
    const votes = round.tallies.find((tally) => tally.candidateId === eliminated.id)?.votes ?? 0

    const tieLead = elimination.tieBreak
      ? `A tie for last — ${nameList(result, elimination.tieBreak.tiedIds)} at ${votes} each — goes to the tie-break: `
      : ''
    const totalMoved = elimination.transfers.reduce((sum, transfer) => sum + transfer.votes, 0)
    // One destination states it directly; several state the total then the
    // split — every transfer carries its own number either way.
    const moved =
      elimination.transfers.length === 0
        ? ''
        : elimination.transfers.length === 1
          ? `${totalMoved} ${totalMoved === 1 ? 'moves' : 'move'} to ${memberOf(result, elimination.transfers[0].toId).name}`
          : `${totalMoved} move: ${destinationsCompact(result, elimination.transfers)}`
    const ranOut = elimination.exhausted > 0
      ? `${moved ? ', ' : ''}${ballotsWord(elimination.exhausted)} ${elimination.exhausted === 1 ? 'runs' : 'run'} out of rankings`
      : ''

    lines.push({
      tag: `R${round.round}`,
      text: `${tieLead}${eliminated.name} is eliminated on ${votesWord(votes)} — ${moved}${ranOut}.`,
    })
  }

  const finalRound = result.rounds[result.rounds.length - 1]
  const winner = memberOf(result, result.winner.candidateId)
  const { votes, method } = result.winner
  if (method === 'majority') {
    const share = percentOf(votes, finalRound.activeVotes)
    lines.push({
      tag: 'Final',
      text: `${winner.name} crosses the line — ${votes} of the ${finalRound.activeVotes} ballots still counting (${share}%), past ${finalRound.majorityThreshold}.`,
    })
  } else if (result.winner.tieBreak) {
    lines.push({
      tag: 'Final',
      text: `Nobody crosses ${finalRound.majorityThreshold}. The final two tie at ${votes} each, and the tie-break names ${winner.name} the winner.`,
    })
  } else {
    const [a, b] = finalRound.tallies
    const other = a.candidateId === result.winner.candidateId ? b : a
    lines.push({
      tag: 'Final',
      text: `Nobody crosses ${finalRound.majorityThreshold}. With only two left, the leader wins: ${winner.name} ${votes}, ${memberOf(result, other.candidateId).name} ${other.votes}.`,
    })
  }

  return lines
}

/** The plain-language tie-break disclosure (R1: name the lot, then our rule). */
function tieDisclosure(result: CountResult<Candidate>): VerdictDisclosure | null {
  if (result.tieBreaks.length === 0) return null

  const events = result.tieBreaks.map((tie) => tieEventSentence(result, tie))
  const body = [
    `${events.join(' ')}`,
    'Real elections often settle ties by lot — a coin flip or a name drawn at random. Maine and Alaska put drawing lots in their rules, and one Maine city council race was decided by a name drawn from a bowl.',
    `This simulator can't flip coins and stay repeatable, so it uses a fixed rule instead: the tied candidate with the fewest earlier votes loses${
      result.tieBreaks.some((tie) => tie.resolvedBy === 'candidate-order')
        ? ', and if those match too, the first name on the roster loses'
        : ''
    }. The count below plays out under that rule.`,
  ]

  return { key: 'tie', label: ['The ', { term: 'tie-break' }], body }
}

function tieEventSentence(result: CountResult<Candidate>, tie: TieBreakEvent): string {
  const names = nameList(result, tie.tiedIds)
  const round = result.rounds[tie.round - 1]
  const votes = round.tallies.find((tally) => tally.candidateId === tie.loserId)?.votes ?? 0
  if (tie.purpose === 'final-winner') {
    return `Round ${tie.round}: the final two tied exactly — ${names} at ${votes} each.`
  }
  return `Round ${tie.round}: ${names} tied for last place at ${votes} each.`
}

/** The exhausted-ballot disclosure: the term, the dropped line, both shares. */
function exhaustedDisclosure(result: CountResult<Candidate>): VerdictDisclosure | null {
  const finalRound = result.rounds[result.rounds.length - 1]
  if (finalRound.exhaustedVotes <= 0) return null

  const winner = memberOf(result, result.winner.candidateId)
  const body = [
    `By the final count, ${ballotsWord(finalRound.exhaustedVotes)} of the ${result.totalBallots} were exhausted — every candidate they ranked had been eliminated, so there was no next choice left to count.`,
    `The majority line follows the ballots still counting, which is why it dropped from ${result.rounds[0].majorityThreshold} to ${finalRound.majorityThreshold} for the final round.`,
  ]
  if (percentOf(result.winner.votes, result.totalBallots) < 50) {
    body.push(
      `${winner.name}'s ${result.winner.votes} votes are ${percentOf(result.winner.votes, finalRound.activeVotes)}% of the ballots still counting — and ${percentOf(result.winner.votes, result.totalBallots)}% of all ${result.totalBallots}. Real ranked-choice elections measure the endgame against the ballots still counting too, not against every ballot cast.`,
    )
  }

  return { key: 'exhausted', label: [{ term: 'exhausted' }, ' ballots — stopped counting'], body }
}

/**
 * The full verdict card copy: plurality (winner-take-all) vs ranked-choice,
 * changed or same, plus the by-round story and every disclosure that fires.
 */
export function verdictCopy(result: CountResult<Candidate>): VerdictCopy {
  const verdict = verdictOf(result)
  const memberById = new Map(result.candidates.map((member) => [member.id, member]))
  const pluralityMember = memberById.get(verdict.plurality.candidateId)!
  const winnerMember = memberById.get(verdict.rcvWinnerId)!
  const pluralityTied = verdict.plurality.tiedIds.length > 1

  const kind: VerdictKind = pluralityTied ? 'tied-first' : verdict.changed ? 'changed' : 'same'
  const finalRound = result.rounds[result.rounds.length - 1]

  const headline =
    kind === 'changed'
      ? 'Ranking changed the outcome'
      : kind === 'same'
        ? 'Ranking confirmed the outcome'
        : 'A tie the first count could not settle'

  let standfirst: string
  if (kind === 'tied-first') {
    standfirst = `The first count could not pick a leader — ${nameList(result, verdict.plurality.tiedIds)} tied at ${verdict.plurality.votes}. Winner-take-all would need a coin flip; ranked counting kept going and landed on ${winnerMember.name}.`
  } else if (kind === 'changed') {
    standfirst = `The first-count lead was ${pluralityMember.name}'s. The rankings underneath it belonged to ${winnerMember.name}.`
  } else if (result.winner.round === 1) {
    standfirst = `${winnerMember.name} crossed the majority line in round 1 with ${votesWord(result.winner.votes)} — both ways of counting agree at the buzzer.`
  } else {
    standfirst = `Winner-take-all would have called it on a ${verdict.plurality.votes}-vote lead. Ranked counting played the whole field out and walked ${winnerMember.name} over the line.`
  }

  const disclosures: VerdictDisclosure[] = []
  const tie = tieDisclosure(result)
  if (tie) disclosures.push(tie)
  const exhausted = exhaustedDisclosure(result)
  if (exhausted) disclosures.push(exhausted)

  return {
    kind,
    headline,
    standfirst,
    pluralitySide: {
      label: 'If the count stopped at round 1',
      candidateId: pluralityMember.id,
      name: pluralityMember.name,
      votes: verdict.plurality.votes,
      caption: ['winner-take-all · the most first choices, no majority needed'],
    },
    rankedSide: {
      label: 'After every round',
      candidateId: winnerMember.id,
      name: winnerMember.name,
      votes: result.winner.votes,
      caption: [
        'ranked-choice winner · a ',
        { term: 'majority' },
        ` of the ${finalRound.activeVotes} ballots still counting`,
      ],
    },
    storyTitle: 'How the count got there',
    story: storyLines(result),
    disclosures,
    nextMoves:
      'Replay the count from the tip-off — or rewrite the field below and run a different ending.',
  }
}
