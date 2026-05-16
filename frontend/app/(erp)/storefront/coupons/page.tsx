'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { Plus, Trash2, Pencil, X } from 'lucide-react'

type Coupon = {
  id: number; code: string; description: string | null
  type: 'percent' | 'fixed' | 'free_shipping'
  value: number; min_subtotal: number
  starts_at: string | null; ends_at: string | null
  usage_limit: number | null; per_customer_limit: number | null
  active: boolean; redeem_count: number
}

const empty: any = {
  code: '', description: '', type: 'percent', value: 10, min_subtotal: 0,
  starts_at: '', ends_at: '', usage_limit: '', per_customer_limit: '', active: true,
}

export default function CouponsPage() {
  const [items, setItems] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<any>(empty)
  const [editing, setEditing] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/storefront/coupons')
      setItems(data?.data ?? data ?? [])
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function save() {
    try {
      const payload = {
        ...form,
        value: Number(form.value) || 0,
        min_subtotal: Number(form.min_subtotal) || 0,
        usage_limit: form.usage_limit === '' ? null : Number(form.usage_limit),
        per_customer_limit: form.per_customer_limit === '' ? null : Number(form.per_customer_limit),
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
      }
      if (editing) await api.put(`/admin/storefront/coupons/${editing}`, payload)
      else         await api.post('/admin/storefront/coupons', payload)
      toast.success('Saved')
      setForm(empty); setEditing(null); setShowForm(false); load()
    } catch (e: any) {
      toast.error(e?.response?.data?.errors ? Object.values(e.response.data.errors)[0] as string : 'Could not save')
    }
  }

  async function del(id: number) {
    if (!confirm('Delete this coupon?')) return
    await api.delete(`/admin/storefront/coupons/${id}`)
    load()
  }

  function edit(c: Coupon) {
    setForm({
      code: c.code, description: c.description ?? '', type: c.type,
      value: c.value, min_subtotal: c.min_subtotal,
      starts_at: c.starts_at?.slice(0, 16) ?? '',
      ends_at: c.ends_at?.slice(0, 16) ?? '',
      usage_limit: c.usage_limit ?? '',
      per_customer_limit: c.per_customer_limit ?? '',
      active: c.active,
    })
    setEditing(c.id); setShowForm(true)
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-end">
        <button onClick={() => { setForm(empty); setEditing(null); setShowForm(true) }}
          className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
          <Plus className="h-4 w-4" /> New coupon
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">{editing ? 'Edit coupon' : 'New coupon'}</h2>
            <button onClick={() => { setShowForm(false); setEditing(null); setForm(empty) }}><X className="h-4 w-4" /></button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Code" value={form.code} onChange={(v: string) => setForm({ ...form, code: v.toUpperCase() })} />
            <div>
              <label className="text-xs font-medium text-slate-600">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                <option value="percent">Percent off</option>
                <option value="fixed">Fixed amount</option>
                <option value="free_shipping">Free shipping</option>
              </select>
            </div>
            <Field label={form.type === 'percent' ? 'Percent (e.g. 10)' : 'Amount (RM)'} type="number" value={form.value} onChange={(v: string) => setForm({ ...form, value: v })} />
            <Field label="Minimum subtotal (RM)" type="number" value={form.min_subtotal} onChange={(v: string) => setForm({ ...form, min_subtotal: v })} />
            <Field label="Starts at" type="datetime-local" value={form.starts_at} onChange={(v: string) => setForm({ ...form, starts_at: v })} />
            <Field label="Ends at" type="datetime-local" value={form.ends_at} onChange={(v: string) => setForm({ ...form, ends_at: v })} />
            <Field label="Total usage limit" type="number" value={form.usage_limit} onChange={(v: string) => setForm({ ...form, usage_limit: v })} />
            <Field label="Per-customer limit" type="number" value={form.per_customer_limit} onChange={(v: string) => setForm({ ...form, per_customer_limit: v })} />
            <Field label="Description" value={form.description} onChange={(v: string) => setForm({ ...form, description: v })} wide />
            <label className="flex items-center gap-2 md:col-span-2">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              <span className="text-sm">Active</span>
            </label>
          </div>
          <div className="mt-4 flex justify-end">
            <button onClick={save} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
              {editing ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">Min Subtotal</th>
              <th className="px-4 py-3">Used</th>
              <th className="px-4 py-3">Active</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No coupons yet.</td></tr>
            ) : items.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs font-semibold">{c.code}</td>
                <td className="px-4 py-3">{c.type}</td>
                <td className="px-4 py-3">{c.type === 'percent' ? `${c.value}%` : c.type === 'fixed' ? `RM${Number(c.value).toFixed(2)}` : '—'}</td>
                <td className="px-4 py-3">RM{Number(c.min_subtotal).toFixed(2)}</td>
                <td className="px-4 py-3">{c.redeem_count}{c.usage_limit ? ` / ${c.usage_limit}` : ''}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {c.active ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => edit(c)} className="mr-2 text-slate-500 hover:text-indigo-600"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => del(c.id)} className="text-slate-500 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, wide, type = 'text' }: any) {
  return (
    <div className={wide ? 'md:col-span-2' : ''}>
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
    </div>
  )
}
