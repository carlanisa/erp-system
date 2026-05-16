'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import { Suspense } from 'react'

function OrderConfirmationContent() {
  const params = useSearchParams()
  const so = params.get('so')
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
      <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
      <h1 className="mt-4 text-3xl font-semibold">Thank you for your order!</h1>
      {so && <p className="mt-2 text-neutral-600">Order reference: <span className="font-mono font-semibold">{so}</span></p>}
      <p className="mt-3 text-neutral-600">
        We&apos;ll contact you shortly to confirm your order. You can also view it from your account.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/shop" className="rounded-full bg-rose-500 px-6 py-3 text-sm font-semibold text-white hover:bg-rose-600">
          Continue shopping
        </Link>
        <Link href="/account/orders" className="rounded-full border border-neutral-300 px-6 py-3 text-sm font-semibold text-neutral-800 hover:bg-neutral-100">
          View orders
        </Link>
      </div>
    </div>
  )
}

// Wrap in Suspense because useSearchParams() forces client-side rendering and Next.js
// requires a suspense boundary for it during static prerender.
export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">Loading…</div>}>
      <OrderConfirmationContent />
    </Suspense>
  )
}
