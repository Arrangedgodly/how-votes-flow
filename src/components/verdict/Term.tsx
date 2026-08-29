import { useId, useRef, useState, type ReactNode } from 'react'
import { GLOSSARY, type CopyPart, type GlossaryId } from '../../copy/copy.ts'

/**
 * Term — the gentle jargon tooltip (T8): a term of art in running copy that
 * carries its own plain-language definition.
 *
 * World grammar: the term stays inline in the sentence (Barlow, same size as
 * its context), marked only by a dotted underline — the arena's way of saying
 * "ask about this one". The definition opens as a small raised panel
 * (ground bed, hairline rule, soft drop) anchored above the term.
 *
 * Accessible by construction, never motion-only:
 *  - the trigger is a real <button> (keyboard-focusable, Enter/Space toggle);
 *  - hover/focus opens, Escape and blur close, click toggles (touch has no
 *    hover — the tap is the tooltip);
 *  - aria-expanded + aria-controls announce the state, and the open panel is
 *    plain text in the accessibility tree — the definition is readable by
 *    screen reader exactly when it is readable by eye;
 *  - the panel appears and disappears as a discrete state change (no
 *    animation), so reduced motion changes nothing here.
 */

interface TermProps {
  /** The glossary entry this term links to. */
  id: GlossaryId
  /** Override the displayed words (defaults to the entry's own term). */
  display?: ReactNode
  /** Extra classes for the inline trigger (it inherits text size and color). */
  className?: string
}

export function Term({ id, display, className = '' }: TermProps) {
  const entry = GLOSSARY[id]
  const panelId = useId()
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  return (
    <span className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={(event) => {
          // Pointer clicks toggle (touch has no hover — the tap is the
          // tooltip). Keyboard activation (detail 0) is a no-op: focus alone
          // already opened the panel, so Enter must not close it — Escape
          // and blur are the keyboard's close.
          if (event.detail > 0) setOpen((value) => !value)
        }}
        onMouseEnter={() => setOpen(true)}
        // A pointer leaving must not close a panel the keyboard focus is
        // still holding open.
        onMouseLeave={() => {
          if (document.activeElement !== triggerRef.current) setOpen(false)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setOpen(false)
          }
        }}
        className={`border-b border-dotted border-current underline-offset-2 ${className}`.trim()}
      >
        {display ?? entry.term}
      </button>
      {/* The panel always exists (hidden when closed) so aria-controls points
          at a real node in every state — screen readers and axe both resolve
          the reference. Tailwind's preflight keeps [hidden] display:none over
          the utility classes, so nothing leaks when closed. */}
      <span
        role="tooltip"
        id={panelId}
        hidden={!open}
        className="absolute bottom-full left-0 z-30 mb-2 block w-[min(44ch,calc(100vw-3rem))] border border-ground-500 bg-ground-800 px-3 py-2.5 text-left font-body text-xs normal-case leading-relaxed tracking-normal text-ink-body shadow-[0_10px_28px_rgba(0,0,0,0.5)] sm:text-[13px]"
      >
        {entry.definition}
      </span>
    </span>
  )
}

/** Renders copy parts, swapping glossary terms for inline Term tooltips. */
export function CopyParts({ parts, className }: { parts: readonly CopyPart[]; className?: string }) {
  return (
    <span className={className}>
      {parts.map((part, index): ReactNode =>
        typeof part === 'string' ? part : <Term key={index} id={part.term} />,
      )}
    </span>
  )
}
