'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { ArrowLeft, Undo2, Loader2 } from 'lucide-react'

type R = {
  id: number
  status: string
  reason?: string
  condition?: string
  refund_amount: number
  restocked: boolean
  order: { id: number; external_order_id: string; total: number; currency: string; channel?: { name: string; color?: string } }
}

export default function ReturnsPage() {
  const [rows, setRows] = useState<R[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState<number | null>(null)

  async function load() {
    setLoading(true)
    try {
      const r = await api.get('/sales/order-management/returns')
      setRows(r.data.data || [])
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function request() {
    const orderId = window.prompt('Marketplace order ID to request return for:')
    if (!orderId) return
    const reason = window.prompt('Reason for return:') || ''
    setBusy(0)
    try {
      await api.post('/sales/order-management/returns', { order_id: Number(orderId), reason })
      await load()
    } finally { setBusy(null) }
  }

  async function receive(id: number) {
    const condition = window.prompt('Condition? (saleable / damaged)', 'saleable')
    if (condition !== 'saleable' && condition !== 'damaged') return
    setBusy(id)
    try {
      await api.post(`/sales/order-management/returns/${id}/receive`, { condition })
      await load()
    } finally { setBusy(null) }
  }

  async function refund(id: number, total: number) {
    const amt = window.prompt('Refund amount:', String(total))
    if (!amt) return
    const restock = window.confirm('Restock items? (OK = yes, Cancel = no)')
    setBusy(id)
    try {
      await api.post(`/sales/order-management/returns/${id}/refund`, { refund_amount: Number(amt), restock })
      await load()
    } finally { setBusy(null) }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/sales/order-management" className="text-slate-500 hover:text-slate-800">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
          <Undo2 className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800">Returns &amp; Refunds</h1>
          <p className="text-sm text-slate-500 mt-0.5">Receive returned parcels, inspect condition, refund customer.</p>
        </div>
        <button onClick={request} className="btn btn-primary">+ New Return</button>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium">Order #</th>
              <th className="text-left px-4 py-2.5 font-medium">Channel</th>
              <th className="text-left px-4 py-2.5 font-medium">Reason</th>
              <th className="text-left px-4 py-2.5 font-medium">Status</th>
              <th className="text-left px-4 py-2.5 font-medium">Condition</th>
              <th className="text-right px-4 py-2.5 font-medium">Refund</th>
              <th className="text-left px-4 py-2.5 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">No returns yet.</td></tr>}
            {rows.map(r => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-4 py-2.5 font-mono text-xs">{r.order.external_order_id}</td>
                <td className="px-4 py-2.5">{r.order.channel?.name || '—'}</td>
                <td className="px-4 py-2.5">{r.reason || '—'}</td>
                <td className="px-4 py-2.5">{r.status}</td>
                <td className="px-4 py-2.5">{r.condition || '—'}</td>
                <td className="px-4 py-2.5 text-right">{r.order.currency} {Number(r.refund_amount).toFixed(2)}</td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-2">
                    {r.status === 'requested' && (
                      <button onClick={() => receive(r.id)} className="text-xs px-2 py-1 border rounded-md hover:bg-slate-50">
                        {busy === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Receive'}
                      </button>
                    )}
                    {r.status === 'received' && (
                      <button onClick={() => refund(r.id, r.order.total)} className="text-xs px-2 py-1 border rounded-md hover:bg-slate-50">
                        {busy === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Refund'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
