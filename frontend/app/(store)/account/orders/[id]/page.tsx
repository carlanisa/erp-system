'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { storefrontApi, formatMYR } from '@/lib/storefront-api'
import { useCustomerAuthStore } from '@/stores/customer-auth-store'
import { CheckCircle2, Clock, Package, Truck, X } from 'lucide-react'

type Line = { id: number; description: string; color: string | null; size: string | null; qty: number; unit_price: number; amount: number }
type Order = {
  id: number; so_number: string; date: string; amount: number; discount_total: number; shipping_total: number; tax_total: number
  storefront_status: string | null; payment_method: string | null; payment_reference: string | null
  shipping_address_json: any
  lines: Line[]
}

const STEPS = [
  { key: 'pending_payment', label: 'Pending payment', icon: Clock },
  { key: 'paid',            label: 'Payment received', icon: CheckCircle2 },
  { key: 'fulfilled',       label: 'Shipped', icon: Truck },
  { key: 'delivered',       label: 'Delivered', icon: Package },
]

export default function OrderDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const customer = useCustomerAuthStore((s) => s.customer)
  const hydrated = useCustomerAuthStore((s) => s.hydrated)
  const hydrate = useCustomerAuthStore((s) => s.hydrate)
  const [order, setOrder] = useState<Order | null>(null)

  useEffect(() => { hydrate().catch(() => {}) }, [hydrate])
  useEffect(() => { if (hydrated && !customer) router.push('/account/login') }, [hydrated, customer, router])
  useEffect(() => {
    if (!customer) return
    storefrontApi.get(`/orders/${params.id}`).then(({ data }) => setOrder(data)).catch(() => setOrder(null))
  }, [customer, params.id])

  if (!customer) return null
  if (!order) return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-neutral-500">Loading…</div>

  const cancelled = order.storefront_status === 'cancelled'
  const currentIdx = cancelled ? -1 : Math.max(0, STEPS.findIndex((s) => s.key === order.storefront_status))

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/account/orders" className="text-sm text-neutral-500 hover:text-rose-500">← All orders</Link>
      <h1 className="mt-2 text-3xl font-semibold">Order <span className="font-mono">{order.so_number}</span></h1>
      <div className="text-sm text-neutral-500">{order.date}</div>

      {/* Timeline */}
      <div className="mt-8 rounded-xl border border-neutral-200 p-5">
        {cancelled ? (
          <div className="flex items-center gap-3 text-rose-600">
            <X className="h-5 w-5" /> This order was cancelled.
          </div>
        ) : (
          <ol className="grid grid-cols-4 gap-2">
            {STEPS.map((s, i) => {
              const Icon = s.icon
              const done = i <= currentIdx
              return (
                <li key={s.key} className="flex flex-col items-center text-center">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-full ${done ? 'bg-rose-500 text-white' : 'bg-neutral-200 text-neutral-500'}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className={`mt-2 text-xs ${done ? 'text-rose-600 font-medium' : 'text-neutral-500'}`}>{s.label}</span>
                </li>
              )
            })}
          </ol>
        )}
      </div>

      {/* Items */}
      <div className="mt-6 rounded-xl border border-neutral-200">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-xs uppercase tracking-wider text-neutral-500">
            <tr><th className="px-4 py-2 text-left">Item</th><th className="px-4 py-2 text-right">Qty</th><th className="px-4 py-2 text-right">Price</th><th className="px-4 py-2 text-right">Subtotal</th></tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {order.lines.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-3">
                  <div className="font-medium">{l.description}</div>
                  <div className="text-xs text-neutral-500">{[l.color, l.size].filter(Boolean).join(' · ')}</div>
                </td>
                <td className="px-4 py-3 text-right">{l.qty}</td>
                <td className="px-4 py-3 text-right">{formatMYR(l.unit_price)}</td>
                <td className="px-4 py-3 text-right font-medium">{formatMYR(l.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-neutral-200 p-5 text-sm">
          <h3 className="mb-3 font-semibold">Shipping address</h3>
          {order.shipping_address_json ? (
            <div className="text-neutral-700">
              <div>{order.shipping_address_json.name}</div>
              <div>{order.shipping_address_json.phone}</div>
              <div>{order.shipping_address_json.line1}</div>
              {order.shipping_address_json.line2 && <div>{order.shipping_address_json.line2}</div>}
              <div>{order.shipping_address_json.city}, {order.shipping_address_json.postcode}</div>
              <div>{order.shipping_address_json.state_code}</div>
            </div>
          ) : <div className="text-neutral-500">—</div>}
        </div>
        <div className="rounded-xl border border-neutral-200 p-5 text-sm">
          <h3 className="mb-3 font-semibold">Summary</h3>
          <Row label="Discount"   value={`− ${formatMYR(order.discount_total)}`} />
          <Row label="Shipping"   value={formatMYR(order.shipping_total)} />
          <Row label="Tax"        value={formatMYR(order.tax_total)} />
          <div className="my-2 border-t" />
          <Row label="Total" value={formatMYR(order.amount)} bold />
          <div className="mt-3 text-xs text-neutral-500">
            Payment: <span className="uppercase">{order.payment_method || '—'}</span>
            {order.payment_reference && <span className="ml-2 font-mono">{order.payment_reference}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${bold ? 'text-base font-semibold' : 'text-neutral-600'}`}>
      <span>{label}</span><span>{value}</span>
    </div>
  )
}
