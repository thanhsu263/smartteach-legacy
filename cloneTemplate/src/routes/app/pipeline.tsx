import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { KanbanSquare, Table2, Clock, ChevronRight, GripVertical } from 'lucide-react'
import { DEALS, STAGES, ALL_STAGES, type Deal, type Stage, fmtMoney, companyById } from '@/lib/crm-data'
import { RecordPanel, type RecordSelection } from '@/components/RecordPanel'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export const Route = createFileRoute('/app/pipeline')({
  head: () => ({ meta: [{ title: 'Pipeline · Orbit' }, { name: 'description', content: 'Kanban and table views of your deals.' }] }),
  component: Pipeline,
})

type View = 'board' | 'table'

function Pipeline() {
  const [deals, setDeals] = useState<Deal[]>(DEALS)
  const [view, setView] = useState<View>('board')
  const [selection, setSelection] = useState<RecordSelection>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overStage, setOverStage] = useState<Stage | null>(null)

  const total = deals.reduce((s, d) => s + d.value, 0)

  const moveDeal = (id: string, stage: Stage) => {
    setDeals(prev => prev.map(d => (d.id === id ? { ...d, stage } : d)))
    const d = deals.find(x => x.id === id)
    if (d && d.stage !== stage) toast.success(`${companyById(d.companyId)?.name} moved to ${stage}`)
  }

  return (
    <div className="flex flex-col h-full min-h-0 flex-1">
      <div className="flex flex-wrap items-center gap-3 px-5 sm:px-8 pt-6 pb-4">
        <div className="mr-auto">
          <h1 className="text-2xl font-semibold tracking-tight">Pipeline</h1>
          <p className="mt-1 text-sm text-muted-foreground">{deals.length} deals · {fmtMoney(total)} open</p>
        </div>
        <div className="inline-flex rounded-lg bg-muted p-1 text-sm">
          {([['board', 'Board', KanbanSquare], ['table', 'Table', Table2]] as const).map(([v, label, Icon]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn('inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors', view === v ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
      </div>

      {view === 'board' ? (
        <div className="flex-1 min-h-0 overflow-x-auto px-5 sm:px-8 pb-6">
          <div className="grid grid-cols-4 gap-4 min-w-[960px] h-full">
            {STAGES.map(stage => {
              const list = deals.filter(d => d.stage === stage)
              const sum = list.reduce((s, d) => s + d.value, 0)
              return (
                <div
                  key={stage}
                  onDragOver={e => { e.preventDefault(); setOverStage(stage) }}
                  onDragLeave={() => setOverStage(null)}
                  onDrop={e => { e.preventDefault(); if (dragId) moveDeal(dragId, stage); setDragId(null); setOverStage(null) }}
                  className={cn('flex flex-col rounded-xl p-2 transition-colors min-h-[300px]', overStage === stage ? 'bg-accent/60 ring-1 ring-brand/30' : 'bg-muted/40')}
                >
                  <div className="flex items-center justify-between px-2 py-2">
                    <span className="text-sm font-semibold">{stage}</span>
                    <span className="text-xs text-muted-foreground">{list.length} · {fmtMoney(sum)}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {list.map(d => (
                      <div
                        key={d.id}
                        draggable
                        onDragStart={() => setDragId(d.id)}
                        onDragEnd={() => { setDragId(null); setOverStage(null) }}
                        onClick={() => setSelection({ type: 'deal', id: d.id })}
                        className={cn('orbit-card p-3 cursor-grab active:cursor-grabbing hover:-translate-y-0.5 transition-transform', dragId === d.id && 'opacity-50')}
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-sm font-semibold leading-tight truncate">{companyById(d.companyId)?.name}</span>
                              <span className="text-sm font-semibold tabular-nums">{fmtMoney(d.value)}</span>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{d.lastNote}</p>
                            <div className="mt-2.5 flex items-center gap-2">
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-accent-foreground">{d.ownerInitials}</span>
                              <span className="text-xs text-muted-foreground">{d.owner.split(' ')[0]}</span>
                              <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground"><Clock className="h-3 w-3" />{d.closeDate}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="px-5 sm:px-8 pb-6">
          <div className="orbit-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[820px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground border-b border-border">
                    <th className="px-4 py-3 font-medium">Deal</th>
                    <th className="px-4 py-3 font-medium">Company</th>
                    <th className="px-4 py-3 font-medium">Stage</th>
                    <th className="px-4 py-3 font-medium text-right">Value</th>
                    <th className="px-4 py-3 font-medium">Probability</th>
                    <th className="px-4 py-3 font-medium">Owner</th>
                    <th className="px-4 py-3 font-medium">Close</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {deals.map(d => (
                    <tr key={d.id} onClick={() => setSelection({ type: 'deal', id: d.id })} className="border-b border-border/60 last:border-0 hover:bg-accent/40 cursor-pointer transition-colors">
                      <td className="px-4 py-3 font-medium">{d.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{companyById(d.companyId)?.name}</td>
                      <td className="px-4 py-3">
                        <select
                          value={d.stage}
                          onClick={e => e.stopPropagation()}
                          onChange={e => moveDeal(d.id, e.target.value as Stage)}
                          className="rounded-md bg-muted px-2 py-1 text-xs font-medium outline-none focus:ring-2 focus:ring-ring"
                        >
                          {ALL_STAGES.map(s => <option key={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">{fmtMoney(d.value)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden"><div className="h-full bg-foreground" style={{ width: `${d.probability}%` }} /></div>
                          <span className="text-xs tabular-nums text-muted-foreground">{d.probability}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{d.owner}</td>
                      <td className="px-4 py-3 text-muted-foreground">{d.closeDate}</td>
                      <td className="px-2 py-3 text-muted-foreground"><ChevronRight className="h-4 w-4" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <RecordPanel selection={selection} onClose={() => setSelection(null)} onSelect={setSelection} />
    </div>
  )
}
