'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export function FAQAccordion({ config }: { config: { title?: string; subtitle?: string; items: { q: string; a: string }[] } }) {
  const items = config.items ?? []
  const [open, setOpen] = useState<number | null>(0)
  if (items.length === 0) return null
  return (
    <section className="py-14" style={{ background: 'var(--brand-bg)' }}>
      <div className="mx-auto max-w-3xl px-6">
        {(config.title || config.subtitle) && (
          <header className="mb-8 text-center">
            {config.title && <h2 className="text-3xl font-semibold" style={{ fontFamily: 'var(--brand-font-heading)', color: 'var(--brand-text)' }}>{config.title}</h2>}
            {config.subtitle && <p className="mt-2 text-sm" style={{ color: 'var(--brand-muted)' }}>{config.subtitle}</p>}
          </header>
        )}
        <dl className="space-y-2">
          {items.map((it, i) => {
            const isOpen = open === i
            return (
              <div key={i} className="overflow-hidden rounded-lg border" style={{ borderColor: 'rgba(0,0,0,0.08)', background: 'var(--brand-surface)' }}>
                <button onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
                  <span className="text-sm font-semibold md:text-base" style={{ color: 'var(--brand-text)' }}>{it.q}</span>
                  <ChevronDown className={`h-4 w-4 flex-none transition ${isOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--brand-muted)' }} />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--brand-muted)' }}>
                    {it.a}
                  </div>
                )}
              </div>
            )
          })}
        </dl>
      </div>
    </section>
  )
}
