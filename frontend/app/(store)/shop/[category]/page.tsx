'use client'

import { useEffect, useState } from 'react'
import { storefrontApi } from '@/lib/storefront-api'
import { ProductCard, type StoreProduct } from '@/components/storefront/ProductCard'

const CATEGORY_LABELS: Record<string, string> = {
  'baju-kurung': 'Baju Kurung',
  'hijab': 'Hijab',
  'new-arrivals': 'New Arrivals',
}

export default function CategoryPage({ params }: { params: { category: string } }) {
  const [items, setItems] = useState<StoreProduct[]>([])
  const [loading, setLoading] = useState(true)
  const label = CATEGORY_LABELS[params.category] ?? params.category

  useEffect(() => {
    const requestParams: any = { limit: 48 }
    if (params.category === 'new-arrivals') requestParams.is_new_arrival = 1
    else requestParams.category = params.category

    storefrontApi.get('/products', { params: requestParams })
      .then(({ data }) => setItems(data?.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [params.category])

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-3xl font-semibold capitalize">{label}</h1>
      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-lg bg-neutral-100" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 p-12 text-center text-neutral-500">
          No products in this category yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {items.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  )
}
