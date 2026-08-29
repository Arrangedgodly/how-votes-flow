/**
 * Scenario data model — the authoring layer between the fixed cast and the
 * counting engine (src/engine). A scenario is named voter blocs over candidate
 * ids; `toElection` (see ./runtime.ts) is the only bridge to the engine.
 *
 * Product constraints baked into the model rather than policed by callers:
 * bloc weights across a scenario total exactly 100 votes, rankings run 1–3
 * candidates deep, and rankings never repeat a candidate. The engine validates
 * again at count time — these are authoring guarantees, not secrets.
 */

/** Where a scenario comes from: an authored preset, the blank slate, or the generator. */
export type ScenarioKind = 'preset' | 'custom' | 'surprise'

/** One named bloc of identical ballots. */
export interface ScenarioBloc {
  /** Stable id, unique within the scenario — React keys and editor targeting. */
  id: string
  /** Human label shown on the board/editor, e.g. "Theo's supporters, Nia second". */
  label: string
  /** Votes in this bloc. Positive integer; scenario blocs sum to 100. */
  weight: number
  /** Candidate ids, 1st choice first. 1–3 entries, no duplicates. */
  ranking: string[]
}

/** A playable starting point for the board. */
export interface Scenario {
  id: string
  kind: ScenarioKind
  /** Display title, e.g. "The Spoiler". */
  title: string
  /** One line stating the lesson the run is built to demonstrate. */
  lesson: string
  blocs: ScenarioBloc[]
}
