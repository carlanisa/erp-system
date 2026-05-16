'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { storefrontApi, formatMYR } from '@/lib/storefront-api'
import { useCustomerAuthStore } from '@/stores/customer-auth-store'

type Order = {
  id: number
  so_number: string
  date: string
  amount: number
  storefront_status: string | null
}

export default function OrdersPage() {
  const router = useRouter()
  const customer = useCustomerAuthStore((s) => s.customer)
  const hydrated = useCustomerAuthStore((s) => s.hydrated)
  const hydrate = useCustomerAuthStore((s) => s.hydrate)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { hydrate().catch(() => {}) }, [hydrate])
  useEffect(() => { if (hydrated && !customer) router.push('/account/login') }, [hydrated, customer, router])
  useEffect(() => {
    if (!customer) return
    storefrontApi.get('/orders').then(({ data }) => setOrders(data?.data ?? [])).finally(() => setLoading(false))
  }, [customer])

  if (!customer) return null

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-3xl font-semibold">My orders</h1>
      {loading ? <div className="text-neutral-500">Loading…</div> : orders.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 p-12 text-center text-neutral-500">
          No orders yet. <Link href="/shop" className="text-rose-500 hover:underline">Start shopping →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Link
              key={o.id}
              href={`/account/orders/${o.id}`}
              className="flex items-center justify-between rounded-xl border border-neutral-200 p-4 hover:border-rose-500"
            >
              <div>
                <div className="font-mono text-sm font-semibold">{o.so_number}</div>
                <div className="text-xs text-neutral-500">{o.date}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{formatMYR(o.amount)}</div>
                <div className="text-xs text-neutral-500">{o.storefront_status || '—'}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
