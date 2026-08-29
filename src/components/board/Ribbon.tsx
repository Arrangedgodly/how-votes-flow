import type { ReactNode } from 'react'

interface RibbonProps {
  /** Score-bug chip naming the round on the board, e.g. "R2" or "FINAL". */
  roundLabel: string
  /**
   * Narration for the current board state. This element is the accessibility
   * channel AND the narrator (one element, both jobs): it is a polite live
   * region, so every board change announced here reaches screen readers. T6
   * feeds it from playback; T8 authors the copy.
   */
  text: ReactNode
}

/** The ribbon caption strip — attached beneath the board, full board width. */
export function Ribbon({ roundLabel, text }: RibbonProps) {
  return (
    <div className="strip-surface flex items-center gap-3 px-3 py-2.5 sm:gap-4 sm:px-4">
      <p className="tally shrink-0 text-lg font-bold text-ink-bright" aria-hidden="true">
        {roundLabel}
      </p>
      <p
        role="status"
        aria-live="polite"
        className="min-w-0 max-w-[75ch] flex-1 text-sm leading-snug text-ink-body sm:text-[15px]"
      >
        {text}
      </p>
    </div>
  )
}
