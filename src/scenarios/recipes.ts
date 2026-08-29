import { CAST } from './cast.ts'
import type { Scenario, ScenarioBloc } from './types.ts'

/**
 * The four authored recipes plus the Custom blank slate. Every recipe is a
 * hand-checked trace through the engine, asserted by src/scenarios/scenarios.test.ts
 * to demonstrably produce its promised lesson (flip / comeback / same / tie fires).
 *
 * Cast hygiene: across the four presets each candidate leads the first count
 * exactly once and wins exactly once, so no face is typecast as the perpetual
 * front-runner or the perpetual loser — the cast stays party-neutral in practice,
 * not just in prose.
 */

const bloc = (id: string, label: string, weight: number, ...ranking: string[]): ScenarioBloc => ({
  id,
  label,
  weight,
  ranking,
})

/**
 * THE SPOILER — the plurality leader loses under ranked counting.
 *
 * Trace (engine-verified): R1 ada 38, nia 30, theo 18, eli 14 — nobody reaches
 * 51, so winner-take-all would hand it to Ada on a 38-vote plurality. Eli is
 * eliminated and 14 votes stream to Nia (44). Theo is eliminated and 18 more
 * arrive (62). Nia crosses 51: a 62–38 majority had ranked Nia over Ada all
 * along — Eli and Theo were splitting it. Lesson delivered: RCV winner ≠
 * round-1 leader.
 */
const theSpoiler: Scenario = {
  id: 'spoiler',
  kind: 'preset',
  title: 'The Spoiler',
  lesson: 'The first-count lead was not a majority — two trailing candidates were splitting the votes that beat it.',
  blocs: [
    bloc('spoiler-1', "Ada's loyalists", 38, 'ada'),
    bloc('spoiler-2', "Nia's loyalists", 30, 'nia'),
    bloc('spoiler-3', "Eli's supporters, Nia second", 14, 'eli', 'nia'),
    bloc('spoiler-4', "Theo's supporters, Nia second", 18, 'theo', 'nia'),
  ],
}

/**
 * THE COMEBACK — a candidate NOT leading round 1 wins.
 *
 * Trace (engine-verified): R1 nia 32, ada 27, eli 24, theo 17. Eli sits third.
 * Theo is eliminated; 17 votes flow to Eli (41). Ada is eliminated; 27 more
 * flow in (68). Eli crosses 51 from third place — the early trailer never led
 * a round until the one that mattered. Distinct from The Spoiler: there the
 * winner was a near-tied second; here the winner starts clearly behind in third.
 */
const theComeback: Scenario = {
  id: 'comeback',
  kind: 'preset',
  title: 'The Comeback',
  lesson: 'Third place after the first count — then two rounds of transfers landed on one door and carried the win.',
  blocs: [
    bloc('comeback-1', "Nia's loyalists", 32, 'nia'),
    bloc('comeback-2', "Ada's supporters, Eli second", 27, 'ada', 'eli'),
    bloc('comeback-3', "Eli's loyalists", 24, 'eli', 'theo'),
    bloc('comeback-4', "Theo's supporters, Eli second", 17, 'theo', 'eli'),
  ],
}

/**
 * STATUS QUO CONFIRMED — ranked counting agrees with the first count.
 *
 * Trace (engine-verified): R1 theo 45, eli 24, nia 19, ada 12 — a clear lead,
 * still short of 51. Ada is eliminated; the 12 votes split 7 to Theo and 5 to
 * Eli. Round 2: Theo 52 ≥ 51 — an outright majority for the same candidate
 * plurality would have picked. The lesson RCV teaches about itself: it does not
 * exist to flip outcomes, it exists to find majorities — and here it confirms.
 */
const statusQuoConfirmed: Scenario = {
  id: 'status-quo',
  kind: 'preset',
  title: 'Status Quo Confirmed',
  lesson: 'No twist this time — ranked counting agreed with the first count and handed the leader an outright majority.',
  blocs: [
    bloc('status-quo-1', "Theo's loyalists", 45, 'theo', 'ada'),
    bloc('status-quo-2', "Eli's supporters", 24, 'eli', 'nia'),
    bloc('status-quo-3', "Nia's supporters", 19, 'nia', 'eli'),
    bloc('status-quo-4', "Ada's supporters, Theo second", 7, 'ada', 'theo'),
    bloc('status-quo-5', "Ada's supporters, Eli second", 5, 'ada', 'eli'),
  ],
}

/**
 * NAIL-BITER — an elimination tie fires and is disclosed; margins stay tight.
 *
 * Trace (engine-verified): R1 eli 34, ada 30, nia 21, theo 15. Theo is
 * eliminated (9 votes to Nia, 6 exhaust). R2: eli 34, ada 30, nia 30 — an
 * exact tie for last. The engine's disclosed tie-break runs: Ada had more
 * round-1 votes (30 vs 21), so Nia is eliminated; 14 votes go to Ada, 7 to
 * Eli, 9 exhaust. R3: ada 44, eli 41 with 15 ballots inactive — threshold 43,
 * cleared by exactly one vote. Plurality leader Eli loses; verdict 'changed',
 * but the lesson under test is the disclosed tie and the one-vote margin.
 */
const nailBiter: Scenario = {
  id: 'nail-biter',
  kind: 'preset',
  title: 'Nail-Biter',
  lesson: 'A tie for last forced a disclosed tie-break — and the winner still cleared the majority line by a single vote.',
  blocs: [
    bloc('nail-biter-1', "Eli's loyalists", 34, 'eli'),
    bloc('nail-biter-2', "Ada's loyalists", 30, 'ada', 'nia'),
    bloc('nail-biter-3', "Nia's supporters, Ada second", 14, 'nia', 'ada'),
    bloc('nail-biter-4', "Nia's supporters, Eli second", 7, 'nia', 'eli'),
    bloc('nail-biter-5', "Theo's supporters, Nia second", 9, 'theo', 'nia'),
    bloc('nail-biter-6', "Theo's loyalists", 6, 'theo'),
  ],
}

/** The four authored recipes, in picker order. */
export const PRESETS: readonly Scenario[] = [theSpoiler, theComeback, statusQuoConfirmed, nailBiter]

/** Look up an authored recipe by scenario id. */
export function presetById(id: string): Scenario | undefined {
  return PRESETS.find((preset) => preset.id === id)
}

/**
 * CUSTOM blank slate — the wide-open field every edit session starts from:
 * four even 25-vote lanes, single-preference, no second choices yet. It is a
 * valid, runnable election (sums to 100; the symmetric bullet field exhausts
 * fully and may legitimately surface tie disclosures — honest engine behavior,
 * and the ready-made exhaustion case for T8's disclosure copy).
 *
 * Factory, not a shared constant: callers own and mutate their copy (T7).
 */
export function blankCustomScenario(): Scenario {
  return {
    id: 'custom',
    kind: 'custom',
    title: 'Custom',
    lesson: 'A wide-open field: four even lanes, no second choices yet — make it yours and run the count.',
    blocs: CAST.map((member, index) => ({
      id: `custom-${index + 1}`,
      label: `${member.name}'s voters`,
      weight: 25,
      ranking: [member.id],
    })),
  }
}
