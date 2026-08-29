import { describe, expect, it } from 'vitest'
import { boardViewForRound } from './boardState.ts'
import { blankCustomScenario, presetById, runScenario } from '../../scenarios/index.ts'

const spoiler = runScenario(presetById('spoiler')!)
const nailBiter = runScenario(presetById('nail-biter')!)
const custom = runScenario(blankCustomScenario())

const votesByLane = (view: ReturnType<typeof boardViewForRound>) =>
  Object.fromEntries(view.lanes.map((lane) => [lane.member.id, lane.votes]))
const statusByLane = (view: ReturnType<typeof boardViewForRound>) =>
  Object.fromEntries(view.lanes.map((lane) => [lane.member.id, lane.status]))

describe('boardState — the board view of an engine result', () => {
  it('renders a mid-count round: one lane struck, three standing, no exhaustion', () => {
    const view = boardViewForRound(spoiler, 1) // round 2, after Eli's elimination
    expect(view.round.round).toBe(2)
    expect(view.round.majorityThreshold).toBe(51)
    expect(votesByLane(view)).toEqual({ ada: 38, eli: 14, nia: 44, theo: 18 })
    expect(statusByLane(view)).toEqual({ ada: 'active', eli: 'eliminated', nia: 'active', theo: 'active' })
    const eli = view.lanes.find((lane) => lane.member.id === 'eli')!
    expect(eli.eliminatedInRound).toBe(1) // frozen at the tally of the round that cut him
    expect(view.exhausted).toBe(0)
    expect(view.decided).toBe(false)
    expect(view.allocation.map((row) => [row.member.id, row.votes])).toEqual([
      ['ada', 38],
      ['nia', 44],
      ['theo', 18],
    ])
  })

  it('renders the decided round: winner lane marked, both eliminated lanes struck', () => {
    const view = boardViewForRound(spoiler, 2)
    expect(view.decided).toBe(true)
    expect(view.winner?.candidateId).toBe('nia')
    expect(view.winner?.method).toBe('majority')
    expect(statusByLane(view)).toEqual({ ada: 'active', eli: 'eliminated', nia: 'winner', theo: 'eliminated' })
    expect(votesByLane(view)).toEqual({ ada: 38, eli: 14, nia: 62, theo: 18 })
    const theo = view.lanes.find((lane) => lane.member.id === 'theo')!
    expect(theo.eliminatedInRound).toBe(2)
  })

  it('renders honest exhaustion: inactive ballots counted out of the allocation', () => {
    const view = boardViewForRound(nailBiter, 2) // final round: 15 ballots inactive
    expect(view.exhausted).toBe(15)
    expect(view.round.activeVotes).toBe(85)
    expect(view.round.majorityThreshold).toBe(43) // the line drops when ballots stop counting
    expect(view.allocation.map((row) => row.votes).reduce((a, b) => a + b, 0)).toBe(85)
    expect(view.allocation.reduce((a, b) => a + b.votes, 0) + view.exhausted).toBe(100)
    expect(statusByLane(view)).toEqual({ ada: 'winner', eli: 'active', nia: 'eliminated', theo: 'eliminated' })
  })

  it('flags a final-two win won without crossing the line', () => {
    const view = boardViewForRound(custom, custom.rounds.length - 1)
    expect(view.decided).toBe(true)
    expect(view.winner?.wonWithoutMajority).toBe(true)
    expect(view.winner?.method).toBe('final-two-leader')
    expect(view.exhausted).toBe(50)
    // The final-round runner-up was never eliminated — they stand, unstruck.
    // (First declared loses ties, so theo — declared last — wins this one.)
    expect(statusByLane(view)).toEqual({ ada: 'eliminated', eli: 'eliminated', nia: 'active', theo: 'winner' })
  })

  it('clamps out-of-range round indices', () => {
    expect(boardViewForRound(spoiler, 99).round.round).toBe(spoiler.rounds.length)
    expect(boardViewForRound(spoiler, -3).round.round).toBe(1)
  })
})
