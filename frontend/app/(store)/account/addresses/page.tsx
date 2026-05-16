'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { storefrontApi } from '@/lib/storefront-api'
import { MY_STATES } from '@/lib/my-states'
import { useCustomerAuthStore } from '@/stores/customer-auth-store'
import { Trash2, Plus } from 'lucide-react'

type Address = {
  id: number; label: string | null; name: string; phone: string;
  line1: string; line2: string | null; city: string; state_code: string;
  postcode: string; country: string;
  is_default_shipping: boolean; is_default_billing: boolean;
}

const empty = { label: '', name: '', phone: '', line1: '', line2: '', city: '', state_code: 'MY-10', postcode: '', country: 'MY', is_default_shipping: false }

export default function AddressesPage() {
  const router = useRouter()
  const customer = useCustomerAuthStore((s) => s.customer)
  const hydrated = useCustomerAuthStore((s) => s.hydrated)
  const hydrate = useCustomerAuthStore((s) => s.hydrate)
  const [items, setItems] = useState<Address[]>([])
  const [form, setForm] = useState<any>(empty)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => { hydrate().catch(() => {}) }, [hydrate])
  useEffect(() => { if (hydrated && !customer) router.push('/account/login') }, [hydrated, customer, router])

  async function load() {
    const { data } = await storefrontApi.get('/addresses')
    setItems(data ?? [])
  }
  useEffect(() => { if (customer) load() }, [customer])

  async function save() {
    try {
      await storefrontApi.post('/addresses', form)
      toast.success('Address saved')
      setForm(empty); setShowForm(false); load()
    } catch { toast.error('Could not save address') }
  }
  async function del(id: number) {
    await storefrontApi.delete(`/addresses/${id}`); load()
  }

  if (!customer) return null

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Saved addresses</h1>
        <button onClick={() => setShowForm((s) => !s)} className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600">
          <Plus className="h-4 w-4" /> Add address
        </button>
      </div>

      {showForm && (
        <div className="mb-8 rounded-xl border border-neutral-200 p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Label (Home / Office)" value={form.label} onChange={(v: string) => setForm({ ...form, label: v })} />
            <Field label="Full name" value={form.name} onChange={(v: string) => setForm({ ...form, name: v })} />
            <Field label="Phone" value={form.phone} onChange={(v: string) => setForm({ ...form, phone: v })} />
            <Field label="Postcode" value={form.postcode} onChange={(v: string) => setForm({ ...form, postcode: v })} />
            <Field label="Line 1" value={form.line1} onChange={(v: string) => setForm({ ...form, line1: v })} wide />
            <Field label="Line 2" value={form.line2} onChange={(v: string) => setForm({ ...form, line2: v })} wide />
            <Field label="City" value={form.city} onChange={(v: string) => setForm({ ...form, city: v })} />
            <div>
              <label className="text-xs font-medium text-neutral-700">State</label>
              <select value={form.state_code} onChange={(e) => setForm({ ...form, state_code: e.target.value })}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
                {MY_STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 md:col-span-2">
              <input type="checkbox" checked={form.is_default_shipping} onChange={(e) => setForm({ ...form, is_default_shipping: e.target.checked })} />
              <span className="text-sm">Set as default shipping address</span>
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => { setShowForm(false); setForm(empty) }} className="rounded-md border border-neutral-300 px-4 py-2 text-sm">Cancel</button>
            <button onClick={save} className="rounded-md bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600">Save</button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 p-12 text-center text-neutral-500">
          No saved addresses yet.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <div key={a.id} className="flex items-start justify-between rounded-xl border border-neutral-200 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{a.name}</span>
                  {a.label && <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs">{a.label}</span>}
                  {a.is_default_shipping && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">Default</span>}
                </div>
                <div className="mt-1 text-sm text-neutral-600">{a.phone}</div>
                <div className="mt-1 text-sm text-neutral-700">
                  {a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.postcode} ({a.state_code})
                </div>
              </div>
              <button onClick={() => del(a.id)} className="text-neutral-400 hover:text-rose-500" aria-label="Delete">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Field({ label, value, onChange, wide }: any) {
  return (
    <div className={wide ? 'md:col-span-2' : ''}>
      <label className="text-xs font-medium text-neutral-700">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none" />
    </div>
  )
}
