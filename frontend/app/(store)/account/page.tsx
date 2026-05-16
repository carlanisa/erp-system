'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCustomerAuthStore } from '@/stores/customer-auth-store'

export default function AccountPage() {
  const router = useRouter()
  const customer = useCustomerAuthStore((s) => s.customer)
  const hydrated = useCustomerAuthStore((s) => s.hydrated)
  const hydrate = useCustomerAuthStore((s) => s.hydrate)
  const logout = useCustomerAuthStore((s) => s.logout)

  useEffect(() => { hydrate().catch(() => {}) }, [hydrate])
  useEffect(() => { if (hydrated && !customer) router.push('/account/login') }, [hydrated, customer, router])

  if (!hydrated || !customer) return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-neutral-500">Loading…</div>

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold">My account</h1>
      <p className="mt-2 text-neutral-600">Hi {customer.name} — manage your orders and details below.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Link href="/account/orders" className="rounded-xl border border-neutral-200 p-5 hover:border-rose-500">
          <div className="text-lg font-semibold">My orders</div>
          <div className="mt-1 text-sm text-neutral-500">View past orders and track shipments.</div>
        </Link>
        <Link href="/account/addresses" className="rounded-xl border border-neutral-200 p-5 hover:border-rose-500">
          <div className="text-lg font-semibold">Saved addresses</div>
          <div className="mt-1 text-sm text-neutral-500">Manage your shipping addresses.</div>
        </Link>
        <Link href="/account/wishlist" className="rounded-xl border border-neutral-200 p-5 hover:border-rose-500">
          <div className="text-lg font-semibold">My wishlist</div>
          <div className="mt-1 text-sm text-neutral-500">Items you saved for later.</div>
        </Link>
        <button
          onClick={async () => { await logout(); router.push('/') }}
          className="rounded-xl border border-neutral-200 p-5 text-left hover:border-rose-500"
        >
          <div className="text-lg font-semibold">Sign out</div>
          <div className="mt-1 text-sm text-neutral-500">End your session.</div>
        </button>
      </div>
    </div>
  )
}
