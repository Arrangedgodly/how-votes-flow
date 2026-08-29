import { describe, expect, it } from 'vitest'
import { runInstantRunoff } from './count.ts'
import type { BallotBloc, Candidate, RoundResult } from './types.ts'

const cast: Candidate[] = [
  { id: 'a', name: 'Aya' },
  { id: 'b', name: 'Ben' },
  { id: 'c', name: 'Cleo' },
  { id: 'd', name: 'Dev' },
]

const bloc = (weight: number, ...ranking: string[]): BallotBloc => ({ weight, ranking })

const votes = (round: RoundResult, id: string): number => {
  const tally = round.tallies.find((entry) => entry.candidateId === id)
  if (!tally) throw new Error(`expected a tally for '${id}' in round ${round.round}`)
  return tally.votes
}

describe('instant-runoff engine', () => {
  it('declares an immediate winner when a candidate wins a majority of active votes in round 1', () => {
    const result = runInstantRunoff({
      candidates: cast,
      blocs: [bloc(58, 'a'), bloc(22, 'b', 'c'), bloc(20, 'c', 'b')],
    })

    expect(result.rounds).toHaveLength(1)
    const [round1] = result.rounds
    expect(votes(round1, 'a')).toBe(58)
    expect(votes(round1, 'b')).toBe(22)
    expect(votes(round1, 'c')).toBe(20)
    expect(votes(round1, 'd')).toBe(0) // continuing lanes render even at zero
    expect(round1.activeVotes).toBe(100)
    expect(round1.exhaustedVotes).toBe(0)
    expect(round1.majorityThreshold).toBe(51)
    expect(round1.elimination).toBeNull()
    expect(result.tieBreaks).toHaveLength(0)
    expect(result.winner).toEqual({
      candidateId: 'a',
      method: 'majority',
      round: 1,
      wonWithoutMajority: false,
      votes: 58,
      tieBreak: null,
    })
  })

  it('flips the plurality leader: the round-1 leader loses after transfers (the spoiler)', () => {
    const result = runInstantRunoff({
      candidates: cast,
      blocs: [
        bloc(34, 'a'), // plurality leader under winner-take-all
        bloc(33, 'b'),
        bloc(15, 'c', 'b'), // both trailing blocs prefer b over a
        bloc(18, 'd', 'b'),
      ],
    })

    // winner-take-all would elect 'a' with the most first-preference votes
    expect(votes(result.rounds[0], 'a')).toBe(34)
    expect(result.winner.candidateId).toBe('b')
    expect(result.winner.method).toBe('majority')

    expect(result.rounds).toHaveLength(3)
    // round 1: eliminate c, exactly 15 votes flow to b
    expect(result.rounds[0].elimination).toMatchObject({ eliminatedId: 'c', exhausted: 0 })
    expect(result.rounds[0].elimination?.transfers).toEqual([{ toId: 'b', votes: 15 }])
    // round 2: eliminate d, 18 more flow to b
    expect(result.rounds[1].elimination).toMatchObject({ eliminatedId: 'd', exhausted: 0 })
    expect(result.rounds[1].elimination?.transfers).toEqual([{ toId: 'b', votes: 18 }])
    // round 3: b crosses the threshold
    expect(votes(result.rounds[2], 'b')).toBe(66)
    expect(result.winner.votes).toBe(66)
    expect(result.tieBreaks).toHaveLength(0)
  })

  it('marks ballots with no continuing preference inactive and shrinks the denominator accordingly', () => {
    const result = runInstantRunoff({
      candidates: cast,
      blocs: [bloc(40, 'a'), bloc(30, 'b'), bloc(20, 'c'), bloc(10, 'd')], // single-preference blocs exhaust
    })

    expect(result.rounds).toHaveLength(3)
    const [round1, round2, round3] = result.rounds
    expect(round1.activeVotes).toBe(100)
    expect(round1.exhaustedVotes).toBe(0)
    expect(round1.majorityThreshold).toBe(51)
    expect(round2.activeVotes).toBe(90)
    expect(round2.exhaustedVotes).toBe(10)
    expect(round2.majorityThreshold).toBe(46) // 10 ballots went inactive, threshold drops
    expect(round3.activeVotes).toBe(70)
    expect(round3.exhaustedVotes).toBe(30)
    expect(round3.majorityThreshold).toBe(36)

    expect(round1.elimination).toMatchObject({ eliminatedId: 'd', exhausted: 10 })
    expect(round1.elimination?.transfers).toEqual([])
    expect(round2.elimination).toMatchObject({ eliminatedId: 'c', exhausted: 20 })
    expect(round2.elimination?.transfers).toEqual([])

    // 40 of 100 total votes is a majority of the 70 still counting
    expect(result.winner).toEqual({
      candidateId: 'a',
      method: 'majority',
      round: 3,
      wonWithoutMajority: false,
      votes: 40,
      tieBreak: null,
    })
  })

  it('breaks an elimination tie on fewest first-round votes and records the event', () => {
    const result = runInstantRunoff({
      candidates: cast,
      blocs: [bloc(35, 'a'), bloc(20, 'b', 'c'), bloc(30, 'c', 'b'), bloc(5, 'd'), bloc(10, 'd', 'b')],
    })

    // round 1 eliminates d (unique minimum, 15); round 2 ties b and c at 30 each,
    // and b had fewer round-1 votes (20 vs 30)
    expect(result.tieBreaks).toHaveLength(1)
    expect(result.tieBreaks[0]).toEqual({
      round: 2,
      purpose: 'elimination',
      tiedIds: ['b', 'c'],
      loserId: 'b',
      resolvedBy: 'first-round',
    })
    expect(result.rounds[1].elimination?.eliminatedId).toBe('b')
    // b's own 20 transfer to c; the 10 that arrived from d have no continuing preference
    expect(result.rounds[1].elimination?.transfers).toEqual([{ toId: 'c', votes: 20 }])
    expect(result.rounds[1].elimination?.exhausted).toBe(10)
    expect(result.winner).toMatchObject({ candidateId: 'c', method: 'majority', votes: 50 })
  })

  it('falls back to stable candidate order when first-round votes are also tied', () => {
    const result = runInstantRunoff({
      candidates: cast,
      blocs: [bloc(40, 'a'), bloc(20, 'b'), bloc(20, 'c', 'a'), bloc(20, 'd')],
    })

    expect(result.tieBreaks).toHaveLength(2)
    // round 1: three-way tie at 20, first-round votes identical -> candidate order
    expect(result.tieBreaks[0]).toEqual({
      round: 1,
      purpose: 'elimination',
      tiedIds: ['b', 'c', 'd'],
      loserId: 'b',
      resolvedBy: 'candidate-order',
    })
    // b's 20 single-preference ballots exhaust
    expect(result.rounds[0].elimination?.eliminatedId).toBe('b')
    expect(result.rounds[0].elimination?.exhausted).toBe(20)
    // round 2: c and d tied at 20 again, still identical first-round -> order
    expect(result.tieBreaks[1]).toEqual({
      round: 2,
      purpose: 'elimination',
      tiedIds: ['c', 'd'],
      loserId: 'c',
      resolvedBy: 'candidate-order',
    })
    expect(result.rounds[1].elimination?.transfers).toEqual([{ toId: 'a', votes: 20 }])
    expect(result.winner).toMatchObject({ candidateId: 'a', method: 'majority', votes: 60 })
  })

  it('declares the final-two winner without a majority, flagged, with the tie disclosed (exact tie under the active denominator)', () => {
    const result = runInstantRunoff({
      candidates: cast,
      blocs: [bloc(40, 'a'), bloc(40, 'b'), bloc(12, 'c'), bloc(8, 'd')],
    })

    expect(result.rounds).toHaveLength(3)
    const finalRound = result.rounds[2]
    expect(finalRound.activeVotes).toBe(80)
    expect(finalRound.exhaustedVotes).toBe(20)
    expect(finalRound.majorityThreshold).toBe(41) // 40-40 does not cross
    expect(finalRound.elimination).toBeNull()

    expect(result.winner).toEqual({
      candidateId: 'b',
      method: 'final-two-leader',
      round: 3,
      wonWithoutMajority: true,
      votes: 40,
      tieBreak: {
        round: 3,
        purpose: 'final-winner',
        tiedIds: ['a', 'b'],
        loserId: 'a',
        resolvedBy: 'candidate-order',
      },
    })
    expect(result.tieBreaks).toHaveLength(1)
  })

  it('flags a clear final-two leader when the majority denominator is all ballots cast (rules are parameterized)', () => {
    const blocs = [bloc(46, 'a'), bloc(24, 'b'), bloc(20, 'c', 'b'), bloc(10, 'd')]

    // adopted default: threshold over votes still counting — a crosses 46 of 90 active
    const byActive = runInstantRunoff({ candidates: cast, blocs })
    expect(byActive.rounds).toHaveLength(2)
    expect(byActive.rules.majorityDenominator).toBe('active')
    expect(byActive.winner).toMatchObject({ candidateId: 'a', method: 'majority', votes: 46 })

    // alternative rule: threshold over all 100 cast — nobody crosses, final two leads
    const byTotal = runInstantRunoff({ candidates: cast, blocs }, { majorityDenominator: 'total' })
    expect(byTotal.rounds).toHaveLength(3)
    expect(byTotal.rules.majorityDenominator).toBe('total')
    expect(byTotal.winner).toEqual({
      candidateId: 'a',
      method: 'final-two-leader',
      round: 3,
      wonWithoutMajority: true,
      votes: 46,
      tieBreak: null,
    })
  })

  it('preserves vote totals across rounds and transfers (sum invariants)', () => {
    const scenarios: BallotBloc[][] = [
      [bloc(34, 'a'), bloc(33, 'b'), bloc(15, 'c', 'b'), bloc(18, 'd', 'b')],
      [bloc(40, 'a'), bloc(30, 'b'), bloc(20, 'c'), bloc(10, 'd')],
      [bloc(35, 'a'), bloc(20, 'b', 'c'), bloc(30, 'c', 'b'), bloc(5, 'd'), bloc(10, 'd', 'b')],
    ]

    for (const blocs of scenarios) {
      const result = runInstantRunoff({ candidates: cast, blocs })
      expect(result.totalBallots).toBe(100)

      for (const round of result.rounds) {
        expect(round.activeVotes + round.exhaustedVotes).toBe(100)
        expect(round.tallies.reduce((sum, tally) => sum + tally.votes, 0)).toBe(round.activeVotes)
        expect(round.tallies.map((tally) => tally.candidateId)).toEqual(round.continuingIds)
      }

      for (let i = 0; i < result.rounds.length - 1; i++) {
        const round = result.rounds[i]
        const next = result.rounds[i + 1]
        const elimination = round.elimination
        if (!elimination) throw new Error('only the final round may end without an elimination')

        // every vote of the eliminated candidate transfers or exhausts — nothing vanishes
        const eliminatedVotes = votes(round, elimination.eliminatedId)
        const transferred = elimination.transfers.reduce((sum, transfer) => sum + transfer.votes, 0)
        expect(transferred + elimination.exhausted).toBe(eliminatedVotes)
        expect(next.continuingIds).toEqual(round.continuingIds.filter((id) => id !== elimination.eliminatedId))

        // survivors keep their tally plus exactly what transferred in
        for (const tally of next.tallies) {
          const incoming = elimination.transfers.find((transfer) => transfer.toId === tally.candidateId)?.votes ?? 0
          expect(tally.votes).toBe(votes(round, tally.candidateId) + incoming)
        }
        expect(next.exhaustedVotes).toBe(round.exhaustedVotes + elimination.exhausted)
      }
    }
  })

  it('is deterministic: identical input produces an identical result', () => {
    const input = {
      candidates: cast,
      blocs: [bloc(34, 'a'), bloc(33, 'b'), bloc(15, 'c', 'b'), bloc(18, 'd', 'b')],
    }
    expect(runInstantRunoff(input)).toEqual(runInstantRunoff(input))
  })
})

describe('engine input validation', () => {
  it('rejects fewer than two candidates', () => {
    expect(() => runInstantRunoff({ candidates: [cast[0]], blocs: [bloc(10, 'a')] })).toThrow(
      /at least two candidates/,
    )
  })

  it('rejects duplicate candidate ids', () => {
    expect(() =>
      runInstantRunoff({
        candidates: [cast[0], { id: 'a', name: 'Duplicate' }, cast[2], cast[3]],
        blocs: [bloc(1, 'a')],
      }),
    ).toThrow(/duplicate candidate id/)
  })

  it('rejects an election with no ballot blocs', () => {
    expect(() => runInstantRunoff({ candidates: cast, blocs: [] })).toThrow(/at least one ballot bloc/)
  })

  it('rejects rankings that reference an unknown candidate', () => {
    expect(() => runInstantRunoff({ candidates: cast, blocs: [bloc(10, 'a', 'z')] })).toThrow(
      /unknown candidate id 'z'/,
    )
  })

  it('rejects duplicate ids within one ranking', () => {
    expect(() => runInstantRunoff({ candidates: cast, blocs: [bloc(10, 'a', 'a')] })).toThrow(/more than once/)
  })

  it('rejects rankings longer than the candidate list', () => {
    expect(() =>
      runInstantRunoff({ candidates: cast.slice(0, 3), blocs: [bloc(10, 'a', 'b', 'c', 'd')] }),
    ).toThrow(/more than the 3 candidates/)
  })

  it('rejects empty rankings', () => {
    expect(() => runInstantRunoff({ candidates: cast, blocs: [{ weight: 10, ranking: [] }] })).toThrow(
      /at least one candidate/,
    )
  })

  it('rejects non-positive and fractional weights', () => {
    expect(() => runInstantRunoff({ candidates: cast, blocs: [bloc(0, 'a')] })).toThrow(/positive integer/)
    expect(() => runInstantRunoff({ candidates: cast, blocs: [bloc(-5, 'a')] })).toThrow(/positive integer/)
    expect(() => runInstantRunoff({ candidates: cast, blocs: [bloc(2.5, 'a')] })).toThrow(/positive integer/)
  })
})
