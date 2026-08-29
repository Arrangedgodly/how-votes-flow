import { describe, expect, it } from 'vitest'
import { CAST, castIds } from './cast.ts'
import { PRESETS, blankCustomScenario, presetById } from './recipes.ts'
import { generateSurpriseScenario } from './surprise.ts'
import {
  cloneScenario,
  pluralityLeader,
  runScenario,
  scenarioVoteTotal,
  verdictOf,
} from './runtime.ts'
import type { Scenario } from './types.ts'
import type { RoundResult } from '../engine/index.ts'

const votesIn = (round: RoundResult, id: string): number =>
  round.tallies.find((tally) => tally.candidateId === id)?.votes ?? 0

/** Every product constraint on scenario data, checked without the engine. */
function assertValidScenario(scenario: Scenario): void {
  expect(scenario.blocs.length).toBeGreaterThanOrEqual(1)
  expect(scenarioVoteTotal(scenario)).toBe(100)

  const seenBlocIds = new Set<string>()
  for (const bloc of scenario.blocs) {
    expect(bloc.id, `bloc id ${bloc.id}`).toBeTruthy()
    expect(seenBlocIds.has(bloc.id), `duplicate bloc id ${bloc.id}`).toBe(false)
    seenBlocIds.add(bloc.id)
    expect(bloc.label, `bloc ${bloc.id} label`).toBeTruthy()
    expect(Number.isInteger(bloc.weight), `bloc ${bloc.id} weight`).toBe(true)
    expect(bloc.weight, `bloc ${bloc.id} weight`).toBeGreaterThan(0)
    expect(bloc.ranking.length, `bloc ${bloc.id} ranking depth`).toBeGreaterThanOrEqual(1)
    expect(bloc.ranking.length, `bloc ${bloc.id} ranking depth`).toBeLessThanOrEqual(3)
    expect(new Set(bloc.ranking).size, `bloc ${bloc.id} repeats a candidate`).toBe(bloc.ranking.length)
    for (const id of bloc.ranking) {
      expect(castIds.includes(id), `bloc ${bloc.id} references unknown id ${id}`).toBe(true)
    }
  }
}

/** The engine accepts the scenario, and the count terminates inside the bounds. */
function assertCountable(scenario: Scenario): ReturnType<typeof runScenario> {
  const result = runScenario(scenario) // engine validation throws on bad input
  expect(result.totalBallots).toBe(100)
  expect(result.rounds.length).toBeLessThanOrEqual(4)
  const eliminations = result.rounds.filter((round) => round.elimination !== null).length
  expect(eliminations, 'at most 3 elimination rounds').toBeLessThanOrEqual(3)
  return result
}

describe('the fixed cast', () => {
  it('fields exactly four members in a stable order, each fully described', () => {
    expect(CAST.map((member) => member.id)).toEqual(['ada', 'eli', 'nia', 'theo'])
    for (const member of CAST) {
      expect(member.name).toBeTruthy()
      expect(member.short).toBeTruthy()
      expect(member.persona, `${member.id} persona is one line`).not.toMatch(/\n/)
      expect(member.persona.length, `${member.id} persona stays a single line`).toBeLessThanOrEqual(90)
    }
  })
})

describe('authored scenario metadata', () => {
  it('ships exactly the four named recipes with one-line titles and lessons', () => {
    expect(PRESETS).toHaveLength(4)
    expect(PRESETS.map((preset) => preset.title)).toEqual([
      'The Spoiler',
      'The Comeback',
      'Status Quo Confirmed',
      'Nail-Biter',
    ])
    for (const preset of PRESETS) {
      expect(preset.kind).toBe('preset')
      expect(preset.id).toBeTruthy()
      expect(preset.lesson).toBeTruthy()
      expect(preset.lesson).not.toMatch(/\n/)
    }
    expect(new Set(PRESETS.map((preset) => preset.id)).size).toBe(4)
    expect(presetById('nail-biter')?.title).toBe('Nail-Biter')
    expect(presetById('does-not-exist')).toBeUndefined()
  })

  it('satisfies the data-model and engine invariants for every authored starting point', () => {
    for (const scenario of [...PRESETS, blankCustomScenario()]) {
      assertValidScenario(scenario)
      assertCountable(scenario)
    }
  })

  it('balances the cast: each candidate leads round 1 once and wins once across the presets', () => {
    const leaders: string[] = []
    const winners: string[] = []
    for (const preset of PRESETS) {
      const result = runScenario(preset)
      leaders.push(pluralityLeader(result).candidateId)
      winners.push(result.winner.candidateId)
    }
    expect(leaders.sort()).toEqual([...castIds].sort())
    expect(winners.sort()).toEqual([...castIds].sort())
  })
})

describe('The Spoiler — RCV flips the plurality leader', () => {
  const result = runScenario(presetById('spoiler')!)

  it('has a unique round-1 leader who then loses', () => {
    expect(pluralityLeader(result)).toEqual({ candidateId: 'ada', votes: 38, tiedIds: ['ada'] })
    expect(result.winner.candidateId).toBe('nia')
    expect(verdictOf(result).changed).toBe(true)
  })

  it('arrives at the flip through transfers, not a round-1 accident', () => {
    expect(result.rounds).toHaveLength(3)
    expect(result.rounds.filter((round) => round.elimination)).toHaveLength(2)
    expect(result.winner.method).toBe('majority')
    const finalRound = result.rounds[2]
    expect(votesIn(finalRound, 'nia')).toBe(62)
    expect(votesIn(finalRound, 'ada')).toBe(38)
  })
})

describe('The Comeback — an early trailer wins', () => {
  const preset = presetById('comeback')!
  const result = runScenario(preset)

  it('elects a candidate who sat third after the first count', () => {
    expect(result.winner.candidateId).toBe('eli')
    expect(result.winner.method).toBe('majority')

    const round1 = result.rounds[0]
    const eliVotes = votesIn(round1, 'eli')
    const above = round1.tallies.filter((tally) => tally.votes > eliVotes)
    expect(above).toHaveLength(2) // two candidates strictly ahead of the eventual winner
    expect(eliVotes).toBe(24)
    expect(pluralityLeader(result).candidateId).toBe('nia')
    expect(verdictOf(result).changed).toBe(true)
  })

  it('shows the consolidation: the trailer only leads once the field narrows', () => {
    expect(result.rounds).toHaveLength(3)
    const finalRound = result.rounds[2]
    expect(votesIn(finalRound, 'eli')).toBe(68)
    expect(result.winner.votes).toBe(68)
  })
})

describe('Status Quo Confirmed — RCV agrees with plurality', () => {
  const result = runScenario(presetById('status-quo')!)

  it('returns verdict "same": the round-1 leader wins', () => {
    expect(pluralityLeader(result)).toEqual({ candidateId: 'theo', votes: 45, tiedIds: ['theo'] })
    expect(result.winner.candidateId).toBe('theo')
    expect(verdictOf(result).changed).toBe(false)
  })

  it('actually runs the count past round 1 before confirming with a majority', () => {
    expect(result.rounds).toHaveLength(2)
    expect(result.rounds[0].majorityThreshold).toBe(51)
    expect(votesIn(result.rounds[0], 'theo')).toBe(45) // short of the line in round 1
    expect(result.winner.method).toBe('majority')
    expect(result.winner.votes).toBe(52)
  })
})

describe('Nail-Biter — an elimination tie fires and is disclosed', () => {
  const result = runScenario(presetById('nail-biter')!)

  it('records an elimination tie-break event and pins it to the round that ran it', () => {
    expect(result.tieBreaks.length).toBeGreaterThanOrEqual(1)
    const event = result.tieBreaks.find((tie) => tie.purpose === 'elimination')
    expect(event).toBeDefined()
    expect(event?.tiedIds).toEqual(['ada', 'nia'])
    expect(event?.resolvedBy).toBe('first-round')

    const round = result.rounds[(event?.round ?? 1) - 1]
    expect(round.elimination?.tieBreak).toEqual(event) // disclosed where it happened
    expect(round.elimination?.eliminatedId).toBe(event?.loserId)
  })

  it('keeps the margins tight: close first count, one vote over the final line', () => {
    const round1 = result.rounds[0]
    const sorted = [...round1.tallies].map((tally) => tally.votes).sort((a, b) => b - a)
    expect(sorted[0] - sorted[1], 'round-1 top-two gap').toBeLessThanOrEqual(6)

    const finalRound = result.rounds[result.rounds.length - 1]
    expect(result.winner.votes - finalRound.majorityThreshold).toBeLessThanOrEqual(2)
    expect(result.winner.method).toBe('majority')
  })
})

describe('Custom blank state', () => {
  it('starts as a wide-open field: four even lanes, valid and countable', () => {
    const custom = blankCustomScenario()
    expect(custom.kind).toBe('custom')
    assertValidScenario(custom)

    const result = assertCountable(custom)
    for (const id of castIds) {
      expect(votesIn(result.rounds[0], id)).toBe(25)
    }
  })

  it('clones independently — editing a copy never touches the authored data', () => {
    const custom = blankCustomScenario()
    const copy = cloneScenario(custom)
    copy.blocs[0].weight = 40
    copy.blocs[0].ranking.push(copy.blocs[1].ranking[0])
    expect(custom.blocs[0].weight).toBe(25)
    expect(custom.blocs[0].ranking).toHaveLength(1)
  })
})

describe('Surprise Me generator — property test', () => {
  const SURPRISE_SEEDS = Array.from({ length: 100 }, (_, index) => index + 1)

  it('always sums to 100, stays model-valid, and the engine terminates (100 seeds)', () => {
    for (const seed of SURPRISE_SEEDS) {
      const scenario = generateSurpriseScenario(seed)
      expect(scenario.kind, `seed ${seed}`).toBe('surprise')
      expect(scenarioVoteTotal(scenario), `seed ${seed} vote total`).toBe(100)
      assertValidScenario(scenario)
      assertCountable(scenario)
    }
  })

  it('produces plausible fields: no dead lanes, no round-1 runaway (100 seeds)', () => {
    for (const seed of SURPRISE_SEEDS) {
      const result = runScenario(generateSurpriseScenario(seed))
      const round1 = result.rounds[0]
      for (const id of castIds) {
        expect(votesIn(round1, id), `seed ${seed}, lane ${id}`).toBeGreaterThanOrEqual(10)
      }
      expect(Math.max(...round1.tallies.map((tally) => tally.votes)), `seed ${seed} leader`).toBeLessThan(51)
      expect(result.rounds.length, `seed ${seed} runs at least one elimination round`).toBeGreaterThanOrEqual(2)
    }
  })

  it('is deterministic per seed and varies across seeds', () => {
    expect(generateSurpriseScenario(42)).toEqual(generateSurpriseScenario(42))
    expect(runScenario(generateSurpriseScenario(42))).toEqual(runScenario(generateSurpriseScenario(42)))

    const distinct = new Set(
      Array.from({ length: 20 }, (_, index) => JSON.stringify(generateSurpriseScenario(index))),
    )
    expect(distinct.size).toBeGreaterThan(1)
  })
})
