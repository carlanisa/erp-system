'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { ArrowLeft, Printer, Loader2 } from 'lucide-react'

type Row = {
  id: number; awb_no: string; courier?: string; channel?: string
  buyer_name?: string; ship_by_date?: string; has_pdf: boolean; item_count: number; total: number
}

export default function PrintAwbPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [picked, setPicked] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const r = await api.get('/sales/order-management/awb/pending')
      setRows(r.data.data || [])
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  function toggle(id: number) {
    setPicked(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }
  function toggleAll() {
    setPicked(prev => prev.size === rows.length ? new Set() : new Set(rows.map(r => r.id)))
  }

  async function printSelected() {
    if (picked.size === 0) return
    setBusy(true)
    try {
      const r = await api.post('/sales/order-management/awb/bulk-pdf', { ids: Array.from(picked) })
      const files = r.data.data.files as { url: string }[]
      files.forEach(f => window.open(f.url, '_blank'))
      setPicked(new Set())
      await load()
    } finally { setBusy(false) }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/sales/order-management" className="text-slate-500 hover:text-slate-800">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
          <Printer className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800">Print Airway Bills</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Select paid orders, print their AWB labels, then send to Pack Station.
          </p>
        </div>
        <button
          onClick={printSelected}
          disabled={busy || picked.size === 0}
          className="btn btn-primary inline-flex items-center gap-2"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
          Print {picked.size > 0 ? `(${picked.size})` : ''}
        </button>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs">
            <tr>
              <th className="px-4 py-2.5 w-10">
                <input
                  type="checkbox"
                  checked={rows.length > 0 && picked.size === rows.length}
                  onChange={toggleAll}
                />
              </th>
              <th className="text-left px-4 py-2.5 font-medium">AWB</th>
              <th className="text-left px-4 py-2.5 font-medium">Channel</th>
              <th className="text-left px-4 py-2.5 font-medium">Courier</th>
              <th className="text-left px-4 py-2.5 font-medium">Buyer</th>
              <th className="text-left px-4 py-2.5 font-medium">Items</th>
              <th className="text-left px-4 py-2.5 font-medium">Ship By</th>
              <th className="text-left px-4 py-2.5 font-medium">PDF</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">No AWBs pending print.</td></tr>
            )}
            {rows.map(r => (
              <tr key={r.id} className="border-t border-slate-100 hover:bg-amber-50/30">
                <td className="px-4 py-2.5">
                  <input type="checkbox" checked={picked.has(r.id)} onChange={() => toggle(r.id)} />
                </td>
                <td className="px-4 py-2.5 font-mono text-xs">{r.awb_no}</td>
                <td className="px-4 py-2.5">{r.channel || '—'}</td>
                <td className="px-4 py-2.5">{r.courier || '—'}</td>
                <td className="px-4 py-2.5">{r.buyer_name || '—'}</td>
                <td className="px-4 py-2.5">{r.item_count}</td>
                <td className="px-4 py-2.5 text-slate-500 text-xs">{r.ship_by_date || '—'}</td>
                <td className="px-4 py-2.5">
                  {r.has_pdf
                    ? <span className="text-emerald-600 text-xs">Ready</span>
                    : <span className="text-amber-600 text-xs">No PDF</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
