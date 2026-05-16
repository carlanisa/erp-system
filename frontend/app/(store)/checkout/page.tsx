'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { storefrontApi, formatMYR } from '@/lib/storefront-api'
import { MY_STATES } from '@/lib/my-states'
import { useCartStore } from '@/stores/cart-store'
import { useCustomerAuthStore } from '@/stores/customer-auth-store'

type ShippingQuote = { amount: number; zone_name: string | null; rate_name: string | null; free_applied: boolean }

export default function CheckoutPage() {
  const router = useRouter()
  const cart = useCartStore((s) => s.cart)
  const refresh = useCartStore((s) => s.refresh)
  const customer = useCustomerAuthStore((s) => s.customer)
  const hydrate = useCustomerAuthStore((s) => s.hydrate)

  const [form, setForm] = useState({
    name: '', phone: '', line1: '', line2: '', city: '', state_code: 'MY-10', postcode: '',
    guest_email: '', guest_password: '',
  })
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'bank_transfer'>('cod')
  const [shipping, setShipping] = useState<ShippingQuote | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { refresh().catch(() => {}); hydrate().catch(() => {}) }, [refresh, hydrate])
  useEffect(() => {
    if (!form.state_code) return
    storefrontApi.post('/shipping/quote', { state_code: form.state_code })
      .then(({ data }) => setShipping(data))
      .catch(() => setShipping(null))
  }, [form.state_code, cart.subtotal])

  useEffect(() => {
    if (customer) setForm((f) => ({ ...f, name: f.name || customer.name, guest_email: customer.email }))
  }, [customer])

  const total = cart.subtotal + (shipping?.amount ?? 0)

  async function submit() {
    if (cart.items.length === 0) { toast.error('Your cart is empty.'); return }
    setSubmitting(true)
    try {
      const payload: any = {
        shipping_address: {
          name: form.name, phone: form.phone,
          line1: form.line1, line2: form.line2 || undefined,
          city: form.city, state_code: form.state_code, postcode: form.postcode,
          country: 'MY',
        },
        payment_method: paymentMethod,
      }
      if (!customer) {
        if (!form.guest_email || !form.guest_password) {
          toast.error('Please provide an email & password to create your account.')
          setSubmitting(false); return
        }
        payload.guest_email = form.guest_email
        payload.guest_password = form.guest_password
        payload.guest_name = form.name
      }
      const { data } = await storefrontApi.post('/checkout', payload)
      toast.success('Order placed!')
      router.push(`/order/confirmation?so=${encodeURIComponent(data.so_number)}`)
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Could not place order.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-3xl font-semibold">Checkout</h1>
      <div className="grid gap-8 lg:grid-cols-[1fr,400px]">
        <div className="space-y-8">
          {/* Contact */}
          {!customer && (
            <section className="rounded-xl border border-neutral-200 p-5">
              <h2 className="mb-3 text-lg font-semibold">Contact &amp; account</h2>
              <p className="mb-3 text-xs text-neutral-500">We&apos;ll create an account so you can track your order.</p>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Email" value={form.guest_email} onChange={(v) => setForm({ ...form, guest_email: v })} type="email" />
                <Field label="Password (min 8)" value={form.guest_password} onChange={(v) => setForm({ ...form, guest_password: v })} type="password" />
              </div>
            </section>
          )}

          {/* Shipping */}
          <section className="rounded-xl border border-neutral-200 p-5">
            <h2 className="mb-3 text-lg font-semibold">Shipping address</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Full name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              <Field label="Address line 1" value={form.line1} onChange={(v) => setForm({ ...form, line1: v })} wide />
              <Field label="Address line 2 (optional)" value={form.line2} onChange={(v) => setForm({ ...form, line2: v })} wide />
              <Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
              <Field label="Postcode" value={form.postcode} onChange={(v) => setForm({ ...form, postcode: v })} />
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-neutral-700">State</label>
                <select
                  value={form.state_code}
                  onChange={(e) => setForm({ ...form, state_code: e.target.value })}
                  className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none"
                >
                  {MY_STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* Payment */}
          <section className="rounded-xl border border-neutral-200 p-5">
            <h2 className="mb-3 text-lg font-semibold">Payment</h2>
            <div className="space-y-2">
              <PaymentOption label="Cash on Delivery (COD)" sub="Pay when you receive your order" checked={paymentMethod === 'cod'} onSelect={() => setPaymentMethod('cod')} />
              <PaymentOption label="Bank Transfer" sub="We'll email you bank details after placing the order" checked={paymentMethod === 'bank_transfer'} onSelect={() => setPaymentMethod('bank_transfer')} />
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-500">
                Card payments (Stripe / PayPal / Billplz / ToyyibPay) coming soon.
              </div>
            </div>
          </section>
        </div>

        {/* Summary */}
        <aside className="h-fit rounded-xl border border-neutral-200 p-5">
          <h2 className="text-lg font-semibold">Order summary</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {cart.items.map((i) => (
              <li key={i.id} className="flex justify-between">
                <span className="line-clamp-1">{i.name} × {i.qty}</span>
                <span>{formatMYR(i.line_total)}</span>
              </li>
            ))}
          </ul>
          <div className="my-3 border-t" />
          <Row label="Subtotal" value={formatMYR(cart.subtotal)} />
          <Row
            label={shipping ? `Shipping (${shipping.zone_name ?? '—'})` : 'Shipping'}
            value={shipping ? (shipping.free_applied ? 'Free' : formatMYR(shipping.amount)) : '—'}
          />
          <div className="my-3 border-t" />
          <Row label="Total" value={formatMYR(total)} bold />
          <button
            onClick={submit}
            disabled={submitting}
            className="mt-5 block w-full rounded-full bg-rose-500 px-6 py-3 text-center text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-60"
          >
            {submitting ? 'Placing order…' : 'Place order'}
          </button>
        </aside>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', wide }: any) {
  return (
    <div className={wide ? 'md:col-span-2' : ''}>
      <label className="text-xs font-medium text-neutral-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none"
      />
    </div>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${bold ? 'text-base font-semibold' : ''}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

function PaymentOption({ label, sub, checked, onSelect }: any) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left ${checked ? 'border-rose-500 bg-rose-50' : 'border-neutral-300 hover:border-neutral-400'}`}
    >
      <span className={`mt-0.5 inline-block h-4 w-4 rounded-full border-2 ${checked ? 'border-rose-500 bg-rose-500' : 'border-neutral-400'}`} />
      <span>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-neutral-500">{sub}</div>
      </span>
    </button>
  )
}
