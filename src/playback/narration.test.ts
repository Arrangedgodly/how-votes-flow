import { describe, expect, it } from 'vitest'
import { blankCustomScenario, presetById, runScenario } from '../scenarios/index.ts'
import { ribbonForSetup, ribbonForStep } from './narration.ts'
import { buildTimeline } from './timeline.ts'

const spoiler = runScenario(presetById('spoiler')!)
const nailBiter = runScenario(presetById('nail-biter')!)
const custom = runScenario(blankCustomScenario())

const spoilerTimeline = buildTimeline(spoiler)
const nailTimeline = buildTimeline(nailBiter)
const customTimeline = buildTimeline(custom)

const ribbon = (result: typeof spoiler, index: number) =>
  ribbonForStep(result, buildTimeline(result).steps[index])

describe('narration — setup and round opens', () => {
  it('sets up the count from data', () => {
    expect(ribbonForSetup(spoiler)).toBe(
      '100 ballots, 4 candidates. Tip off to start the count — round 1 is first choices only.',
    )
  })

  it('frames round 1 as winner-take-all over the live tallies (the reveal setup)', () => {
    expect(ribbon(spoiler, 0)).toBe(
      'Round 1 — first choices only: Ada 38, Nia 30, Theo 18, Eli 14. The majority line sits at 51. Nobody has crossed it. If we stopped counting here, winner-take-all would hand it all to Ada Quinn on 38 votes.',
    )
  })

  it('frames a tied first count honestly: no winner-take-all winner either', () => {
    const step = customTimeline.steps.find(
      (candidate) => candidate.kind === 'round-open' && candidate.roundIndex === 0,
    )!
    expect(ribbonForStep(custom, step)).toBe(
      'Round 1 — first choices only: Ada 25, Eli 25, Nia 25, Theo 25. The majority line sits at 51. Nobody has crossed it. If we stopped counting here, winner-take-all could not pick a winner — Ada Quinn, Eli Park, Nia Okafor, and Theo Bass are tied at 25 first choices each.',
    )
  })

  it('recaps the elimination, states exhaustion, and names the dropped line', () => {
    // Nail-Biter round 3: 15 inactive, line honestly dropped to 43.
    const step = nailTimeline.steps.find(
      (candidate) => candidate.kind === 'round-open' && candidate.roundIndex === 2,
    )!
    expect(ribbonForStep(nailBiter, step)).toBe(
      "Final count — After Nia Okafor's elimination, ballots counting: Ada 44, Eli 41. 15 ballots have now stopped counting, so the majority line drops to 43.",
    )
  })

  it('opens mid-count rounds with the recap and the standing line', () => {
    const step = spoilerTimeline.steps.find(
      (candidate) => candidate.kind === 'round-open' && candidate.roundIndex === 1,
    )!
    expect(ribbonForStep(spoiler, step)).toBe(
      "Round 2 — After Eli Park's elimination, ballots counting: Nia 44, Ada 38, Theo 18. The majority line sits at 51. Nobody has crossed it.",
    )
  })
})

describe('narration — strike and transfer', () => {
  it('names the eliminated candidate and their tally', () => {
    const step = spoilerTimeline.steps.find(
      (candidate) => candidate.kind === 'strike' && candidate.roundIndex === 0,
    )!
    expect(ribbonForStep(spoiler, step)).toBe(
      'Round 1 — Eli Park has the fewest votes (14) and is eliminated.',
    )
  })

  it('discloses an elimination tie: lot in real elections, fixed rule here', () => {
    const step = nailTimeline.steps.find(
      (candidate) => candidate.kind === 'strike' && candidate.roundIndex === 1,
    )!
    expect(ribbonForStep(nailBiter, step)).toBe(
      'Round 2 — a tie for last place: Ada and Nia at 30 each. Real elections often settle ties by lot — a coin flip or a drawn name. This simulator keeps every rerun identical, so the tie-break uses the earlier count instead: Nia Okafor is eliminated.',
    )
  })

  it('discloses a multi-way tie with the fallback rule named as a last resort', () => {
    const step = customTimeline.steps.find(
      (candidate) => candidate.kind === 'strike' && candidate.roundIndex === 0,
    )!
    expect(ribbonForStep(custom, step)).toBe(
      'Round 1 — a tie for last place: Ada, Eli, Nia, and Theo at 25 each. Real elections often settle ties by lot — a coin flip or a drawn name. This simulator keeps every rerun identical, so the tie-break uses the roster order as a last resort instead: Ada Quinn is eliminated.',
    )
  })

  it('states every transfer destination and count (the signature numbers)', () => {
    const step = spoilerTimeline.steps.find(
      (candidate) => candidate.kind === 'transfer' && candidate.roundIndex === 1,
    )!
    expect(ribbonForStep(spoiler, step)).toBe(
      "Theo Bass's 18 ballots move to their next choices: 18 to Nia Okafor.",
    )
  })

  it('glosses exhaustion at its first occurrence, then counts it plainly', () => {
    const first = nailTimeline.steps.find(
      (candidate) => candidate.kind === 'transfer' && candidate.roundIndex === 0,
    )!
    expect(ribbonForStep(nailBiter, first)).toBe(
      "Theo Bass's 9 ballots move to their next choices: 9 to Nia Okafor. And 6 ballots listed no next choice — everyone they ranked is now out, so they are exhausted and stop counting.",
    )

    const second = nailTimeline.steps.find(
      (candidate) => candidate.kind === 'transfer' && candidate.roundIndex === 1,
    )!
    expect(ribbonForStep(nailBiter, second)).toBe(
      "Nia Okafor's 21 ballots move to their next choices: 14 to Ada Quinn, and 7 to Eli Park. And 9 more ballots listed no next choice and stop counting.",
    )
  })

  it('handles a pure-exhaustion elimination (no destinations)', () => {
    const step = customTimeline.steps.find(
      (candidate) => candidate.kind === 'transfer' && candidate.roundIndex === 0,
    )!
    expect(ribbonForStep(custom, step)).toBe(
      "Ada Quinn's 25 ballots listed no next choice — everyone they ranked is now out, so they are exhausted and stop counting.",
    )
  })
})

describe('narration — the declaration', () => {
  it('declares a majority win with the numbers that crossed', () => {
    const step = spoilerTimeline.steps[spoilerTimeline.steps.length - 1]
    expect(ribbonForStep(spoiler, step)).toBe(
      'Final — Nia Okafor crosses the majority line with 62 votes of the 100 still counting, past the line of 51. Nia Okafor wins.',
    )
  })

  it('declares a majority over a shrunken denominator (exhaustion accounted)', () => {
    const step = nailTimeline.steps[nailTimeline.steps.length - 1]
    expect(ribbonForStep(nailBiter, step)).toBe(
      'Final — Ada Quinn crosses the majority line with 44 votes of the 85 still counting, past the line of 43. Ada Quinn wins.',
    )
  })

  it('declares an exactly tied final two via the fixed tie-break', () => {
    const step = customTimeline.steps[customTimeline.steps.length - 1]
    expect(ribbonForStep(custom, step)).toBe(
      "Final two — nobody crosses the line of 26: an exact tie. This simulator's fixed tie-break decides it, and Theo Bass wins.",
    )
  })
})

describe('narration — determinism', () => {
  it('yields identical strings for identical engine results', () => {
    const rerun = runScenario(presetById('nail-biter')!)
    for (let index = 0; index < nailTimeline.steps.length; index++) {
      expect(ribbon(nailBiter, index)).toBe(ribbon(rerun, index))
    }
  })
})
