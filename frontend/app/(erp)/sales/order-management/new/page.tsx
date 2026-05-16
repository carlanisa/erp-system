'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { ArrowLeft, Plus, Trash2, Loader2 } from 'lucide-react'

type Channel = { code: string; name: string }
type LineRow = { external_sku: string; name_snapshot: string; external_variant_name: string; qty: number; unit_price: number; image_url: string }

export default function NewOrderPage() {
  const router = useRouter()
  const [channels, setChannels] = useState<Channel[]>([])
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({
    channel_code: 'shopee_my',
    external_order_id: '',
    external_order_sn: '',
    buyer_name: '',
    buyer_phone: '',
    currency: 'MYR',
    subtotal: 0,
    shipping_fee: 0,
    total: 0,
    awb_no: '',
    courier: '',
    ship_by_date: '',
    weight_kg: '',
    status: 'paid',
  })
  const [items, setItems] = useState<LineRow[]>([
    { external_sku: '', name_snapshot: '', external_variant_name: '', qty: 1, unit_price: 0, image_url: '' },
  ])

  useEffect(() => {
    api.get('/sales/order-management/channels').then(r => setChannels(r.data.data || []))
  }, [])

  function addLine() {
    setItems([...items, { external_sku: '', name_snapshot: '', external_variant_name: '', qty: 1, unit_price: 0, image_url: '' }])
  }
  function removeLine(i: number) { setItems(items.filter((_, idx) => idx !== i)) }
  function updateLine(i: number, k: keyof LineRow, v: any) {
    const next = [...items]
    ;(next[i] as any)[k] = v
    setItems(next)
  }

  async function save() {
    setBusy(true)
    try {
      await api.post('/sales/order-management/orders', {
        ...form,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : undefined,
        ship_by_date: form.ship_by_date || undefined,
        items: items.map(i => ({
          external_sku: i.external_sku,
          name_snapshot: i.name_snapshot || undefined,
          external_variant_name: i.external_variant_name || undefined,
          image_url: i.image_url || undefined,
          qty: Number(i.qty) || 1,
          unit_price: Number(i.unit_price) || 0,
        })),
      })
      router.push('/sales/order-management')
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to create order')
    } finally { setBusy(false) }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/sales/order-management" className="text-slate-500 hover:text-slate-800">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">New Order (manual)</h1>
          <p className="text-sm text-slate-500 mt-0.5">Seed an order — useful for testing the pack flow or manual entry before APIs are connected.</p>
        </div>
      </div>

      <div className="card grid grid-cols-2 md:grid-cols-3 gap-3">
        <Field label="Channel">
          <select className="input" value={form.channel_code} onChange={e => setForm({ ...form, channel_code: e.target.value })}>
            {channels.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="External Order ID">
          <input className="input" value={form.external_order_id} onChange={e => setForm({ ...form, external_order_id: e.target.value })} placeholder="260509VUWPBSRD" />
        </Field>
        <Field label="Order SN">
          <input className="input" value={form.external_order_sn} onChange={e => setForm({ ...form, external_order_sn: e.target.value })} placeholder="SPXMY062572315385" />
        </Field>
        <Field label="Buyer name">
          <input className="input" value={form.buyer_name} onChange={e => setForm({ ...form, buyer_name: e.target.value })} />
        </Field>
        <Field label="Buyer phone">
          <input className="input" value={form.buyer_phone} onChange={e => setForm({ ...form, buyer_phone: e.target.value })} />
        </Field>
        <Field label="AWB no">
          <input className="input" value={form.awb_no} onChange={e => setForm({ ...form, awb_no: e.target.value })} placeholder="SPXMY..." />
        </Field>
        <Field label="Courier">
          <input className="input" value={form.courier} onChange={e => setForm({ ...form, courier: e.target.value })} placeholder="SPX / J&T / NinjaVan" />
        </Field>
        <Field label="Ship by date">
          <input type="date" className="input" value={form.ship_by_date} onChange={e => setForm({ ...form, ship_by_date: e.target.value })} />
        </Field>
        <Field label="Weight (kg)">
          <input type="number" step="0.001" className="input" value={form.weight_kg} onChange={e => setForm({ ...form, weight_kg: e.target.value })} />
        </Field>
        <Field label="Currency">
          <input className="input" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} />
        </Field>
        <Field label="Subtotal">
          <input type="number" step="0.01" className="input" value={form.subtotal} onChange={e => setForm({ ...form, subtotal: Number(e.target.value) })} />
        </Field>
        <Field label="Shipping fee">
          <input type="number" step="0.01" className="input" value={form.shipping_fee} onChange={e => setForm({ ...form, shipping_fee: Number(e.target.value) })} />
        </Field>
        <Field label="Total">
          <input type="number" step="0.01" className="input" value={form.total} onChange={e => setForm({ ...form, total: Number(e.target.value) })} />
        </Field>
        <Field label="Status">
          <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
            <option value="pending_payment">Pending payment</option>
            <option value="paid">Paid</option>
            <option value="to_ship">To ship</option>
          </select>
        </Field>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-800">Items</h2>
          <button onClick={addLine} className="btn btn-secondary text-xs inline-flex items-center gap-1"><Plus className="w-3 h-3" /> Add item</button>
        </div>
        <table className="w-full text-sm">
          <thead className="text-xs text-slate-600">
            <tr>
              <th className="text-left py-1.5">SKU *</th>
              <th className="text-left py-1.5">Name</th>
              <th className="text-left py-1.5">Variation</th>
              <th className="text-left py-1.5">Image URL</th>
              <th className="text-right py-1.5 w-16">Qty</th>
              <th className="text-right py-1.5 w-24">Unit price</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="py-1.5"><input className="input" value={it.external_sku} onChange={e => updateLine(i, 'external_sku', e.target.value)} placeholder="XS/D1-2" /></td>
                <td className="py-1.5"><input className="input" value={it.name_snapshot} onChange={e => updateLine(i, 'name_snapshot', e.target.value)} placeholder="Carlanisa Liyana 2.0" /></td>
                <td className="py-1.5"><input className="input" value={it.external_variant_name} onChange={e => updateLine(i, 'external_variant_name', e.target.value)} placeholder="Smokey Blue Stripe, XS" /></td>
                <td className="py-1.5"><input className="input" value={it.image_url} onChange={e => updateLine(i, 'image_url', e.target.value)} placeholder="https://..." /></td>
                <td className="py-1.5"><input type="number" className="input text-right" value={it.qty} onChange={e => updateLine(i, 'qty', Number(e.target.value))} /></td>
                <td className="py-1.5"><input type="number" step="0.01" className="input text-right" value={it.unit_price} onChange={e => updateLine(i, 'unit_price', Number(e.target.value))} /></td>
                <td className="py-1.5 text-right"><button onClick={() => removeLine(i)} className="text-rose-500 hover:text-rose-700"><Trash2 className="w-4 h-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <button onClick={save} disabled={busy || !form.external_order_id || items.some(i => !i.external_sku)} className="btn btn-primary inline-flex items-center gap-2">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Save Order
        </button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}
