import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Search, ChevronRight } from 'lucide-react'
import { COMPANIES, type Company, fmtMoney } from '@/lib/crm-data'
import { RecordPanel, type RecordSelection } from '@/components/RecordPanel'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/app/companies')({
  head: () => ({ meta: [{ title: 'Companies · Orbit' }, { name: 'description', content: 'Every account in one database.' }] }),
  component: Companies,
})

const STATUSES: Array<Company['status'] | 'All'> = ['All', 'Prospect', 'Customer', 'Expansion', 'Churn risk']

function Companies() {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('All')
  const [selection, setSelection] = useState<RecordSelection>(null)

  const rows = useMemo(
    () => COMPANIES.filter(c =>
      (status === 'All' || c.status === status) &&
      (c.name.toLowerCase().includes(q.toLowerCase()) || c.industry.toLowerCase().includes(q.toLowerCase()))
    ),
    [q, status]
  )

  return (
    <div className="p-5 sm:p-8 space-y-5 max-w-7xl w-full mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Companies</h1>
        <p className="mt-1 text-sm text-muted-foreground">{COMPANIES.length} accounts · {fmtMoney(COMPANIES.reduce((s, c) => s + c.arr, 0))} total ARR</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search companies or industries"
            className="w-full rounded-lg bg-card ring-1 ring-border pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map(s => (
            <button key={s} onClick={() => setStatus(s)} className={cn('rounded-full px-3 py-1.5 text-xs font-medium transition-colors', status === s ? 'bg-foreground text-background' : 'bg-card ring-1 ring-border text-muted-foreground hover:text-foreground')}>{s}</button>
          ))}
        </div>
      </div>

      <div className="orbit-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[880px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground border-b border-border">
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Industry</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">ICP</th>
                <th className="px-4 py-3 font-medium text-right">ARR</th>
                <th className="px-4 py-3 font-medium">Health</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Last activity</th>
                <th className="px-2 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map(c => (
                <tr key={c.id} onClick={() => setSelection({ type: 'company', id: c.id })} className="border-b border-border/60 last:border-0 hover:bg-accent/40 cursor-pointer transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="h-7 w-7 rounded-md bg-gradient-to-br from-brand/80 to-brand/30 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{c.domain}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.industry}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium',
                      c.status === 'Customer' && 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/70',
                      c.status === 'Prospect' && 'bg-accent text-accent-foreground',
                      c.status === 'Expansion' && 'bg-brand/10 text-brand ring-1 ring-brand/20',
                      c.status === 'Churn risk' && 'bg-rose-50 text-rose-800 ring-1 ring-rose-200/70',
                    )}>{c.status}</span>
                  </td>
                  <td className={cn('px-4 py-3 font-semibold tabular-nums', c.icp >= 90 ? 'text-emerald-700' : '')}>{c.icp}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">{fmtMoney(c.arr)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                        <div className={cn('h-full', c.health >= 75 ? 'bg-emerald-500' : c.health >= 50 ? 'bg-amber-400' : 'bg-rose-500')} style={{ width: `${c.health}%` }} />
                      </div>
                      <span className="text-xs tabular-nums text-muted-foreground">{c.health}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.owner}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.lastActivity}</td>
                  <td className="px-2 py-3 text-muted-foreground"><ChevronRight className="h-4 w-4" /></td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">No companies match that search.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <RecordPanel selection={selection} onClose={() => setSelection(null)} onSelect={setSelection} />
    </div>
  )
}
