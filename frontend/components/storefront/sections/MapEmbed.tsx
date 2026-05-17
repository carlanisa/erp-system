'use client'

import { MapPin } from 'lucide-react'

export function MapEmbed({ config }: { config: { title?: string; address?: string; embed_url?: string; height?: number } }) {
  if (!config.embed_url && !config.address) return null
  // If only address provided, build a maps embed URL
  const src = config.embed_url || `https://www.google.com/maps?q=${encodeURIComponent(config.address ?? '')}&output=embed`
  return (
    <section className="py-12" style={{ background: 'var(--brand-bg)' }}>
      <div className="mx-auto max-w-6xl px-6">
        {(config.title || config.address) && (
          <header className="mb-5 flex flex-col items-center gap-1 text-center">
            {config.title && <h2 className="text-2xl font-semibold md:text-3xl" style={{ fontFamily: 'var(--brand-font-heading)', color: 'var(--brand-text)' }}>{config.title}</h2>}
            {config.address && (
              <div className="inline-flex items-center gap-1 text-sm" style={{ color: 'var(--brand-muted)' }}>
                <MapPin className="h-3.5 w-3.5" /> {config.address}
              </div>
            )}
          </header>
        )}
        <div className="overflow-hidden rounded-2xl shadow-sm" style={{ height: `${config.height ?? 360}px` }}>
          <iframe src={src} className="h-full w-full" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
        </div>
      </div>
    </section>
  )
}
