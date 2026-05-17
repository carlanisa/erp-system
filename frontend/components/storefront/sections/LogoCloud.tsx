'use client'

import { imageSrc } from '@/lib/storefront-api'

export function LogoCloud({ config }: { config: { title?: string; logos: { image: string; name?: string; url?: string }[] } }) {
  const logos = config.logos ?? []
  if (logos.length === 0) return null
  return (
    <section className="py-12" style={{ background: 'var(--brand-surface)' }}>
      <div className="mx-auto max-w-7xl px-6">
        {config.title && (
          <p className="mb-6 text-center text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: 'var(--brand-muted)' }}>{config.title}</p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
          {logos.map((l, i) => {
            const inner = (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageSrc(l.image)} alt={l.name ?? ''} className="h-8 max-w-[140px] object-contain opacity-60 transition hover:opacity-100 md:h-10" />
            )
            return l.url ? <a key={i} href={l.url} target="_blank" rel="noopener noreferrer">{inner}</a> : <span key={i}>{inner}</span>
          })}
        </div>
      </div>
    </section>
  )
}
