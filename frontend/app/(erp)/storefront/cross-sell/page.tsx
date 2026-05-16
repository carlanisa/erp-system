'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { ArrowLeft, Plus, Pencil, Trash2, X, Layers } from 'lucide-react'

type Rule = {
  id: number; name: string
  anchor_type: 'category'|'product'; anchor_value: string
  suggest_categories: string[]|null; suggest_product_ids: number[]|null
  reason_text: string|null; max_suggestions: number; priority: number; active: boolean
}

const empty: any = {
  name: '', anchor_type: 'category', anchor_value: '',
  suggest_categories: '', suggest_product_ids: '',
  reason_text: '', max_suggestions: 4, priority: 100, active: true,
}

export default function CrossSellPage() {
  const [items, setItems] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<number | null>(null)
  const [form, setForm] = useState<any>(empty)

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/storefront/cross-sell-rules')
      setItems(data?.data ?? data ?? [])
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  function openNew() { setForm(empty); setEditing(null); setShowForm(true) }
  function openEdit(r: Rule) {
    setForm({
      name: r.name, anchor_type: r.anchor_type, anchor_value: r.anchor_value,
      suggest_categories: (r.suggest_categories ?? []).join(', '),
      suggest_product_ids: (r.suggest_product_ids ?? []).join(', '),
      reason_text: r.reason_text ?? '',
      max_suggestions: r.max_suggestions, priority: r.priority, active: r.active,
    })
    setEditing(r.id); setShowForm(true)
  }

  async function save() {
    try {
      const payload = {
        ...form,
        suggest_categories: form.suggest_categories.split(',').map((s: string) => s.trim()).filter(Boolean),
        suggest_product_ids: form.suggest_product_ids.split(',').map((s: string) => parseInt(s.trim())).filter(Boolean),
        max_suggestions: Number(form.max_suggestions) || 4,
        priority: Number(form.priority) || 100,
      }
      if (editing) await api.put(`/admin/storefront/cross-sell-rules/${editing}`, payload)
      else         await api.post('/admin/storefront/cross-sell-rules', payload)
      toast.success('Saved')
      setShowForm(false); load()
    } catch (e: any) { toast.error('Could not save') }
  }
  async function del(id: number) {
    if (!confirm('Delete this rule?')) return
    await api.delete(`/admin/storefront/cross-sell-rules/${id}`); load()
  }

  return (
    <div>
      <Link href="/storefront" className="inline-flex items-center gap-1 mb-3 text-sm text-slate-500 hover:text-indigo-600">
        <ArrowLeft className="h-3.5 w-3.5" /> Storefront
      </Link>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-indigo-600" />
          <h1 className="text-2xl font-semibold text-slate-800">Cross-sell Rules</h1>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
          <Plus className="h-4 w-4" /> New rule
        </button>
      </div>
      <p className="mb-6 text-sm text-slate-600">When a customer adds anchor (category or product) to cart, show suggested products with a friendly reason.</p>

      {showForm && (
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">{editing ? 'Edit rule' : 'New rule'}</h2>
            <button onClick={() => setShowForm(false)}><X className="h-4 w-4" /></button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Rule name" value={form.name} onChange={(v: string) => setForm({ ...form, name: v })} />
            <div>
              <label className="text-xs font-medium text-slate-600">Anchor type</label>
              <select value={form.anchor_type} onChange={(e) => setForm({ ...form, anchor_type: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                <option value="category">Category</option>
                <option value="product">Specific product ID</option>
              </select>
            </div>
            <Field label={form.anchor_type === 'category' ? 'Anchor category (e.g. baju kurung)' : 'Anchor product ID'} value={form.anchor_value} onChange={(v: string) => setForm({ ...form, anchor_value: v })} wide />
            <Field label="Suggested categories (comma-separated, e.g. hijab, brooch, inner)" value={form.suggest_categories} onChange={(v: string) => setForm({ ...form, suggest_categories: v })} wide />
            <Field label="Suggested product IDs (comma-separated, optional)" value={form.suggest_product_ids} onChange={(v: string) => setForm({ ...form, suggest_product_ids: v })} wide />
            <Field label="Reason shown to customer" value={form.reason_text} onChange={(v: string) => setForm({ ...form, reason_text: v })} wide placeholder="Complete the look ✨" />
            <Field label="Max suggestions" type="number" value={form.max_suggestions} onChange={(v: string) => setForm({ ...form, max_suggestions: v })} />
            <Field label="Priority (lower runs first)" type="number" value={form.priority} onChange={(v: string) => setForm({ ...form, priority: v })} />
            <label className="flex items-center gap-2 md:col-span-2">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              <span className="text-sm">Active</span>
            </label>
          </div>
          <div className="mt-5 flex justify-end">
            <button onClick={save} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Save</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {loading ? <div className="text-slate-400">Loading…</div> : items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center text-slate-400">No rules yet. Default rules will be seeded on first deploy.</div>
        ) : items.map((r) => (
          <div key={r.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{r.name}</span>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono">priority {r.priority}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {r.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  <span className="font-medium">When:</span> {r.anchor_type} = <span className="font-mono">{r.anchor_value}</span>
                  &nbsp;·&nbsp;
                  <span className="font-medium">Show:</span> {(r.suggest_categories ?? []).join(', ') || (r.suggest_product_ids ?? []).join(', ')}
                </div>
                {r.reason_text && <div className="mt-1 text-xs text-rose-600">"{r.reason_text}"</div>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(r)} className="text-slate-500 hover:text-indigo-600"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => del(r.id)} className="text-slate-500 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', wide, placeholder }: any) {
  return (
    <div className={wide ? 'md:col-span-2' : ''}>
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
    </div>
  )
}
