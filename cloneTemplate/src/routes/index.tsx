import { useEffect, useRef, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { heatColor } from '@/lib/heat'
import {
  CompaniesTableDemo,
  OrbitalDemo,
  KanbanDemo,
  AIChatDemo,
  RetentionDemo,
} from '@/components/story-demos'
import { HeroSheets } from '@/components/hero-sheets'

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Orbit — every deal has a temperature' },
      {
        name: 'description',
        content:
          'Orbit scores every account cold to hot, so your team works the deals that are actually moving. Pipeline, signals, forecasting and retention in one CRM.',
      },
      { property: 'og:title', content: 'Orbit CRM' },
      { property: 'og:description', content: 'Every deal has a temperature. Orbit scores every account cold to hot.' },
    ],
  }),
  component: Landing,
})

/* ─────────────────────────── story content ─────────────────────────── */

const STEPS = [
  {
    label: 'Build pipeline',
    title: 'Every account, already researched.',
    body: 'Orbit enriches companies as they land and drafts the first touch from your notes — so reps start from a follow-up, not a blank page.',
  },
  {
    label: 'Convert leads',
    title: 'See why a lead is hot before you call.',
    body: 'Signals orbit each account: fit score, funding, warm paths, intent. The right context sits one glance away.',
  },
  {
    label: 'Run sales motions',
    title: 'A pipeline board your team actually keeps up to date.',
    body: 'Drag deals across stages, see owners and last activity on every card, and let Orbit nudge what has gone cold.',
  },
  {
    label: 'Forecast revenue',
    title: 'Ask the number. Get the answer and the risk.',
    body: 'Orbit runs the forecast and reads heat signals for you, then explains what could move the quarter — with the tools it used.',
  },
  {
    label: 'Retain and expand',
    title: 'Keep the revenue you already won.',
    body: 'Health scores, cooling alerts, and expansion plays live next to the pipeline, so net retention is a motion, not a report.',
  },
]

function Landing() {
  return (
    <div className="orbit-light min-h-dvh bg-paper text-ink">
      <Nav />
      <Hero />
      <Proof />
      <Chapters />
      <Features />
      <CTABand />
      <Footer />
    </div>
  )
}

/* ─────────────────────────────── nav ─────────────────────────────── */

function Nav() {
  return (
    <header className="sticky top-0 z-40 bg-paper/85 backdrop-blur-md border-b border-ink/10">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <OrbitMark />
          <span className="text-[15px] font-semibold tracking-tight">ORBIT</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-ink/60">
          <a href="#story" className="hover:text-ink transition-colors">Product</a>
          <a href="#features" className="hover:text-ink transition-colors">Platform</a>
          <a href="#proof" className="hover:text-ink transition-colors">Customers</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/app" preload="render" className="hidden sm:inline text-sm font-medium text-ink/60 hover:text-ink transition-colors">Sign in</Link>
          <Link to="/app" preload="render" className="orbit-cta inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium">
            Open Orbit <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </header>
  )
}

function OrbitMark({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cn('relative inline-flex h-7 w-7 items-center justify-center rounded-lg', inverted ? 'bg-cream' : 'bg-ink', className)}>
      <span className={cn('h-2 w-2 rounded-full', inverted ? 'bg-ink' : 'bg-cream')} />
      <span className={cn('absolute h-5 w-5 rounded-full border rotate-[-25deg] scale-x-[1.35]', inverted ? 'border-ink/60' : 'border-cream/60')} />
    </span>
  )
}

/* ─────────────────────────────── hero ─────────────────────────────── */

function Hero() {
  const [front, setFront] = useState(0)
  const watch = () => {
    setFront(0)
    document.getElementById('sheet-stack')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
  return (
    <section className="relative overflow-hidden bg-field text-cream min-h-[88vh] flex items-center">
      <div aria-hidden className="grain pointer-events-none absolute inset-0" />
      <div className="relative mx-auto w-full max-w-7xl px-5 sm:px-8 py-14 lg:py-20 grid gap-12 lg:grid-cols-[55fr_45fr] items-center">
        <div>
          <span className="mono-label text-cream/80">Orbit CRM</span>
          <h1 className="mt-6 font-semibold text-[44px] lg:text-[80px] leading-[0.98] tracking-[-0.04em]">
            Every deal has a
            <span className="chrome-text block">temperature.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-cream/80">
            Orbit scores every account cold to hot, so your team works the deals that are actually moving.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/app" preload="render" className="cta cta-primary">Start free <ArrowRight className="h-4 w-4" /></Link>
            <button type="button" onClick={watch} className="cta cta-secondary">Watch the pipeline warm up</button>
            <a href="#story" className="ml-1 text-sm text-cream/80 underline underline-offset-4 decoration-cream/40 hover:text-cream hover:decoration-cream transition-colors">
              Read how scoring works
            </a>
          </div>
        </div>
        <HeroSheets front={front} onChange={setFront} />
      </div>
    </section>
  )
}

/* ─────────────────────────────── proof ─────────────────────────────── */

function Proof() {
  const logos = ['Northwind', 'Halcyon', 'Ferrous', 'Lumen', 'Meridian', 'Aster', 'Vantage']
  return (
    <section id="proof" className="border-b border-ink/10">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-8 flex flex-wrap items-center gap-x-3 gap-y-3">
        <span className="mono-label text-ink/50">Revenue teams on Orbit</span>
        {logos.map(l => <span key={l} className="mono-label text-ink/70">{l}</span>)}
      </div>
    </section>
  )
}

/* ───────────────────── chapters — scroll-driven heat bars ───────────────────── */

type Renderer = (active: boolean) => React.ReactNode

function Chapter({ index, step, render }: { index: number; step: (typeof STEPS)[number]; render: Renderer }) {
  const ref = useRef<HTMLElement>(null)
  const barRef = useRef<HTMLSpanElement>(null)
  const [active, setActive] = useState(false)

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)
    const tween = gsap.fromTo(
      barRef.current,
      { xPercent: -100 },
      {
        xPercent: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: ref.current,
          start: 'top 80%',
          end: 'bottom 45%',
          scrub: true,
          onToggle: self => setActive(self.isActive),
        },
      }
    )
    return () => { tween.scrollTrigger?.kill(); tween.kill() }
  }, [])

  return (
    <article ref={ref} className="grid gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-14 items-start">
      <div className="lg:sticky lg:top-24">
        <span className="mono-label text-ink/60">0{index + 1} · {step.label}</span>
        <span className="heat-bar mt-3 block w-full max-w-sm" aria-hidden><span ref={barRef} /></span>
        <h2 className="mt-5 font-semibold tracking-[-0.03em] leading-[1.05] text-[32px] sm:text-[40px]">{step.title}</h2>
        <p className="mt-4 text-base leading-relaxed text-ink/60 max-w-md">{step.body}</p>
      </div>
      <div className="h-[460px] sm:h-[540px]">{render(active)}</div>
    </article>
  )
}

function Chapters() {
  const renderers: Renderer[] = [
    () => <CompaniesTableDemo />,
    () => <OrbitalDemo />,
    active => <KanbanDemo mode="drift" active={active} />,
    active => <AIChatDemo active={active} />,
    active => <RetentionDemo active={active} />,
  ]
  return (
    <section id="story" className="bg-paper">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-20 lg:py-28 space-y-24 lg:space-y-32">
        {STEPS.map((s, i) => (
          <Chapter key={s.label} index={i} step={s} render={renderers[i]} />
        ))}
      </div>
    </section>
  )
}

/* ────────────────────────────── features ────────────────────────────── */

function Features() {
  const items = [
    { tag: 'Cold', h: 0, t: 'One record for every relationship', d: 'Companies, contacts and deals share a single timeline. Emails, calls, notes and AI summaries land in one place.' },
    { tag: 'Warm', h: 0.5, t: 'Views that fit the motion', d: 'Kanban for pipeline reviews, tables for ops, record panels for the call. Switch without losing filters.' },
    { tag: 'Hot', h: 1, t: 'AI that does the busywork', d: 'Follow-ups drafted from notes, heat scored on arrival, forecasts explained in plain language.' },
  ]
  return (
    <section id="features" className="border-t border-ink/10">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-24">
        <div className="max-w-2xl">
          <h2 className="font-semibold tracking-[-0.03em] text-[36px] sm:text-[48px] leading-[1.05]">Built for teams who sell every day.</h2>
          <p className="mt-4 text-lg text-ink/60">Orbit replaces the spreadsheet, the enrichment tool and the forecasting deck with one system that stays up to date on its own.</p>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {items.map(it => (
            <div key={it.t} className="orbit-card p-7 hover:-translate-y-0.5 transition-transform">
              <span className="mono-label" style={{ color: heatColor(it.h) }}>{it.tag}</span>
              <h3 className="mt-6 text-xl font-semibold tracking-tight">{it.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/60">{it.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────── CTA ─────────────────────────────── */

function CTABand() {
  return (
    <section className="relative overflow-hidden bg-field text-cream">
      <div aria-hidden className="grain pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8 py-24 sm:py-32 text-center">
        <span className="mono-label text-cream/80">Get started</span>
        <h2 className="mt-6 font-semibold tracking-[-0.04em] text-[40px] sm:text-[64px] leading-[0.98]">Put your revenue in Orbit.</h2>
        <p className="mt-5 text-lg text-cream/80">Import your pipeline in minutes. Your team is selling from it the same afternoon.</p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link to="/app" className="cta cta-primary">Start free <ArrowRight className="h-4 w-4" /></Link>
          <Link to="/app" className="cta cta-secondary">Open the app</Link>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-ink/10 bg-paper">
      <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-3 px-5 sm:px-8 py-8 text-sm text-ink/60">
        <span className="flex items-center gap-2"><OrbitMark className="h-6 w-6" /> Orbit CRM</span>
        <span>© {new Date().getFullYear()} Orbit. All rights reserved.</span>
      </div>
    </footer>
  )
}
