import { describe, expect, it } from 'vitest'
import {
  blankCustomScenario,
  generateSurpriseScenario,
  PRESETS,
  presetById,
  runScenario,
  scenarioVoteTotal,
} from '../../scenarios/index.ts'
import type { Scenario } from '../../scenarios/index.ts'
import {
  commitWeight,
  deriveBlocLabel,
  freePool,
  lineupIssues,
  lineupReducer,
  MAX_BLOCS,
  nextBlocId,
  ribbonForLineup,
  ribbonForLoad,
  setRanking,
  TOTAL_VOTES,
  type LineupAction,
} from './editorState.ts'

/**
 * T7 — the on-board editor's pure model. The contract under test:
 *  - the conserved electorate: placed + pool === 100 through EVERY action;
 *  - impossible states prevented (sum never exceeds 100, weights ≥ 1,
 *    rankings never duplicate, the field never empties);
 *  - the start gate: TIP OFF needs all 100 placed and a structurally valid
 *    lineup;
 *  - preset priming: loads are independent clones of the authored data.
 */

const spoiler = presetById('spoiler')!
const firstBlocOf = (scenario: Scenario) => scenario.blocs[0]
const apply = (scenario: Scenario, ...actions: LineupAction[]) =>
  actions.reduce((current, action) => lineupReducer(current, action), scenario)

/** The conservation + validity invariant, checked after every action. */
function assertConserved(scenario: Scenario) {
  const sum = scenarioVoteTotal(scenario)
  expect(sum).toBeLessThanOrEqual(TOTAL_VOTES)
  expect(sum).toBeGreaterThanOrEqual(scenario.blocs.length) // every bloc holds ≥1
  expect(freePool(scenario)).toBe(TOTAL_VOTES - sum)
  expect(freePool(scenario)).toBeGreaterThanOrEqual(0)
  for (const bloc of scenario.blocs) {
    expect(Number.isInteger(bloc.weight)).toBe(true)
    expect(bloc.weight).toBeGreaterThanOrEqual(1)
    expect(new Set(bloc.ranking).size).toBe(bloc.ranking.length)
    expect(bloc.ranking.length).toBeGreaterThanOrEqual(1)
    expect(bloc.ranking.length).toBeLessThanOrEqual(3)
  }
}

describe('editor: preset priming', () => {
  it('loads a clone — authored data never mutates through the editor', () => {
    const before = structuredClone(spoiler)
    const loaded = lineupReducer(blankCustomScenario(), { type: 'load', scenario: spoiler })
    apply(
      loaded,
      { type: 'nudge', blocId: 'spoiler-1', delta: 1 },
      { type: 'set-rank', blocId: 'spoiler-2', slot: 0, candidateId: 'theo' },
      { type: 'remove-bloc', blocId: 'spoiler-3' },
    )
    expect(spoiler).toEqual(before)
    expect(loaded).not.toBe(spoiler)
    expect(loaded.blocs).not.toBe(spoiler.blocs)
  })

  it('every starting point boots runnable: presets, Custom, seeded surprises', () => {
    const starts = [...PRESETS, blankCustomScenario()]
    for (const seed of [1, 7, 42, 71356508]) starts.push(generateSurpriseScenario(seed))
    for (const start of starts) {
      expect(lineupIssues(start)).toEqual([])
      expect(() => runScenario(start)).not.toThrow()
    }
  })
})

describe('editor: the conserved 100', () => {
  it('nudge up draws from the pool; at pool 0 it is blocked', () => {
    let scenario = lineupReducer(spoiler, { type: 'load', scenario: spoiler })
    expect(freePool(scenario)).toBe(0)
    const stuck = lineupReducer(scenario, { type: 'nudge', blocId: 'spoiler-1', delta: 1 })
    expect(firstBlocOf(stuck).weight).toBe(38) // impossible state prevented
    assertConserved(stuck)

    scenario = lineupReducer(scenario, { type: 'nudge', blocId: 'spoiler-1', delta: -1 })
    expect(firstBlocOf(scenario).weight).toBe(37)
    expect(freePool(scenario)).toBe(1)
    scenario = lineupReducer(scenario, { type: 'nudge', blocId: 'spoiler-1', delta: 1 })
    expect(firstBlocOf(scenario).weight).toBe(38)
    expect(freePool(scenario)).toBe(0)
  })

  it('nudge down stops at the 1-vote floor', () => {
    const custom = lineupReducer(blankCustomScenario(), { type: 'load', scenario: blankCustomScenario() })
    const small = apply(custom, { type: 'set-weight', blocId: 'custom-1', weight: 1 })
    expect(firstBlocOf(small).weight).toBe(1)
    expect(freePool(small)).toBe(24) // 100 − (1 + 25 + 25 + 25)
    const floor = lineupReducer(small, { type: 'nudge', blocId: 'custom-1', delta: -1 })
    expect(firstBlocOf(floor).weight).toBe(1)
    expect(freePool(floor)).toBe(24)
  })

  it('commitWeight parses, rejects drafts, and clamps into the possible range', () => {
    expect(commitWeight('45', 38, 0)).toBe(38) // over the pool → clamped to current
    expect(commitWeight('45', 20, 10)).toBe(30) // clamped to weight + pool
    expect(commitWeight('3', 38, 0)).toBe(3)
    expect(commitWeight('1', 5, 0)).toBe(1)
    expect(commitWeight('0', 5, 0)).toBe(1) // floor
    expect(commitWeight('', 5, 0)).toBeNull()
    expect(commitWeight('  ', 5, 0)).toBeNull()
    expect(commitWeight('4.5', 5, 0)).toBeNull()
    expect(commitWeight('abc', 5, 0)).toBeNull()
    expect(commitWeight('-3', 5, 0)).toBe(1)
  })

  it('set-weight clamps through the reducer too', () => {
    const scenario = lineupReducer(spoiler, { type: 'load', scenario: spoiler })
    const greedy = lineupReducer(scenario, { type: 'set-weight', blocId: 'spoiler-1', weight: 999 })
    expect(firstBlocOf(greedy).weight).toBe(38)
    expect(freePool(greedy)).toBe(0)
    assertConserved(greedy)
  })

  it('removing a bloc returns its votes to the free pool', () => {
    const scenario = apply(spoiler, { type: 'load', scenario: spoiler })
    const removedWeight = scenario.blocs[2].weight // Eli's supporters, 14
    const after = lineupReducer(scenario, { type: 'remove-bloc', blocId: 'spoiler-3' })
    expect(after.blocs.length).toBe(3)
    expect(freePool(after)).toBe(removedWeight)
    expect(scenarioVoteTotal(after)).toBe(TOTAL_VOTES - removedWeight)
    assertConserved(after)
  })

  it('the last bloc never leaves — the field stays countable', () => {
    let scenario = apply(spoiler, { type: 'load', scenario: spoiler })
    for (const bloc of [...scenario.blocs]) {
      scenario = lineupReducer(scenario, { type: 'remove-bloc', blocId: bloc.id })
    }
    expect(scenario.blocs.length).toBe(1)
    expect(lineupIssues(spoiler)).toEqual([]) // authored data untouched throughout
  })

  it('adding a bloc takes one unplaced vote; needs pool ≥ 1; caps at MAX_BLOCS', () => {
    const full = lineupReducer(spoiler, { type: 'load', scenario: spoiler })
    expect(lineupReducer(full, { type: 'add-bloc' }).blocs.length).toBe(4) // pool 0 → no-op

    let scenario = apply(full, { type: 'nudge', blocId: 'spoiler-1', delta: -1 })
    scenario = lineupReducer(scenario, { type: 'add-bloc' })
    expect(scenario.blocs.length).toBe(5)
    expect(scenario.blocs.at(-1)!.weight).toBe(1)
    expect(scenario.blocs.at(-1)!.ranking).toEqual(['ada'])
    expect(freePool(scenario)).toBe(0)
    assertConserved(scenario)

    // Fill the roster to the cap — freeing one vote per add (a bloc costs a
    // ballot from the pool, by the conserved-electorate model).
    let packed = scenario
    while (packed.blocs.length < MAX_BLOCS) {
      packed = lineupReducer(packed, { type: 'nudge', blocId: packed.blocs[0].id, delta: -1 })
      packed = lineupReducer(packed, { type: 'add-bloc' })
    }
    expect(packed.blocs.length).toBe(MAX_BLOCS)
    const squeeze = apply(packed, { type: 'nudge', blocId: packed.blocs[0].id, delta: -1 })
    expect(lineupReducer(squeeze, { type: 'add-bloc' }).blocs.length).toBe(MAX_BLOCS)
  })

  it('new bloc ids are unique and deterministic', () => {
    expect(nextBlocId([{ id: 'custom-1' }, { id: 'custom-4' }])).toBe('bloc-5')
    expect(nextBlocId([{ id: 'surprise-2-3' }])).toBe('bloc-4')
    expect(nextBlocId([])).toBe('bloc-1')
    let scenario = apply(spoiler, { type: 'load', scenario: spoiler }, { type: 'nudge', blocId: 'spoiler-1', delta: -1 })
    scenario = lineupReducer(scenario, { type: 'add-bloc' })
    const ids = new Set(scenario.blocs.map((bloc) => bloc.id))
    expect(ids.size).toBe(scenario.blocs.length)
  })

  it('spread-unplaced clears the pool exactly, largest-remainder', () => {
    // Spoiler minus two blocs frees 14 + 18 = 32 across 2 remaining blocs → +16 each.
    const holed = apply(
      spoiler,
      { type: 'load', scenario: spoiler },
      { type: 'remove-bloc', blocId: 'spoiler-3' },
      { type: 'remove-bloc', blocId: 'spoiler-4' },
    )
    expect(freePool(holed)).toBe(32)
    const spread = lineupReducer(holed, { type: 'spread-unplaced' })
    expect(freePool(spread)).toBe(0)
    expect(spread.blocs.map((bloc) => bloc.weight)).toEqual([54, 46])
    // Rankings and labels survive a spread untouched.
    expect(spread.blocs[0].ranking).toEqual(holed.blocs[0].ranking)
    expect(spread.blocs[0].label).toBe(holed.blocs[0].label)
    assertConserved(spread)

    // An odd pool splits with the INCREMENTS within 1 of each other (the
    // spread balances what was unplaced, not the whole field).
    const odd = apply(spoiler, { type: 'load', scenario: spoiler }, { type: 'nudge', blocId: 'spoiler-1', delta: -1 })
    const oddSpread = lineupReducer(odd, { type: 'spread-unplaced' })
    expect(freePool(oddSpread)).toBe(0)
    const increments = oddSpread.blocs.map((bloc, index) => bloc.weight - odd.blocs[index].weight)
    expect(Math.max(...increments) - Math.min(...increments)).toBeLessThanOrEqual(1)

    // At pool 0 it is an identity.
    expect(lineupReducer(spread, { type: 'spread-unplaced' })).toEqual(spread)
  })
})

describe('editor: rank selects', () => {
  it('sets, clears, and cascades — clearing a 2nd drops a 3rd', () => {
    expect(setRanking(['eli', 'nia'], 1, 'theo')).toEqual(['eli', 'theo'])
    expect(setRanking(['eli', 'nia', 'theo'], 1, null)).toEqual(['eli'])
    expect(setRanking(['eli', 'nia'], 1, null)).toEqual(['eli'])
    expect(setRanking(['eli'], 1, 'nia')).toEqual(['eli', 'nia'])
    expect(setRanking(['eli', 'nia'], 2, 'theo')).toEqual(['eli', 'nia', 'theo'])
    // No 3rd without a 2nd.
    expect(setRanking(['eli'], 2, 'theo')).toEqual(['eli'])
    // 1st choice is never clearable.
    expect(setRanking(['eli', 'nia'], 0, null)).toEqual(['eli', 'nia'])
  })

  it('choosing an already-used candidate swaps the two slots — no duplicates, ever', () => {
    expect(setRanking(['ada', 'nia', 'theo'], 0, 'theo')).toEqual(['theo', 'nia', 'ada'])
    expect(setRanking(['ada', 'nia'], 1, 'ada')).toEqual(['nia', 'ada'])
    // Choosing an already-used candidate for a brand-new slot is a no-op —
    // there is nothing to swap with, and undefined must never enter a ranking.
    expect(setRanking(['ada'], 1, 'ada')).toEqual(['ada'])
    expect(setRanking(['ada', 'nia'], 2, 'ada')).toEqual(['ada', 'nia'])
  })

  it('a rank edit relabels the row from its own picks; weight edits keep authored labels', () => {
    const scenario = apply(spoiler, { type: 'load', scenario: spoiler })
    const nudged = lineupReducer(scenario, { type: 'nudge', blocId: 'spoiler-3', delta: -1 })
    expect(nudged.blocs[2].label).toBe(spoiler.blocs[2].label) // "Eli's supporters, Nia second"
    const repicked = lineupReducer(scenario, {
      type: 'set-rank',
      blocId: 'spoiler-3',
      slot: 1,
      candidateId: 'theo',
    })
    expect(repicked.blocs[2].label).toBe('Eli 1st · Theo 2nd')
    expect(deriveBlocLabel(['nia'])).toBe('Nia only')
    expect(deriveBlocLabel(['theo', 'ada', 'nia'])).toBe('Theo 1st · Ada 2nd · Nia 3rd')
  })
})

describe('editor: the start gate', () => {
  it('blocks on unplaced ballots and states the recovery', () => {
    const holed = apply(
      spoiler,
      { type: 'load', scenario: spoiler },
      { type: 'remove-bloc', blocId: 'spoiler-4' },
    )
    const issues = lineupIssues(holed)
    expect(issues).toHaveLength(1)
    expect(issues[0]).toContain('18 ballots are unplaced')
    expect(issues[0]).toContain('Spread the unplaced')
  })

  it('flags hand-broken structure the controls cannot construct', () => {
    const dup = structuredClone(spoiler)
    dup.blocs[2].ranking = ['eli', 'eli']
    expect(lineupIssues(dup).some((issue) => issue.includes('distinct choices'))).toBe(true)

    const over = structuredClone(spoiler)
    over.blocs[0].weight = 101
    expect(lineupIssues(over).some((issue) => issue.includes('too many'))).toBe(true)

    const unknown = structuredClone(spoiler)
    unknown.blocs[0].ranking = ['zzz']
    expect(lineupIssues(unknown)).toHaveLength(1)
  })
})

describe('editor: ribbon announcements', () => {
  it('a load announces its field; surprise says so', () => {
    expect(ribbonForLoad(spoiler)).toBe(
      'The Spoiler is on the board — 100 ballots across 4 blocs. Tip off to start the count.',
    )
    expect(ribbonForLoad(generateSurpriseScenario(7))).toMatch(
      /^A fresh random field rolls in — 100 ballots across \d+ blocs\. Tip off to start the count\.$/,
    )
  })

  it('the standing lineup narration states the 100-sum condition, singular included', () => {
    expect(ribbonForLineup(spoiler)).toBe(
      'Lineup set — 100 ballots across 4 blocs. Tip off to start the count.',
    )
    const oneOut = apply(spoiler, { type: 'load', scenario: spoiler }, { type: 'nudge', blocId: 'spoiler-1', delta: -1 })
    expect(ribbonForLineup(oneOut)).toBe(
      '1 ballot unplaced — every one of the 100 must sit on a bloc before tip off. Spread the unplaced or place them by hand.',
    )
    const manyOut = apply(oneOut, { type: 'nudge', blocId: 'spoiler-2', delta: -1 })
    expect(ribbonForLineup(manyOut)).toContain('2 ballots unplaced')
  })
})

describe('editor: random action sequences keep the field runnable (property)', () => {
  it('never breaks conservation, validity, or the engine across 6 starts × 120 actions', () => {
    // Deterministic mulberry32, mirroring surprise.ts discipline.
    let seed = 71356508
    const rand = () => {
      seed = (seed + 0x6d2b79f5) | 0
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
    const castIdsOf = ['ada', 'eli', 'nia', 'theo']

    for (const start of [...PRESETS, blankCustomScenario(), generateSurpriseScenario(3), generateSurpriseScenario(4)]) {
      let scenario = lineupReducer(start, { type: 'load', scenario: start })
      for (let step = 0; step < 120; step++) {
        const bloc = scenario.blocs[Math.floor(rand() * scenario.blocs.length)]
        const slot = Math.floor(rand() * 3) as 0 | 1 | 2
        const action: LineupAction = (() => {
          switch (Math.floor(rand() * 7)) {
            case 0:
              return { type: 'nudge', blocId: bloc.id, delta: rand() < 0.5 ? 1 : -1 }
            case 1:
              return { type: 'set-weight', blocId: bloc.id, weight: Math.floor(rand() * 130) - 5 }
            case 2:
              return {
                type: 'set-rank',
                blocId: bloc.id,
                slot,
                candidateId: rand() < 0.25 ? null : castIdsOf[Math.floor(rand() * 4)],
              }
            case 3:
              return { type: 'remove-bloc', blocId: bloc.id }
            case 4:
              return { type: 'add-bloc' }
            case 5:
              return { type: 'spread-unplaced' }
            default:
              return { type: 'nudge', blocId: bloc.id, delta: rand() < 0.5 ? 1 : -1 }
          }
        })()
        scenario = lineupReducer(scenario, action)
        assertConserved(scenario)
        expect(() => runScenario(scenario)).not.toThrow()
        // The gate and the state agree: pool 0 ⇒ runnable (structural issues
        // are unconstructable by the reducer's own guards).
        if (freePool(scenario) === 0) expect(lineupIssues(scenario)).toEqual([])
        else expect(lineupIssues(scenario).length).toBeGreaterThanOrEqual(1)
      }
      // The board always re-primes: every sequence ends engine-runnable once
      // the pool is spread.
      scenario = lineupReducer(scenario, { type: 'spread-unplaced' })
      expect(lineupIssues(scenario)).toEqual([])
    }
  })
})
