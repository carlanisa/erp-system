'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { ArrowLeft, Plus, Pencil, Trash2, X, Gift, Search } from 'lucide-react'

type Item = { product_id: number; default_qty: number; role: 'anchor'|'required'|'suggested'; product?: { name: string; sale_price: number; featured_image_url?: string; gallery_urls?: string[] } }
type Bundle = {
  id: number; name: string; slug: string; description: string | null; image_url: string | null
  pricing_type: 'sum_minus_percent'|'fixed_total'|'free_cheapest'
  discount_value: number; active: boolean; sort_order: number
  items: Item[]
}
type Product = { id: number; name: string; sku?: string; sale_price?: number }

const emptyForm: any = {
  name: '', slug: '', description: '', image_url: '',
  pricing_type: 'sum_minus_percent', discount_value: 15,
  min_items: 2, active: true, sort_order: 100,
  items: [] as Item[],
}

export default function BundlesPage() {
  const [items, setItems] = useState<Bundle[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<any>(emptyForm)

  // Product search for the picker
  const [productSearch, setProductSearch] = useState('')
  const [products, setProducts] = useState<Product[]>([])

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/storefront/bundles')
      setItems(data?.data ?? data ?? [])
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      api.get('/inventory/products', { params: { search: productSearch, per_page: 12 } })
        .then(({ data }) => setProducts(data?.data?.data ?? data?.data ?? []))
        .catch(() => setProducts([]))
    }, 200)
    return () => clearTimeout(t)
  }, [productSearch])

  function openNew() { setForm(emptyForm); setEditing(null); setShowForm(true) }
  async function openEdit(b: Bundle) {
    const { data } = await api.get(`/admin/storefront/bundles/${b.id}`)
    setForm({
      name: data.name, slug: data.slug, description: data.description ?? '',
      image_url: data.image_url ?? '',
      pricing_type: data.pricing_type, discount_value: data.discount_value,
      min_items: data.min_items, active: !!data.active, sort_order: data.sort_order,
      items: (data.items ?? []).map((i: any) => ({
        product_id: i.product_id, default_qty: i.default_qty, role: i.role,
        product: i.product ? { name: i.product.name, sale_price: i.product.sale_price } : undefined,
      })),
    })
    setEditing(b.id); setShowForm(true)
  }
  function addItem(p: Product, role: 'anchor'|'required'|'suggested' = 'required') {
    if (form.items.some((i: Item) => i.product_id === p.id)) return
    setForm({ ...form, items: [...form.items, { product_id: p.id, default_qty: 1, role, product: { name: p.name, sale_price: p.sale_price ?? 0 } }] })
  }
  function removeItem(idx: number) {
    setForm({ ...form, items: form.items.filter((_: any, i: number) => i !== idx) })
  }
  function updateItem(idx: number, field: 'default_qty'|'role', v: any) {
    const next = [...form.items]; next[idx] = { ...next[idx], [field]: v }; setForm({ ...form, items: next })
  }

  async function save() {
    try {
      const payload = {
        ...form,
        discount_value: Number(form.discount_value) || 0,
        min_items: Number(form.min_items) || 2,
        sort_order: Number(form.sort_order) || 0,
        items: form.items.map((i: Item) => ({
          product_id: i.product_id, default_qty: i.default_qty, role: i.role,
        })),
      }
      if (editing) await api.put(`/admin/storefront/bundles/${editing}`, payload)
      else         await api.post('/admin/storefront/bundles', payload)
      toast.success('Bundle saved')
      setShowForm(false); setEditing(null); load()
    } catch (e: any) {
      toast.error(e?.response?.data?.errors ? Object.values(e.response.data.errors)[0] as string : 'Could not save')
    }
  }
  async function del(id: number) {
    if (!confirm('Delete this bundle?')) return
    await api.delete(`/admin/storefront/bundles/${id}`)
    load()
  }

  return (
    <div>
      <Link href="/storefront" className="inline-flex items-center gap-1 mb-3 text-sm text-slate-500 hover:text-indigo-600">
        <ArrowLeft className="h-3.5 w-3.5" /> Storefront
      </Link>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-rose-500" />
          <h1 className="text-2xl font-semibold text-slate-800">Bundles</h1>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
          <Plus className="h-4 w-4" /> New bundle
        </button>
      </div>
      <p className="mb-6 text-sm text-slate-600">Pre-set product combos (e.g. Baju Kurung + Hijab + Brooch) with auto-calculated bundle pricing.</p>

      {showForm && (
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">{editing ? 'Edit bundle' : 'New bundle'}</h2>
            <button onClick={() => setShowForm(false)}><X className="h-4 w-4" /></button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Name" value={form.name} onChange={(v: string) => setForm({ ...form, name: v })} />
            <Field label="URL slug (e.g. baju-kurung-and-hijab)" value={form.slug} onChange={(v: string) => setForm({ ...form, slug: v })} />
            <Field label="Image URL (optional)" value={form.image_url} onChange={(v: string) => setForm({ ...form, image_url: v })} wide />
            <Field label="Description (optional)" value={form.description} onChange={(v: string) => setForm({ ...form, description: v })} textarea wide />
            <div>
              <label className="text-xs font-medium text-slate-600">Pricing strategy</label>
              <select value={form.pricing_type} onChange={(e) => setForm({ ...form, pricing_type: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                <option value="sum_minus_percent">Sum minus % discount</option>
                <option value="fixed_total">Fixed bundle price</option>
                <option value="free_cheapest">Cheapest item free</option>
              </select>
            </div>
            <Field label={form.pricing_type === 'sum_minus_percent' ? 'Discount %' : form.pricing_type === 'fixed_total' ? 'Fixed total (RM)' : 'Value (ignored)'} type="number" value={form.discount_value} onChange={(v: string) => setForm({ ...form, discount_value: v })} />
            <Field label="Minimum items" type="number" value={form.min_items} onChange={(v: string) => setForm({ ...form, min_items: v })} />
            <Field label="Sort order" type="number" value={form.sort_order} onChange={(v: string) => setForm({ ...form, sort_order: v })} />
            <label className="flex items-center gap-2 md:col-span-2">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              <span className="text-sm">Active</span>
            </label>
          </div>

          {/* Items picker */}
          <div className="mt-5">
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Items in this bundle</h3>
            <div className="rounded-md border border-slate-200">
              {form.items.length === 0 ? (
                <div className="p-3 text-xs text-slate-400">No items yet — search a product below to add.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500">
                    <tr><th className="px-3 py-2 text-left">Product</th><th>Qty</th><th>Role</th><th></th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {form.items.map((it: Item, i: number) => (
                      <tr key={it.product_id}>
                        <td className="px-3 py-2">{it.product?.name ?? `#${it.product_id}`}</td>
                        <td className="px-3 py-2 text-center">
                          <input type="number" min="1" value={it.default_qty} onChange={(e) => updateItem(i, 'default_qty', Number(e.target.value))}
                            className="w-16 rounded border border-slate-300 px-2 py-1 text-sm" />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <select value={it.role} onChange={(e) => updateItem(i, 'role', e.target.value)}
                            className="rounded border border-slate-300 px-2 py-1 text-xs">
                            <option value="anchor">Anchor</option>
                            <option value="required">Required</option>
                            <option value="suggested">Suggested</option>
                          </select>
                        </td>
                        <td className="px-3 py-2 text-right"><button onClick={() => removeItem(i)} className="text-rose-500"><Trash2 className="h-4 w-4" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="mt-3">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                <input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Search products to add…"
                  className="w-full rounded-md border border-slate-300 pl-8 pr-3 py-2 text-sm" />
              </div>
              {productSearch && products.length > 0 && (
                <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-sm">
                  {products.map((p) => (
                    <button key={p.id} onClick={() => addItem(p)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50">
                      <span>{p.name} <span className="text-xs text-slate-400">({p.sku})</span></span>
                      <span className="text-xs text-rose-600">+ Add</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="rounded-md border border-slate-300 px-4 py-2 text-sm">Cancel</button>
            <button onClick={save} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">{editing ? 'Update' : 'Create'}</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {loading ? <div className="text-slate-400">Loading…</div> : items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center text-slate-400">No bundles yet.</div>
        ) : items.map((b) => (
          <div key={b.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{b.name}</span>
                  <span className="rounded bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">{b.pricing_type}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${b.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {b.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">/{b.slug} · {b.items.length} items</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(b)} className="text-slate-500 hover:text-indigo-600"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => del(b.id)} className="text-slate-500 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', wide, textarea }: any) {
  return (
    <div className={wide ? 'md:col-span-2' : ''}>
      <label className="text-xs font-medium text-slate-600">{label}</label>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      )}
    </div>
  )
}
