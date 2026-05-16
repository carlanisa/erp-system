'use client'

import { Instagram } from 'lucide-react'

export function InstagramFeed({ config }: { config: { handle?: string; images: string[] } }) {
  const images = config.images ?? []
  if (images.length === 0) return null
  return (
    <section className="py-16" style={{ background: 'var(--brand-bg)' }}>
      <div className="mx-auto max-w-7xl px-6">
        <header className="mb-8 text-center">
          <Instagram className="mx-auto mb-2 h-6 w-6" style={{ color: 'var(--brand-primary)' }} />
          <h2 className="text-3xl font-semibold" style={{ fontFamily: 'var(--brand-font-heading)', color: 'var(--brand-text)' }}>Follow us</h2>
          {config.handle && <p className="mt-1 text-sm" style={{ color: 'var(--brand-muted)' }}>@{config.handle}</p>}
        </header>
        <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
          {images.slice(0, 6).map((src, i) => (
            <a key={i} href={config.handle ? `https://instagram.com/${config.handle}` : '#'} target="_blank" rel="noopener noreferrer"
              className="group relative aspect-square overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/30">
                <Instagram className="h-6 w-6 text-white opacity-0 transition group-hover:opacity-100" />
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
