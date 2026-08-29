import { useCallback, useMemo, useReducer, useRef, useState } from 'react'
import { ArenaBoard } from './components/board/ArenaBoard.tsx'
import { LineupEditor } from './components/editor/LineupEditor.tsx'
import { PresetChips } from './components/editor/PresetChips.tsx'
import { CopyParts } from './components/verdict/Term.tsx'
import { VerdictCard } from './components/verdict/VerdictCard.tsx'
import { BRAND } from './copy/copy.ts'
import {
  lineupIssues,
  lineupReducer,
  ribbonForLineup,
  ribbonForLoad,
  type LineupAction,
} from './components/editor/editorState.ts'
import { Controls } from './playback/Controls.tsx'
import { TransferLayer } from './playback/TransferLayer.tsx'
import type { MotionPref, UsePlaybackOptions } from './playback/usePlayback.ts'
import { usePlayback } from './playback/usePlayback.ts'
import type { PlaybackStepKind } from './playback/timeline.ts'
import {
  blankCustomScenario,
  generateSurpriseScenario,
  PRESETS,
  presetById,
  runScenario,
} from './scenarios/index.ts'
import type { Scenario } from './scenarios/index.ts'

/**
 * How Votes Flow — the app shell around the Arena Board (T7 wiring).
 *
 * ONE BOARD, TWO GRIPS: there is no setup screen. The board stands at round
 * 1 of the working lineup; beneath it the roster editor (preset chips, bloc
 * rows with weight steppers and rank selects) edits that lineup LIVE — every
 * change recomputes the count, so lanes, majority line, and the courtside
 * field move as you nudge. The 100 ballots are conserved (blocs + unplaced
 * pool, see src/components/editor/editorState.ts) and TIP OFF is gated until
 * all 100 are placed.
 *
 * Phase contract (the mid-playback transition, defined): the editor mounts
 * in setup and in the verdict state only — while the count is playing, the
 * board is performing and playback controls hold the base. Any edit from
 * the verdict state resets the machine to setup with the board re-primed at
 * round 1 (the instant-rerun path); Surprise Me rerolls straight into setup.
 *
 * Capture/pinning params (not product features): `?scenario=<preset|custom|
 * surprise>`, `?seed=N` (deterministic surprise), `?motion=reduced|full`,
 * `?autostart=1`, and `?pin=<round-open|strike|transfer|winner|verdict>&
 * round=N&at=MS` (paused at a deterministic beat, for screenshots and the
 * detector's URL scan).
 */

interface Boot {
  scenarioId: string
  seed: number | undefined
  options: UsePlaybackOptions
}

function readBoot(): Boot {
  if (typeof window === 'undefined') {
    return { scenarioId: 'spoiler', seed: undefined, options: {} }
  }
  const params = new URLSearchParams(window.location.search)

  const requested = params.get('scenario')
  const scenarioId =
    requested && (presetById(requested) || requested === 'custom' || requested === 'surprise')
      ? requested
      : 'spoiler'

  const seedParam = Number(params.get('seed'))
  const seed = scenarioId === 'surprise' && Number.isFinite(seedParam) && seedParam > 0
    ? Math.floor(seedParam)
    : undefined

  const motion = params.get('motion')
  const initialMotion: MotionPref | undefined =
    motion === 'reduced' || motion === 'full' ? motion : undefined

  const pinKind = params.get('pin')
  const pin =
    pinKind === 'round-open' || pinKind === 'strike' || pinKind === 'transfer' ||
    pinKind === 'winner' || pinKind === 'verdict'
      ? {
          kind: pinKind as PlaybackStepKind | 'verdict',
          roundNumber: Number(params.get('round')) || 1,
          atMs: Number(params.get('at')) || 600,
        }
      : undefined

  return {
    scenarioId,
    seed,
    options: {
      autostart: params.get('autostart') === '1',
      pin,
      initialMotion,
    },
  }
}

function bootScenario(id: string, seed: number | undefined): Scenario {
  if (id === 'custom') return blankCustomScenario()
  if (id === 'surprise') return generateSurpriseScenario(seed)
  return presetById(id) ?? PRESETS[0]
}

export default function App() {
  const [boot] = useState(readBoot)
  const [initialLineup] = useState(() => bootScenario(boot.scenarioId, boot.seed))
  const [lineup, dispatchLineup] = useReducer(lineupReducer, initialLineup)

  const result = useMemo(() => runScenario(lineup), [lineup])
  const playback = usePlayback(result, boot.options)

  const issues = useMemo(() => lineupIssues(lineup), [lineup])
  const canStart = issues.length === 0

  // Ribbon announcements for the editor grip: a load announces its field,
  // any edit falls back to the standing lineup narration (which states the
  // 100-sum condition). Both flow through the board's own live region.
  const [announce, setAnnounce] = useState<string | null>(null)

  const { reset } = playback
  const editLineup = useCallback(
    (action: LineupAction) => {
      if (action.type === 'load') setAnnounce(ribbonForLoad(action.scenario))
      else setAnnounce(null)
      // Editing always re-primes: from the verdict state this returns the
      // board to setup; from setup it is an identity and harms nothing.
      reset()
      dispatchLineup(action)
    },
    [reset],
  )

  const pickStartingPoint = useCallback(
    (scenario: Scenario) => editLineup({ type: 'load', scenario }),
    [editLineup],
  )
  const rerollSurprise = useCallback(
    () => editLineup({ type: 'load', scenario: generateSurpriseScenario() }),
    [editLineup],
  )

  const overlay = playback.overlay
  const layer =
    overlay.streams && overlay.struckNowId ? (
      <TransferLayer
        key={`transfer-r${playback.roundIndex + 1}`}
        fromId={overlay.struckNowId}
        streams={overlay.streams}
        exhausted={overlay.exhaustedNow}
        landed={overlay.landed}
        clock={overlay.clock}
      />
    ) : null

  const editing = playback.state.phase !== 'playing'
  const setupRibbon = announce ?? ribbonForLineup(lineup)
  const ribbonText = playback.state.phase === 'idle' ? setupRibbon : playback.ribbon

  // TIP OFF's node, shared Controls ↔ editor (T10 focus residual): completing
  // the field via "Spread the unplaced" self-disables that control, and the
  // deliberate seat is the primary action the success just armed.
  const tipOffRef = useRef<HTMLButtonElement>(null)

  // Landmarks (T9): the marquee is a real banner (it sits outside the main
  // landmark, so the header element keeps its banner role), and `data-motion`
  // mirrors the resolved reduced-motion state (OS query OR manual toggle)
  // onto the tree — the CSS backstop in index.css reads it to kill every
  // residual micro-transition.
  return (
    <div className="min-h-dvh bg-ground-950 font-body text-ink-body" data-motion={playback.reduced ? 'reduced' : 'full'}>
      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-6 sm:py-6">
        {/* The marquee — the brand in the LED register (Doto earns it here:
            this is the scoreboard's own name), subtitle in Barlow with the
            one jargon term glossed. The board below is the page's voice. */}
        <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h1 className="tally led-lit text-2xl font-black uppercase tracking-[0.06em] text-ink-bright sm:text-3xl">
            {BRAND.title}
          </h1>
          <p className="text-xs text-ink-mute sm:text-sm">
            <CopyParts parts={BRAND.subtitle} />
          </p>
        </header>

        <main data-phase={playback.state.phase} data-beat={playback.beatLabel}>
        <div className="mt-3 sm:mt-5">
          <ArenaBoard
            result={result}
            roundIndex={playback.roundIndex}
            ribbonText={ribbonText}
            playback={overlay}
            layer={layer}
          />
        </div>

        {playback.state.phase === 'done' && <VerdictCard result={result} />}

        {/* The base: one primary action, the preset selector, the lineup
            editor. While the count plays, the board holds the stage — the
            editing grip returns with the verdict. */}
        <div className="mt-5 space-y-3">
          <Controls
            controller={playback}
            startDisabled={!canStart}
            startReason={issues[0]}
            tipOffRef={tipOffRef}
          />

          {editing && (
            <PresetChips activeId={lineup.id} onPick={pickStartingPoint} onSurprise={rerollSurprise} />
          )}

          {editing && <LineupEditor scenario={lineup} dispatch={editLineup} tipOffRef={tipOffRef} />}
        </div>

        {import.meta.env.DEV && (
          <p className="mt-4 text-xs text-ink-mute">
            T8 narrative + verdict card are live. Pin a beat with
            ?scenario=&amp;pin=round-open|transfer|strike|winner|verdict&amp;round=N&at=MS
            &amp;motion=reduced|full, run with ?autostart=1, or boot a deterministic random
            field with ?scenario=surprise&amp;seed=N.
          </p>
        )}
        </main>
      </div>
    </div>
  )
}
