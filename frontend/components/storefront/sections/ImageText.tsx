'use client'

import Link from 'next/link'

export function ImageText({ config }: { config: { image: string; image_position?: 'left' | 'right'; kicker?: string; title: string; body: string; button_text?: string; button_url?: string } }) {
  const right = config.image_position === 'right'
  return (
    <section className="py-16" style={{ background: 'var(--brand-bg)' }}>
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-8 px-6 md:grid-cols-2 md:gap-16">
        <div className={right ? 'md:order-2' : ''}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={config.image} alt={config.title} className="aspect-[4/5] w-full rounded-2xl object-cover shadow-sm" />
        </div>
        <div>
          {config.kicker && (
            <p className="text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: 'var(--brand-accent)' }}>{config.kicker}</p>
          )}
          <h2 className="mt-3 text-3xl font-semibold md:text-4xl" style={{ fontFamily: 'var(--brand-font-heading)', color: 'var(--brand-text)' }}>{config.title}</h2>
          <p className="mt-4 text-base leading-relaxed" style={{ color: 'var(--brand-muted)' }}>{config.body}</p>
          {config.button_text && config.button_url && (
            <Link href={config.button_url}
              className="mt-6 inline-block rounded-full px-7 py-3 text-sm font-semibold uppercase tracking-wider text-white"
              style={{ background: 'var(--brand-primary)' }}>
              {config.button_text}
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}
