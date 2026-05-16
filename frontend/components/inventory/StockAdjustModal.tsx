'use client'

import { useState } from 'react'
import { X, Loader2, ArrowDownCircle, ArrowUpCircle, SlidersHorizontal } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import type { Product } from '@/types/index'

type Props = {
  open: boolean
  onClose: () => void
  onSaved: () => void
  product: Product | null
}

const MOVE_TYPES = [
  { value: 'in',         label: 'Stock In',    icon: ArrowDownCircle,    color: 'text-emerald-600', bg: 'bg-emerald-50',  border: 'border-emerald-400' },
  { value: 'out',        label: 'Stock Out',   icon: ArrowUpCircle,      color: 'text-red-600',     bg: 'bg-red-50',      border: 'border-red-400' },
  { value: 'adjustment', label: 'Adjustment',  icon: SlidersHorizontal,  color: 'text-amber-600',   bg: 'bg-amber-50',    border: 'border-amber-400' },
]

export default function StockAdjustModal({ open, onClose, onSaved, product }: Props) {
  const [type, setType]           = useState('in')
  const [quantity, setQuantity]   = useState('')
  const [reference, setReference] = useState('')
  const [notes, setNotes]         = useState('')
  const [saving, setSaving]       = useState(false)

  function reset() { setType('in'); setQuantity(''); setReference(''); setNotes('') }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!product) return
    setSaving(true)
    try {
      await api.post('/inventory/stock-movements', {
        product_id: product.id,
        type,
        quantity:   +quantity,
        reference:  reference || undefined,
        notes:      notes || undefined,
      })
      const label = type === 'in' ? 'added to' : type === 'out' ? 'removed from' : 'adjusted for'
      toast.success(`${quantity} units ${label} ${product.name}`)
      reset()
      onSaved()
      onClose()
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Stock movement failed')
    } finally {
      setSaving(false)
    }
  }

  if (!open || !product) return null

  const newStock = type === 'adjustment'
    ? +quantity
    : type === 'in'
      ? product.stock + +quantity
      : product.stock - +quantity

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-800">Stock Adjustment</h3>
            <p className="text-xs text-slate-500 mt-0.5">{product.sku} — {product.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current stock banner */}
        <div className="mx-6 mt-4 flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
          <div>
            <p className="text-xs text-slate-400">Current Stock</p>
            <p className="text-2xl font-bold text-slate-800">{product.stock} <span className="text-sm font-normal text-slate-400">units</span></p>
          </div>
          {quantity && (
            <div className="text-right">
              <p className="text-xs text-slate-400">After adjustment</p>
              <p className={`text-2xl font-bold ${newStock < 0 ? 'text-red-500' : newStock <= product.low_stock_alert ? 'text-amber-600' : 'text-emerald-600'}`}>
                {newStock} <span className="text-sm font-normal text-slate-400">units</span>
              </p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Type selector */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">Movement Type</label>
            <div className="grid grid-cols-3 gap-2">
              {MOVE_TYPES.map(t => {
                const Icon = t.icon
                return (
                  <button key={t.value} type="button" onClick={() => setType(t.value)}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all text-xs font-medium ${
                      type === t.value ? `${t.bg} ${t.border} ${t.color}` : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              {type === 'adjustment' ? 'New Stock Quantity' : 'Quantity'}
            </label>
            <input required type="number" min="0.001" step="0.001" value={quantity}
              onChange={e => setQuantity(e.target.value)} placeholder="0"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Reference # (optional)</label>
              <input value={reference} onChange={e => setReference(e.target.value)}
                placeholder="PO-001, GRN-001..."
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Notes (optional)</label>
              <input value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Reason..."
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
            <button type="submit" disabled={saving || !quantity} className="btn-primary flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Record Movement
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
