/**
 * The real UI demos used in the hero sheet stack and the chapter sequence.
 * All data colour comes from the heat ramp (src/lib/heat.ts); each demo has an
 * idle loop so the page moves at rest.
 */
import { useEffect, useId, useState } from 'react'
import {
  Sparkles, Send, MoreHorizontal, Filter, ArrowUpDown, Plus, Wrench, Check, Clock, Building2,
} from 'lucide-react'
import { COMPANIES, DEALS, STAGES, type Deal, fmtMoney, companyById } from '@/lib/crm-data'
import { HEAT, heatColor, heatAlpha, heatStyle, clamp01 } from '@/lib/heat'
import { cn } from '@/lib/utils'

const probHeat = (p: number) => clamp01((p - 15) / 65)
const icpHeat = (icp: number) => clamp01((icp - 65) / 33)
const healthHeat = (h: number) => clamp01((h - 30) / 65)

/* ─────────────────────────── shared chrome ─────────────────────────── */

function Window({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('orbit-card overflow-hidden flex flex-col h-full', className)}>
      <div className="flex items-center gap-3 px-4 h-10 border-b border-ink/10 shrink-0">
        <span className="flex gap-1.5">
          <i className="h-2 w-2 rounded-full bg-ink/10" />
          <i className="h-2 w-2 rounded-full bg-ink/10" />
          <i className="h-2 w-2 rounded-full bg-ink/10" />
        </span>
        <span className="mono-label text-ink/60">{title}</span>
      </div>
      <div className="flex-1 min-h-0 relative">{children}</div>
    </div>
  )
}

function HeatDot({ h, className }: { h: number; className?: string }) {
  return <span className={cn('heat-item inline-block h-2 w-2 rounded-full shrink-0', className)} style={heatStyle(h)} />
}

function Initials({ text }: { text: string }) {
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-paper text-[10px] font-semibold text-ink">
      {text}
    </span>
  )
}

/* ───────────────── Step 1 · Companies table + AI follow-up ───────────────── */

export function CompaniesTableDemo() {
  const rows = COMPANIES.slice(0, 6)
  return (
    <Window title="Companies · 1,284 records">
      <div className="absolute inset-0 flex flex-col">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-ink/10 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-paper px-2 py-1 font-medium"><Filter className="h-3 w-3" /> ICP &gt; 80</span>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-paper px-2 py-1 font-medium"><ArrowUpDown className="h-3 w-3" /> Heat</span>
          <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-ink text-cream px-2 py-1 font-medium"><Plus className="h-3 w-3" /> Add</span>
        </div>
        <div className="grid grid-cols-[1.6fr_1fr_0.7fr_0.9fr_0.8fr] gap-3 px-4 py-2 text-[10px] uppercase tracking-[1.4px] font-mono text-ink/50 border-b border-ink/10">
          <span>Company</span><span>Industry</span><span>Heat</span><span>ARR</span><span>Owner</span>
        </div>
        <div className="flex-1 overflow-hidden">
          {rows.map((c, i) => (
            <div key={c.id} className={cn('grid grid-cols-[1.6fr_1fr_0.7fr_0.9fr_0.8fr] gap-3 items-center px-4 py-2.5 text-sm border-b border-ink/5', i === 0 && 'bg-paper')}>
              <span className="flex items-center gap-2 min-w-0">
                <span className="h-6 w-6 rounded-md bg-ink shrink-0" />
                <span className="truncate font-medium">{c.name}</span>
              </span>
              <span className="truncate text-ink/60 text-xs">{c.industry}</span>
              <span className="flex items-center gap-2 text-xs font-semibold tabular-nums" style={{ color: heatColor(icpHeat(c.icp)) }}>
                <HeatDot h={icpHeat(c.icp)} />{c.icp}
              </span>
              <span className="text-xs tabular-nums">{fmtMoney(c.arr)}</span>
              <span className="text-xs text-ink/60 truncate">{c.owner.split(' ')[0]}</span>
            </div>
          ))}
        </div>

        <div className="absolute right-4 bottom-4 w-[300px] sm:w-[340px] orbit-card p-4 shadow-lg">
          <div className="flex items-center gap-2 text-xs font-medium">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-ink text-cream"><Sparkles className="h-3.5 w-3.5" /></span>
            AI follow-up · Northwind Labs
            <MoreHorizontal className="ml-auto h-4 w-4 text-ink/50" />
          </div>
          <div className="mt-3 rounded-xl bg-paper p-3 text-xs leading-relaxed text-ink/90">
            <p className="text-ink/60">To: elena@northwind.ai</p>
            <p className="mt-1 font-medium">Re: security review before Thursday</p>
            <p className="mt-2">Hi Elena — attaching our SOC 2 Type II report and the data-flow diagram your team asked for. Happy to bring our security lead to Thursday's call so you can close the review in one pass.</p>
            <p className="mt-2">— Maya</p>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button className="orbit-cta inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium"><Send className="h-3 w-3" /> Send</button>
            <button className="text-xs font-medium text-ink/60 hover:text-ink">Edit</button>
            <span className="ml-auto text-[10px] text-ink/50">Drafted from 3 notes</span>
          </div>
        </div>
      </div>
    </Window>
  )
}

/* ─────────────────────── Step 2 · Orbital diagram ─────────────────────── */

const CHIPS = [
  { label: 'ICP: 98', r: 112, a: -60, heat: 0.95 },
  { label: 'Warm intro via a16z', r: 165, a: 20, heat: 0.55 },
  { label: '$5B Series H', r: 148, a: 150, heat: 0.5 },
  { label: 'Hiring 40 AEs', r: 205, a: -150, heat: 0.15, ghost: true },
  { label: 'Visited pricing 3×', r: 190, a: 70, heat: 0.9 },
  { label: 'Champion: Elena V.', r: 230, a: -20, heat: 0.2, ghost: true },
  { label: 'Uses Snowflake', r: 245, a: 115, heat: 0.05, ghost: true },
]

export function OrbitalDemo({ compact = false }: { compact?: boolean }) {
  const k = compact ? 0.5 : 1
  return (
    <Window title="Northwind Labs · signals">
      <div className="absolute inset-0 orbit-grid-bg overflow-hidden flex items-center justify-center">
        {[110, 165, 210, 250].map(r => (
          <span key={r} className="absolute rounded-full border border-dashed border-ink/15" style={{ width: r * 2 * k, height: r * 2 * k }} />
        ))}
        <div className="relative z-10 flex flex-col items-center">
          <div className={cn('rounded-2xl bg-ink text-cream flex items-center justify-center', compact ? 'h-12 w-12' : 'h-16 w-16')}>
            <Building2 className={compact ? 'h-5 w-5' : 'h-7 w-7'} />
          </div>
          <span className="mt-2 text-sm font-semibold">Northwind Labs</span>
          <span className="text-[11px] text-ink/60">Lead score 96 · Tier 1</span>
        </div>
        <div className="absolute inset-0 flex items-center justify-center animate-[orbit-spin_70s_linear_infinite]">
          {CHIPS.filter(c => !(compact && c.ghost)).map(c => {
            const rad = (c.a * Math.PI) / 180
            return (
              <span key={c.label} className="absolute z-10" style={{ transform: `translate(${Math.cos(rad) * c.r * k}px, ${Math.sin(rad) * c.r * k}px)` }}>
                <span className="block animate-[orbit-spin_70s_linear_infinite_reverse]">
                  <span
                    className={cn('heat-item inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white border border-ink/10 font-medium text-ink', compact ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs')}
                    style={heatStyle(c.heat, 'none')}
                  >
                    <HeatDot h={c.heat} />{c.label}
                  </span>
                </span>
              </span>
            )
          })}
        </div>
      </div>
    </Window>
  )
}

/* ─────────────────────────── Step 3 · Kanban ─────────────────────────── */

type KanbanMode = 'static' | 'drift' | 'warmup'

export function KanbanDemo({ compact = false, mode = 'static', active = true }: { compact?: boolean; mode?: KanbanMode; active?: boolean }) {
  const [deals, setDeals] = useState<Deal[]>(DEALS)
  const [heat, setHeat] = useState<Record<string, number>>(() =>
    Object.fromEntries(DEALS.map(d => [d.id, probHeat(d.probability)]))
  )

  // Warm-up loop: every 6s, all cards drop to cold then warm to hot in sequence.
  useEffect(() => {
    if (mode !== 'warmup' || !active) return
    const order = [...DEALS].sort((a, b) => a.probability - b.probability)
    const n = order.length
    let timers: number[] = []
    const cycle = () => {
      timers.forEach(clearTimeout)
      timers = []
      setHeat(Object.fromEntries(order.map(d => [d.id, 0])))
      order.forEach((d, i) => {
        timers.push(window.setTimeout(() => {
          setHeat(prev => ({ ...prev, [d.id]: 0.3 + (0.7 * i) / (n - 1) }))
        }, 450 + i * 320))
      })
    }
    const first = window.setTimeout(cycle, 150)
    const loop = window.setInterval(cycle, 6000)
    return () => { clearTimeout(first); clearInterval(loop); timers.forEach(clearTimeout) }
  }, [mode, active])

  // Drift loop: one card moves to the next column every 4s.
  useEffect(() => {
    if (mode !== 'drift' || !active) return
    let i = 0
    const t = window.setInterval(() => {
      setDeals(prev => {
        const idx = i++ % prev.length
        return prev.map((d, j) =>
          j === idx ? { ...d, stage: STAGES[(STAGES.indexOf(d.stage) + 1) % STAGES.length] } : d
        )
      })
    }, 4000)
    return () => clearInterval(t)
  }, [mode, active])

  return (
    <Window title={compact ? 'Pipeline · Q4' : 'Pipeline · Q4 · $1.88M weighted'}>
      <div className={cn('absolute inset-0 bg-paper', compact ? 'p-2 overflow-hidden' : 'overflow-x-auto overflow-y-hidden p-3')}>
        <div className={cn('grid h-full', compact ? 'grid-cols-2 gap-2' : 'grid-cols-4 gap-3 min-w-[760px]')}>
          {STAGES.map(stage => {
            const list = deals.filter(d => d.stage === stage)
            const total = list.reduce((s, d) => s + d.value, 0)
            return (
              <div key={stage} className="flex flex-col min-h-0">
                <div className="flex items-center justify-between px-1 pb-1.5">
                  <span className="text-[11px] font-semibold">{stage}</span>
                  <span className="text-[10px] text-ink/50 tabular-nums">{list.length} · {fmtMoney(total)}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {list.map(d => {
                    const h = heat[d.id] ?? 0
                    return (
                      <div key={d.id} className={cn('heat-item rounded-xl border bg-white will-change-transform', compact ? 'p-2' : 'p-3')} style={heatStyle(h, 'tint')}>
                        <div className="flex items-start justify-between gap-2">
                          <span className="flex items-center gap-1.5 min-w-0">
                            <HeatDot h={h} />
                            <span className={cn('font-semibold leading-tight truncate', compact ? 'text-[11px]' : 'text-xs')}>{companyById(d.companyId)?.name}</span>
                          </span>
                          <span className={cn('font-semibold tabular-nums', compact ? 'text-[11px]' : 'text-xs')} style={{ color: heatColor(h) }}>{fmtMoney(d.value)}</span>
                        </div>
                        <p className={cn('mt-1 text-ink/60', compact ? 'text-[10px] line-clamp-1' : 'text-[11px] line-clamp-2')}>{d.lastNote}</p>
                        <div className={cn('flex items-center gap-2', compact ? 'mt-1.5' : 'mt-2.5')}>
                          <Initials text={d.ownerInitials} />
                          <span className="text-[10px] text-ink/60">{d.owner.split(' ')[0]}</span>
                          <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-ink/50"><Clock className="h-3 w-3" />{d.closeDate}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Window>
  )
}

/* ───────────────────────── Step 4 · AI revenue chat ───────────────────────── */

const ANSWER =
  'You are tracking to $2.14M for Q4 — 7% above plan. Vantage ($690K, hot) signs by Oct 21. Sable ($410K) is cooling fast: usage fell 30% after their exec sponsor left. If Sable slips you land at $1.73M. Escalate Sable to Maya this week.'

export function AIChatDemo({ active = true, compact = false }: { active?: boolean; compact?: boolean }) {
  const [typed, setTyped] = useState(0)
  const gid = useId()
  useEffect(() => {
    if (!active) return
    let i = 0
    const t = setInterval(() => {
      i += 3
      setTyped(i)
      if (i >= ANSWER.length) clearInterval(t)
    }, 18)
    return () => clearInterval(t)
  }, [active])
  const done = typed >= ANSWER.length

  return (
    <Window title="Ask Orbit · forecast">
      <div className="absolute inset-0 flex flex-col">
        <div className={cn('flex-1 overflow-hidden space-y-3', compact ? 'p-3' : 'p-4 sm:p-5 space-y-4')}>
          <div className="flex justify-end">
            <div className={cn('max-w-[85%] rounded-2xl rounded-br-md bg-ink text-cream px-3.5 py-2', compact ? 'text-xs' : 'text-sm')}>
              Are we going to hit the Q4 number? What could break it?
            </div>
          </div>
          <div className="flex gap-2.5">
            <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-paper text-ink"><Sparkles className="h-3.5 w-3.5" /></span>
            <div className="min-w-0 flex-1 space-y-2.5">
              <div className="rounded-xl border border-ink/10 bg-white p-2.5 text-[11px]">
                <div className="flex items-center gap-2 font-medium"><Wrench className="h-3 w-3 text-ink/50" /> 2 tools used</div>
                <div className="mt-1.5 space-y-1 text-ink/60">
                  <div className="flex items-center gap-2"><Check className="h-3 w-3" /><code className="font-mono text-[10px]">pipeline.forecast(q="Q4", weighted=true)</code></div>
                  <div className="flex items-center gap-2"><Check className="h-3 w-3" /><code className="font-mono text-[10px]">accounts.heat(min_arr=100000)</code></div>
                </div>
              </div>
              <div className="rounded-xl border border-ink/10 bg-white p-2.5">
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[1.4px] text-ink/50">
                  <span>Weighted forecast</span><span>Q4</span>
                </div>
                <svg viewBox="0 0 240 56" className="mt-1 w-full h-12" aria-hidden>
                  <defs>
                    <linearGradient id={gid} x1="0" x2="1">
                      <stop offset="0" stopColor={HEAT.cold} />
                      <stop offset="0.5" stopColor={HEAT.warm} />
                      <stop offset="1" stopColor={HEAT.hot} />
                    </linearGradient>
                  </defs>
                  <line x1="0" y1="34" x2="240" y2="34" stroke="rgba(11,13,24,0.1)" strokeDasharray="3 4" />
                  <path
                    d="M0 50 C 30 48, 50 42, 80 38 S 130 30, 160 20 S 210 10, 240 4"
                    fill="none" stroke={`url(#${gid})`} strokeWidth="2.5" strokeLinecap="round"
                    pathLength={1} strokeDasharray="1" className="animate-[orbit-draw_6s_cubic-bezier(0.22,1,0.36,1)_infinite]"
                  />
                </svg>
              </div>
              <p className={cn('leading-relaxed', compact ? 'text-[11px]' : 'text-sm')}>
                {ANSWER.slice(0, typed)}
                {!done && <span className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 bg-ink animate-orbit-blink" />}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { k: 'Forecast', v: '$2.14M', d: '+7% vs plan', h: 0.6 },
                  { k: 'Cooling', v: '$410K', d: 'Sable & Co · renewal', h: 1 },
                ].map(s => (
                  <div key={s.k} className="heat-item rounded-xl border p-2.5" style={heatStyle(s.h, 'tint')}>
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-ink/70"><HeatDot h={s.h} />{s.k}</div>
                    <div className={cn('mt-1 font-semibold tabular-nums', compact ? 'text-base' : 'text-lg')} style={{ color: heatColor(s.h) }}>{s.v}</div>
                    <div className="text-[10px] text-ink/60">{s.d}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-ink/10 p-2.5">
          <div className="flex items-center gap-2 rounded-xl bg-paper px-3 py-2 text-xs text-ink/50">
            Ask anything about your revenue…
            <span className="ml-auto inline-flex h-6 w-6 items-center justify-center rounded-lg bg-ink text-cream"><Send className="h-3 w-3" /></span>
          </div>
        </div>
      </div>
    </Window>
  )
}

/* ─────────────────────── Step 5 · Retain and expand ─────────────────────── */

export function RetentionDemo({ active = true }: { active?: boolean }) {
  const accounts = COMPANIES.filter(c => c.status !== 'Prospect')
  const [health, setHealth] = useState<Record<string, number>>(() => Object.fromEntries(accounts.map(c => [c.id, c.health])))

  useEffect(() => {
    if (!active) return
    const t = window.setInterval(() => {
      setHealth(prev => {
        const next: Record<string, number> = {}
        for (const c of accounts) {
          const cur = prev[c.id] ?? c.health
          const drift = Math.round((Math.random() - 0.5) * 6) + Math.sign(c.health - cur)
          next[c.id] = Math.max(30, Math.min(96, cur + drift))
        }
        return next
      })
    }, 2000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  return (
    <Window title="Customer health · 412 accounts">
      <div className="absolute inset-0 flex flex-col p-4 gap-4 overflow-hidden">
        <div className="grid grid-cols-3 gap-3">
          {[
            { k: 'Net revenue retention', v: '118%', d: '+4 pts QoQ', h: 0.75 },
            { k: 'Expansion pipeline', v: '$1.2M', d: '14 open plays', h: 0.5 },
            { k: 'Accounts cooling', v: '6', d: '$540K ARR', h: 1 },
          ].map(s => (
            <div key={s.k} className="heat-item rounded-xl border p-3" style={heatStyle(s.h, 'tint')}>
              <div className="text-[11px] text-ink/60">{s.k}</div>
              <div className="mt-1 text-xl font-semibold tracking-tight tabular-nums">{s.v}</div>
              <div className="text-[11px] font-medium" style={{ color: heatColor(s.h) }}>{s.d}</div>
            </div>
          ))}
        </div>
        <div className="flex-1 min-h-0 rounded-xl border border-ink/10 bg-white overflow-hidden">
          <div className="grid grid-cols-[1.5fr_0.8fr_1.2fr_1fr] gap-3 px-4 py-2 text-[10px] font-mono uppercase tracking-[1.4px] text-ink/50 border-b border-ink/10">
            <span>Account</span><span>ARR</span><span>Health</span><span>Next play</span>
          </div>
          {accounts.map(c => {
            const v = health[c.id] ?? c.health
            const h = healthHeat(v)
            return (
              <div key={c.id} className="grid grid-cols-[1.5fr_0.8fr_1.2fr_1fr] gap-3 items-center px-4 py-2.5 text-sm border-b border-ink/5">
                <span className="font-medium truncate">{c.name}</span>
                <span className="text-xs tabular-nums">{fmtMoney(c.arr)}</span>
                <span className="flex items-center gap-2">
                  <span className="h-1.5 flex-1 rounded-full bg-paper overflow-hidden">
                    <span className="heat-item block h-full rounded-full" style={{ width: `${v}%`, backgroundColor: heatColor(h), transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1), background-color 0.8s' }} />
                  </span>
                  <span className="heat-item inline-flex min-w-7 justify-center rounded-md px-1 text-[11px] font-semibold tabular-nums" style={{ ...heatStyle(h, 'tint'), color: heatColor(h) }}>{v}</span>
                </span>
                <span className="text-xs text-ink/70">{c.status === 'Churn risk' ? 'Save call' : c.status === 'Expansion' ? 'Upsell seats' : 'QBR'}</span>
              </div>
            )
          })}
        </div>
      </div>
    </Window>
  )
}
