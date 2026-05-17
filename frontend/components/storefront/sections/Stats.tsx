'use client'

export function Stats({ config }: { config: { kicker?: string; title?: string; items: { value: string; label: string; suffix?: string }[] } }) {
  const items = config.items ?? []
  if (items.length === 0) return null
  const cols = items.length === 4 ? 'md:grid-cols-4' : items.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'
  return (
    <section className="py-14" style={{ background: 'var(--brand-primary)', color: '#fff' }}>
      <div className="mx-auto max-w-6xl px-6">
        {(config.kicker || config.title) && (
          <header className="mb-8 text-center">
            {config.kicker && <p className="text-xs font-semibold uppercase tracking-[0.3em] opacity-80">{config.kicker}</p>}
            {config.title && <h2 className="mt-2 text-3xl font-semibold md:text-4xl" style={{ fontFamily: 'var(--brand-font-heading)' }}>{config.title}</h2>}
          </header>
        )}
        <div className={`grid grid-cols-2 gap-6 ${cols}`}>
          {items.map((s, i) => (
            <div key={i} className="text-center">
              <div className="flex items-baseline justify-center gap-1 text-4xl font-bold tabular-nums md:text-5xl" style={{ fontFamily: 'var(--brand-font-heading)' }}>
                {s.value}
                {s.suffix && <span className="text-xl opacity-80">{s.suffix}</span>}
              </div>
              <div className="mt-1 text-xs uppercase tracking-widest opacity-80">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
