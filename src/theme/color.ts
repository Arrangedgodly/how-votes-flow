/**
 * Color math for the Arena Board palette gates (T4) — pure, dependency-free.
 *
 * Used by `arena.test.ts` to re-validate the theme on every test run and
 * available to later accessibility passes (T9). No DOM, no React.
 */

export type RGB = [number, number, number] // sRGB, 0-255

export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '')
  const n = parseInt(h, 16)
  if (h.length !== 6 || Number.isNaN(n)) throw new Error(`bad hex: ${hex}`)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** sRGB channel → linear-light (WCAG 2.x definition). */
function channelLin(c: number): number {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}

/** WCAG relative luminance. */
export function luminance(rgb: RGB): number {
  return (
    0.2126 * channelLin(rgb[0]) + 0.7152 * channelLin(rgb[1]) + 0.0722 * channelLin(rgb[2])
  )
}

/** WCAG contrast ratio between two hex colors. */
export function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(hexToRgb(a)), luminance(hexToRgb(b))].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

/** CIELAB from linear sRGB under D65. */
export function rgbToLab(rgb: RGB): [number, number, number] {
  const [r, g, b] = rgb.map(channelLin)
  const X = 0.4124 * r + 0.3576 * g + 0.1805 * b
  const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b
  const Z = 0.0193 * r + 0.1192 * g + 0.9505 * b
  const white = [0.95047, 1.0, 1.08883]
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  const [fx, fy, fz] = [f(X / white[0]), f(Y / white[1]), f(Z / white[2])]
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}

/** CIE76 color difference in Lab (adequate for large categorical deltas). */
export function deltaE76(a: string, b: string): number {
  const [x, y] = [rgbToLab(hexToRgb(a)), rgbToLab(hexToRgb(b))]
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2])
}

// ——— Dichromacy simulation: Viénot, Brettel & Mollon (1999), severity 1.0 ———
// Linear sRGB → LMS (Hunt-Pointer-Estevez, D65), collapse the deficient axis,
// back to sRGB. The standard physics-adjacent approximation used by tooling.

const HPE = [
  [17.8824, 43.5161, 4.73535],
  [3.45565, 27.1554, 3.86714],
  [0.0299566, 0.184309, 1.46709],
]
const HPE_INV = [
  [0.0809444479, -0.130504409, 0.116721906],
  [-0.0102485335, 0.054019331, -0.113614708],
  [-0.000365296938, -0.00412161469, 0.693511405],
]
const DEUTANopia = [
  [1, 0, 0],
  [0.494207, 0, 1.248235],
  [0, 0, 1],
]
const PROTANopia = [
  [0, 1.05118294, -0.05116099],
  [0, 1, 0],
  [0, 0, 1],
]

export type CvdMode = 'deuteranopia' | 'protanopia'

function mul3(m: number[][], v: number[]): number[] {
  return m.map((row) => row.reduce((s, x, i) => s + x * v[i], 0))
}

function encode(c: number): number {
  const v = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055
  return Math.round(255 * Math.min(1, Math.max(0, v)))
}

/** Simulate dichromatic perception of a hex color; returns the perceived sRGB. */
export function simulateCvd(hex: string, mode: CvdMode): RGB {
  const mat = mode === 'deuteranopia' ? DEUTANopia : PROTANopia
  const linear = hexToRgb(hex).map(channelLin)
  const simulated = mul3(HPE_INV, mul3(mat, mul3(HPE, linear)))
  return simulated.map(encode) as RGB
}

/** Perceived color difference after CVD simulation. */
export function deltaE76Cvd(a: string, b: string, mode: CvdMode): number {
  const [x, y] = [rgbToLab(simulateCvd(a, mode)), rgbToLab(simulateCvd(b, mode))]
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2])
}
