'use client'

import Link from 'next/link'
import { formatMYR } from '@/lib/storefront-api'

type Product = {
  id: number; slug: string; name: string; color: string | null
  price: number; original_price: number | null; image: string | null; image_alt: string | null
  is_featured: boolean
}

export function FeaturedProducts({ config }: { config: { title?: string; subtitle?: string; products: Product[] } }) {
  const items = config.products ?? []
  if (items.length === 0) return null

  return (
    <section className="bg-white py-16" style={{ background: 'var(--brand-surface)' }}>
      <div className="mx-auto max-w-7xl px-6">
        {(config.title || config.subtitle) && (
          <header className="mb-8 text-center">
            {config.title && (
              <h2 className="text-3xl font-semibold" style={{ fontFamily: 'var(--brand-font-heading)', color: 'var(--brand-text)' }}>{config.title}</h2>
            )}
            {config.subtitle && <p className="mt-2 text-sm" style={{ color: 'var(--brand-muted)' }}>{config.subtitle}</p>}
          </header>
        )}
        <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => {
            const onSale = p.original_price !== null && p.original_price > p.price
            const off = onSale ? Math.round(((p.original_price! - p.price) / p.original_price!) * 100) : 0
            return (
              <Link key={p.id} href={`/products/${p.slug}`} className="group block">
                <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-neutral-100">
                  {p.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt={p.name} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:opacity-0" />
                  )}
                  {p.image_alt ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image_alt} alt="" className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-700 group-hover:opacity-100" />
                  ) : (
                    p.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-0 transition duration-700 group-hover:opacity-100" />
                    )
                  )}
                  {/* Badges */}
                  <div className="absolute left-2 top-2 flex flex-col gap-1">
                    {p.is_featured && <span className="rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-900">Hot</span>}
                    {onSale && <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ background: 'var(--brand-sale)' }}>-{off}%</span>}
                  </div>
                </div>
                <div className="mt-3 text-center">
                  <h3 className="line-clamp-1 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--brand-text)' }}>{p.name}</h3>
                  <div className="mt-1 flex items-center justify-center gap-2 text-sm">
                    {onSale && <span className="text-xs line-through" style={{ color: 'var(--brand-muted)' }}>{formatMYR(p.original_price!)}</span>}
                    <span className="font-semibold" style={{ color: onSale ? 'var(--brand-sale)' : 'var(--brand-text)' }}>{formatMYR(p.price)}</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
