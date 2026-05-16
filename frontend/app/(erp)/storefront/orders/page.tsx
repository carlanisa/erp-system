'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

type Order = {
  id: number
  so_number: string
  date: string
  amount: number
  storefront_status: string | null
  payment_method: string | null
  customer?: { id: number; name: string; email: string | null } | null
}

export default function StorefrontOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/storefront/orders')
      .then(({ data }) => setOrders(data?.data ?? []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Order #</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No storefront orders yet.</td></tr>
            ) : orders.map((o) => (
              <tr key={o.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs">{o.so_number}</td>
                <td className="px-4 py-3">{o.date}</td>
                <td className="px-4 py-3">{o.customer?.name ?? '—'}</td>
                <td className="px-4 py-3 uppercase text-xs">{o.payment_method ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                    {o.storefront_status ?? '—'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-semibold">
                  RM{Number(o.amount).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
