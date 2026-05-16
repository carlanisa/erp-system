'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { ArrowLeft, Plus, Pencil, Trash2, X, Sparkles } from 'lucide-react'

type Rule = {
  id: number; name: string
  trigger: 'threshold_near'|'idle_in_cart'|'exit_intent'|'add_to_cart_first'|'ai_concierge'
  voucher_type: 'free_shipping'|'percent'|'fixed'
  value: number; min_subtotal: number; valid_minutes: number
  max_per_session: number; idle_seconds: number|null; threshold_min: number|null
  headline: string|null; subtext: string|null; active: boolean; priority: number
}
type Offer = { id: number; code: string; voucher_type: string; value: number; trigger: string|null; session_token: string; expires_at: string; used_at: string|null; created_at: string }

const TRIGGER_LABEL: Record<string, string> = {
  threshold_near: 'When near free-shipping threshold',
  idle_in_cart: 'When idle in cart',
  exit_intent: 'On exit intent (mouse leaves)',
  add_to_cart_first: 'On first add to cart',
  ai_concierge: 'AI concierge can grant',
}

const empty: any = {
  name: '', trigger: 'exit_intent', voucher_type: 'percent',
  value: 10, min_subtotal: 0, valid_minutes: 15, max_per_session: 1,
  idle_seconds: 90, threshold_min: 100,
  headline: '', subtext: '', active: true, priority: 100,
}

export default function VouchersPage() {
  const [tab, setTab] = useState<'rules' | 'offers'>('rules')
  const [rules, setRules] = useState<Rule[]>([])
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<number|null>(null)
  const [form, setForm] = useState<any>(empty)

  async function load() {
    setLoading(true)
    try {
      if (tab === 'rules') {
        const { data } = await api.get('/admin/storefront/voucher-rules')
        setRules(Array.isArray(data) ? data : data?.data ?? [])
      } else {
        const { data } = await api.get('/admin/storefront/voucher-offers')
        setOffers(Array.isArray(data) ? data : data?.data ?? [])
      }
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [tab])

  function openNew() { setForm(empty); setEditing(null); setShowForm(true) }
  function openEdit(r: Rule) { setForm({ ...r }); setEditing(r.id); setShowForm(true) }

  async function save() {
    try {
      const payload = { ...form,
        value: Number(form.value) || 0,
        min_subtotal: Number(form.min_subtotal) || 0,
        valid_minutes: Number(form.valid_minutes) || 15,
        max_per_session: Number(form.max_per_session) || 1,
        idle_seconds: form.idle_seconds ? Number(form.idle_seconds) : null,
        threshold_min: form.threshold_min ? Number(form.threshold_min) : null,
      }
      if (editing) await api.put(`/admin/storefront/voucher-rules/${editing}`, payload)
      else         await api.post('/admin/storefront/voucher-rules', payload)
      toast.success('Saved')
      setShowForm(false); load()
    } catch { toast.error('Could not save') }
  }
  async function del(id: number) {
    if (!confirm('Delete this rule?')) return
    await api.delete(`/admin/storefront/voucher-rules/${id}`); load()
  }

  return (
    <div>
      <Link href="/storefront" className="inline-flex items-center gap-1 mb-3 text-sm text-slate-500 hover:text-indigo-600">
        <ArrowLeft className="h-3.5 w-3.5" /> Storefront
      </Link>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-rose-500" />
          <h1 className="text-2xl font-semibold text-slate-800">Smart Vouchers</h1>
        </div>
        {tab === 'rules' && (
          <button onClick={openNew} className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
            <Plus className="h-4 w-4" /> New rule
          </button>
        )}
      </div>
      <p className="mb-6 text-sm text-slate-600">Behaviorally-triggered offers — e.g. free shipping on first add, RM10 off on exit intent, 5% off after idle in cart.</p>

      <div className="mb-4 flex gap-2">
        <button onClick={() => setTab('rules')} className={`rounded-full px-4 py-1.5 text-sm ${tab === 'rules' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Rules</button>
        <button onClick={() => setTab('offers')} className={`rounded-full px-4 py-1.5 text-sm ${tab === 'offers' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Issued offers</button>
      </div>

      {showForm && tab === 'rules' && (
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">{editing ? 'Edit rule' : 'New rule'}</h2>
            <button onClick={() => setShowForm(false)}><X className="h-4 w-4" /></button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Rule name" value={form.name} onChange={(v: string) => setForm({ ...form, name: v })} />
            <div>
              <label className="text-xs font-medium text-slate-600">Trigger</label>
              <select value={form.trigger} onChange={(e) => setForm({ ...form, trigger: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                {Object.entries(TRIGGER_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Voucher type</label>
              <select value={form.voucher_type} onChange={(e) => setForm({ ...form, voucher_type: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                <option value="free_shipping">Free shipping</option>
                <option value="percent">Percent off</option>
                <option value="fixed">Fixed RM off</option>
              </select>
            </div>
            <Field label={form.voucher_type === 'percent' ? 'Percent (e.g. 10)' : form.voucher_type === 'fixed' ? 'Amount RM' : 'Value (ignored)'} type="number" value={form.value} onChange={(v: string) => setForm({ ...form, value: v })} />
            <Field label="Min subtotal (RM)" type="number" value={form.min_subtotal} onChange={(v: string) => setForm({ ...form, min_subtotal: v })} />
            <Field label="Valid minutes" type="number" value={form.valid_minutes} onChange={(v: string) => setForm({ ...form, valid_minutes: v })} />
            <Field label="Max per session" type="number" value={form.max_per_session} onChange={(v: string) => setForm({ ...form, max_per_session: v })} />
            {form.trigger === 'idle_in_cart' && <Field label="Idle seconds" type="number" value={form.idle_seconds ?? ''} onChange={(v: string) => setForm({ ...form, idle_seconds: v })} />}
            {form.trigger === 'threshold_near' && <Field label="Threshold min subtotal (RM)" type="number" value={form.threshold_min ?? ''} onChange={(v: string) => setForm({ ...form, threshold_min: v })} />}
            <Field label="Headline shown to customer" value={form.headline ?? ''} onChange={(v: string) => setForm({ ...form, headline: v })} wide />
            <Field label="Subtext" value={form.subtext ?? ''} onChange={(v: string) => setForm({ ...form, subtext: v })} wide />
            <Field label="Priority" type="number" value={form.priority} onChange={(v: string) => setForm({ ...form, priority: v })} />
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

      {tab === 'rules' && (
        <div className="space-y-3">
          {loading ? <div className="text-slate-400">Loading…</div> : rules.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center text-slate-400">No rules yet — defaults are seeded on deploy.</div>
          ) : rules.map((r) => (
            <div key={r.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{r.name}</span>
                    <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">{TRIGGER_LABEL[r.trigger]}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {r.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Reward: <span className="font-medium">{r.voucher_type === 'percent' ? `${r.value}% off` : r.voucher_type === 'fixed' ? `RM${r.value} off` : 'Free shipping'}</span>
                    {r.min_subtotal > 0 && <> · min RM{r.min_subtotal}</>} · valid {r.valid_minutes} min
                  </div>
                  {r.headline && <div className="mt-1 text-xs text-rose-600">"{r.headline}"</div>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(r)} className="text-slate-500 hover:text-indigo-600"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => del(r.id)} className="text-slate-500 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'offers' && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr><th className="px-4 py-2 text-left">Code</th><th>Reward</th><th>Trigger</th><th>Session</th><th>Issued</th><th>Status</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {offers.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No offers issued yet.</td></tr>
              ) : offers.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-2 font-mono text-xs font-semibold">{o.code}</td>
                  <td className="px-4 py-2 text-xs">{o.voucher_type === 'percent' ? `${o.value}%` : o.voucher_type === 'fixed' ? `RM${o.value}` : 'Free ship'}</td>
                  <td className="px-4 py-2 text-xs">{o.trigger}</td>
                  <td className="px-4 py-2 text-xs font-mono text-slate-500">{o.session_token.slice(0, 10)}…</td>
                  <td className="px-4 py-2 text-xs">{new Date(o.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2 text-xs">{o.used_at ? <span className="text-emerald-600 font-medium">Used</span> : (new Date(o.expires_at) < new Date() ? <span className="text-slate-400">Expired</span> : <span className="text-amber-600">Live</span>)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', wide }: any) {
  return (
    <div className={wide ? 'md:col-span-2' : ''}>
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <input type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
    </div>
  )
}
