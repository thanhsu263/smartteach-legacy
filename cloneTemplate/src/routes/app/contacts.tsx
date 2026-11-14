import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Search, Mail } from 'lucide-react'
import { CONTACTS, companyById } from '@/lib/crm-data'
import { RecordPanel, type RecordSelection } from '@/components/RecordPanel'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/app/contacts')({
  head: () => ({ meta: [{ title: 'Contacts · Orbit' }, { name: 'description', content: 'Every person you sell to.' }] }),
  component: Contacts,
})

function Contacts() {
  const [q, setQ] = useState('')
  const [selection, setSelection] = useState<RecordSelection>(null)
  const rows = useMemo(
    () => CONTACTS.filter(p => {
      const s = q.toLowerCase()
      return p.name.toLowerCase().includes(s) || p.title.toLowerCase().includes(s) || (companyById(p.companyId)?.name.toLowerCase().includes(s) ?? false)
    }),
    [q]
  )

  return (
    <div className="p-5 sm:p-8 space-y-5 max-w-7xl w-full mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Contacts</h1>
        <p className="mt-1 text-sm text-muted-foreground">{CONTACTS.length} people across {new Set(CONTACTS.map(c => c.companyId)).size} companies</p>
      </div>

      <label className="relative block max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search people, titles or companies"
          className="w-full rounded-lg bg-card ring-1 ring-border pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(p => {
          const c = companyById(p.companyId)
          return (
            <button key={p.id} onClick={() => setSelection({ type: 'contact', id: p.id })} className="orbit-card p-4 text-left hover:-translate-y-0.5 transition-transform">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                  {p.name.split(' ').map(n => n[0]).join('')}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{p.title} · {c?.name}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className={cn(
                  'rounded-full px-2 py-0.5 text-[11px] font-medium',
                  p.role === 'Champion' && 'bg-brand/10 text-brand',
                  p.role === 'Decision maker' && 'bg-foreground text-background',
                  p.role === 'Economic buyer' && 'bg-amber-50 text-amber-800 ring-1 ring-amber-200/70',
                  p.role === 'User' && 'bg-muted text-muted-foreground',
                )}>{p.role}</span>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3" />{p.lastTouch}</span>
              </div>
            </button>
          )
        })}
        {rows.length === 0 && <p className="col-span-full py-12 text-center text-sm text-muted-foreground">No contacts match that search.</p>}
      </div>

      <RecordPanel selection={selection} onClose={() => setSelection(null)} onSelect={setSelection} />
    </div>
  )
}
