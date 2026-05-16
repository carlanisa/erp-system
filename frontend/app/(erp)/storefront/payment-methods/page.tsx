'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { Plus, Pencil, Trash2, X, CreditCard, Banknote, MessageCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

type Method = {
  id: number
  code: string
  driver: string
  label: string
  enabled: boolean
  sort_order: number
  config: Record<string, any> | null
}

const DRIVER_LABELS: Record<string, string> = {
  cod: 'Cash on Delivery',
  bank_transfer: 'Bank Transfer',
  stripe: 'Stripe',
  paypal: 'PayPal',
  billplz: 'Billplz',
  toyyibpay: 'ToyyibPay',
  manual: 'Manual (custom)',
}

export default function PaymentMethodsPage() {
  const [items, setItems] = useState<Method[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Method | null>(null)
  const [creatingManual, setCreatingManual] = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await api.get('/admin/storefront/payment-methods')
    setItems(Array.isArray(data) ? data : data?.data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function toggle(m: Method) {
    await api.put(`/admin/storefront/payment-methods/${m.id}`, { enabled: !m.enabled })
    toast.success(!m.enabled ? `${m.label} enabled` : `${m.label} disabled`)
    load()
  }

  async function del(m: Method) {
    if (!confirm(`Delete "${m.label}"?`)) return
    const { data } = await api.delete(`/admin/storefront/payment-methods/${m.id}`)
    toast.success(data.note || 'Deleted')
    load()
  }

  async function openEdit(m: Method) {
    const { data } = await api.get(`/admin/storefront/payment-methods/${m.id}`)
    setEditing(data)
  }

  return (
    <div>
      <Link href="/storefront" className="inline-flex items-center gap-1 mb-3 text-sm text-slate-500 hover:text-indigo-600">
        <ArrowLeft className="h-3.5 w-3.5" /> Storefront
      </Link>
      <div className="mb-2 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-slate-800">Payment Methods</h1>
        <button onClick={() => setCreatingManual(true)}
          className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 whitespace-nowrap">
          <Plus className="h-4 w-4" /> Add manual method
        </button>
      </div>
      <p className="mb-6 text-sm text-slate-600">
        Built-in methods (Stripe, PayPal, Billplz, ToyyibPay) activate via secret keys. Bank Transfer + Manual methods show instructions to the customer with an optional WhatsApp link.
      </p>

      {loading ? (
        <div className="text-slate-400">Loading…</div>
      ) : (
        <div className="space-y-3">
          {items.map((m) => (
            <div key={m.id} className="flex items-start justify-between rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-start gap-3">
                <DriverIcon driver={m.driver} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{m.label}</span>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono">{m.code}</span>
                    <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">{DRIVER_LABELS[m.driver] ?? m.driver}</span>
                  </div>
                  <ConfigSummary method={m} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openEdit(m)} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100">
                  <Pencil className="inline h-3 w-3 mr-1" /> Configure
                </button>
                <button onClick={() => toggle(m)}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold ${m.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                  {m.enabled ? 'Enabled' : 'Disabled'}
                </button>
                {m.driver === 'manual' && (
                  <button onClick={() => del(m)} className="text-slate-400 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <EditModal method={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />
      )}
      {creatingManual && (
        <CreateManualModal onClose={() => setCreatingManual(false)} onCreated={() => { setCreatingManual(false); load() }} />
      )}
    </div>
  )
}

function DriverIcon({ driver }: { driver: string }) {
  const Cls = ['stripe', 'paypal', 'billplz', 'toyyibpay'].includes(driver) ? CreditCard : Banknote
  return <Cls className="mt-0.5 h-5 w-5 text-slate-500" />
}

function ConfigSummary({ method }: { method: Method }) {
  const c = method.config ?? {}
  const has = (k: string) => !!c[k]
  const driver = method.driver

  if (driver === 'bank_transfer') {
    return (
      <p className="mt-1 text-xs text-slate-500">
        {c.bank_name && <>Bank: <span className="font-medium">{c.bank_name}</span> · </>}
        {c.account_number && <>Acc: <span className="font-mono">{String(c.account_number).replace(/.(?=.{4})/g, '•')}</span> · </>}
        {c.contact_phone && <><MessageCircle className="inline h-3 w-3" /> {c.contact_phone}</>}
        {!c.bank_name && !c.account_number && !c.contact_phone && <span className="italic">Not configured yet</span>}
      </p>
    )
  }
  if (driver === 'stripe')    return <p className="mt-1 text-xs text-slate-500">{has('secret') ? '✓ Secret key set' : '⚠ Set Secret key to activate'}</p>
  if (driver === 'paypal')    return <p className="mt-1 text-xs text-slate-500">{has('client_id') && has('client_secret') ? `✓ ${c.mode ?? 'sandbox'} keys set` : '⚠ Set client_id + client_secret'}</p>
  if (driver === 'billplz')   return <p className="mt-1 text-xs text-slate-500">{has('key') && has('collection_id') ? '✓ Keys + collection set' : '⚠ Set API key + collection_id'}</p>
  if (driver === 'toyyibpay') return <p className="mt-1 text-xs text-slate-500">{has('secret') && has('category') ? '✓ Secret + category set' : '⚠ Set secret + categoryCode'}</p>
  if (driver === 'manual') {
    return (
      <p className="mt-1 text-xs text-slate-500">
        {c.account_number && <>Acc: <span className="font-mono">{String(c.account_number).replace(/.(?=.{4})/g, '•')}</span> · </>}
        {c.contact_phone && <><MessageCircle className="inline h-3 w-3" /> {c.contact_phone}</>}
      </p>
    )
  }
  return <p className="mt-1 text-xs text-slate-500">No configuration needed.</p>
}

function EditModal({ method, onClose, onSaved }: { method: Method; onClose: () => void; onSaved: () => void }) {
  const [label, setLabel] = useState(method.label)
  const [config, setConfig] = useState<Record<string, any>>(method.config ?? {})
  const [saving, setSaving] = useState(false)

  function set(k: string, v: any) { setConfig({ ...config, [k]: v }) }

  async function save() {
    setSaving(true)
    try {
      await api.put(`/admin/storefront/payment-methods/${method.id}`, { label, config })
      toast.success('Saved')
      onSaved()
    } catch { toast.error('Could not save') } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="font-semibold">Configure {method.label}</h2>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-4 p-5">
          <Field label="Display label" value={label} onChange={setLabel} />

          {method.driver === 'bank_transfer' && (
            <>
              <Section title="Bank details" />
              <Field label="Bank name" value={config.bank_name ?? ''} onChange={(v) => set('bank_name', v)} placeholder="Maybank" />
              <Field label="Account name" value={config.account_name ?? ''} onChange={(v) => set('account_name', v)} />
              <Field label="Account number" value={config.account_number ?? ''} onChange={(v) => set('account_number', v)} />
              <Section title="Customer support (for receipt confirmation)" />
              <Field label="Contact email" value={config.contact_email ?? ''} onChange={(v) => set('contact_email', v)} placeholder="payments@modestwear.com" />
              <Field label="WhatsApp phone (with country code)" value={config.contact_phone ?? ''} onChange={(v) => set('contact_phone', v)} placeholder="+60123456789" />
              <Field label="Custom notice (shown to customer)" value={config.notice ?? ''} onChange={(v) => set('notice', v)} textarea
                placeholder="Leave blank for the default 'send receipt via WhatsApp...' message." />
            </>
          )}

          {method.driver === 'stripe' && (
            <>
              <Section title="Stripe API keys" />
              <Field label="Secret key (sk_live_... or sk_test_...)" value={config.secret ?? ''} onChange={(v) => set('secret', v)} type="password" />
              <Field label="Webhook signing secret (whsec_...)" value={config.webhook ?? ''} onChange={(v) => set('webhook', v)} type="password" />
              <p className="text-xs text-slate-500">Webhook URL: <code className="rounded bg-slate-100 px-1.5 py-0.5">/api/storefront/webhooks/stripe</code></p>
            </>
          )}

          {method.driver === 'paypal' && (
            <>
              <Section title="PayPal API credentials" />
              <div>
                <label className="text-xs font-medium text-slate-600">Mode</label>
                <select value={config.mode ?? 'sandbox'} onChange={(e) => set('mode', e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                  <option value="sandbox">Sandbox (testing)</option>
                  <option value="live">Live (production)</option>
                </select>
              </div>
              <Field label="Client ID" value={config.client_id ?? ''} onChange={(v) => set('client_id', v)} />
              <Field label="Client secret" value={config.client_secret ?? ''} onChange={(v) => set('client_secret', v)} type="password" />
            </>
          )}

          {method.driver === 'billplz' && (
            <>
              <Section title="Billplz API" />
              <Field label="API key (v3-...)" value={config.key ?? ''} onChange={(v) => set('key', v)} type="password" />
              <Field label="Collection ID" value={config.collection_id ?? ''} onChange={(v) => set('collection_id', v)} />
              <Field label="X-Signature (optional)" value={config.x_signature ?? ''} onChange={(v) => set('x_signature', v)} type="password" />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!config.sandbox} onChange={(e) => set('sandbox', e.target.checked)} /> Sandbox mode
              </label>
              <p className="text-xs text-slate-500">Webhook URL: <code className="rounded bg-slate-100 px-1.5 py-0.5">/api/storefront/webhooks/billplz</code></p>
            </>
          )}

          {method.driver === 'toyyibpay' && (
            <>
              <Section title="ToyyibPay API" />
              <Field label="User secret key" value={config.secret ?? ''} onChange={(v) => set('secret', v)} type="password" />
              <Field label="Category code" value={config.category ?? ''} onChange={(v) => set('category', v)} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!config.sandbox} onChange={(e) => set('sandbox', e.target.checked)} /> Sandbox mode
              </label>
              <p className="text-xs text-slate-500">Webhook URL: <code className="rounded bg-slate-100 px-1.5 py-0.5">/api/storefront/webhooks/toyyibpay</code></p>
            </>
          )}

          {method.driver === 'manual' && (
            <ManualFields config={config} set={set} />
          )}

          {method.driver === 'cod' && (
            <p className="text-sm text-slate-500">No configuration needed for Cash on Delivery.</p>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm">Cancel</button>
          <button onClick={save} disabled={saving} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ManualFields({ config, set }: { config: Record<string, any>; set: (k: string, v: any) => void }) {
  return (
    <>
      <Section title="Payment details shown to customer" />
      <Field label="Account name" value={config.account_name ?? ''} onChange={(v) => set('account_name', v)} placeholder="e.g. TNG eWallet number" />
      <Field label="Account number / ID" value={config.account_number ?? ''} onChange={(v) => set('account_number', v)} />
      <Field label="QR image URL (optional)" value={config.qr_image_url ?? ''} onChange={(v) => set('qr_image_url', v)} placeholder="https://..." />
      <Section title="Contact info for receipt" />
      <Field label="Contact email" value={config.contact_email ?? ''} onChange={(v) => set('contact_email', v)} />
      <Field label="WhatsApp phone (with country code)" value={config.contact_phone ?? ''} onChange={(v) => set('contact_phone', v)} placeholder="+60123456789" />
      <Field label="Custom notice / instructions" value={config.notice ?? ''} onChange={(v) => set('notice', v)} textarea />
    </>
  )
}

function CreateManualModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [label, setLabel] = useState('')
  const [code, setCode] = useState('')
  const [config, setConfig] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)

  function set(k: string, v: any) { setConfig({ ...config, [k]: v }) }

  async function save() {
    if (!label || !code) { toast.error('Label and code are required.'); return }
    setSaving(true)
    try {
      await api.post('/admin/storefront/payment-methods', {
        code: code.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
        driver: 'manual',
        label,
        enabled: true,
        config,
      })
      toast.success('Method created')
      onCreated()
    } catch (e: any) {
      toast.error(e?.response?.data?.errors ? Object.values(e.response.data.errors)[0] as string : 'Could not create')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="font-semibold">Add manual payment method</h2>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-4 p-5">
          <Field label="Display name (shown to customer)" value={label} onChange={setLabel} placeholder="e.g. Touch n Go eWallet" />
          <Field label="Code (a-z, 0-9, underscores)" value={code} onChange={(v) => setCode(v.toLowerCase().replace(/[^a-z0-9_]/g, '_'))} placeholder="tng_ewallet" />
          <ManualFields config={config} set={set} />
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm">Cancel</button>
          <button onClick={save} disabled={saving} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
            {saving ? 'Creating…' : 'Create method'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Section({ title }: { title: string }) {
  return <h3 className="border-t border-slate-200 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
}

function Field({ label, value, onChange, type = 'text', placeholder, textarea }: any) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600">{label}</label>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={2}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      )}
    </div>
  )
}
