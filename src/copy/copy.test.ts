import { describe, expect, it } from 'vitest'
import type { CountResult, Candidate } from '../engine/index.ts'
import {
  blankCustomScenario,
  generateSurpriseScenario,
  pluralityLeader,
  PRESETS,
  presetById,
  runScenario,
} from '../scenarios/index.ts'
import type { Scenario } from '../scenarios/index.ts'
import { ribbonForStep } from '../playback/narration.ts'
import { buildTimeline } from '../playback/timeline.ts'
import {
  BRAND,
  GLOSSARY,
  LANE_STOPPED_HERE,
  partsToText,
  roundOneCrossedFrame,
  verdictCopy,
  winnerTakeAllFrame,
} from './copy.ts'

const spoiler = runScenario(presetById('spoiler')!)
const comeback = runScenario(presetById('comeback')!)
const statusQuo = runScenario(presetById('status-quo')!)
const nailBiter = runScenario(presetById('nail-biter')!)
const custom = runScenario(blankCustomScenario())

/** Every string the product can print for a result: card, ribbon, glossary. */
function allCopyStrings(result: CountResult<Candidate>): string[] {
  const card = verdictCopy(result)
  const strings: string[] = [
    card.headline,
    card.standfirst,
    card.storyTitle,
    card.nextMoves,
    ...card.story.map((line) => line.text),
    ...card.disclosures.flatMap((disclosure) => [
      partsToText(disclosure.label),
      ...disclosure.body,
    ]),
    partsToText(card.pluralitySide.caption),
    partsToText(card.rankedSide.caption),
    ...Object.values(GLOSSARY).flatMap((entry) => [entry.term, entry.definition]),
  ]
  const timeline = buildTimeline(result)
  strings.push(...timeline.steps.map((step) => ribbonForStep(result, step)))
  return strings
}

/** A scenario where round 1 already crosses the majority line. */
const roundOneWinner: Scenario = {
  id: 'test-round-one',
  kind: 'custom',
  title: 'Round one winner',
  lesson: '',
  blocs: [
    { id: 'b1', label: "Ada's loyalists", weight: 60, ranking: ['ada'] },
    { id: 'b2', label: "Eli's supporters", weight: 20, ranking: ['eli', 'nia'] },
    { id: 'b3', label: "Nia's supporters", weight: 12, ranking: ['nia', 'eli'] },
    { id: 'b4', label: "Theo's supporters", weight: 8, ranking: ['theo', 'eli'] },
  ],
}

describe('copy — brand and lane frame', () => {
  it('names the product with a descriptive subtitle', () => {
    expect(BRAND.title).toBe('How Votes Flow')
    expect(partsToText(BRAND.subtitle)).toBe('a ranked-choice voting simulator')
  })

  it('marks the round-1 leader lane in the score register', () => {
    expect(LANE_STOPPED_HERE).toBe('if we stopped here')
  })
})

describe('copy — glossary (R1 plain-language terms)', () => {
  it('carries exactly the four agreed terms', () => {
    expect(Object.keys(GLOSSARY).sort()).toEqual(['exhausted', 'majority', 'ranked-choice', 'tie-break'])
  })

  it('leads with ranked-choice voting and names the synonym once', () => {
    expect(GLOSSARY['ranked-choice'].term).toBe('ranked-choice voting')
    expect(GLOSSARY['ranked-choice'].definition).toContain('instant-runoff voting')
    // The synonym is mentioned exactly once across all product copy.
    const mentions = allCopyStrings(spoiler).filter((text) => text.includes('instant-runoff')).length
    expect(mentions).toBe(1)
  })

  it('defines majority against the ballots still counting, never the 100', () => {
    expect(GLOSSARY.majority.definition).toContain('More than half of the ballots still counting')
  })

  it('glosses exhausted with the inactive synonym and the mechanism', () => {
    expect(GLOSSARY.exhausted.definition).toContain('inactive')
    expect(GLOSSARY.exhausted.definition).toContain('stops counting')
    expect(GLOSSARY.exhausted.definition).toContain('no next choice left')
  })

  it('names lot as the real-world tie-break and our fixed rule as the adaptation', () => {
    const definition = GLOSSARY['tie-break'].definition
    expect(definition).toContain('by lot')
    expect(definition).toContain('coin flip')
    expect(definition).toContain('Maine and Alaska')
    expect(definition).toContain('fixed rule')
  })
})

describe('copy — the round-1 winner-take-all frame', () => {
  it('names the plurality leader as the stopped-here winner', () => {
    expect(winnerTakeAllFrame(spoiler)).toBe(
      'If we stopped counting here, winner-take-all would hand it all to Ada Quinn on 38 votes.',
    )
    expect(winnerTakeAllFrame(comeback)).toBe(
      'If we stopped counting here, winner-take-all would hand it all to Nia Okafor on 32 votes.',
    )
  })

  it('refuses to invent a leader when the first count ties', () => {
    expect(winnerTakeAllFrame(custom)).toBe(
      'If we stopped counting here, winner-take-all could not pick a winner — Ada Quinn, Eli Park, Nia Okafor, and Theo Bass are tied at 25 first choices each.',
    )
  })

  it('switches to the agreement frame when round 1 already crossed', () => {
    const result = runScenario(roundOneWinner)
    expect(result.winner.round).toBe(1)
    expect(roundOneCrossedFrame(result)).toBe(
      'Ada Quinn crosses it outright with 60 votes — winner-take-all and ranked counting agree from the start.',
    )
  })
})

describe('copy — the verdict card', () => {
  it(' Spoiler: changed, both names, both numbers, no spurious disclosures', () => {
    const card = verdictCopy(spoiler)
    expect(card.kind).toBe('changed')
    expect(card.headline).toBe('Ranking changed the outcome')
    expect(card.standfirst).toBe(
      "The first-count lead was Ada Quinn's. The rankings underneath it belonged to Nia Okafor.",
    )
    expect(card.pluralitySide).toMatchObject({ name: 'Ada Quinn', votes: 38 })
    expect(card.rankedSide).toMatchObject({ name: 'Nia Okafor', votes: 62 })
    expect(card.story.map((line) => `${line.tag} ${line.text}`)).toEqual([
      'R1 Eli Park is eliminated on 14 votes — 14 move to Nia Okafor.',
      'R2 Theo Bass is eliminated on 18 votes — 18 move to Nia Okafor.',
      'Final Nia Okafor crosses the line — 62 of the 100 ballots still counting (62%), past 51.',
    ])
    expect(card.disclosures).toEqual([])
  })

  it('Comeback: changed, the trailer wins', () => {
    const card = verdictCopy(comeback)
    expect(card.kind).toBe('changed')
    expect(card.pluralitySide).toMatchObject({ name: 'Nia Okafor', votes: 32 })
    expect(card.rankedSide).toMatchObject({ name: 'Eli Park', votes: 68 })
    expect(card.story).toHaveLength(3)
  })

  it('Status-Quo: same, confirmed with a majority behind it', () => {
    const card = verdictCopy(statusQuo)
    expect(card.kind).toBe('same')
    expect(card.headline).toBe('Ranking confirmed the outcome')
    expect(card.standfirst).toBe(
      'Winner-take-all would have called it on a 45-vote lead. Ranked counting played the whole field out and walked Theo Bass over the line.',
    )
    expect(card.pluralitySide).toMatchObject({ name: 'Theo Bass', votes: 45 })
    expect(card.rankedSide).toMatchObject({ name: 'Theo Bass', votes: 52 })
    expect(card.story.map((line) => `${line.tag} ${line.text}`)).toEqual([
      'R1 Ada Quinn is eliminated on 12 votes — 12 move: 5 to Eli Park and 7 to Theo Bass.',
      'Final Theo Bass crosses the line — 52 of the 100 ballots still counting (52%), past 51.',
    ])
    expect(card.disclosures).toEqual([])
  })

  it('Nail-Biter: tie and exhaustion disclosures fire with the researched facts', () => {
    const card = verdictCopy(nailBiter)
    expect(card.kind).toBe('changed')
    expect(card.pluralitySide).toMatchObject({ name: 'Eli Park', votes: 34 })
    expect(card.rankedSide).toMatchObject({ name: 'Ada Quinn', votes: 44 })

    const [tie, exhausted] = card.disclosures
    expect(partsToText(tie.label)).toBe('The tie-break')
    expect(tie.body[0]).toBe('Round 2: Ada Quinn and Nia Okafor tied for last place at 30 each.')
    expect(tie.body[1]).toContain('by lot')
    expect(tie.body[1]).toContain('Maine and Alaska')
    expect(tie.body[1]).toContain('a name drawn from a bowl')
    expect(tie.body[2]).toContain("can't flip coins and stay repeatable")
    expect(tie.body[2]).toContain('the fewest earlier votes loses')

    expect(partsToText(exhausted.label)).toBe('exhausted ballots — stopped counting')
    expect(exhausted.body[0]).toBe(
      'By the final count, 15 ballots of the 100 were exhausted — every candidate they ranked had been eliminated, so there was no next choice left to count.',
    )
    expect(exhausted.body[1]).toBe(
      'The majority line follows the ballots still counting, which is why it dropped from 51 to 43 for the final round.',
    )
    expect(exhausted.body[2]).toBe(
      "Ada Quinn's 44 votes are 52% of the ballots still counting — and 44% of all 100. Real ranked-choice elections measure the endgame against the ballots still counting too, not against every ballot cast.",
    )
  })

  it('Custom: a tied first count gets its own honest ending', () => {
    const card = verdictCopy(custom)
    expect(card.kind).toBe('tied-first')
    expect(card.headline).toBe('A tie the first count could not settle')
    expect(card.standfirst).toBe(
      'The first count could not pick a leader — Ada Quinn, Eli Park, Nia Okafor, and Theo Bass tied at 25. Winner-take-all would need a coin flip; ranked counting kept going and landed on Theo Bass.',
    )
    expect(card.story.at(-1)!.text).toBe(
      'Nobody crosses 26. The final two tie at 25 each, and the tie-break names Theo Bass the winner.',
    )
    const keys = card.disclosures.map((disclosure) => disclosure.key)
    expect(keys).toContain('tie')
    expect(keys).toContain('exhausted')
  })

  it('a round-1 winner reads as agreement, not twist', () => {
    const card = verdictCopy(runScenario(roundOneWinner))
    expect(card.kind).toBe('same')
    expect(card.standfirst).toBe(
      'Ada Quinn crossed the majority line in round 1 with 60 votes — both ways of counting agree at the buzzer.',
    )
    expect(card.story).toHaveLength(1)
  })
})

describe('copy — verdict correctness against the engine', () => {
  const fields = [
    ...PRESETS.map((preset) => runScenario(preset)),
    custom,
    runScenario(roundOneWinner),
    ...[7, 21, 42, 99, 71356508].map((seed) => runScenario(generateSurpriseScenario(seed))),
  ]

  it.each(fields)('states exactly what the engine computed', (result) => {
    const card = verdictCopy(result)
    const plurality = pluralityLeader(result)
    expect(card.pluralitySide.candidateId).toBe(plurality.tiedIds[0])
    expect(card.pluralitySide.votes).toBe(plurality.votes)
    expect(card.rankedSide.candidateId).toBe(result.winner.candidateId)
    expect(card.rankedSide.votes).toBe(result.winner.votes)
    expect(card.kind === 'changed').toBe(
      result.winner.candidateId !== plurality.tiedIds[0] && plurality.tiedIds.length === 1,
    )
    // The story ends on the deciding round's own numbers.
    const finalRound = result.rounds[result.rounds.length - 1]
    expect(card.story).toHaveLength(result.rounds.length)
    expect(card.story.at(-1)!.tag).toBe('Final')
    expect(card.story.at(-1)!.text).toContain(String(result.winner.votes))
    expect(card.story.at(-1)!.text).toContain(String(finalRound.majorityThreshold))
  })
})

describe('copy — determinism and hygiene', () => {
  it('yields identical copy for identical engine results', () => {
    expect(verdictCopy(runScenario(presetById('nail-biter')!))).toEqual(verdictCopy(nailBiter))
  })

  it('never prints real-world election numbers or years (R1: Alaska figures secondary-sourced)', () => {
    const forbidden = /\b(19|20)\d{2}\b|Peltola|Palin|Begich|8,?529|91,?266|86,?026|11,?290/
    for (const result of [spoiler, comeback, statusQuo, nailBiter, custom]) {
      for (const text of allCopyStrings(result)) {
        expect(text.match(forbidden)).toBeNull()
      }
    }
  })

  it('keeps every sentence within a plain-language register (no jargon left unglossed in the card)', () => {
    // The terms of art the card may use are exactly the glossary's own words.
    const allowed = new Set(Object.values(GLOSSARY).map((entry) => entry.term))
    expect(allowed).toContain('ranked-choice voting')
    const card = verdictCopy(nailBiter)
    for (const text of [card.standfirst, ...card.disclosures.flatMap((d) => d.body)]) {
      expect(text).not.toMatch(/\bIRV\b|\bstv\b|\bCondorcet\b|\btabulation\b|\bquorum\b/i)
    }
  })
})
