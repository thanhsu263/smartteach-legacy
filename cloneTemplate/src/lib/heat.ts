/**
 * Heat ramp — the one data-colour system on the marketing page.
 * cold #4F8CFF → warm #FFB443 → hot #FF5C39. Items take colour AND scale from heat:
 * cold = 0.94 scale / 70% opacity, hot = 1.04 scale / 100% / 3px ring.
 */
import type { CSSProperties } from 'react'

export const HEAT = { cold: '#4F8CFF', warm: '#FFB443', hot: '#FF5C39' } as const

const hex2rgb = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
const C = hex2rgb(HEAT.cold)
const W = hex2rgb(HEAT.warm)
const H = hex2rgb(HEAT.hot)

export const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

export function heatRGB(h: number): [number, number, number] {
  const t = clamp01(h)
  const [a, b, k] = t < 0.5 ? [C, W, t * 2] : [W, H, (t - 0.5) * 2]
  return [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * k)) as [number, number, number]
}

export const heatColor = (h: number) => `rgb(${heatRGB(h).join(',')})`
export const heatAlpha = (h: number, a: number) => `rgba(${heatRGB(h).join(',')},${a})`

type Fill = 'solid' | 'tint' | 'none'

export function heatStyle(h: number, fill: Fill = 'solid'): CSSProperties {
  const t = clamp01(h)
  const ring = Math.max(0, (t - 0.6) / 0.4) * 0.18
  const base: CSSProperties = {
    transform: `scale(${(0.94 + 0.1 * t).toFixed(3)})`,
    opacity: 0.7 + 0.3 * t,
    boxShadow: `0 0 0 3px rgba(255,92,57,${ring.toFixed(3)})`,
  }
  if (fill === 'solid') base.backgroundColor = heatColor(t)
  if (fill === 'tint') {
    base.backgroundColor = heatAlpha(t, 0.1)
    base.borderColor = heatAlpha(t, 0.45)
  }
  return base
}
