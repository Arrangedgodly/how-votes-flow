import { CAST, castIds, cloneScenario, scenarioVoteTotal } from '../../scenarios/index.ts'
import type { Scenario } from '../../scenarios/index.ts'

/**
 * The lineup editor's pure state model (T7) — the "second grip" on the board.
 *
 * THE CONSERVED ELECTORATE (the recorded model behind the 100-sum):
 * exactly TOTAL_VOTES voters exist, and every one of them is either on a
 * bloc or in the free pool. `placed + pool === 100` is the invariant every
 * action preserves:
 *
 *   steppers      move one voter at a time — up DRAWS from the pool (blocked
 *                 at pool 0, so the placed sum can never exceed 100), down
 *                 RETURNS one (a bloc never drops below its 1-vote floor)
 *   typed weight  clamps into [1, weight + pool]
 *   delete bloc   returns all of its voters to the pool
 *   add bloc      takes one voter from the pool (needs pool ≥ 1)
 *   spread        the balance control: largest-remainder distribution of the
 *                 whole pool across the blocs — the one-click way back to a
 *   the unplaced  full field
 *
 * TIP OFF is gated on `lineupIssues(...).length === 0`: all 100 placed AND
 * structurally engine-valid (the structural half holds by construction —
 * slot selects only offer unused candidates — but the gate checks honestly).
 *
 * The reducer is pure and total: every action returns a valid Scenario or
 * the same Scenario when it cannot apply. Asserted by editorState.test.ts,
 * including random action sequences keeping `runScenario` throw-free.
 */

export const TOTAL_VOTES = 100
export const MAX_RANK_DEPTH = 3
export const MAX_BLOCS = 12

/** Ranking slot index: 0 = 1st choice, 1 = 2nd, 2 = 3rd. */
export type Slot = 0 | 1 | 2

export type LineupAction =
  | { type: 'load'; scenario: Scenario }
  | { type: 'nudge'; blocId: string; delta: 1 | -1 }
  | { type: 'set-weight'; blocId: string; weight: number }
  | { type: 'set-rank'; blocId: string; slot: Slot; candidateId: string | null }
  | { type: 'remove-bloc'; blocId: string }
  | { type: 'add-bloc' }
  | { type: 'spread-unplaced' }

/** Ballots not on any bloc — waiting to be placed. */
export function freePool(scenario: Scenario): number {
  return TOTAL_VOTES - scenarioVoteTotal(scenario)
}

/* ————— weights ————— */

/**
 * Parse a typed weight into a committable value, or null when the draft is
 * not yet a whole number (empty, "-", partial). Clamps into [1, current+pool]
 * so a commit can never over-place the field.
 */
export function commitWeight(raw: string, current: number, pool: number): number | null {
  if (raw.trim() === '') return null
  const parsed = Number(raw)
  if (!Number.isInteger(parsed)) return null
  return Math.min(Math.max(parsed, 1), current + pool)
}

/* ————— rankings ————— */

/**
 * Rewrite a ranking at `slot`. `candidateId === null` truncates the ranking
 * just above the slot (clearing a 2nd choice drops a 3rd with it). Choosing
 * a candidate already used at another slot SWAPS the two — duplicates are
 * unconstructable, not merely corrected. Setting a slot beyond the current
 * depth + 1 is a no-op (no 3rd choice without a 2nd).
 */
export function setRanking(ranking: readonly string[], slot: Slot, candidateId: string | null): string[] {
  const next = [...ranking]
  if (candidateId === null) {
    if (slot === 0) return next // 1st choice is never clearable from the UI
    return next.slice(0, slot)
  }
  if (slot > next.length) return next
  const existing = next.indexOf(candidateId)
  if (existing === slot) return next
  if (existing !== -1) {
    // Swap with the slot that held this candidate — a friendly, dupe-free
    // move. Only possible against an OCCUPIED slot; choosing an already-used
    // candidate for a brand-new slot has nothing to swap with, so it stays
    // a no-op (the UI never offers it).
    if (slot >= next.length) return next
    next[existing] = next[slot]
  }
  next[slot] = candidateId
  return next.slice(0, MAX_RANK_DEPTH)
}

/* ————— labels ————— */

const ORDINALS = ['1st', '2nd', '3rd'] as const

const FIRST_NAME = new Map(CAST.map((member) => [member.id, member.name.split(' ')[0]]))

/**
 * Derive a bloc's row label from its own ranking ("Eli 1st · Nia 2nd", or
 * "Eli only" for a bullet vote). Authored labels survive weight-only edits;
 * any ranking edit switches the row to this derived form, so a label can
 * never go stale against its picks.
 */
export function deriveBlocLabel(ranking: readonly string[]): string {
  const first = ranking[0]
  if (!first) return 'Unplaced bloc'
  if (ranking.length === 1) return `${FIRST_NAME.get(first) ?? first} only`
  return ranking
    .slice(0, MAX_RANK_DEPTH)
    .map((id, index) => `${FIRST_NAME.get(id) ?? id} ${ORDINALS[index]}`)
    .join(' · ')
}

/* ————— ids ————— */

/** Next in the `bloc-N` series beyond any trailing number in existing ids. */
export function nextBlocId(blocs: readonly { id: string }[]): string {
  let max = 0
  for (const bloc of blocs) {
    const match = bloc.id.match(/(\d+)$/)
    if (match) max = Math.max(max, Number(match[1]))
  }
  return `bloc-${max + 1}`
}

/* ————— the reducer ————— */

function mapBloc(scenario: Scenario, blocId: string, map: (bloc: Scenario['blocs'][number]) => Scenario['blocs'][number]): Scenario {
  return { ...scenario, blocs: scenario.blocs.map((bloc) => (bloc.id === blocId ? map(bloc) : bloc)) }
}

/** Apply one editor action. Pure; unappliable actions return the input. */
export function lineupReducer(scenario: Scenario, action: LineupAction): Scenario {
  switch (action.type) {
    case 'load':
      // Authored data is never shared — the board always edits its own copy.
      return cloneScenario(action.scenario)

    case 'nudge': {
      const pool = freePool(scenario)
      return mapBloc(scenario, action.blocId, (bloc) => {
        const weight = Math.min(Math.max(bloc.weight + action.delta, 1), bloc.weight + pool)
        return weight === bloc.weight ? bloc : { ...bloc, weight }
      })
    }

    case 'set-weight':
      return mapBloc(scenario, action.blocId, (bloc) => {
        if (!Number.isInteger(action.weight)) return bloc
        const weight = Math.min(Math.max(action.weight, 1), bloc.weight + freePool(scenario))
        return weight === bloc.weight ? bloc : { ...bloc, weight }
      })

    case 'set-rank':
      return mapBloc(scenario, action.blocId, (bloc) => {
        const ranking = setRanking(bloc.ranking, action.slot, action.candidateId)
        if (ranking.join() === bloc.ranking.join()) return bloc
        return { ...bloc, ranking, label: deriveBlocLabel(ranking) }
      })

    case 'remove-bloc': {
      if (scenario.blocs.length <= 1) return scenario // keep at least one bloc
      // The weight returns to the free pool by conservation — nothing to do.
      return { ...scenario, blocs: scenario.blocs.filter((bloc) => bloc.id !== action.blocId) }
    }

    case 'add-bloc': {
      if (scenario.blocs.length >= MAX_BLOCS || freePool(scenario) < 1) return scenario
      const ranking = [castIds[0]]
      return {
        ...scenario,
        blocs: [
          ...scenario.blocs,
          { id: nextBlocId(scenario.blocs), label: deriveBlocLabel(ranking), weight: 1, ranking },
        ],
      }
    }

    case 'spread-unplaced': {
      const pool = freePool(scenario)
      if (pool <= 0 || scenario.blocs.length === 0) return scenario
      const base = Math.floor(pool / scenario.blocs.length)
      const extra = pool % scenario.blocs.length
      return {
        ...scenario,
        blocs: scenario.blocs.map((bloc, index) => ({
          ...bloc,
          weight: bloc.weight + base + (index < extra ? 1 : 0),
        })),
      }
    }
  }
}

/* ————— the start gate ————— */

/**
 * Everything that blocks TIP OFF. Empty array ⇒ the field is runnable. The
 * structural checks mirror the engine's own validation; the editor's
 * controls make them unconstructable, and this function is the honest belt
 * to that brace.
 */
export function lineupIssues(scenario: Scenario): string[] {
  const issues: string[] = []
  const pool = freePool(scenario)
  if (scenario.blocs.length === 0) issues.push('Add at least one bloc before tip off.')
  if (pool > 0) {
    issues.push(
      `${pool} ${pool === 1 ? 'ballot is' : 'ballots are'} unplaced — all ${TOTAL_VOTES} must sit on a bloc. Spread the unplaced or place them by hand.`,
    )
  }
  if (pool < 0) issues.push(`${-pool} too many ballots placed — the field only has ${TOTAL_VOTES}.`)
  for (const bloc of scenario.blocs) {
    if (!Number.isInteger(bloc.weight) || bloc.weight < 1) {
      issues.push(`${bloc.label} needs at least 1 vote.`)
    }
    const known = bloc.ranking.every((id) => castIds.includes(id))
    const unique = new Set(bloc.ranking).size === bloc.ranking.length
    if (bloc.ranking.length < 1 || bloc.ranking.length > MAX_RANK_DEPTH || !known || !unique) {
      issues.push(`${bloc.label} needs 1–3 distinct choices.`)
    }
  }
  return issues
}

/* ————— ribbon narration (the editor's announcements) ————— */

/** Announced when a starting point comes onto the board. */
export function ribbonForLoad(scenario: Scenario): string {
  const sum = scenarioVoteTotal(scenario)
  const count = scenario.blocs.length
  if (scenario.kind === 'surprise') {
    return `A fresh random field rolls in — ${sum} ballots across ${count} blocs. Tip off to start the count.`
  }
  return `${scenario.title} is on the board — ${sum} ballots across ${count} blocs. Tip off to start the count.`
}

/** The standing setup narration: the state of the 100, every render. */
export function ribbonForLineup(scenario: Scenario): string {
  const pool = freePool(scenario)
  if (pool > 0) {
    return `${pool} ${pool === 1 ? 'ballot' : 'ballots'} unplaced — every one of the ${TOTAL_VOTES} must sit on a bloc before tip off. Spread the unplaced or place them by hand.`
  }
  return `Lineup set — ${TOTAL_VOTES} ballots across ${scenario.blocs.length} blocs. Tip off to start the count.`
}
