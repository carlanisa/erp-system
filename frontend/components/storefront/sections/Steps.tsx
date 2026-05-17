'use client'

export function Steps({ config }: { config: { kicker?: string; title?: string; subtitle?: string; items: { title: string; body?: string }[] } }) {
  const items = config.items ?? []
  if (items.length === 0) return null
  return (
    <section className="py-14" style={{ background: 'var(--brand-surface)' }}>
      <div className="mx-auto max-w-6xl px-6">
        {(config.kicker || config.title || config.subtitle) && (
          <header className="mb-10 text-center">
            {config.kicker && <p className="text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: 'var(--brand-accent)' }}>{config.kicker}</p>}
            {config.title && <h2 className="mt-2 text-3xl font-semibold md:text-4xl" style={{ fontFamily: 'var(--brand-font-heading)', color: 'var(--brand-text)' }}>{config.title}</h2>}
            {config.subtitle && <p className="mt-3 text-sm md:text-base" style={{ color: 'var(--brand-muted)' }}>{config.subtitle}</p>}
          </header>
        )}
        <ol className="relative grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {items.map((s, i) => (
            <li key={i} className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-full text-xl font-semibold text-white"
                   style={{ background: 'var(--brand-primary)' }}>
                {i + 1}
              </div>
              <h3 className="mt-4 text-base font-semibold" style={{ color: 'var(--brand-text)' }}>{s.title}</h3>
              {s.body && <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--brand-muted)' }}>{s.body}</p>}
              {/* Connecting dotted line on larger screens */}
              {i < items.length - 1 && (
                <span className="absolute left-12 top-6 hidden h-px w-[calc(100%-3rem)] border-t-2 border-dashed lg:block" style={{ borderColor: 'var(--brand-accent)', opacity: 0.5 }} />
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
