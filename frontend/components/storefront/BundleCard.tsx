'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { storefrontApi, formatMYR } from '@/lib/storefront-api'
import { Gift } from 'lucide-react'

type BundleItem = {
  product_id: number; name: string; image: string | null; price: number; qty: number; role: string
}
type Bundle = {
  id: number; name: string; slug: string; description: string | null; image_url: string | null
  pricing_type: string; discount_value: number
  original: number; final: number; savings: number; savings_percent: number
  items: BundleItem[]
}

export function BundleCard({ productId }: { productId: number }) {
  const [bundles, setBundles] = useState<Bundle[]>([])
  const [adding, setAdding] = useState<number | null>(null)

  useEffect(() => {
    storefrontApi.get(`/bundles/for-product/${productId}`)
      .then(({ data }) => setBundles(data ?? []))
      .catch(() => setBundles([]))
  }, [productId])

  async function addBundle(b: Bundle) {
    setAdding(b.id)
    try {
      await storefrontApi.post(`/bundles/${b.id}/add-to-cart`)
      toast.success(`${b.name} added — you saved ${formatMYR(b.savings)}!`)
      window.dispatchEvent(new CustomEvent('storefront:cart-refresh'))
    } catch { toast.error('Could not add bundle') } finally { setAdding(null) }
  }

  if (bundles.length === 0) return null

  return (
    <div className="mt-10 space-y-4">
      <div className="flex items-center gap-2">
        <Gift className="h-5 w-5 text-rose-500" />
        <h2 className="text-lg font-semibold">Better together</h2>
      </div>
      {bundles.map((b) => (
        <div key={b.id} className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-neutral-900">{b.name}</h3>
              {b.description && <p className="mt-0.5 text-xs text-neutral-600">{b.description}</p>}
            </div>
            <div className="text-right">
              <div className="text-xs text-neutral-400 line-through">{formatMYR(b.original)}</div>
              <div className="text-lg font-bold text-rose-600">{formatMYR(b.final)}</div>
              <div className="text-xs font-semibold text-emerald-600">Save {b.savings_percent}%</div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {b.items.map((i) => (
              <div key={i.product_id} className="flex items-center gap-2 rounded-lg bg-white p-2 pr-3 shadow-sm">
                <div className="h-12 w-12 overflow-hidden rounded-md bg-neutral-100">
                  {i.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.image} alt={i.name} className="h-full w-full object-cover" />
                  )}
                </div>
                <div>
                  <div className="line-clamp-1 max-w-[140px] text-xs font-medium">{i.name}</div>
                  <div className="text-xs text-neutral-500">{formatMYR(i.price)} × {i.qty}</div>
                </div>
              </div>
            ))}
            <button
              onClick={() => addBundle(b)}
              disabled={adding === b.id}
              className="ml-auto rounded-full bg-rose-500 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-60"
            >
              {adding === b.id ? 'Adding…' : 'Add bundle to cart'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
