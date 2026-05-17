'use client'

import Link from 'next/link'
import { imageSrc, formatMYR } from '@/lib/storefront-api'

type Product = {
  id: number; slug: string; name: string; color: string | null
  price: number; original_price: number | null; image: string | null
}

export function ProductShowcase({ config }: { config: { product?: Product; kicker?: string; subtitle?: string; image_position?: 'left'|'right' } }) {
  const p = config.product
  if (!p) return null
  const right = config.image_position === 'right'
  const onSale = p.original_price !== null && p.original_price > p.price
  const off = onSale ? Math.round(((p.original_price! - p.price) / p.original_price!) * 100) : 0
  return (
    <section className="py-16" style={{ background: 'var(--brand-surface)' }}>
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-6 md:grid-cols-2 md:gap-16">
        <div className={right ? 'md:order-2' : ''}>
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-neutral-100 shadow-sm">
            {p.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageSrc(p.image)} alt={p.name} className="h-full w-full object-cover" />
            )}
            {onSale && (
              <span className="absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-semibold text-white"
                    style={{ background: 'var(--brand-sale)' }}>-{off}%</span>
            )}
          </div>
        </div>
        <div>
          {config.kicker && (
            <p className="text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: 'var(--brand-accent)' }}>{config.kicker}</p>
          )}
          <h2 className="mt-3 text-3xl font-semibold md:text-4xl" style={{ fontFamily: 'var(--brand-font-heading)', color: 'var(--brand-text)' }}>{p.name}</h2>
          {config.subtitle && <p className="mt-3 text-base leading-relaxed" style={{ color: 'var(--brand-muted)' }}>{config.subtitle}</p>}
          <div className="mt-5 flex items-baseline gap-3">
            {onSale && <span className="text-base line-through" style={{ color: 'var(--brand-muted)' }}>{formatMYR(p.original_price!)}</span>}
            <span className="text-2xl font-semibold" style={{ color: onSale ? 'var(--brand-sale)' : 'var(--brand-text)' }}>{formatMYR(p.price)}</span>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={`/product/${p.slug}`}
              className="rounded-full px-7 py-3 text-sm font-semibold uppercase tracking-wider text-white"
              style={{ background: 'var(--brand-primary)' }}>
              Shop Now
            </Link>
            <Link href={`/product/${p.slug}`}
              className="rounded-full border px-7 py-3 text-sm font-semibold uppercase tracking-wider"
              style={{ borderColor: 'var(--brand-text)', color: 'var(--brand-text)' }}>
              View Details
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
