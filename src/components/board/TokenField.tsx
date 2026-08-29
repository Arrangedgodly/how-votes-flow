/** One allocation row of the courtside field. */
export interface TokenRow {
  key: string
  /** Condensed label: the lane tag, or the plain-language exhausted label. */
  label: string
  count: number
  /** Ink class tinting this row's chips (currentColor). */
  inkClass: string
}

interface TokenFieldProps {
  rows: TokenRow[]
  /** Total ballots — the field always shows every one of them. */
  total: number
}

/** Chunk a count into groups of `size` (last group takes the remainder). */
function chunk(count: number, size: number): number[] {
  const groups: number[] = []
  for (let remaining = count; remaining > 0; remaining -= size) {
    groups.push(Math.min(size, remaining))
  }
  return groups
}

/**
 * The courtside token field: all `total` votes as physical tokens, massed in
 * groups of five and colored by the lane they currently count for. Never 100
 * loose sprites — the chunk is the counting unit, and each row states its own
 * number. Ballots that no longer count get their own honest row, muted.
 */
export function TokenField({ rows, total }: TokenFieldProps) {
  return (
    <section
      aria-label={`Courtside — all ${total} ballots by current count`}
      className="min-w-0"
    >
      <h2 className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-ink-mute">
        Courtside · {total} ballots by current count
      </h2>
      <ul className="mt-2 flex flex-col gap-1.5">
        {rows.map((row) => (
          <li
            key={row.key}
            className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 ${row.inkClass}`}
          >
            <span className="w-[7.5rem] shrink-0 font-display text-xs font-semibold uppercase leading-none tracking-[0.12em]">
              {row.label}
            </span>
            <span className="tally w-6 shrink-0 text-center text-sm font-bold leading-none">
              {row.count}
            </span>
            <span className="flex min-w-0 flex-wrap items-center gap-1.5" aria-hidden="true">
              {chunk(row.count, 5).map((groupSize, groupIndex) => (
                <span key={groupIndex} className="flex items-center gap-[3px]">
                  {Array.from({ length: groupSize }).map((_, chipIndex) => (
                    <span key={chipIndex} className="token-chip size-2.5 sm:size-3" />
                  ))}
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
