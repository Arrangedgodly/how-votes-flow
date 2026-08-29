import { runInstantRunoff } from '../engine/index.ts'
import type { CountResult, ElectionInput } from '../engine/index.ts'
import { CAST } from './cast.ts'
import type { CastMember } from './cast.ts'
import type { Scenario } from './types.ts'

/**
 * The bridge between the scenario layer and the counting engine, plus the
 * plurality-vs-RCV comparison every verdict rests on. Pure functions only —
 * no React, no state; the board and playback layers consume these.
 */

/** Total votes in a scenario. Authored scenarios always total exactly 100. */
export function scenarioVoteTotal(scenario: Scenario): number {
  return scenario.blocs.reduce((sum, bloc) => sum + bloc.weight, 0)
}

/** Convert a scenario into engine input. Copies arrays; never shares references. */
export function toElection(scenario: Scenario): ElectionInput<CastMember> {
  return {
    candidates: [...CAST],
    blocs: scenario.blocs.map((bloc) => ({ weight: bloc.weight, ranking: [...bloc.ranking] })),
  }
}

/** Count a scenario under the adopted default rules. */
export function runScenario(scenario: Scenario): CountResult<CastMember> {
  return runInstantRunoff(toElection(scenario))
}

/** The first-count (plurality) leader, as winner-take-all would see it. */
export interface PluralityResult {
  /** Leader under the engine's policy: first declared candidate holding the max. */
  candidateId: string
  votes: number
  /** All candidates tied at the max — more than one means the lead itself is tied. */
  tiedIds: string[]
}

/**
 * Derive the round-1 plurality leader from a count result. The engine
 * deliberately does not compute this (one tie policy is enough), so the
 * verdict card (T8) and recipe tests derive it from `rounds[0].tallies` —
 * same order, same first-max policy as the engine's own leader rule.
 */
export function pluralityLeader(result: CountResult): PluralityResult {
  const [round1] = result.rounds
  if (!round1) throw new Error('count result has no rounds')
  const top = Math.max(...round1.tallies.map((tally) => tally.votes))
  const tiedIds = round1.tallies.filter((tally) => tally.votes === top).map((tally) => tally.candidateId)
  return { candidateId: tiedIds[0], votes: top, tiedIds }
}

/** The comparison the product states every single time: plurality vs RCV. */
export interface ScenarioVerdict {
  plurality: PluralityResult
  /** The ranked-choice winner. */
  rcvWinnerId: string
  /** True when ranked counting changed the outcome relative to winner-take-all. */
  changed: boolean
}

/** Build the verdict comparison from a count result. */
export function verdictOf(result: CountResult): ScenarioVerdict {
  const plurality = pluralityLeader(result)
  return {
    plurality,
    rcvWinnerId: result.winner.candidateId,
    changed: result.winner.candidateId !== plurality.candidateId,
  }
}

/** A deep, independent copy a UI can mutate without touching the authored data. */
export function cloneScenario(scenario: Scenario): Scenario {
  return structuredClone(scenario)
}
