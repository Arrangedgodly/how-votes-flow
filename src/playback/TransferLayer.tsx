import { useCallback, useEffect, useRef, useState } from 'react'
import { COLOR_TOKENS } from '../theme/arena.ts'
import {
  CHUNK_STAGGER_MS,
  CHUNK_TRAVEL_MS,
  EXHAUST_DELAY_MS,
  EXHAUST_DURATION_MS,
  type TransferStream,
} from './timeline.ts'

/**
 * The transfer stream — the signature interaction (design brief): a struck
 * team's ballots streaming across the court into teammates' lanes, every
 * stream carrying its own pinned count, motion that always states its number.
 *
 * Geometry, not pictures: measured lane anchors, quadratic arcs, and chunk
 * sprites (groups of five token chips — the counting unit) positioned along
 * the arc from the shared elapsed-time clock. Purely decorative (aria-hidden)
 * — the ribbon narrates the identical numbers, and in reduced-motion mode
 * this layer never renders at all.
 */

interface Point {
  x: number
  y: number
}

interface Rect extends Point {
  w: number
  h: number
}

interface StreamGeometry {
  from: Point
  control: Point
  to: Point
  /** Where the pinned count badge sits — the arc lands ON its own number. */
  labelAt: Point
  path: string
}

interface TransferLayerProps {
  fromId: string
  streams: readonly TransferStream[]
  exhausted: number
  /** Landed votes per stream (ticks the pinned badges). */
  landed: readonly number[] | null
  /** The playback clock — ms into the transfer beat. Freezes on pause. */
  clock: { readonly elapsed: number }
}

const inkOf = (id: string): string => COLOR_TOKENS[id] ?? COLOR_TOKENS['ink-bright']

/** Exponential ease-out — fast off the line, settling onto the target. */
function easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - Math.pow(2, -9 * t)
}

function quadAt(from: Point, control: Point, to: Point, t: number): Point {
  const u = 1 - t
  return {
    x: u * u * from.x + 2 * u * t * control.x + t * t * to.x,
    y: u * u * from.y + 2 * u * t * control.y + t * t * to.y,
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * The stream lands in the receiving lane's status band — the empty slot
 * between the tally and the gauge. It is free by construction during every
 * transfer (only the winner lane ever fills it, and winners never receive),
 * so the pinned count can never sit on a name, a digit, or a persona: it
 * parks beside the very number it is ticking up.
 */
function buildGeometry(from: Point, toTally: Rect): StreamGeometry {
  const to = { x: toTally.x + toTally.w / 2 - 4, y: toTally.y + toTally.h + 12 }
  const dx = to.x - from.x
  const dy = to.y - from.y
  const distance = Math.hypot(dx, dy) || 1
  // The arc bows to the left of travel: upward across a lane row, sideways on
  // the phone's stacked lanes.
  const normal = { x: dy / distance, y: -dx / distance }
  const bow = clamp(distance * 0.3, 30, 96)
  const control = { x: (from.x + to.x) / 2 + normal.x * bow, y: (from.y + to.y) / 2 + normal.y * bow }
  return {
    from,
    control,
    to,
    labelAt: to,
    path: `M ${from.x} ${from.y} Q ${control.x} ${control.y} ${to.x} ${to.y}`,
  }
}

export function TransferLayer({ fromId, streams, exhausted, landed, clock }: TransferLayerProps) {
  const layerRef = useRef<HTMLDivElement>(null)
  const chunkRefs = useRef<(HTMLDivElement | null)[][]>([])
  const exhaustRef = useRef<HTMLDivElement>(null)
  const [geometry, setGeometry] = useState<StreamGeometry[] | null>(null)
  const [exhaustAt, setExhaustAt] = useState<Point | null>(null)
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 })

  const measure = useCallback(() => {
    const layer = layerRef.current
    const panel = layer?.parentElement
    if (!layer || !panel) return
    const layerRect = layer.getBoundingClientRect()

    const tallyRectOf = (id: string): Rect | null => {
      const lane = panel.querySelector<HTMLElement>(`[data-lane="${CSS.escape(id)}"]`)
      const tally = lane?.querySelector<HTMLElement>('[data-tally]')
      if (!tally) return null
      const rect = tally.getBoundingClientRect()
      return {
        x: rect.left - layerRect.left,
        y: rect.top - layerRect.top,
        w: rect.width,
        h: rect.height,
      }
    }

    const fromTally = tallyRectOf(fromId)
    if (!fromTally) return
    const from = { x: fromTally.x + fromTally.w / 2, y: fromTally.y + fromTally.h / 2 }
    const built = streams.map((stream) => {
      const toTally = tallyRectOf(stream.toId)
      return toTally ? buildGeometry(from, toTally) : null
    })
    if (built.some((entry) => entry === null)) return
    setGeometry(built as StreamGeometry[])
    setExhaustAt(exhausted > 0 ? { x: from.x, y: from.y + 44 } : null)
    setSize({ w: layerRect.width, h: layerRect.height })
  }, [fromId, streams, exhausted])

  // Measure on mount, on panel resize, and once webfonts settle (the Doto
  // digits load async and shift lane geometry).
  useEffect(() => {
    measure()
    const panel = layerRef.current?.parentElement
    const observer = panel ? new ResizeObserver(() => measure()) : null
    observer?.observe(panel!)
    void document.fonts?.ready.then(() => measure())
    return () => observer?.disconnect()
  }, [measure])

  // Imperative motion: chunk sprites and the exhausted sink read the shared
  // clock every frame, so pause freezes them exactly where they are.
  useEffect(() => {
    if (!geometry) return
    let frame = 0
    const tick = () => {
      const elapsed = clock.elapsed
      chunkRefs.current.forEach((streamChunks, streamIndex) => {
        const path = geometry[streamIndex]
        if (!path) return
        streamChunks.forEach((element, chunkIndex) => {
          if (!element) return
          const local = elapsed - chunkIndex * CHUNK_STAGGER_MS
          if (local < 0 || local >= CHUNK_TRAVEL_MS) {
            element.style.opacity = '0'
            return
          }
          const progress = easeOutExpo(local / CHUNK_TRAVEL_MS)
          const point = quadAt(path.from, path.control, path.to, progress)
          element.style.opacity = local < 60 ? String(local / 60) : '1'
          element.style.transform = `translate(${point.x}px, ${point.y}px) translate(-50%, -50%)`
        })
      })

      const exhaust = exhaustRef.current
      if (exhaust && exhaustAt) {
        const local = elapsed - EXHAUST_DELAY_MS
        const eased = easeOutExpo(clamp(local / EXHAUST_DURATION_MS, 0, 1))
        // Sinks and dims, but stays legible — this number states itself too.
        exhaust.style.opacity = local < 0 ? '0' : String(1 - 0.55 * eased)
        exhaust.style.transform = `translate(${exhaustAt.x}px, ${exhaustAt.y + 16 * eased}px) translate(-50%, 0)`
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [geometry, exhaustAt, clock])

  return (
    <div
      ref={layerRef}
      aria-hidden="true"
      className="stream-in pointer-events-none absolute inset-0 z-10"
    >
      {geometry && size.w > 0 && (
        <>
          {/* The stream trails — thin dashed arcs in the receiving team's ink. */}
          <svg
            width={size.w}
            height={size.h}
            viewBox={`0 0 ${size.w} ${size.h}`}
            className="absolute inset-0"
          >
            {geometry.map((path, index) => (
              <path
                key={index}
                d={path.path}
                fill="none"
                stroke={inkOf(streams[index].toId)}
                strokeWidth={1.5}
                strokeOpacity={0.45}
                strokeDasharray="1 7"
                strokeLinecap="round"
              />
            ))}
          </svg>

          {/* The pinned counts — every stream states its number where it happens.
              A pin appears with the FIRST chunk's landing, never before: a "+0"
              states nothing, and the tally beside it only ticks on landing too,
              so the pin and the digit it parks next to always agree. Until then
              the arc flies alone — the ribbon (the sole announcer) already
              carries the numbers, so nothing is motion-only. */}
          {geometry.map((path, index) => {
            const count = landed?.[index] ?? 0
            return (
              count > 0 && (
                <span
                  key={index}
                  className="strip-surface tally absolute -translate-x-1/2 -translate-y-1/2 px-1.5 py-0.5 text-sm font-bold leading-none"
                  style={{ left: path.labelAt.x, top: path.labelAt.y, color: inkOf(streams[index].toId) }}
                >
                  +{count}
                </span>
              )
            )
          })}

          {/* Chunk sprites: groups of five token chips, the counting unit. */}
          {geometry.map((_, streamIndex) =>
            streams[streamIndex].chunks.map((chunk, chunkIndex) => (
              <div
                key={chunkIndex}
                ref={(element) => {
                  chunkRefs.current[streamIndex] = chunkRefs.current[streamIndex] ?? []
                  chunkRefs.current[streamIndex][chunkIndex] = element
                }}
                className="absolute left-0 top-0 flex gap-[2px] opacity-0 will-change-transform"
                style={{ color: inkOf(streams[streamIndex].toId) }}
              >
                {Array.from({ length: chunk }).map((_, chipIndex) => (
                  <span key={chipIndex} className="token-chip size-1.5" />
                ))}
              </div>
            )),
          )}

          {/* Ballots switching off: they sink from the struck lane, lights out.
              Bedded like the pinned counts — it states a number too, and the
              strike may pass behind it. */}
          {exhaustAt && exhausted > 0 && (
            <div
              ref={exhaustRef}
              className="absolute left-0 top-0 flex items-center gap-1.5 opacity-0 will-change-transform"
              style={{ transform: `translate(${exhaustAt.x}px, ${exhaustAt.y}px) translate(-50%, 0)` }}
            >
              <span className="strip-surface px-1.5 py-0.5 font-display text-[11px] font-semibold uppercase leading-none tracking-[0.12em] text-ink-body">
                {exhausted} stop counting
              </span>
              <span className="flex gap-[2px] text-ink-mute">
                {Array.from({ length: Math.min(exhausted, 10) }).map((_, chipIndex) => (
                  <span key={chipIndex} className="token-chip size-1.5" />
                ))}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
