import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowUpRight, AlertTriangle, TrendingUp, Clock } from 'lucide-react'
import { COMPANIES, DEALS, ALL_STAGES, fmtMoney, companyById } from '@/lib/crm-data'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/app/')({
  head: () => ({
    meta: [
      { title: 'Overview · Orbit' },
      { name: 'description', content: 'Your revenue at a glance.' },
    ],
  }),
  component: Overview,
})

function Overview() {
  const pipeline = DEALS.reduce((s, d) => s + d.value, 0)
  const weighted = DEALS.reduce((s, d) => s + (d.value * d.probability) / 100, 0)
  const atRisk = COMPANIES.filter(c => c.status === 'Churn risk')
  const byStage = ALL_STAGES.map(s => ({ stage: s, total: DEALS.filter(d => d.stage === s).reduce((a, d) => a + d.value, 0) }))
  const max = Math.max(...byStage.map(b => b.total), 1)

  return (
    <div className="p-5 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Good morning, Maya</h1>
          <p className="mt-1 text-sm text-muted-foreground">Q4 is 71% through. Here is where the number stands.</p>
        </div>
        <Link to="/app/pipeline" className="orbit-cta inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium">
          Open pipeline <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { k: 'Open pipeline', v: fmtMoney(pipeline), d: `${DEALS.length} deals`, icon: TrendingUp },
          { k: 'Weighted forecast', v: fmtMoney(weighted), d: '+7% vs plan', icon: TrendingUp },
          { k: 'Closing this month', v: fmtMoney(DEALS.filter(d => d.closeDate.startsWith('Oct')).reduce((s, d) => s + d.value, 0)), d: '5 deals', icon: Clock },
          { k: 'Accounts at risk', v: String(atRisk.length), d: fmtMoney(atRisk.reduce((s, c) => s + c.arr, 0)) + ' ARR', icon: AlertTriangle, warn: true },
        ].map(s => (
          <div key={s.k} className="orbit-card p-5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              {s.k}
              <s.icon className={cn('h-4 w-4', s.warn ? 'text-amber-600' : 'text-muted-foreground')} />
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-tight">{s.v}</div>
            <div className={cn('mt-1 text-xs', s.warn ? 'text-amber-700' : 'text-muted-foreground')}>{s.d}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="orbit-card p-5">
          <h2 className="text-sm font-semibold">Pipeline by stage</h2>
          <div className="mt-5 space-y-3">
            {byStage.map(b => (
              <div key={b.stage} className="grid grid-cols-[110px_1fr_70px] items-center gap-3 text-sm">
                <span className="text-muted-foreground text-xs">{b.stage}</span>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-foreground transition-[width] duration-500" style={{ width: `${(b.total / max) * 100}%` }} />
                </div>
                <span className="text-right text-xs tabular-nums font-medium">{fmtMoney(b.total)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="orbit-card p-5">
          <h2 className="text-sm font-semibold">Needs attention</h2>
          <ul className="mt-4 space-y-3">
            {DEALS.filter(d => d.probability >= 55).slice(0, 4).map(d => (
              <li key={d.id} className="flex items-start gap-3 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium truncate">{companyById(d.companyId)?.name} · {fmtMoney(d.value)}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{d.lastNote}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
