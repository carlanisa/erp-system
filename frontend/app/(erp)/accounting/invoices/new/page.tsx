'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Plus, Trash2, ArrowLeft, Save, Send, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import type { Customer } from '@/types/index'

type LineItem = {
  id: number
  description: string
  quantity: string
  unit_price: string
  tax_rate: string
}

const emptyLine = (): LineItem => ({
  id: Date.now(),
  description: '',
  quantity: '1',
  unit_price: '',
  tax_rate: '0',
})

export default function NewInvoicePage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [saving, setSaving] = useState<'draft' | 'send' | null>(null)

  const [form, setForm] = useState({
    customer_id: '',
    date: new Date().toISOString().slice(0, 10),
    due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    notes: '',
  })
  const [items, setItems] = useState<LineItem[]>([emptyLine()])

  useEffect(() => {
    api.get('/crm/customers', { params: { all: 'true' } })
      .then(r => setCustomers(r.data.data))
      .catch(() => toast.error('Failed to load customers'))
  }, [])

  function updateItem(id: number, field: keyof LineItem, value: string) {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item))
  }

  function addLine() { setItems(prev => [...prev, emptyLine()]) }

  function removeLine(id: number) {
    if (items.length === 1) return
    setItems(prev => prev.filter(i => i.id !== id))
  }

  function calcLine(item: LineItem) {
    const qty   = parseFloat(item.quantity)  || 0
    const price = parseFloat(item.unit_price) || 0
    const tax   = parseFloat(item.tax_rate)   || 0
    const sub   = qty * price
    return { sub, tax: sub * (tax / 100), total: sub + sub * (tax / 100) }
  }

  const subtotal  = items.reduce((s, i) => s + calcLine(i).sub, 0)
  const taxTotal  = items.reduce((s, i) => s + calcLine(i).tax, 0)
  const grandTotal = subtotal + taxTotal

  async function handleSubmit(sendNow: boolean) {
    if (!form.customer_id) return toast.error('Please select a customer')
    if (items.some(i => !i.description || !i.unit_price)) {
      return toast.error('Fill all item descriptions and prices')
    }

    const mode = sendNow ? 'send' : 'draft'
    setSaving(mode)
    try {
      const { data } = await api.post('/accounting/invoices', {
        ...form,
        items: items.map(i => ({
          description: i.description,
          quantity:    parseFloat(i.quantity),
          unit_price:  parseFloat(i.unit_price),
          tax_rate:    parseFloat(i.tax_rate) || 0,
        })),
      })

      const invoice = data.data
      if (sendNow) {
        await api.post(`/accounting/invoices/${invoice.id}/send`)
        toast.success(`${invoice.number} created and sent!`)
      } else {
        toast.success(`${invoice.number} saved as draft`)
      }
      router.push('/accounting/invoices')
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Failed to create invoice')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="max-w-4xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/accounting/invoices" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-slate-800">New Invoice</h1>
            <p className="text-sm text-slate-500">Create a new customer invoice</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleSubmit(false)}
            disabled={!!saving}
            className="btn-outline flex items-center gap-2"
          >
            {saving === 'draft' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Draft
          </button>
          <button
            onClick={() => handleSubmit(true)}
            disabled={!!saving}
            className="btn-primary flex items-center gap-2"
          >
            {saving === 'send' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Create & Send
          </button>
        </div>
      </div>

      {/* Invoice Info */}
      <div className="card">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Invoice Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Customer *</label>
            <select
              value={form.customer_id}
              onChange={e => setForm({ ...form, customer_id: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">Select customer...</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Issue Date *</label>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Due Date *</label>
            <input
              type="date"
              value={form.due_date}
              onChange={e => setForm({ ...form, due_date: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Line Items</h2>
          <button onClick={addLine} className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium">
            <Plus className="w-3.5 h-3.5" /> Add Item
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-2.5 w-[40%]">Description</th>
                <th className="text-right text-xs text-slate-500 font-medium px-3 py-2.5 w-20">Qty</th>
                <th className="text-right text-xs text-slate-500 font-medium px-3 py-2.5 w-32">Unit Price</th>
                <th className="text-right text-xs text-slate-500 font-medium px-3 py-2.5 w-20">Tax %</th>
                <th className="text-right text-xs text-slate-500 font-medium px-3 py-2.5 w-28">Total</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.map((item) => {
                const { total } = calcLine(item)
                return (
                  <tr key={item.id}>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={item.description}
                        onChange={e => updateItem(item.id, 'description', e.target.value)}
                        placeholder="Service or product description..."
                        className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={e => updateItem(item.id, 'quantity', e.target.value)}
                        min="0.01"
                        step="0.01"
                        className="w-full px-2 py-1.5 text-sm text-right border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={item.unit_price}
                        onChange={e => updateItem(item.id, 'unit_price', e.target.value)}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="w-full px-2 py-1.5 text-sm text-right border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={item.tax_rate}
                        onChange={e => updateItem(item.id, 'tax_rate', e.target.value)}
                        min="0"
                        max="100"
                        step="0.01"
                        className="w-full px-2 py-1.5 text-sm text-right border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-slate-700">
                      {formatCurrency(total)}
                    </td>
                    <td className="pr-3 py-2">
                      <button
                        onClick={() => removeLine(item.id)}
                        disabled={items.length === 1}
                        className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors disabled:opacity-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end px-5 py-4 border-t border-slate-100">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600">
              <span>Tax</span>
              <span>{formatCurrency(taxTotal)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-slate-800 pt-2 border-t border-slate-200">
              <span>Total</span>
              <span>{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="card">
        <label className="block text-xs font-medium text-slate-600 mb-1.5">Notes (optional)</label>
        <textarea
          rows={3}
          value={form.notes}
          onChange={e => setForm({ ...form, notes: e.target.value })}
          placeholder="Additional notes or payment instructions..."
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
      </div>
    </div>
  )
}
