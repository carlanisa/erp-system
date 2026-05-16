'use client'

import { useEffect, useState } from 'react'
import { storefrontApi } from '@/lib/storefront-api'
import { ProductCard, type StoreProduct } from '@/components/storefront/ProductCard'

export default function ShopPage() {
  const [items, setItems] = useState<StoreProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    storefrontApi.get('/products', { params: { limit: 48 } })
      .then(({ data }) => setItems(data?.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-3xl font-semibold">All products</h1>
      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-lg bg-neutral-100" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 p-12 text-center text-neutral-500">
          No products published yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {items.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  )
}
