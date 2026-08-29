import type { Candidate } from '../engine/types.ts'

/**
 * The fixed cast of "How Votes Flow" — one consistent set of four fictional
 * candidates used by every scenario, preset, and edit session (PRODUCT.md:
 * party-neutral, classroom-safe, no resemblance to real politicians).
 *
 * `id` is the only reference carried inside rankings, scenarios, and engine
 * output; everything else here is display info. The Arena Board world (T4/T5)
 * themes one colorblind-safe team ink per member, keyed by `id` — never baked
 * in here, so the palette can change without touching scenario data.
 *
 * Declaration order is load-bearing: it is the engine's tie-break fallback of
 * last resort (first declared loses a tie), so this array must stay stable.
 */
export interface CastMember extends Candidate {
  /** Short uppercase lane tag for the scoreboard register (rendered by T5). */
  short: string
  /** One line, classroom-safe, role-neutral: character only, never an outcome. */
  persona: string
}

export const CAST: readonly CastMember[] = [
  {
    id: 'ada',
    name: 'Ada Quinn',
    short: 'ADA',
    persona: 'The methodical veteran: prepared for every question, flustered by none.',
  },
  {
    id: 'eli',
    name: 'Eli Park',
    short: 'ELI',
    persona: 'The organizer: shows up early, stays late, remembers every first name.',
  },
  {
    id: 'nia',
    name: 'Nia Okafor',
    short: 'NIA',
    persona: 'The spark: all energy at the podium and a grin for every camera.',
  },
  {
    id: 'theo',
    name: 'Theo Bass',
    short: 'THEO',
    persona: 'The wildcard: big ideas, bigger handshakes, zero indoor voice.',
  },
]

/** Cast ids in declaration order — the stable vocabulary of every ranking. */
export const castIds: readonly string[] = CAST.map((member) => member.id)
