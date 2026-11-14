/**
 * Hero 3D sheet stack: three white sheets in perspective, each holding a real demo.
 * Tabs swap which sheet is in front (CSS transform transition); pointer parallax
 * tilts the stack ±4° via rAF (no transition on that property).
 */
import { useEffect, useRef } from 'react'
import { KanbanDemo, OrbitalDemo, AIChatDemo } from '@/components/story-demos'
import { cn } from '@/lib/utils'

const SHEETS = ['Pipeline', 'Signals', 'Forecast'] as const

export function HeroSheets({ front, onChange }: { front: number; onChange: (i: number) => void }) {
  const stageRef = useRef<HTMLDivElement>(null)
  const stackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stage = stageRef.current
    const stack = stackRef.current
    if (!stage || !stack) return
    if (!window.matchMedia('(min-width: 1024px)').matches) return

    let raf = 0
    let tx = 0, ty = 0        // target offsets (deg)
    let cx = 0, cy = 0        // current offsets
    let leaving = false

    const frame = () => {
      cx += (tx - cx) * 0.12
      cy += (ty - cy) * 0.12
      if (leaving && Math.abs(cx) < 0.02 && Math.abs(cy) < 0.02) {
        stack.style.transform = ''
        raf = 0
        return
      }
      stack.style.transform = `rotateX(${(12 + cy).toFixed(2)}deg) rotateY(${(-18 + cx).toFixed(2)}deg)`
      raf = requestAnimationFrame(frame)
    }
    const onMove = (e: PointerEvent) => {
      const r = stage.getBoundingClientRect()
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1   // -1..1
      const ny = ((e.clientY - r.top) / r.height) * 2 - 1
      tx = nx * 4
      ty = -ny * 4
      leaving = false
      if (!raf) raf = requestAnimationFrame(frame)
    }
    const onLeave = () => { tx = 0; ty = 0; leaving = true; if (!raf) raf = requestAnimationFrame(frame) }
    stage.addEventListener('pointermove', onMove)
    stage.addEventListener('pointerleave', onLeave)
    return () => {
      stage.removeEventListener('pointermove', onMove)
      stage.removeEventListener('pointerleave', onLeave)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div className="flex flex-col items-center lg:items-end gap-6">
      <div ref={stageRef} id="sheet-stack" className="sheet-stage w-[380px] max-w-full lg:mr-10">
        <div ref={stackRef} className="sheet-stack relative h-[470px] will-change-transform">
          {SHEETS.map((name, i) => {
            const slot = (i - front + SHEETS.length) % SHEETS.length
            return (
              <div key={name} className={cn('sheet orbit-card overflow-hidden orbit-light', `sheet-slot-${slot}`)} aria-hidden={slot !== 0}>
                {i === 0 && <KanbanDemo compact mode="warmup" active={front === 0} />}
                {i === 1 && <OrbitalDemo compact />}
                {i === 2 && <AIChatDemo compact active />}
              </div>
            )
          })}
        </div>
      </div>
      <div className="flex items-center gap-2 lg:mr-10" role="tablist" aria-label="Hero demos">
        {SHEETS.map((name, i) => (
          <button
            key={name}
            role="tab"
            aria-selected={front === i}
            onClick={() => onChange(i)}
            className={cn(
              'mono-label transition-colors',
              front === i ? 'bg-cream text-ink' : 'text-cream/70 hover:text-cream'
            )}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  )
}
