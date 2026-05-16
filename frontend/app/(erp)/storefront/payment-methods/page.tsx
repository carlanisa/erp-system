'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'

type Method = { id: number; code: string; driver: string; label: string; enabled: boolean; sort_order: number }

const DRIVER_HINTS: Record<string, string> = {
  cod: 'No setup. Customer pays on delivery.',
  bank_transfer: 'Set bank details via BANK_NAME / BANK_ACCOUNT_NAME / BANK_ACCOUNT_NUMBER in .env.',
  stripe: 'Set STRIPE_SECRET in .env. Webhook URL: /api/storefront/webhooks/stripe',
  paypal: 'Set PAYPAL_MODE, PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET. Webhook: /api/storefront/webhooks/paypal',
  billplz: 'Set BILLPLZ_KEY, BILLPLZ_COLLECTION_ID, BILLPLZ_SANDBOX. Webhook: /api/storefront/webhooks/billplz',
  toyyibpay: 'Set TOYYIBPAY_SECRET, TOYYIBPAY_CATEGORY, TOYYIBPAY_SANDBOX. Webhook: /api/storefront/webhooks/toyyibpay',
}

export default function PaymentMethodsPage() {
  const [items, setItems] = useState<Method[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const { data } = await api.get('/admin/storefront/payment-methods')
    setItems(Array.isArray(data) ? data : data?.data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function toggle(m: Method) {
    await api.put(`/admin/storefront/payment-methods/${m.id}`, { enabled: !m.enabled })
    toast.success(!m.enabled ? `${m.label} enabled` : `${m.label} disabled`)
    load()
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Payment Methods</h1>
      <p className="mb-6 text-sm text-slate-600">Enable a method for it to appear at checkout. Configure each gateway in <code className="rounded bg-slate-100 px-1.5 py-0.5">.env</code>.</p>
      <div className="space-y-3">
        {loading ? <div className="text-slate-400">Loading…</div> : items.map((m) => (
          <div key={m.id} className="flex items-start justify-between rounded-lg border border-slate-200 bg-white p-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{m.label}</span>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono">{m.driver}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{DRIVER_HINTS[m.driver] ?? ''}</p>
            </div>
            <button onClick={() => toggle(m)} className={`rounded-full px-4 py-1.5 text-xs font-semibold ${m.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
              {m.enabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
