'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { storefrontApi, formatMYR } from '@/lib/storefront-api'
import { useCartStore } from '@/stores/cart-store'
import { Sparkles, Plus, Truck } from 'lucide-react'

type SuggestionProduct = {
  id: number; slug: string; name: string; color: string | null
  price: number; original_price: number | null; image: string | null
}
type SuggestionGroup = { rule_id: number | null; reason: string; products: SuggestionProduct[] }

export function CartSuggestions() {
  const refreshCart = useCartStore((s) => s.refresh)
  const addItem = useCartStore((s) => s.addItem)
  const [groups, setGroups] = useState<SuggestionGroup[]>([])
  const [delta, setDelta] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState<number | null>(null)

  async function load() {
    setLoading(true)
    try {
      const { data } = await storefrontApi.get('/suggestions/cart')
      setGroups(data?.groups ?? [])
      setDelta(data?.free_shipping_delta ?? 0)
    } finally { setLoading(false) }
  }

  useEffect(() => {
    load()
    const handler = () => load()
    window.addEventListener('storefront:cart-refresh', handler)
    return () => window.removeEventListener('storefront:cart-refresh', handler)
  }, [])

  async function add(p: SuggestionProduct) {
    setAdding(p.id)
    try {
      await addItem(p.id, null, 1)
      toast.success(`Added ${p.name}`)
      await refreshCart()
      load()
    } catch { toast.error('Could not add') } finally { setAdding(null) }
  }

  if (loading || groups.length === 0) return null

  return (
    <div className="mt-8 space-y-6">
      {delta > 0 && delta <= 80 && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm">
          <Truck className="h-4 w-4 text-emerald-600" />
          <span className="text-emerald-700">
            Add <strong>{formatMYR(delta)}</strong> more to unlock <strong>free shipping</strong>.
          </span>
        </div>
      )}
      {groups.map((g) => (
        <section key={g.rule_id ?? g.reason}>
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-rose-500" />
            <h3 className="text-base font-semibold text-neutral-900">{g.reason}</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {g.products.map((p) => (
              <div key={p.id} className="group rounded-xl border border-neutral-200 p-2">
                <Link href={`/product/${p.slug}`} className="block">
                  <div className="aspect-[3/4] overflow-hidden rounded-lg bg-neutral-100">
                    {p.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image} alt={p.name} className="h-full w-full object-cover transition group-hover:scale-105" />
                    ) : null}
                  </div>
                </Link>
                <div className="mt-2 line-clamp-1 text-xs font-medium text-neutral-800">{p.name}</div>
                <div className="text-xs font-semibold text-neutral-900">{formatMYR(p.price)}</div>
                <button
                  onClick={() => add(p)}
                  disabled={adding === p.id}
                  className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                >
                  <Plus className="h-3 w-3" /> {adding === p.id ? 'Adding…' : 'Add'}
                </button>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
