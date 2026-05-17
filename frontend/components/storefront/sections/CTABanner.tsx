'use client'

import Link from 'next/link'
import { imageSrc } from '@/lib/storefront-api'

export function CTABanner({ config }: { config: { background_image?: string; kicker?: string; title: string; subtitle?: string; button_text?: string; button_url?: string; secondary_button_text?: string; secondary_button_url?: string; align?: 'left'|'center' } }) {
  const align = config.align ?? 'center'
  const alignCls = align === 'left' ? 'items-start text-left' : 'items-center text-center'
  return (
    <section className="relative overflow-hidden py-20" style={{ background: config.background_image ? 'transparent' : 'var(--brand-primary)' }}>
      {config.background_image && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageSrc(config.background_image)} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/55" />
        </>
      )}
      <div className={`relative mx-auto flex max-w-3xl flex-col px-6 ${alignCls}`} style={{ color: '#fff' }}>
        {config.kicker && <p className="text-xs font-semibold uppercase tracking-[0.3em] opacity-90">{config.kicker}</p>}
        <h2 className="mt-2 text-3xl font-semibold md:text-5xl" style={{ fontFamily: 'var(--brand-font-heading)' }}>{config.title}</h2>
        {config.subtitle && <p className="mt-3 text-base opacity-90 md:text-lg">{config.subtitle}</p>}
        <div className="mt-6 flex flex-wrap gap-3">
          {config.button_text && config.button_url && (
            <Link href={config.button_url}
              className="rounded-full bg-white px-7 py-3 text-sm font-semibold uppercase tracking-wider"
              style={{ color: 'var(--brand-primary)' }}>
              {config.button_text}
            </Link>
          )}
          {config.secondary_button_text && config.secondary_button_url && (
            <Link href={config.secondary_button_url}
              className="rounded-full border border-white/70 px-7 py-3 text-sm font-semibold uppercase tracking-wider text-white hover:bg-white/10">
              {config.secondary_button_text}
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}
