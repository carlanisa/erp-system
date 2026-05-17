'use client'

import Link from 'next/link'
import { imageSrc } from '@/lib/storefront-api'

type Col = { image?: string; kicker?: string; title?: string; body?: string; button_text?: string; button_url?: string }

export function Columns({ config }: { config: { title?: string; subtitle?: string; columns?: Col[]; cols?: 2 | 3 } }) {
  const cols = config.columns ?? []
  if (cols.length === 0) return null
  const gridCls = (config.cols ?? 2) === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'
  return (
    <section className="py-14" style={{ background: 'var(--brand-bg)' }}>
      <div className="mx-auto max-w-7xl px-6">
        {(config.title || config.subtitle) && (
          <header className="mb-8 text-center">
            {config.title && <h2 className="text-3xl font-semibold" style={{ fontFamily: 'var(--brand-font-heading)', color: 'var(--brand-text)' }}>{config.title}</h2>}
            {config.subtitle && <p className="mt-2 text-sm" style={{ color: 'var(--brand-muted)' }}>{config.subtitle}</p>}
          </header>
        )}
        <div className={`grid grid-cols-1 gap-6 ${gridCls}`}>
          {cols.map((c, i) => (
            <div key={i} className="rounded-2xl overflow-hidden bg-white shadow-sm" style={{ background: 'var(--brand-surface)' }}>
              {c.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageSrc(c.image)} alt={c.title ?? ''} className="aspect-[4/3] w-full object-cover" />
              )}
              <div className="p-6">
                {c.kicker && <p className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: 'var(--brand-accent)' }}>{c.kicker}</p>}
                {c.title && <h3 className="mt-2 text-xl font-semibold" style={{ fontFamily: 'var(--brand-font-heading)', color: 'var(--brand-text)' }}>{c.title}</h3>}
                {c.body && <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--brand-muted)' }}>{c.body}</p>}
                {c.button_text && c.button_url && (
                  <Link href={c.button_url} className="mt-4 inline-block text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--brand-primary)' }}>
                    {c.button_text} →
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
