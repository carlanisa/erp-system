'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { imageSrc } from '@/lib/storefront-api'

export function Gallery({ config }: { config: { title?: string; layout?: 'grid'|'masonry'; cols?: 3|4|5; images: { src: string; alt?: string; caption?: string }[] } }) {
  const images = config.images ?? []
  const [open, setOpen] = useState<number | null>(null)
  if (images.length === 0) return null

  const cols = (config.cols ?? 4)
  const gridCls = cols === 5 ? 'md:grid-cols-5' : cols === 3 ? 'md:grid-cols-3' : 'md:grid-cols-4'

  return (
    <section className="py-14" style={{ background: 'var(--brand-bg)' }}>
      <div className="mx-auto max-w-7xl px-6">
        {config.title && (
          <h2 className="mb-8 text-center text-3xl font-semibold" style={{ fontFamily: 'var(--brand-font-heading)', color: 'var(--brand-text)' }}>{config.title}</h2>
        )}
        <div className={`grid grid-cols-2 gap-3 ${gridCls}`}>
          {images.map((img, i) => (
            <button key={i} onClick={() => setOpen(i)} className="group relative aspect-square overflow-hidden rounded-lg bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageSrc(img.src)} alt={img.alt ?? ''} className="h-full w-full object-cover transition group-hover:scale-105" />
            </button>
          ))}
        </div>
      </div>
      {open !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6" onClick={() => setOpen(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageSrc(images[open].src)} alt={images[open].alt ?? ''} className="max-h-[90vh] max-w-[90vw] rounded" />
          {images[open].caption && <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded bg-black/60 px-4 py-2 text-sm text-white">{images[open].caption}</div>}
          <button onClick={() => setOpen(null)} className="absolute right-6 top-6 rounded-full bg-white/20 p-2 text-white hover:bg-white/30">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </section>
  )
}
