'use client'

import { Star } from 'lucide-react'

export function Testimonials({ config }: { config: { title?: string; items: { name: string; rating: number; text: string }[] } }) {
  const items = config.items ?? []
  if (items.length === 0) return null
  return (
    <section className="py-16" style={{ background: 'var(--brand-surface)' }}>
      <div className="mx-auto max-w-7xl px-6">
        {config.title && (
          <h2 className="mb-10 text-center text-3xl font-semibold" style={{ fontFamily: 'var(--brand-font-heading)', color: 'var(--brand-text)' }}>{config.title}</h2>
        )}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {items.map((t, i) => (
            <div key={i} className="rounded-2xl p-6" style={{ background: 'var(--brand-bg)' }}>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-current" style={{ color: 'var(--brand-accent)' }} />
                ))}
              </div>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--brand-text)' }}>&ldquo;{t.text}&rdquo;</p>
              <div className="mt-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--brand-muted)' }}>— {t.name}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
