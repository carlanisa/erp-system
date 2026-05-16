'use client'

import { useCallback, useEffect, useState } from 'react'
import { TrendingUp, ArrowDownCircle, ArrowUpCircle, SlidersHorizontal, RefreshCw } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import { api } from '@/lib/api'
import { formatDate, formatCurrency } from '@/lib/utils'
import { clsx } from 'clsx'

type Movement = {
  id: number; type: 'in' | 'out' | 'adjustment'
  quantity: number; unit_cost: number
  reference?: string; notes?: string; created_at: string
  product?: { name: string; sku: string }
  created_by?: { name: string }
}

const TYPE_CONFIG = {
  in:         { label: 'Stock In',    icon: ArrowDownCircle,   color: 'text-emerald-600', bg: 'bg-emerald-50' },
  out:        { label: 'Stock Out',   icon: ArrowUpCircle,     color: 'text-red-500',     bg: 'bg-red-50' },
  adjustment: { label: 'Adjustment', icon: SlidersHorizontal, color: 'text-amber-600',   bg: 'bg-amber-50' },
}

export default function StockMovementsPage() {
  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading]     = useState(true)
  const [typeFilter, setType]     = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (typeFilter) params.type = typeFilter
      const { data } = await api.get('/inventory/stock-movements', { params })
      setMovements(data.data)
    } finally {
      setLoading(false)
    }
  }, [typeFilter])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-4">
      <PageHeader
        title="Stock Movements"
        description="All inventory in/out and adjustments"
        icon={TrendingUp}
        action={<button onClick={load} className="btn-outline flex items-center gap-2"><RefreshCw className="w-4 h-4" />Refresh</button>}
      />

      {/* Type filter tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {[{ value: '', label: 'All' }, { value: 'in', label: 'Stock In' }, { value: 'out', label: 'Stock Out' }, { value: 'adjustment', label: 'Adjustments' }].map(t => (
          <button key={t.value} onClick={() => setType(t.value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              typeFilter === t.value ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left text-xs text-slate-500 font-semibold px-4 py-3">Type</th>
                <th className="text-left text-xs text-slate-500 font-semibold px-4 py-3">Product</th>
                <th className="text-right text-xs text-slate-500 font-semibold px-4 py-3">Quantity</th>
                <th className="text-right text-xs text-slate-500 font-semibold px-4 py-3">Unit Cost</th>
                <th className="text-left text-xs text-slate-500 font-semibold px-4 py-3">Reference</th>
                <th className="text-left text-xs text-slate-500 font-semibold px-4 py-3">By</th>
                <th className="text-left text-xs text-slate-500 font-semibold px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>{Array.from({length:7}).map((_,j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse"/></td>
                  ))}</tr>
                ))
              ) : movements.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400 text-sm">No movements found</td></tr>
              ) : movements.map(m => {
                const cfg = TYPE_CONFIG[m.type]
                const Icon = cfg.icon
                return (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                        <Icon className="w-3.5 h-3.5" />{cfg.label}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-700">{m.product?.name ?? '—'}</p>
                      <p className="text-xs font-mono text-slate-400">{m.product?.sku}</p>
                    </td>
                    <td className={clsx('px-4 py-3 text-right font-bold', cfg.color)}>
                      {m.type === 'out' ? '-' : '+'}{m.quantity}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(m.unit_cost)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{m.reference ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{m.created_by?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{formatDate(m.created_at)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
