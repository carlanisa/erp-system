'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { COUNTRIES, COURIERS } from '@/lib/countries'
import { Plus, Trash2, Pencil, X, Globe, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

type Rate = {
  id?: number
  name: string
  weight_min: number | null
  weight_max: number | null
  flat_rate: number
  free_over: number | null
  enabled: boolean
  sort_order: number
}

type Zone = {
  id: number
  name: string
  code: string
  country_code: string | null
  state_codes: string[] | null
  courier: string | null
  enabled: boolean
  sort_order: number
  rates: Rate[]
  has_courier_config?: boolean
}

const emptyRate: Rate = { name: '', weight_min: 0, weight_max: 0.5, flat_rate: 0, free_over: null, enabled: true, sort_order: 0 }
const emptyZone = {
  name: '', code: '', country_code: 'MY', state_codes: '',
  courier: '', courier_api_key: '', courier_account: '', courier_service: '',
  enabled: true, sort_order: 100,
  rates: [{ ...emptyRate, name: 'Up to 0.5 kg' }] as Rate[],
}

export default function ShippingZonesPage() {
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<number | null>(null)
  const [form, setForm] = useState<any>(emptyZone)

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/storefront/shipping-zones')
      setZones(Array.isArray(data) ? data : data?.data ?? [])
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  function openNew() {
    setForm({ ...emptyZone, rates: [{ ...emptyRate, name: 'Up to 0.5 kg' }] })
    setEditing(null); setShowForm(true)
  }

  async function openEdit(zone: Zone) {
    try {
      const { data } = await api.get(`/admin/storefront/shipping-zones/${zone.id}`)
      setForm({
        name: data.name, code: data.code,
        country_code: data.country_code ?? 'MY',
        state_codes: (data.state_codes ?? []).join(', '),
        courier: data.courier ?? '',
        courier_api_key: data.courier_config?.api_key ?? '',
        courier_account: data.courier_config?.account ?? '',
        courier_service: data.courier_config?.service ?? '',
        enabled: data.enabled,
        sort_order: data.sort_order,
        rates: (data.rates ?? []).length > 0 ? data.rates : [{ ...emptyRate, name: 'Standard' }],
      })
      setEditing(zone.id); setShowForm(true)
    } catch { toast.error('Could not load zone details') }
  }

  function addRate() {
    setForm({ ...form, rates: [...form.rates, { ...emptyRate, name: '', weight_min: null, weight_max: null }] })
  }
  function removeRate(idx: number) {
    setForm({ ...form, rates: form.rates.filter((_: Rate, i: number) => i !== idx) })
  }
  function updateRate(idx: number, field: keyof Rate, value: any) {
    const rates = [...form.rates]
    rates[idx] = { ...rates[idx], [field]: value }
    setForm({ ...form, rates })
  }

  async function save() {
    try {
      const courier_config: any = {}
      if (form.courier_api_key) courier_config.api_key = form.courier_api_key
      if (form.courier_account) courier_config.account = form.courier_account
      if (form.courier_service) courier_config.service = form.courier_service

      const payload: any = {
        name: form.name,
        code: form.code.toUpperCase(),
        country_code: form.country_code || null,
        state_codes: form.state_codes
          ? form.state_codes.split(',').map((s: string) => s.trim()).filter(Boolean)
          : null,
        courier: form.courier || null,
        courier_config: Object.keys(courier_config).length ? courier_config : null,
        enabled: !!form.enabled,
        sort_order: Number(form.sort_order) || 0,
        rates: form.rates.map((r: Rate, i: number) => ({
          name: r.name || `Tier ${i + 1}`,
          flat_rate: Number(r.flat_rate) || 0,
          weight_min: r.weight_min === null || r.weight_min === ('' as any) ? null : Number(r.weight_min),
          weight_max: r.weight_max === null || r.weight_max === ('' as any) ? null : Number(r.weight_max),
          free_over: r.free_over === null || r.free_over === ('' as any) ? null : Number(r.free_over),
          enabled: r.enabled !== false,
          sort_order: i,
        })),
      }
      if (editing) {
        // code is unique-required only on create
        delete payload.code
        await api.put(`/admin/storefront/shipping-zones/${editing}`, payload)
      } else {
        await api.post('/admin/storefront/shipping-zones', payload)
      }
      toast.success('Zone saved')
      setShowForm(false); setEditing(null); load()
    } catch (e: any) {
      toast.error(e?.response?.data?.errors ? Object.values(e.response.data.errors)[0] as string : 'Could not save')
    }
  }

  async function del(id: number) {
    if (!confirm('Delete this shipping zone?')) return
    await api.delete(`/admin/storefront/shipping-zones/${id}`)
    load()
  }

  return (
    <div>
      <Link href="/storefront" className="inline-flex items-center gap-1 mb-3 text-sm text-slate-500 hover:text-indigo-600">
        <ArrowLeft className="h-3.5 w-3.5" /> Storefront
      </Link>
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">Shipping Zones</h1>
        <button onClick={openNew} className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
          <Plus className="h-4 w-4" /> New zone
        </button>
      </div>
      <p className="mb-6 text-sm text-slate-600">
        Configure shipping per country with weight-based tiers. Add a courier + API key for live label generation later.
      </p>

      {showForm && (
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">{editing ? 'Edit zone' : 'New zone'}</h2>
            <button onClick={() => { setShowForm(false); setEditing(null) }}><X className="h-4 w-4" /></button>
          </div>

          {/* Basic */}
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Zone name" value={form.name} onChange={(v: string) => setForm({ ...form, name: v })} />
            <Field label="Code (unique, e.g. SG, US-WEST)" value={form.code} onChange={(v: string) => setForm({ ...form, code: v.toUpperCase() })} disabled={!!editing} />
            <div>
              <label className="text-xs font-medium text-slate-600">Country</label>
              <select value={form.country_code} onChange={(e) => setForm({ ...form, country_code: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
              </select>
            </div>
            <Field label="State codes (optional, comma-separated for MY: MY-10, MY-14)" value={form.state_codes} onChange={(v: string) => setForm({ ...form, state_codes: v })} wide />
            <Field label="Sort order" type="number" value={form.sort_order} onChange={(v: string) => setForm({ ...form, sort_order: v })} />
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
              <span className="text-sm">Enabled</span>
            </label>
          </div>

          {/* Courier */}
          <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Globe className="h-4 w-4" /> Courier integration (optional)
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-slate-600">Courier</label>
                <select value={form.courier} onChange={(e) => setForm({ ...form, courier: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                  {COURIERS.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </div>
              <Field label="API key" value={form.courier_api_key} onChange={(v: string) => setForm({ ...form, courier_api_key: v })} type="password" />
              <Field label="Account / Customer ID" value={form.courier_account} onChange={(v: string) => setForm({ ...form, courier_account: v })} />
              <Field label="Service code (e.g. EXPRESS, STANDARD)" value={form.courier_service} onChange={(v: string) => setForm({ ...form, courier_service: v })} />
            </div>
          </div>

          {/* Weight tiers */}
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Weight tiers / rates</h3>
              <button onClick={addRate} className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800">
                <Plus className="h-3 w-3" /> Add tier
              </button>
            </div>
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Label</th>
                    <th className="px-3 py-2">Min kg</th>
                    <th className="px-3 py-2">Max kg</th>
                    <th className="px-3 py-2">Rate (RM)</th>
                    <th className="px-3 py-2">Free over (RM)</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {form.rates.map((r: Rate, i: number) => (
                    <tr key={i}>
                      <td className="px-3 py-2"><input value={r.name} onChange={(e) => updateRate(i, 'name', e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1 text-sm" placeholder="e.g. Up to 0.5 kg" /></td>
                      <td className="px-3 py-2"><input type="number" step="0.001" value={r.weight_min ?? ''} onChange={(e) => updateRate(i, 'weight_min', e.target.value)} className="w-24 rounded border border-slate-300 px-2 py-1 text-sm" /></td>
                      <td className="px-3 py-2"><input type="number" step="0.001" value={r.weight_max ?? ''} onChange={(e) => updateRate(i, 'weight_max', e.target.value)} className="w-24 rounded border border-slate-300 px-2 py-1 text-sm" /></td>
                      <td className="px-3 py-2"><input type="number" step="0.01" value={r.flat_rate} onChange={(e) => updateRate(i, 'flat_rate', e.target.value)} className="w-28 rounded border border-slate-300 px-2 py-1 text-sm" /></td>
                      <td className="px-3 py-2"><input type="number" step="0.01" value={r.free_over ?? ''} onChange={(e) => updateRate(i, 'free_over', e.target.value)} className="w-28 rounded border border-slate-300 px-2 py-1 text-sm" placeholder="—" /></td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => removeRate(i)} className="text-slate-400 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Tip: Leave Min/Max empty for a flat rate that always applies (used as fallback). Use weights when you charge per-kg brackets.
            </p>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => { setShowForm(false); setEditing(null) }} className="rounded-md border border-slate-300 px-4 py-2 text-sm">Cancel</button>
            <button onClick={save} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
              {editing ? 'Update zone' : 'Create zone'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-slate-400">Loading…</div>
      ) : zones.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center text-slate-400">
          No zones yet. Click <span className="font-medium">New zone</span> to add one.
        </div>
      ) : (
        <div className="space-y-3">
          {zones.map((z) => (
            <div key={z.id} className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold">{z.name}</span>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono">{z.code}</span>
                    {z.country_code && <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">{z.country_code}</span>}
                    {z.courier && <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">{z.courier}{z.has_courier_config ? ' ✓' : ''}</span>}
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${z.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {z.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  {z.state_codes && z.state_codes.length > 0 && (
                    <div className="mt-1 text-xs text-slate-500">States: {z.state_codes.join(', ')}</div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(z)} className="text-slate-500 hover:text-indigo-600"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => del(z.id)} className="text-slate-500 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="mt-3 grid gap-2">
                {z.rates.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
                    <span className="font-medium">{r.name}</span>
                    <span className="text-slate-600">
                      {r.weight_min !== null || r.weight_max !== null ? (
                        <span className="mr-3 text-slate-500">
                          {r.weight_min ?? '0'} – {r.weight_max ?? '∞'} kg
                        </span>
                      ) : null}
                      RM{Number(r.flat_rate).toFixed(2)}
                      {r.free_over != null && <span className="ml-2 text-emerald-600">· Free over RM{Number(r.free_over).toFixed(2)}</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', wide, disabled }: any) {
  return (
    <div className={wide ? 'md:col-span-3' : ''}>
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <input type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} disabled={disabled}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-500" />
    </div>
  )
}
