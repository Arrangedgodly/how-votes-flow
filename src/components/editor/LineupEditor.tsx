import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { Scenario } from '../../scenarios/index.ts'
import { CAST, castIds } from '../../scenarios/index.ts'
import { castInkClass } from '../board/ink.ts'
import {
  commitWeight,
  freePool,
  MAX_BLOCS,
  TOTAL_VOTES,
  type LineupAction,
  type Slot,
} from './editorState.ts'

/**
 * The lineup editor (T7) — the board's second grip. A roster of bloc rows on
 * the arena's own materials: each row carries its first choice's team ink
 * (the same ink as its lane above and its chips courtside), a lane-rule at
 * its top edge, and controls in the world's grammar. Editing is LIVE on the
 * board: every weight or pick recomputes the count, so the lanes, the
 * majority line, and the courtside field move as you nudge.
 *
 * The 100-sum is conserved (see editorState.ts) and always visible in the
 * header readout: `placed / 100 ballots placed · N unplaced`.
 */

interface LineupEditorProps {
  /** The working copy — never the authored preset objects themselves. */
  scenario: Scenario
  /** Dispatch through the app's edit path (which also re-primes the board). */
  dispatch: (action: LineupAction) => void
  /**
   * TIP OFF's button node (Controls owns it). "Spread the unplaced" always
   * self-disables on success (pool → 0) — the T10 focus residual — and the
   * deliberate seat is the primary action that success just armed. Optional
   * only so the editor can mount in isolation; the fallback seat is the
   * first bloc row's input.
   */
  tipOffRef?: RefObject<HTMLButtonElement | null>
}

const ORDINAL_LABELS = ['1st', '2nd', '3rd'] as const
const ORDINAL_WORDS = ['first', 'second', 'third'] as const

const selectClass =
  'rounded-none border border-ground-500 bg-ground-800 px-1.5 py-1 text-sm leading-none text-ink-body transition-colors enabled:hover:border-ground-400 disabled:cursor-not-allowed disabled:bg-ground-800 disabled:text-ink-mute'

const smallChip =
  'rounded-full border px-3 py-1.5 font-display text-xs font-semibold uppercase tracking-[0.12em] transition-colors disabled:cursor-not-allowed'

/* Disabled = sunken, not invisible: muted text on the deeper bed keeps the
   control legible (inactive controls carry their own honest state) while
   the missing press-light marks them inert. */
const stepButton =
  'size-8 rounded-none border border-ground-500 bg-ground-700 font-display text-base font-bold leading-none text-ink-body transition-colors enabled:hover:border-ground-400 enabled:hover:text-ink-bright disabled:cursor-not-allowed disabled:bg-ground-800 disabled:text-ink-mute'

/** The stepper + typed input for one bloc's weight. */
function WeightControl({
  blocLabel,
  weight,
  pool,
  onNudge,
  onSet,
  registerInput,
}: {
  blocLabel: string
  weight: number
  pool: number
  onNudge: (delta: 1 | -1) => void
  onSet: (weight: number) => void
  /** Reports this row's input node (roster seat bookkeeping in LineupEditor). */
  registerInput?: (element: HTMLInputElement | null) => void
}) {
  // A local draft lets typing pass through transient states ("", "-") without
  // the input snapping back mid-keystroke; blur and commits re-sync it.
  const [draft, setDraft] = useState<string | null>(null)
  const inputElRef = useRef<HTMLInputElement>(null)
  const shown = draft ?? String(weight)
  const max = weight + pool

  const handle = (raw: string) => {
    setDraft(raw)
    const committed = commitWeight(raw, weight, pool)
    if (committed === null) return
    if (committed !== weight) onSet(committed)
    if (String(committed) !== raw) setDraft(String(committed)) // clamped mid-type
  }

  const step = (delta: 1 | -1) => {
    setDraft(null)
    // Focus residual (T10): a stepper that disables itself on this nudge —
    // "−" landing on the 1-vote floor, "+" emptying the pool — would let the
    // browser drop focus to <body>. Seat it on the row's own input (the
    // cluster's stable anchor, always enabled) BEFORE the re-render disables
    // the button, so focus never leaves the control group.
    const selfDisables = delta < 0 ? weight <= 2 : pool <= 1
    if (selfDisables) inputElRef.current?.focus()
    onNudge(delta)
  }

  return (
    <span className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => step(-1)}
        disabled={weight <= 1}
        aria-label={`Return one vote from ${blocLabel} to the unplaced pool`}
        className={stepButton}
      >
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={max}
        value={shown}
        aria-label={`${blocLabel} — votes`}
        onChange={(event) => handle(event.target.value)}
        onBlur={() => setDraft(null)}
        ref={(element) => {
          inputElRef.current = element
          registerInput?.(element)
        }}
        className="tally w-14 rounded-none border border-ground-500 bg-ground-800 px-1 py-1 text-center text-lg font-bold text-ink-bright [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={() => step(1)}
        disabled={pool < 1}
        aria-label={`Place one of the unplaced votes on ${blocLabel}`}
        className={stepButton}
      >
        +
      </button>
    </span>
  )
}

export function LineupEditor({ scenario, dispatch, tipOffRef }: LineupEditorProps) {
  const pool = freePool(scenario)
  const placed = TOTAL_VOTES - pool
  const atCap = scenario.blocs.length >= MAX_BLOCS

  // Focus residual (T10): three controls here disable THEMSELVES on success —
  // "Spread the unplaced" (pool → 0, always), "Add bloc" (pool → 0 or the
  // roster cap), "Remove" (the last removable row) — and a natively-disabled
  // button drops focus to <body>. Each such handler stakes a deliberate seat
  // BEFORE the re-render lands; the effect seats it once the new lineup has
  // committed (so a just-added row's input is focusable). Every seat is
  // click-gated: boots and autoplay never paint a focus ring.
  const spreadRef = useRef<HTMLButtonElement>(null)
  const firstInputRef = useRef<HTMLInputElement | null>(null)
  const lastInputRef = useRef<HTMLInputElement | null>(null)
  const seatAfterEdit = useRef<RefObject<HTMLButtonElement | HTMLInputElement | null> | null>(null)
  useEffect(() => {
    seatAfterEdit.current?.current?.focus()
    seatAfterEdit.current = null
  }, [scenario])

  return (
    <section aria-label="Lineup editor" className="min-w-0">
      {/* Header: the 100-sum, always visible, plus the field-level actions. */}
      <div className="strip-surface flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5 sm:px-4">
        <h2 className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-ink-mute">
          Lineup
        </h2>
        {/* The 100-sum readout — visual state, deliberately NOT a live region:
            the board's ribbon already announces each lineup change exactly
            once (one announcer per state change, not two). */}
        <p className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
          <span className="tally text-lg font-bold leading-none text-ink-bright">{placed}</span>
          <span className="font-display text-xs font-semibold uppercase tracking-[0.14em] text-ink-mute">
            / {TOTAL_VOTES} ballots placed
          </span>
          {pool > 0 && (
            <span className="font-display text-xs font-semibold uppercase tracking-[0.14em] text-ink-bright">
              · {pool} unplaced
            </span>
          )}
        </p>
        <span className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              // Always self-disables (pool → 0): seat the primary action this
              // success just armed — the verifier-suggested T10 target.
              seatAfterEdit.current = tipOffRef ?? firstInputRef
              dispatch({ type: 'spread-unplaced' })
            }}
            disabled={pool < 1}
            ref={spreadRef}
            title={pool < 1 ? 'Every ballot is already placed' : `Spread the ${pool} unplaced ballots evenly across every bloc`}
            className={`${smallChip} border-ground-500 bg-ground-700 text-ink-body enabled:hover:border-ground-400 enabled:hover:text-ink-bright disabled:bg-ground-800 disabled:text-ink-mute`}
          >
            Spread the unplaced
          </button>
          <button
            type="button"
            onClick={() => {
              // Self-disables when it empties the pool or fills the roster:
              // seat the new row's own input — it commits with this dispatch.
              seatAfterEdit.current = lastInputRef
              dispatch({ type: 'add-bloc' })
            }}
            disabled={pool < 1 || atCap}
            title={
              atCap
                ? `The roster holds at most ${MAX_BLOCS} blocs`
                : pool < 1
                  ? 'Free a ballot first — step any bloc down'
                  : 'Split one unplaced ballot onto a new bloc'
            }
            className={`${smallChip} border-ground-500 bg-ground-700 text-ink-body enabled:hover:border-ground-400 enabled:hover:text-ink-bright disabled:bg-ground-800 disabled:text-ink-mute`}
          >
            Add bloc
          </button>
        </span>
      </div>

      {/* The roster: one row per bloc, inked by its first choice. */}
      <ul className="border border-t-0 border-ground-500 bg-ground-900">
        {scenario.blocs.map((bloc, index) => {
          const firstChoice = bloc.ranking[0] ?? castIds[0]
          const isLast = index === scenario.blocs.length - 1
          const usedElsewhere = (slot: Slot) =>
            bloc.ranking.filter((_, index) => index !== slot)
          return (
            <li
              key={bloc.id}
              className={`lane-rule flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-ground-500 px-3 py-2.5 last:border-b-0 sm:px-4 ${castInkClass(firstChoice)}`}
            >
              <p className="min-w-[9rem] flex-1 basis-full text-sm font-medium leading-snug sm:basis-auto">
                {bloc.label}
              </p>

              <WeightControl
                blocLabel={bloc.label}
                weight={bloc.weight}
                pool={pool}
                onNudge={(delta) => dispatch({ type: 'nudge', blocId: bloc.id, delta })}
                onSet={(weight) => dispatch({ type: 'set-weight', blocId: bloc.id, weight })}
                registerInput={(element) => {
                  // The roster's stable anchors: the first and last rows'
                  // inputs (seat targets above; a one-bloc roster is both).
                  if (element === null) return
                  if (index === 0) firstInputRef.current = element
                  if (isLast) lastInputRef.current = element
                }}
              />

              <span className="flex flex-wrap items-center gap-1.5">
                {([0, 1, 2] as Slot[]).map((slot) => {
                  const chosen = bloc.ranking[slot]
                  const disabled = slot === 2 && bloc.ranking.length < 2
                  const available = castIds.filter((id) => !usedElsewhere(slot).includes(id))
                  return (
                    <span key={slot} className="flex items-center gap-1">
                      <span
                        aria-hidden="true"
                        className="font-display text-[11px] font-semibold uppercase leading-none tracking-[0.12em] text-ink-mute"
                      >
                        {ORDINAL_LABELS[slot]}
                      </span>
                      <select
                        aria-label={`${bloc.label} — ${ORDINAL_WORDS[slot]} choice`}
                        value={chosen ?? ''}
                        disabled={disabled}
                        onChange={(event) =>
                          dispatch({
                            type: 'set-rank',
                            blocId: bloc.id,
                            slot,
                            candidateId: event.target.value || null,
                          })
                        }
                        className={`${selectClass} ${chosen ? castInkClass(chosen) : 'text-ink-mute'}`}
                      >
                        {slot > 0 && <option value="">no next choice</option>}
                        {CAST.filter((member) => available.includes(member.id)).map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name}
                          </option>
                        ))}
                      </select>
                    </span>
                  )
                })}
              </span>

              <button
                type="button"
                onClick={() => {
                  // Removing a row unmounts the pressed button (and at one
                  // remaining bloc the survivors' Remove disables too) — both
                  // natively drop focus to <body>. Seat Spread, the recovery
                  // affordance the returned ballots just armed (pool ≥ 1
                  // after any removal, so it is always enabled here).
                  if (scenario.blocs.length > 1) seatAfterEdit.current = spreadRef
                  dispatch({ type: 'remove-bloc', blocId: bloc.id })
                }}
                disabled={scenario.blocs.length <= 1}
                aria-label={`Remove ${bloc.label}`}
                title={
                  scenario.blocs.length <= 1
                    ? 'Keep at least one bloc'
                    : `Remove ${bloc.label} — its ${bloc.weight} votes return to the unplaced pool`
                }
                className="ml-auto rounded-full border border-ground-500 bg-ground-700 px-2.5 py-1 font-display text-[11px] font-semibold uppercase leading-none tracking-[0.12em] text-ink-body transition-colors enabled:hover:border-ground-400 enabled:hover:text-ink-bright disabled:cursor-not-allowed disabled:bg-ground-800 disabled:text-ink-mute"
              >
                Remove
              </button>
            </li>
          )
        })}
      </ul>
      <p className="mt-2 text-xs text-ink-mute">
        {scenario.blocs.length === 1
          ? 'One bloc on the roster — remove is locked to keep the field countable.'
          : `Every edit re-primes the board — nudge a weight and the count moves.`}
      </p>
    </section>
  )
}
