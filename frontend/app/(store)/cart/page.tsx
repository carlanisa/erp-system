'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useCartStore } from '@/stores/cart-store'
import { formatMYR } from '@/lib/storefront-api'
import { Trash2 } from 'lucide-react'

export default function CartPage() {
  const cart = useCartStore((s) => s.cart)
  const refresh = useCartStore((s) => s.refresh)
  const updateQty = useCartStore((s) => s.updateQty)
  const removeItem = useCartStore((s) => s.removeItem)

  useEffect(() => { refresh().catch(() => {}) }, [refresh])

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <h1 className="text-2xl font-semibold">Your cart is empty</h1>
        <p className="mt-2 text-neutral-600">Explore the shop and add a few things you love.</p>
        <Link href="/shop" className="mt-6 inline-block rounded-full bg-rose-500 px-6 py-3 text-sm font-semibold text-white hover:bg-rose-600">
          Continue shopping
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-3xl font-semibold">Your cart</h1>
      <div className="grid gap-8 lg:grid-cols-[1fr,360px]">
        <div className="space-y-4">
          {cart.items.map((item) => (
            <div key={item.id} className="flex gap-4 rounded-xl border border-neutral-200 p-4">
              <div className="h-20 w-20 flex-none rounded-lg bg-neutral-100" />
              <div className="flex-1">
                <div className="text-sm font-medium">{item.name}</div>
                <div className="mt-1 text-xs text-neutral-500">
                  {[item.color, item.size].filter(Boolean).join(' · ')}
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="inline-flex items-center rounded-md border border-neutral-300">
                    <button onClick={() => updateQty(item.id, item.qty - 1)} className="px-2 py-1 text-sm">−</button>
                    <span className="px-3 text-sm">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, item.qty + 1)} className="px-2 py-1 text-sm">+</button>
                  </div>
                  <button onClick={() => removeItem(item.id)} className="text-neutral-400 hover:text-rose-500" aria-label="Remove">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{formatMYR(item.line_total)}</div>
                <div className="text-xs text-neutral-500">{formatMYR(item.unit_price)} each</div>
              </div>
            </div>
          ))}
        </div>

        <aside className="h-fit rounded-xl border border-neutral-200 p-5">
          <h2 className="text-lg font-semibold">Order summary</h2>
          <div className="mt-4 space-y-2 text-sm">
            <Row label="Subtotal" value={formatMYR(cart.subtotal)} />
            <Row label="Discount" value={`− ${formatMYR(cart.discount_total)}`} muted={cart.discount_total === 0} />
            <Row label="Shipping" value="Calculated at checkout" muted />
            <div className="my-3 border-t" />
            <Row label="Estimated total" value={formatMYR(cart.grand_total)} bold />
          </div>
          <Link
            href="/checkout"
            className="mt-5 block rounded-full bg-rose-500 px-6 py-3 text-center text-sm font-semibold text-white hover:bg-rose-600"
          >
            Checkout
          </Link>
          <p className="mt-3 text-center text-xs text-neutral-500">Free shipping over RM150 (West Malaysia)</p>
        </aside>
      </div>
    </div>
  )
}

function Row({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'text-base font-semibold' : ''} ${muted ? 'text-neutral-500' : ''}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}
