/**
 * App-shell skeleton shown while the /app route chunk or its data is pending.
 * Mirrors the real shell: sidebar rail + three card placeholders.
 */
export function AppShellSkeleton() {
  return (
    <div className="flex min-h-dvh bg-background text-foreground" aria-busy="true" aria-label="Loading Orbit">
      <aside className="hidden md:flex w-[15rem] shrink-0 flex-col border-r border-border bg-sidebar">
        <div className="flex items-center gap-2 h-[52px] px-3 border-b border-border">
          <div className="h-7 w-7 rounded-md bg-muted animate-pulse" />
          <div className="h-3 w-16 rounded bg-muted animate-pulse" />
        </div>
        <div className="px-3 py-3 space-y-2">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-8 rounded-md bg-muted/70 animate-pulse" />
          ))}
        </div>
        <div className="mt-auto p-3 border-t border-border flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-muted animate-pulse" />
          <div className="h-3 w-20 rounded bg-muted animate-pulse" />
        </div>
      </aside>
      <main className="flex-1 min-w-0 p-5 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
        <div className="space-y-2">
          <div className="h-7 w-56 rounded bg-muted animate-pulse" />
          <div className="h-4 w-80 max-w-full rounded bg-muted/70 animate-pulse" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="orbit-card p-5 space-y-3">
              <div className="h-3 w-24 rounded bg-muted animate-pulse" />
              <div className="h-7 w-32 rounded bg-muted animate-pulse" />
              <div className="h-3 w-40 rounded bg-muted/70 animate-pulse" />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
