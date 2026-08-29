/**
 * Cast-id → Tailwind ink class. Static string map on purpose: Tailwind's
 * scanner only sees complete class names, so team inks are never interpolated
 * (`text-${id}` would compile to nothing). Mirrors the T4 convention.
 */
const INK_TEXT: Record<string, string> = {
  ada: 'text-ada',
  eli: 'text-eli',
  nia: 'text-nia',
  theo: 'text-theo',
}

/** The one ink a candidate is rendered in, everywhere (undefined-safe). */
export function castInkClass(id: string): string {
  return INK_TEXT[id] ?? 'text-ink-bright'
}
