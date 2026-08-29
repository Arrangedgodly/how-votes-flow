/**
 * Type model for the single-winner instant-runoff (RCV) counting engine.
 *
 * Pure data, no React. The engine consumes an `ElectionInput` and produces a
 * `CountResult`: a complete, deterministic round-by-round record that a UI can
 * replay without recomputing anything — per-round tallies, active/exhausted
 * accounting, per-destination transfer counts, tie disclosures, and the winner
 * declaration.
 */

/** A candidate. `id` keys every ranking and all engine output; `name` and any
 * extra fields are display info for the UI (type-open — extend freely). */
export interface Candidate {
  id: string
  name: string
}

/** A bloc of identical ballots: `weight` voters all casting the same ranking. */
export interface BallotBloc {
  /** Voters in this bloc. Positive integer. */
  weight: number
  /** Candidate ids, 1st choice first. Non-empty, no duplicates, all ids known. */
  ranking: string[]
}

/** An election to count. */
export interface ElectionInput<TCandidate extends Candidate = Candidate> {
  /** The cast, in stable order. Declaration order is the tie-break fallback of last resort. */
  candidates: TCandidate[]
  /** Weighted ranked blocs. Presets constrain the total to 100 votes. */
  blocs: BallotBloc[]
}

/** What "a majority" is measured against. */
export type MajorityDenominator =
  /** Ballots still counting in the current round (adopted default). */
  | 'active'
  /** All ballots cast, ignoring exhaustion. */
  | 'total'

/**
 * The parameterizable domain rules. Defaults are the positions adopted at Town
 * Hall (docs/ultron/town-hall.md, MVP item 6); research track R1 may contradict
 * them, in which case only the defaults change — not the API or the round model.
 */
export interface CountRules {
  /** Denominator for the majority threshold. Default: 'active'. */
  majorityDenominator: MajorityDenominator
  /** Whether the leader is declared winner once only two candidates remain
   * without a majority. Default: true. */
  declareFinalTwoLeader: boolean
}

/** How the winner crossed (or bypassed) the majority threshold. */
export type WinnerMethod =
  /** Votes strictly past half the denominator (default: ballots still counting). */
  | 'majority'
  /** Only two remained with no majority; the leader wins by rule, flagged. */
  | 'final-two-leader'

/** Why a tie-break ran. */
export type TieBreakPurpose =
  /** To choose which tied candidate is eliminated. */
  | 'elimination'
  /** To choose the winner from a final two that was exactly tied. */
  | 'final-winner'

/** Which rule of the deterministic cascade uniquely decided the tie. */
export type TieBreakResolution =
  /** Fewest first-round votes among the tied candidates. */
  | 'first-round'
  /** Stable candidate order (order declared on the election input). */
  | 'candidate-order'

/** Structured disclosure for a deterministic tie-break; the UI narrates it. */
export interface TieBreakEvent {
  /** Round in which the tie occurred. */
  round: number
  purpose: TieBreakPurpose
  /** Tied candidate ids, in candidate order. */
  tiedIds: string[]
  /** The candidate that lost the tie-break (eliminated, or final runner-up). */
  loserId: string
  /** Rule that made the outcome unique. */
  resolvedBy: TieBreakResolution
}

/** Votes moving from an eliminated candidate to one surviving candidate. */
export interface Transfer {
  toId: string
  votes: number
}

/** The elimination decided at the end of a round. */
export interface Elimination {
  /** The round whose tally produced this elimination. */
  round: number
  eliminatedId: string
  /** Present when the fewest-vote race was tied; discloses the tie-break. */
  tieBreak: TieBreakEvent | null
  /** Non-zero transfers to survivors, in candidate order. Survivors that
   * receive nothing are omitted (a zero-vote stream is not an event). */
  transfers: Transfer[]
  /** Ballots resting on the eliminated candidate with no continuing next
   * preference — they become inactive this round. */
  exhausted: number
}

/** One candidate's tally in one round. */
export interface RoundTally {
  candidateId: string
  votes: number
}

/** A full round record, playable by the UI without recomputation. */
export interface RoundResult {
  /** 1-based round number. */
  round: number
  /** Candidates standing at the start of the round, in candidate order. */
  continuingIds: string[]
  /** Tally per continuing candidate, in candidate order (0-vote lanes included). */
  tallies: RoundTally[]
  /** Ballots still counting this round: the sum of tallies. Majority
   * denominator under the default rules. */
  activeVotes: number
  /** Ballots inactive so far this election (no continuing preference). */
  exhaustedVotes: number
  /** Ballots cast. Constant across rounds. */
  totalBallots: number
  /** Votes needed to win this round: the smallest count past half of the
   * denominator under the applied rules. */
  majorityThreshold: number
  /** Elimination decided at this round's end; null in the round that declared
   * a winner. */
  elimination: Elimination | null
}

/** How the winner was declared. */
export interface WinnerDeclaration {
  candidateId: string
  method: WinnerMethod
  /** Round in which the winner was declared. */
  round: number
  /** Explicit flag: the winner never crossed the majority threshold (final-two
   * leader rule). Always false for method 'majority'. */
  wonWithoutMajority: boolean
  /** The winner's tally in the deciding round. */
  votes: number
  /** Set when an exactly tied final two was decided by the deterministic
   * tie-break. */
  tieBreak: TieBreakEvent | null
}

/** The complete result of one count. Deterministic for a given input + rules. */
export interface CountResult<TCandidate extends Candidate = Candidate> {
  /** Echo of the input cast, order preserved (display info intact). */
  candidates: TCandidate[]
  /** Total ballot weight cast. */
  totalBallots: number
  /** Round 1 first; the last round declared the winner. */
  rounds: RoundResult[]
  /** Every tie-break in chronological order. */
  tieBreaks: TieBreakEvent[]
  winner: WinnerDeclaration
  /** The rules actually applied (defaults merged with any overrides). */
  rules: CountRules
}
