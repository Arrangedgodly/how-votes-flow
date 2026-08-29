import type { ReactNode } from 'react'
import type { CountResult } from '../../engine/index.ts'
import type { CastMember } from '../../scenarios/index.ts'
import { boardViewForRound } from './boardState.ts'
import { castInkClass } from './ink.ts'
import { Ribbon } from './Ribbon.tsx'
import { ScoreLane } from './ScoreLane.tsx'
import type { LineLabel } from './ScoreLane.tsx'
import { TokenField } from './TokenField.tsx'
import type { TokenRow } from './TokenField.tsx'

/**
 * Mid-beat playback adjustments (T6). All optional; the board's static
 * contract (any round of any result, purely props-driven) is unchanged.
 * Structurally compatible with `PlaybackOverlay` from `src/playback/`.
 */
export interface ArenaBoardPlayback {
  /** The lane struck this round (strike + transfer beats), else null. */
  struckNowId?: string | null
  /**
   * Narrative (T8): during the round-1 open, the plurality leader's lane —
   * the one winner-take-all would hand it all to ("if we stopped here").
   */
  stoppedHereId?: string | null
  /** 1-based round number the strike belongs to. */
  struckRound?: number | null
  /** Absolute displayed tallies while transfer digits tick. */
  displayedVotes?: ReadonlyMap<string, number> | null
  /** Hold the winner mark back until the declaration beat. */
  suppressWinner?: boolean
  /** One flash on the strike (motion mode only). */
  flash?: boolean
  /** One amber pulse on the winning tally (motion mode only). */
  pulse?: boolean
  /** Motion devices allowed (not reduced motion). */
  animate?: boolean
}

interface ArenaBoardProps {
  /** A complete engine result — the board renders any of its rounds. */
  result: CountResult<CastMember>
  /** 0-based index into result.rounds; the round shown. */
  roundIndex: number
  /** Narration text for the ribbon (the live region). Supplied by the caller. */
  ribbonText: ReactNode
  /** Playback: mid-beat lane adjustments. */
  playback?: ArenaBoardPlayback
  /** Playback: the transfer stream layer, rendered over the arena floor. */
  layer?: ReactNode
}

/**
 * The Arena Board — the whole committed world, rendering one round of an
 * engine result: four team lanes with huge LED tallies over the majority line
 * on the tally scale, the ribbon caption strip, and the courtside token field
 * with every ballot accounted for. Props-driven and stateless; playback (T6)
 * changes the round index, the ribbon text, and layers its mid-beat state
 * through `playback` / `layer` without the board knowing any clocks.
 */
export function ArenaBoard({ result, roundIndex, ribbonText, playback, layer }: ArenaBoardProps) {
  const view = boardViewForRound(result, roundIndex)
  const { round } = view

  const rows: TokenRow[] = [
    ...view.allocation.map(({ member, votes }) => ({
      key: member.id,
      label: member.short,
      count: votes,
      inkClass: castInkClass(member.id),
    })),
    ...(view.exhausted > 0
      ? [
          {
            key: 'not-counting',
            label: 'No longer counting',
            count: view.exhausted,
            inkClass: 'text-ink-mute',
          },
        ]
      : []),
  ]

  const lineLabelFor = (index: number): LineLabel =>
    index === 0 ? 'show' : index === 2 ? 'show-below-lg' : 'hide'

  return (
    <section
      aria-label={`Arena board — round ${round.round} of ${result.rounds.length}`}
      className="min-w-0"
    >
      {/* The arena floor: lanes live on it, separated by their ink rails.
          Playback draws its transfer streams across this surface. */}
      <div data-floor className="relative border border-ground-500 bg-ground-900 p-3 sm:p-4">
        <ul className="grid grid-cols-2 gap-x-3 gap-y-5 lg:grid-cols-4">
          {view.lanes.map((lane, index) => {
            const forcedOut = playback?.struckNowId === lane.member.id
            return (
              <ScoreLane
                key={lane.member.id}
                lane={lane}
                threshold={round.majorityThreshold}
                total={round.totalBallots}
                lineLabel={lineLabelFor(index)}
                forcedOut={forcedOut}
                stoppedHere={playback?.stoppedHereId === lane.member.id}
                outRound={forcedOut ? (playback?.struckRound ?? null) : null}
                displayVotes={playback?.displayedVotes?.get(lane.member.id) ?? null}
                hideWinnerMark={Boolean(playback?.suppressWinner) && lane.status === 'winner'}
                flash={Boolean(playback?.flash) && forcedOut}
                pulse={
                  Boolean(playback?.pulse) &&
                  lane.status === 'winner' &&
                  !playback?.suppressWinner
                }
                dimTransition={Boolean(playback?.animate)}
              />
            )
          })}
        </ul>
        {layer}
      </div>

      {/* Ribbon — attached beneath the floor, the board's own caption strip. */}
      <Ribbon
        roundLabel={view.decided ? 'FINAL' : `R${round.round}`}
        text={ribbonText}
      />

      {/* Courtside: every ballot, grouped by where it counts now. */}
      <div className="mt-4">
        <TokenField rows={rows} total={round.totalBallots} />
      </div>
    </section>
  )
}
