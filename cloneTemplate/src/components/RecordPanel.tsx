/**
 * Slide-over record detail panel shared by pipeline, companies and contacts.
 */
import { X, Mail, Globe, MapPin, Users, Sparkles, Clock, Phone, FileText } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import {
  type Company, type Contact, type Deal,
  CONTACTS, DEALS, COMPANIES, companyById, fmtFull, fmtMoney,
} from '@/lib/crm-data'

export type RecordSelection =
  | { type: 'company'; id: string }
  | { type: 'contact'; id: string }
  | { type: 'deal'; id: string }
  | null

interface Props {
  selection: RecordSelection
  onClose: () => void
  onSelect: (s: RecordSelection) => void
}

const TIMELINE = [
  { icon: Mail, text: 'Follow-up email sent — security review attachments', when: '2h ago' },
  { icon: Sparkles, text: 'Orbit drafted a follow-up from 3 call notes', when: '2h ago' },
  { icon: Phone, text: 'Discovery call · 32 min · 4 attendees', when: 'Yesterday' },
  { icon: FileText, text: 'Note: champion wants mobile offline mode', when: '3d ago' },
]

export function RecordPanel({ selection, onClose, onSelect }: Props) {
  const open = selection !== null
  return (
    <Sheet open={open} onOpenChange={o => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 gap-0 overflow-y-auto [&>button]:hidden">
        {selection?.type === 'company' && <CompanyView id={selection.id} onClose={onClose} onSelect={onSelect} />}
        {selection?.type === 'contact' && <ContactView id={selection.id} onClose={onClose} onSelect={onSelect} />}
        {selection?.type === 'deal' && <DealView id={selection.id} onClose={onClose} onSelect={onSelect} />}
      </SheetContent>
    </Sheet>
  )
}

function Header({ eyebrow, title, sub, onClose }: { eyebrow: string; title: string; sub?: string; onClose: () => void }) {
  return (
    <div className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border px-5 py-4 flex items-start gap-3">
      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand/80 to-brand/30 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{eyebrow}</p>
        <SheetTitle className="text-base font-semibold leading-tight truncate">{title}</SheetTitle>
        {sub && <p className="text-xs text-muted-foreground truncate">{sub}</p>}
      </div>
      <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Close">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{value}</dd>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="px-5 py-4 border-b border-border/70">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">{title}</h3>
      {children}
    </section>
  )
}

function Timeline() {
  return (
    <Section title="Activity">
      <ol className="space-y-3">
        {TIMELINE.map((t, i) => (
          <li key={i} className="flex gap-3 text-sm">
            <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"><t.icon className="h-3.5 w-3.5" /></span>
            <div className="min-w-0 flex-1">
              <p className="leading-snug">{t.text}</p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5"><Clock className="h-3 w-3" />{t.when}</p>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  )
}

function StatusPill({ status }: { status: Company['status'] }) {
  return (
    <span className={cn(
      'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium',
      status === 'Customer' && 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/70',
      status === 'Prospect' && 'bg-accent text-accent-foreground',
      status === 'Expansion' && 'bg-brand/10 text-brand ring-1 ring-brand/20',
      status === 'Churn risk' && 'bg-rose-50 text-rose-800 ring-1 ring-rose-200/70',
    )}>{status}</span>
  )
}

function CompanyView({ id, onClose, onSelect }: { id: string; onClose: () => void; onSelect: Props['onSelect'] }) {
  const c = COMPANIES.find(x => x.id === id)
  if (!c) return null
  const people = CONTACTS.filter(p => p.companyId === id)
  const deals = DEALS.filter(d => d.companyId === id)
  return (
    <>
      <Header eyebrow="Company" title={c.name} sub={c.domain} onClose={onClose} />
      <Section title="Overview">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Field label="Status" value={<StatusPill status={c.status} />} />
          <Field label="ICP score" value={<span className={c.icp >= 90 ? 'text-emerald-700' : ''}>{c.icp}</span>} />
          <Field label="ARR" value={fmtFull(c.arr)} />
          <Field label="Owner" value={c.owner} />
          <Field label="Industry" value={c.industry} />
          <Field label="Employees" value={<span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5 text-muted-foreground" />{c.employees}</span>} />
          <Field label="Location" value={<span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-muted-foreground" />{c.location}</span>} />
          <Field label="Website" value={<span className="inline-flex items-center gap-1"><Globe className="h-3.5 w-3.5 text-muted-foreground" />{c.domain}</span>} />
        </dl>
      </Section>
      <Section title={`Deals · ${deals.length}`}>
        <div className="space-y-2">
          {deals.map(d => (
            <button key={d.id} onClick={() => onSelect({ type: 'deal', id: d.id })} className="w-full text-left orbit-card p-3 hover:bg-accent/40 transition-colors">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{d.name}</span>
                <span className="tabular-nums font-semibold">{fmtMoney(d.value)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{d.stage} · closes {d.closeDate}</p>
            </button>
          ))}
          {deals.length === 0 && <p className="text-sm text-muted-foreground">No open deals yet.</p>}
        </div>
      </Section>
      <Section title={`People · ${people.length}`}>
        <div className="space-y-1">
          {people.map(p => (
            <button key={p.id} onClick={() => onSelect({ type: 'contact', id: p.id })} className="w-full flex items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-accent/50 transition-colors">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">{p.name.split(' ').map(n => n[0]).join('')}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground truncate">{p.title}</p>
              </div>
              <span className="text-[11px] text-muted-foreground">{p.role}</span>
            </button>
          ))}
        </div>
      </Section>
      <Timeline />
    </>
  )
}

function ContactView({ id, onClose, onSelect }: { id: string; onClose: () => void; onSelect: Props['onSelect'] }) {
  const p: Contact | undefined = CONTACTS.find(x => x.id === id)
  if (!p) return null
  const c = companyById(p.companyId)
  return (
    <>
      <Header eyebrow="Contact" title={p.name} sub={p.title} onClose={onClose} />
      <Section title="Details">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Field label="Email" value={<span className="inline-flex items-center gap-1 truncate"><Mail className="h-3.5 w-3.5 text-muted-foreground" />{p.email}</span>} />
          <Field label="Role" value={p.role} />
          <Field label="Company" value={
            c ? <button onClick={() => onSelect({ type: 'company', id: c.id })} className="text-brand hover:underline">{c.name}</button> : '—'
          } />
          <Field label="Last touch" value={p.lastTouch} />
        </dl>
      </Section>
      <Section title="AI summary">
        <div className="rounded-xl bg-muted/70 p-3 text-sm leading-relaxed">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-brand mb-1"><Sparkles className="h-3.5 w-3.5" /> Orbit</span>
          <p>{p.name.split(' ')[0]} is the {p.role.toLowerCase()} at {c?.name}. Most responsive on Tuesday mornings; cares about security posture and time-to-value. Last three threads were about the rollout timeline.</p>
        </div>
      </Section>
      <Timeline />
    </>
  )
}

function DealView({ id, onClose, onSelect }: { id: string; onClose: () => void; onSelect: Props['onSelect'] }) {
  const d: Deal | undefined = DEALS.find(x => x.id === id)
  if (!d) return null
  const c = companyById(d.companyId)
  return (
    <>
      <Header eyebrow="Deal" title={d.name} sub={`${d.stage} · closes ${d.closeDate}`} onClose={onClose} />
      <Section title="Summary">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Field label="Value" value={fmtFull(d.value)} />
          <Field label="Probability" value={`${d.probability}%`} />
          <Field label="Owner" value={d.owner} />
          <Field label="Company" value={
            c ? <button onClick={() => onSelect({ type: 'company', id: c.id })} className="text-brand hover:underline">{c.name}</button> : '—'
          } />
        </dl>
        <div className="mt-4 h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-foreground" style={{ width: `${d.probability}%` }} />
        </div>
      </Section>
      <Section title="Latest note">
        <p className="text-sm leading-relaxed">{d.lastNote}</p>
      </Section>
      <Timeline />
    </>
  )
}
