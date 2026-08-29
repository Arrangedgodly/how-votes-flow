import { CAST, castIds } from './cast.ts'
import type { Scenario, ScenarioBloc } from './types.ts'

/**
 * Surprise Me — a seeded generator of random-but-plausible scenarios.
 *
 * Guarantees (property-tested over 100 seeds in scenarios.test.ts):
 *  - bloc weights are positive integers summing to exactly 100;
 *  - every ranking is 1–3 known candidate ids with no repeats;
 *  - every candidate starts with 10–40 first-preference votes, so the field
 *    has no dead lanes and no round-1 majority — the count always runs at
 *    least one elimination round;
 *  - the engine terminates on the result within the round bound (4 rounds,
 *    at most 3 eliminations, with 4 candidates).
 *
 * Same seed, same scenario — reproducible for tests and support; the UI passes
 * a fresh random seed per click.
 */

/** Deterministic small PRNG (mulberry32) — enough entropy for 100-vote fields. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Random partition of `total` into `parts` integers within [min, max], sum
 * exact. Random draws first, then a cyclic repair pass (pick any part still
 * inside bounds and nudge it toward the target) — always reachable within the
 * bounds used here, so the repair terminates.
 */
function partitionTotal(
  rand: () => number,
  total: number,
  parts: number,
  min: number,
  max: number,
): number[] {
  const values = Array.from({ length: parts }, () => min + Math.floor(rand() * (max - min + 1)))
  let sum = values.reduce((acc, value) => acc + value, 0)
  for (let i = 0; sum !== total; i = (i + 1) % parts) {
    if (sum < total && values[i] < max) {
      values[i]++
      sum++
    } else if (sum > total && values[i] > min) {
      values[i]--
      sum--
    }
  }
  return values
}

/** Shuffle with the seeded PRNG (Fisher–Yates). */
function shuffled<T>(rand: () => number, items: readonly T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/** First-preference bounds: no dead lanes, and no round-1 majority (leader ≤ 40 < 51). */
const MIN_FIRST_CHOICE = 10
const MAX_FIRST_CHOICE = 40

/** How many distinct blocs a candidate's voters split into. */
function chooseGroupCount(rand: () => number, weight: number): number {
  const roll = rand()
  const wanted = roll < 0.35 ? 1 : roll < 0.8 ? 2 : 3
  return Math.min(wanted, weight)
}

/** Ranking depth beyond the first choice: 0 (bullet), 1, or 2 backups. */
function chooseDepth(rand: () => number): number {
  const roll = rand()
  return roll < 0.2 ? 0 : roll < 0.6 ? 1 : 2
}

/** Generate a fresh random scenario. Omit the seed for a one-off roll. */
export function generateSurpriseScenario(seed: number = Math.floor(Math.random() * 2 ** 31)): Scenario {
  const rand = mulberry32(seed)
  const firstChoiceTotals = partitionTotal(rand, 100, CAST.length, MIN_FIRST_CHOICE, MAX_FIRST_CHOICE)

  const blocs: ScenarioBloc[] = []
  CAST.forEach((member, index) => {
    const total = firstChoiceTotals[index]
    const groups = partitionTotal(rand, total, chooseGroupCount(rand, total), 1, total)
    groups.forEach((weight, groupIndex) => {
      const backups = shuffled(
        rand,
        castIds.filter((id) => id !== member.id),
      ).slice(0, chooseDepth(rand))
      blocs.push({
        id: `surprise-${index + 1}-${groupIndex + 1}`,
        label: groups.length > 1 ? `${member.name}'s voters — group ${groupIndex + 1}` : `${member.name}'s voters`,
        weight,
        ranking: [member.id, ...backups],
      })
    })
  })

  return {
    id: 'surprise',
    kind: 'surprise',
    title: 'Surprise Me',
    lesson: 'A random field with honest arithmetic — where the votes land is anyone\u2019s guess.',
    blocs,
  }
}
