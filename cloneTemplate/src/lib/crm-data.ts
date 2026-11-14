export type Stage = 'Discovery' | 'Demo' | 'Proposal' | 'Negotiation' | 'Closed won'
export const STAGES: Stage[] = ['Discovery', 'Demo', 'Proposal', 'Negotiation']
export const ALL_STAGES: Stage[] = [...STAGES, 'Closed won']

export interface Company {
  id: string
  name: string
  domain: string
  industry: string
  employees: string
  location: string
  icp: number
  arr: number
  owner: string
  status: 'Prospect' | 'Customer' | 'Churn risk' | 'Expansion'
  lastActivity: string
  health: number
}

export interface Contact {
  id: string
  name: string
  title: string
  email: string
  companyId: string
  role: 'Champion' | 'Decision maker' | 'Economic buyer' | 'User'
  lastTouch: string
}

export interface Deal {
  id: string
  name: string
  companyId: string
  value: number
  stage: Stage
  owner: string
  ownerInitials: string
  closeDate: string
  lastNote: string
  probability: number
}

export const OWNERS = [
  { name: 'Maya Chen', initials: 'MC' },
  { name: 'Jonas Reid', initials: 'JR' },
  { name: 'Priya Natarajan', initials: 'PN' },
  { name: 'Theo Marsh', initials: 'TM' },
]

export const COMPANIES: Company[] = [
  { id: 'c1', name: 'Northwind Labs', domain: 'northwind.ai', industry: 'AI infrastructure', employees: '210', location: 'San Francisco', icp: 98, arr: 184000, owner: 'Maya Chen', status: 'Prospect', lastActivity: '2h ago', health: 82 },
  { id: 'c2', name: 'Halcyon Health', domain: 'halcyon.health', industry: 'Healthcare', employees: '1,400', location: 'Boston', icp: 91, arr: 320000, owner: 'Jonas Reid', status: 'Customer', lastActivity: 'Yesterday', health: 74 },
  { id: 'c3', name: 'Ferrous Robotics', domain: 'ferrous.io', industry: 'Robotics', employees: '85', location: 'Pittsburgh', icp: 87, arr: 96000, owner: 'Priya Natarajan', status: 'Prospect', lastActivity: '3d ago', health: 61 },
  { id: 'c4', name: 'Lumen Capital', domain: 'lumen.vc', industry: 'Fintech', employees: '340', location: 'New York', icp: 79, arr: 240000, owner: 'Theo Marsh', status: 'Expansion', lastActivity: '5h ago', health: 90 },
  { id: 'c5', name: 'Sable & Co', domain: 'sable.co', industry: 'Retail', employees: '2,900', location: 'Chicago', icp: 72, arr: 410000, owner: 'Maya Chen', status: 'Churn risk', lastActivity: '12d ago', health: 38 },
  { id: 'c6', name: 'Meridian Freight', domain: 'meridianfreight.com', industry: 'Logistics', employees: '760', location: 'Dallas', icp: 84, arr: 158000, owner: 'Jonas Reid', status: 'Customer', lastActivity: '1d ago', health: 77 },
  { id: 'c7', name: 'Aster Biosciences', domain: 'asterbio.com', industry: 'Biotech', employees: '120', location: 'San Diego', icp: 94, arr: 128000, owner: 'Priya Natarajan', status: 'Prospect', lastActivity: '6h ago', health: 68 },
  { id: 'c8', name: 'Vantage Energy', domain: 'vantage.energy', industry: 'Energy', employees: '5,200', location: 'Houston', icp: 66, arr: 690000, owner: 'Theo Marsh', status: 'Customer', lastActivity: '2d ago', health: 85 },
]

export const CONTACTS: Contact[] = [
  { id: 'p1', name: 'Elena Vasquez', title: 'VP Revenue Operations', email: 'elena@northwind.ai', companyId: 'c1', role: 'Champion', lastTouch: '2h ago' },
  { id: 'p2', name: 'David Okafor', title: 'CFO', email: 'david@northwind.ai', companyId: 'c1', role: 'Economic buyer', lastTouch: '4d ago' },
  { id: 'p3', name: 'Sarah Kim', title: 'Head of Sales', email: 'sarah@halcyon.health', companyId: 'c2', role: 'Decision maker', lastTouch: 'Yesterday' },
  { id: 'p4', name: 'Marcus Bell', title: 'Sales Engineer', email: 'marcus@ferrous.io', companyId: 'c3', role: 'User', lastTouch: '3d ago' },
  { id: 'p5', name: 'Anika Rao', title: 'COO', email: 'anika@lumen.vc', companyId: 'c4', role: 'Economic buyer', lastTouch: '5h ago' },
  { id: 'p6', name: 'Tom Whitfield', title: 'Director of Growth', email: 'tom@sable.co', companyId: 'c5', role: 'Champion', lastTouch: '12d ago' },
  { id: 'p7', name: 'Grace Lin', title: 'RevOps Manager', email: 'grace@meridianfreight.com', companyId: 'c6', role: 'User', lastTouch: '1d ago' },
  { id: 'p8', name: 'Noah Adeyemi', title: 'CEO', email: 'noah@asterbio.com', companyId: 'c7', role: 'Decision maker', lastTouch: '6h ago' },
  { id: 'p9', name: 'Isabel Moreau', title: 'VP Sales', email: 'isabel@vantage.energy', companyId: 'c8', role: 'Champion', lastTouch: '2d ago' },
  { id: 'p10', name: 'Ravi Shah', title: 'Procurement Lead', email: 'ravi@vantage.energy', companyId: 'c8', role: 'Decision maker', lastTouch: '9d ago' },
]

export const DEALS: Deal[] = [
  { id: 'd1', name: 'Northwind — Platform', companyId: 'c1', value: 184000, stage: 'Discovery', owner: 'Maya Chen', ownerInitials: 'MC', closeDate: 'Nov 14', lastNote: 'Elena wants a security review before the next call.', probability: 20 },
  { id: 'd2', name: 'Aster Bio — Team plan', companyId: 'c7', value: 64000, stage: 'Discovery', owner: 'Priya Natarajan', ownerInitials: 'PN', closeDate: 'Nov 30', lastNote: 'Intro call booked via warm referral from Halcyon.', probability: 15 },
  { id: 'd3', name: 'Ferrous — Field sales', companyId: 'c3', value: 96000, stage: 'Demo', owner: 'Priya Natarajan', ownerInitials: 'PN', closeDate: 'Oct 28', lastNote: 'Demo went well; asked for mobile offline mode.', probability: 40 },
  { id: 'd4', name: 'Meridian — Expansion', companyId: 'c6', value: 72000, stage: 'Demo', owner: 'Jonas Reid', ownerInitials: 'JR', closeDate: 'Nov 8', lastNote: 'Grace looping in two regional managers.', probability: 45 },
  { id: 'd5', name: 'Halcyon — Enterprise', companyId: 'c2', value: 320000, stage: 'Proposal', owner: 'Jonas Reid', ownerInitials: 'JR', closeDate: 'Oct 31', lastNote: 'Proposal v2 sent. Legal reviewing DPA.', probability: 60 },
  { id: 'd6', name: 'Lumen — Analytics add-on', companyId: 'c4', value: 48000, stage: 'Proposal', owner: 'Theo Marsh', ownerInitials: 'TM', closeDate: 'Oct 24', lastNote: 'Anika approved budget; waiting on SOW.', probability: 70 },
  { id: 'd7', name: 'Vantage — Global rollout', companyId: 'c8', value: 690000, stage: 'Negotiation', owner: 'Theo Marsh', ownerInitials: 'TM', closeDate: 'Oct 21', lastNote: 'Ravi pushing for 3-year term at 12% discount.', probability: 80 },
  { id: 'd8', name: 'Sable — Renewal + seats', companyId: 'c5', value: 410000, stage: 'Negotiation', owner: 'Maya Chen', ownerInitials: 'MC', closeDate: 'Oct 19', lastNote: 'Usage dipped 30%; exec sponsor left. Escalate.', probability: 55 },
]

export const companyById = (id: string) => COMPANIES.find(c => c.id === id)

export const fmtMoney = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(1)}M`
    : n >= 1000
      ? `$${Math.round(n / 1000)}K`
      : `$${n}`

export const fmtFull = (n: number) => `$${n.toLocaleString('en-US')}`
