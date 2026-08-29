import type { CountResult } from '../../engine/index.ts'
import type { CastMember } from '../../scenarios/index.ts'
import { verdictCopy, type VerdictSide } from '../../copy/copy.ts'
import { castInkClass } from '../board/ink.ts'
import { CopyParts } from './Term.tsx'

/**
 * The verdict card (T8) — the dramatic reveal, closed out analytically.
 *
 * Every count ends here naming BOTH winners: the one winner-take-all would
 * have crowned at round 1 (the plurality leader) and the one ranked counting
 * actually elected — changed, confirmed, or a tie the first count could not
 * settle. The changed ending carries the one sanctioned amber: the reveal is
 * the product's terminal threshold moment, so its mark speaks the buzzer's
 * language (reserved everywhere else for the majority line). The confirmed
 * ending stays in ink — no drama where none happened.
 *
 * Below the comparison: the by-round story in plain language (who was
 * eliminated, where the votes went, how it ended), then only the disclosures
 * that actually fired this run — the tie-break (real jurisdictions draw
 * lots; this repeatable simulator uses a disclosed fixed rule), exhausted
 * ballots (why the majority line follows the ballots still counting), and
 * the honest double share when the winner sits under half of all 100.
 * Replay and the edit-and-rerun grip live just beneath the card.
 *
 * All prose comes from src/copy/copy.ts (data-driven, engine-pure); this
 * component only renders it in the board's materials.
 */

interface VerdictCardProps {
  result: CountResult<CastMember>
}

function VerdictSideView({ side, reveal = false }: { side: VerdictSide; reveal?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="font-display text-[11px] font-semibold uppercase leading-none tracking-[0.14em] text-ink-mute">
        {side.label}
      </p>
      <p
        className={`mt-1.5 font-display text-lg font-semibold uppercase leading-tight tracking-[0.04em] ${castInkClass(side.candidateId)}`}
      >
        {side.name}
      </p>
      <p
        className={`tally led-lit mt-1 text-5xl font-black leading-none sm:text-6xl ${
          reveal ? 'text-buzzer' : 'text-ink-bright'
        }`}
      >
        {side.votes}
        <span className="sr-only">{side.votes === 1 ? ' vote' : ' votes'}</span>
      </p>
      <p className="mt-1.5 max-w-[38ch] text-xs leading-snug text-ink-mute">
        <CopyParts parts={side.caption} />
      </p>
    </div>
  )
}

export function VerdictCard({ result }: VerdictCardProps) {
  const copy = verdictCopy(result)
  const changed = copy.kind === 'changed'

  return (
    <section aria-label="Verdict" className="mt-4 min-w-0">
      <div className="strip-surface px-3 py-4 sm:px-5 sm:py-5">
        {/* The reveal treatment + the one sentence that carries both names. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h2 className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-ink-mute">
            Final verdict
          </h2>
          <p
            className={`bg-ground-700 px-1.5 py-0.5 font-display text-[11px] font-semibold uppercase leading-none tracking-[0.14em] ${
              changed ? 'text-buzzer' : 'text-ink-bright'
            }`}
          >
            {copy.headline}
          </p>
        </div>
        <p className="mt-2 max-w-[75ch] text-sm leading-snug text-ink-body sm:text-[15px]">
          {copy.standfirst}
        </p>

        {/* The comparison — the lesson, stated every single time. */}
        <div className="mt-4 grid gap-y-4 border-t border-ground-500 pt-4 sm:grid-cols-[1fr_auto_1fr] sm:gap-x-6 sm:gap-y-0">
          <VerdictSideView side={copy.pluralitySide} />
          <div aria-hidden="true" className="hidden self-stretch bg-ground-500 sm:block sm:w-px" />
          <VerdictSideView side={copy.rankedSide} reveal={changed} />
        </div>

        {/* The by-round story, in plain language. */}
        <div className="mt-4 border-t border-ground-500 pt-4">
          <h3 className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-ink-mute">
            {copy.storyTitle}
          </h3>
          <ol className="mt-2 space-y-1.5">
            {copy.story.map((line) => (
              <li key={line.tag} className="flex gap-3">
                <span className="tally w-12 shrink-0 text-sm font-bold leading-[1.4] text-ink-bright">
                  {line.tag}
                </span>
                <span className="min-w-0 text-sm leading-snug text-ink-body">{line.text}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Only the disclosures that fired this run. */}
        {copy.disclosures.length > 0 && (
          <div className="mt-4 space-y-2.5">
            {copy.disclosures.map((disclosure) => (
              <div key={disclosure.key} className="border border-ground-500 bg-ground-900 px-3 py-2.5">
                <p className="font-display text-[11px] font-semibold uppercase leading-none tracking-[0.14em] text-ink-mute">
                  <CopyParts parts={disclosure.label} />
                </p>
                {disclosure.body.map((paragraph) => (
                  <p key={paragraph} className="mt-1.5 max-w-[75ch] text-sm leading-snug text-ink-body">
                    {paragraph}
                  </p>
                ))}
              </div>
            ))}
          </div>
        )}

        <p className="mt-4 border-t border-ground-500 pt-3 text-xs text-ink-mute">{copy.nextMoves}</p>
      </div>
    </section>
  )
}
