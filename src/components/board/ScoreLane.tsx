import type { LaneView } from './boardState.ts'
import { LANE_STOPPED_HERE } from '../../copy/copy.ts'
import { castInkClass } from './ink.ts'

/** Where this lane's threshold-line label sits (rows differ per breakpoint). */
export type LineLabel = 'show' | 'show-below-lg' | 'hide'

interface ScoreLaneProps {
  lane: LaneView
  /** Votes needed to win this round — the line's position on the 0–total scale. */
  threshold: number
  /** The full scale: total ballots cast (100). */
  total: number
  /** Whether this lane carries the line's "51 · majority line" caption. */
  lineLabel: LineLabel
  /* ————— playback extensions (T6/T8); all optional, board stays props-driven ————— */
  /** Playback: render the struck treatment for a lane cut this beat. */
  forcedOut?: boolean
  /**
   * Narrative (T8): mark this lane as the winner-take-all leader during the
   * round-1 open — "if we stopped here" — the setup beat of the reveal.
   */
  stoppedHere?: boolean
  /** Playback: the 1-based round a `forcedOut` strike belongs to. */
  outRound?: number | null
  /** Playback: the tally to show while transfer digits tick (else the view's). */
  displayVotes?: number | null
  /** Playback: hold the buzzer mark back until the declaration beat. */
  hideWinnerMark?: boolean
  /** Playback: one flash as the strike cuts (motion mode only). */
  flash?: boolean
  /** Playback: one amber pulse on the winning tally (motion mode only). */
  pulse?: boolean
  /** Playback: animate the lights-out dimming (motion mode only). */
  dimTransition?: boolean
}

/**
 * One team lane: ink rail + lane tag + name, the huge LED tally, the tally
 * gauge with the majority line drawn across it, and the persona line.
 *
 * State treatments: a struck lane freezes at its last tally, the powered
 * elements dim (lane-out) and one bold diagonal cuts the lane; the winner lane
 * carries the buzzer mark (amber — reserved for threshold/majority moments).
 * The playback props layer the mid-beat states on top without changing the
 * static contract: a forced-out lane mid-round, ticking digits, the withheld
 * winner mark, the one-shot flash/pulse devices.
 */
export function ScoreLane({
  lane,
  threshold,
  total,
  lineLabel,
  forcedOut = false,
  outRound = null,
  displayVotes = null,
  hideWinnerMark = false,
  stoppedHere = false,
  flash = false,
  pulse = false,
  dimTransition = false,
}: ScoreLaneProps) {
  const { member, status } = lane
  const struck = status === 'eliminated' || forcedOut
  const won = status === 'winner' && !hideWinnerMark
  const votes = displayVotes ?? lane.votes
  const fillPct = `${Math.min((votes / total) * 100, 100)}%`
  const linePct = `${(threshold / total) * 100}%`

  return (
    <li data-lane={member.id} className={`flex min-w-0 flex-col ${castInkClass(member.id)}`}>
      {/* Powered block (identity → gauge): the parts that go dark when struck,
          and the strike's bounds — the persona below stays lit and uncut. */}
      <div className="relative">
        <div
          className={`${struck ? 'lane-out' : ''}${dimTransition && struck ? ' lane-dim' : ''}`}
        >
          <div className="lane-rule px-1 pt-1.5">
            <p className="font-display text-sm font-semibold uppercase leading-none tracking-[0.16em]">
              {member.short}
            </p>
            <p className="mt-1 font-display text-[13px] font-medium uppercase leading-none tracking-[0.08em] text-ink-body">
              {member.name}
            </p>
          </div>

          {/* The tally — the loudest thing on the page. The unit rides along
              as visually-hidden text ("38 votes"): naming a paragraph through
              an ARIA label is prohibited (generic roles), and content is the
              robust channel — every screen reader reads the digit with its
              unit, right after the name above it. */}
          <p
            data-tally
            className={[
              'tally led-lit mt-2.5 text-6xl font-black sm:text-7xl lg:text-8xl',
              pulse ? 'buzzer-pulse' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {votes}
            <span className="sr-only">{votes === 1 ? ' vote' : ' votes'}</span>
          </p>

          {/* Status slot: buzzer mark on the winner; during round 1's open, the
              winner-take-all frame chip on the plurality leader ("if we stopped
              here" — the reveal's setup). Kept (even when empty) so every gauge
              in a row sits at the same height. The struck lane's caption lives
              below the strike, never under it. */}
          <p className="mt-1.5 min-h-[1.4rem]">
            {won ? (
              <span className="inline-block bg-ground-700 px-1.5 py-0.5 font-display text-xs font-semibold uppercase leading-none tracking-[0.14em] text-buzzer">
                {lane.winner?.wonWithoutMajority ? 'final two · leader wins' : 'majority · buzzer'}
              </span>
            ) : (
              stoppedHere && (
                <span className="inline-block bg-ground-700 px-1.5 py-0.5 font-display text-xs font-semibold uppercase leading-none tracking-[0.14em] text-ink-bright">
                  {LANE_STOPPED_HERE}
                </span>
              )
            )}
          </p>

          {/* Tally gauge: 0–total scale, a fill bar rising off the floor line —
              no box around it; the lane is the container. A struck lane carries
              no fill — its tokens moved. */}
          <div className="relative mt-2 h-14 border-b border-ground-500 sm:h-16 lg:h-20">
            {!struck && (
              <div className="absolute inset-x-1 bottom-0 bg-current" style={{ height: fillPct }} />
            )}
            {/* The majority line — one physical line crossing the board; each lane
                carries its segment, bridging the grid gap so the row reads whole. */}
            <div
              className="absolute inset-x-[-0.6rem] h-[3px] bg-buzzer"
              style={{ bottom: linePct }}
            />
            {(lineLabel === 'show' || lineLabel === 'show-below-lg') && (
              <span
                className={`absolute left-0 flex -translate-y-full items-baseline gap-1.5 pb-1 whitespace-nowrap ${
                  lineLabel === 'show-below-lg' ? 'lg:hidden' : ''
                }`.trim()}
                style={{ bottom: linePct }}
              >
                <span className="tally text-base font-bold leading-none text-buzzer">
                  {threshold}
                </span>
                <span className="font-display text-[11px] font-semibold uppercase leading-none tracking-[0.14em] text-buzzer">
                  majority line
                </span>
              </span>
            )}
          </div>
        </div>

        {/* The strike: one bold diagonal across the powered block — sized
          corner to corner at each breakpoint, clipped at the block's bounds.
          Playback adds one flash as it cuts. */}
        {struck && (
          <div
            aria-hidden="true"
            className={[
              'pointer-events-none absolute inset-0 overflow-hidden',
              flash ? 'strike-flash' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div className="absolute left-1/2 top-1/2 h-2 w-[210%] -translate-x-1/2 -translate-y-1/2 -rotate-[61deg] bg-strike shadow-[0_2px_8px_rgba(0,0,0,0.55)] lg:h-2.5 lg:w-[165%] lg:-rotate-[51deg]" />
          </div>
        )}
      </div>

      {/* The out-caption, below the strike: a struck lane states when it died. */}
      {struck && (
        <p className="mt-1.5 px-1 font-display text-xs font-semibold uppercase leading-none tracking-[0.14em] text-ink-mute">
          out · round {forcedOut ? outRound : lane.eliminatedInRound}
        </p>
      )}

      {/* Persona stays lit on a struck lane — identity outlives the lights.
          Never clamped: the cast is fixed (one line each, ≤90 chars by test),
          and phone parity means the board's only character copy reads in full
          at every lane width — it wraps, it is never cut to an ellipsis. */}
      <p className="mt-2 min-h-[2.6em] px-1 text-xs leading-snug text-ink-mute">
        {member.persona}
      </p>
    </li>
  )
}
