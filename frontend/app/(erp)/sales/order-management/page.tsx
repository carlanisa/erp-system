'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import {
  PackageCheck, ScanLine, Printer, Undo2, Settings, Plus, Search,
} from 'lucide-react'

type Channel = { id: number; code: string; name: string; color?: string }
type Order = {
  id: number
  external_order_id: string
  external_order_sn?: string
  status: string
  buyer_name?: string
  awb_no?: string
  total: number
  currency: string
  ship_by_date?: string
  channel?: Channel
  items?: any[]
}

const STATUSES = [
  { key: 'all',              label: 'All' },
  { key: 'pending_payment',  label: 'Pending Payment' },
  { key: 'paid',             label: 'Paid' },
  { key: 'to_ship',          label: 'To Ship' },
  { key: 'shipped',          label: 'Shipped' },
  { key: 'return_requested', label: 'Returns' },
  { key: 'refunded',         label: 'Refunded' },
]

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    pending_payment: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    paid: 'bg-blue-50 text-blue-700 border-blue-200',
    to_ship: 'bg-amber-50 text-amber-700 border-amber-200',
    shipped: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    return_requested: 'bg-orange-50 text-orange-700 border-orange-200',
    returned: 'bg-orange-50 text-orange-700 border-orange-200',
    refunded: 'bg-rose-50 text-rose-700 border-rose-200',
    cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
  }
  return (
    <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${cfg[status] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

export default function OrderManagementPage() {
  const [status, setStatus] = useState('all')
  const [channels, setChannels] = useState<Channel[]>([])
  const [channelCode, setChannelCode] = useState('')
  const [orders, setOrders] = useState<Order[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const r = await api.get('/sales/order-management/orders', {
        params: { status, channel_code: channelCode || undefined, search: search || undefined },
      })
      setOrders(r.data.data || [])
      setCounts(r.data.meta?.counts || {})
    } finally { setLoading(false) }
  }

  useEffect(() => {
    api.get('/sales/order-management/channels').then(r => setChannels(r.data.data || []))
  }, [])

  useEffect(() => { load() }, [status, channelCode])

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
            <PackageCheck className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Order Management</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Marketplace + website orders — pack with scanner verification
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/sales/order-management/pack" className="btn btn-primary inline-flex items-center gap-2">
            <ScanLine className="w-4 h-4" /> Pack Station
          </Link>
          <Link href="/sales/order-management/print-awb" className="btn btn-secondary inline-flex items-center gap-2">
            <Printer className="w-4 h-4" /> Print AWBs
          </Link>
          <Link href="/sales/order-management/returns" className="btn btn-secondary inline-flex items-center gap-2">
            <Undo2 className="w-4 h-4" /> Returns
          </Link>
          <Link href="/sales/order-management/settings" className="btn btn-secondary inline-flex items-center gap-2">
            <Settings className="w-4 h-4" /> Channels
          </Link>
          <Link href="/sales/order-management/new" className="btn btn-secondary inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Order
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STATUSES.map(s => (
          <button
            key={s.key}
            onClick={() => setStatus(s.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              status === s.key
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {s.label}
            {counts[s.key] != null && s.key !== 'all' && (
              <span className="ml-1.5 opacity-75">({counts[s.key]})</span>
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setChannelCode('')}
          className={`px-2.5 py-1 rounded-md text-xs border ${!channelCode ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}
        >All channels</button>
        {channels.map(c => (
          <button
            key={c.code}
            onClick={() => setChannelCode(c.code)}
            className={`px-2.5 py-1 rounded-md text-xs border inline-flex items-center gap-1.5 ${
              channelCode === c.code ? 'text-white border-transparent' : 'bg-white text-slate-700 border-slate-200'
            }`}
            style={channelCode === c.code ? { backgroundColor: c.color || '#64748b' } : undefined}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color || '#64748b' }} />
            {c.name}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="Order #, AWB, buyer…"
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium">Order #</th>
              <th className="text-left px-4 py-2.5 font-medium">Channel</th>
              <th className="text-left px-4 py-2.5 font-medium">Buyer</th>
              <th className="text-left px-4 py-2.5 font-medium">Items</th>
              <th className="text-left px-4 py-2.5 font-medium">AWB</th>
              <th className="text-right px-4 py-2.5 font-medium">Total</th>
              <th className="text-left px-4 py-2.5 font-medium">Status</th>
              <th className="text-left px-4 py-2.5 font-medium">Ship By</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>
            )}
            {!loading && orders.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                No orders yet. Connect a channel or click <strong>New Order</strong> to seed a test.
              </td></tr>
            )}
            {orders.map(o => (
              <tr key={o.id} className="border-t border-slate-100 hover:bg-amber-50/30">
                <td className="px-4 py-2.5">
                  <Link href={`/sales/order-management/pack?awb=${o.awb_no || o.external_order_id}`} className="text-amber-700 font-medium hover:underline">
                    {o.external_order_id}
                  </Link>
                  {o.external_order_sn && <div className="text-[11px] text-slate-400">{o.external_order_sn}</div>}
                </td>
                <td className="px-4 py-2.5">
                  <span className="inline-flex items-center gap-1.5 text-xs">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: o.channel?.color || '#64748b' }} />
                    {o.channel?.name || '—'}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-slate-700">{o.buyer_name || '—'}</td>
                <td className="px-4 py-2.5 text-slate-700">{o.items?.length ?? 0}</td>
                <td className="px-4 py-2.5 text-slate-700 font-mono text-xs">{o.awb_no || '—'}</td>
                <td className="px-4 py-2.5 text-right">{o.currency} {Number(o.total).toFixed(2)}</td>
                <td className="px-4 py-2.5"><StatusBadge status={o.status} /></td>
                <td className="px-4 py-2.5 text-slate-500 text-xs">{o.ship_by_date || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
