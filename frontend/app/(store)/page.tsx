'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { storefrontApi } from '@/lib/storefront-api'
import { ProductCard, type StoreProduct } from '@/components/storefront/ProductCard'

export default function HomePage() {
  const [featured, setFeatured] = useState<StoreProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    storefrontApi
      .get('/products', { params: { featured: 1, limit: 8 } })
      .then(({ data }) => setFeatured(data?.data ?? []))
      .catch(() => setFeatured([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-gradient-to-br from-rose-50 via-white to-amber-50">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24">
          <div>
            <p className="text-sm font-medium tracking-wide text-rose-500">New Season</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">
              Modestwear, reimagined.
            </h1>
            <p className="mt-4 max-w-md text-neutral-600">
              Discover our latest collection of Baju Kurung, Hijab, and more — curated for the modern Malaysian woman.
            </p>
            <div className="mt-6 flex gap-3">
              <Link
                href="/shop"
                className="rounded-full bg-rose-500 px-6 py-3 text-sm font-semibold text-white hover:bg-rose-600"
              >
                Shop now
              </Link>
              <Link
                href="/shop/baju-kurung"
                className="rounded-full border border-neutral-300 px-6 py-3 text-sm font-semibold text-neutral-800 hover:bg-neutral-100"
              >
                Baju Kurung
              </Link>
            </div>
            <p className="mt-6 text-xs text-neutral-500">
              Free shipping on orders over RM150 · COD &amp; Bank Transfer accepted
            </p>
          </div>
          <div className="aspect-[4/5] rounded-3xl bg-gradient-to-br from-rose-200 via-rose-100 to-amber-100" />
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <h2 className="mb-6 text-2xl font-semibold">Shop by category</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { name: 'Baju Kurung', slug: 'baju-kurung', tint: 'from-rose-200 to-rose-100' },
            { name: 'Hijab', slug: 'hijab', tint: 'from-amber-200 to-amber-100' },
            { name: 'New Arrivals', slug: 'new-arrivals', tint: 'from-emerald-200 to-emerald-100' },
          ].map((c) => (
            <Link
              key={c.slug}
              href={`/shop/${c.slug}`}
              className={`group flex aspect-[3/2] items-end rounded-2xl bg-gradient-to-br ${c.tint} p-6 transition hover:shadow-lg`}
            >
              <span className="text-xl font-semibold text-neutral-900">{c.name} →</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-semibold">Featured</h2>
          <Link href="/shop" className="text-sm text-rose-500 hover:underline">
            View all →
          </Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] animate-pulse rounded-lg bg-neutral-100" />
            ))}
          </div>
        ) : featured.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-300 p-12 text-center text-neutral-500">
            No featured products yet. Publish products from the ERP to see them here.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
