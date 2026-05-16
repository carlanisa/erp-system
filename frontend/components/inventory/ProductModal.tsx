'use client'

import { useEffect, useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import type { Product } from '@/types/index'

type Props = {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editing?: Product | null
  categories: string[]
}

const METHODS = [
  { value: 'average', label: 'Average Cost' },
  { value: 'fifo',    label: 'FIFO' },
  { value: 'lifo',    label: 'LIFO' },
]

const defaultForm = {
  sku: '', barcode: '', name: '', description: '', category: '',
  department_id: '', uom: 'PCS',
  cost_price: '', sale_price: '', stock: '0',
  low_stock_alert: '5', costing_method: 'average',
}

type Dept = { id: number; code: string; name: string }

export default function ProductModal({ open, onClose, onSaved, editing, categories }: Props) {
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [departments, setDepartments] = useState<Dept[]>([])

  useEffect(() => {
    if (open) {
      api.get('/inventory/departments/flat').then(r => setDepartments(r.data.data ?? [])).catch(() => {})
    }
  }, [open])

  useEffect(() => {
    if (editing) {
      setForm({
        sku:             editing.sku,
        barcode:         (editing as any).barcode ?? '',
        name:            editing.name,
        description:     editing.description ?? '',
        category:        editing.category ?? '',
        department_id:   (editing as any).department_id ? String((editing as any).department_id) : '',
        uom:             (editing as any).uom ?? 'PCS',
        cost_price:      String(editing.cost_price),
        sale_price:      String(editing.sale_price),
        stock:           String(editing.stock),
        low_stock_alert: String(editing.low_stock_alert),
        costing_method:  editing.costing_method ?? 'average',
      })
    } else {
      setForm(defaultForm)
    }
    setNewCategory('')
  }, [editing, open])

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  const margin = form.cost_price && form.sale_price
    ? (((+form.sale_price - +form.cost_price) / +form.cost_price) * 100).toFixed(1)
    : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      ...form,
      category:        newCategory || form.category || undefined,
      department_id:   form.department_id ? Number(form.department_id) : null,
      cost_price:      +form.cost_price,
      sale_price:      +form.sale_price,
      stock:           +form.stock,
      low_stock_alert: +form.low_stock_alert,
    }
    try {
      if (editing) {
        await api.put(`/inventory/products/${editing.id}`, payload)
        toast.success('Product updated')
      } else {
        await api.post('/inventory/products', payload)
        toast.success('Product created')
      }
      onSaved()
      onClose()
    } catch (e: any) {
      const errors = e.response?.data?.errors
      if (errors) {
        toast.error(Object.values(errors).flat().join('\n'))
      } else {
        toast.error(e.response?.data?.message ?? 'Failed to save')
      }
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h3 className="font-bold text-slate-800">{editing ? 'Edit Product' : 'New Product'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* SKU + Name */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">SKU *</label>
              <input required value={form.sku} onChange={e => set('sku', e.target.value)}
                placeholder="PROD-001"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Product Name *</label>
              <input required value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="e.g. Faura Shawl - Black"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Barcode + UOM */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Barcode (optional)</label>
              <input value={form.barcode} onChange={e => set('barcode', e.target.value)}
                placeholder="EAN-13 / scan-friendly code"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">UOM</label>
              <input value={form.uom} onChange={e => set('uom', e.target.value.toUpperCase())}
                placeholder="PCS"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono uppercase"
              />
            </div>
          </div>

          {/* Department + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Department</label>
              <select value={form.department_id} onChange={e => set('department_id', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">— None —</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Category</label>
              <div className="flex gap-2">
                <select value={form.category} onChange={e => { set('category', e.target.value); setNewCategory('') }}
                  className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">Select or type new...</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input value={newCategory} onChange={e => { setNewCategory(e.target.value); set('category', '') }}
                  placeholder="New"
                  className="w-24 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Cost Price (RM) *</label>
              <input required type="number" min="0" step="0.01" value={form.cost_price}
                onChange={e => set('cost_price', e.target.value)} placeholder="0.00"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Sale Price (RM) *
                {margin && (
                  <span className={`ml-2 font-semibold ${+margin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {+margin >= 0 ? '+' : ''}{margin}% margin
                  </span>
                )}
              </label>
              <input required type="number" min="0" step="0.01" value={form.sale_price}
                onChange={e => set('sale_price', e.target.value)} placeholder="0.00"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Stock + Alert */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                {editing ? 'Current Stock' : 'Opening Stock'}
              </label>
              <input type="number" min="0" step="0.001" value={form.stock}
                onChange={e => set('stock', e.target.value)}
                disabled={!!editing}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400"
              />
              {editing && <p className="text-xs text-slate-400 mt-1">Use stock adjustment to change</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Low Stock Alert</label>
              <input type="number" min="0" step="0.001" value={form.low_stock_alert}
                onChange={e => set('low_stock_alert', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Costing Method</label>
              <select value={form.costing_method} onChange={e => set('costing_method', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Description (optional)</label>
            <textarea rows={2} value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Product details, specifications..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editing ? 'Update Product' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
