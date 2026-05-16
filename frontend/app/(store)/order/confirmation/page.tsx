'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import { Suspense, useEffect, useState } from 'react'
import { storefrontApi } from '@/lib/storefront-api'
import { PaymentInstructionsCard, type PaymentInstructions } from '@/components/storefront/PaymentInstructions'

function OrderConfirmationContent() {
  const params = useSearchParams()
  const so = params.get('so')
  const [instructions, setInstructions] = useState<PaymentInstructions | null>(null)
  const [driver, setDriver] = useState<string | null>(null)

  useEffect(() => {
    if (!so) return
    storefrontApi.get(`/orders/${encodeURIComponent(so)}/instructions`)
      .then(({ data }) => {
        if (data?.instructions) {
          setInstructions(data.instructions)
          setDriver(data.driver ?? data.payment_method)
        }
      })
      .catch(() => {})
  }, [so])

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <div className="text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
        <h1 className="mt-4 text-3xl font-semibold">Thank you for your order!</h1>
        {so && <p className="mt-2 text-neutral-600">Order reference: <span className="font-mono font-semibold">{so}</span></p>}
      </div>

      {instructions && (
        <div className="mt-8">
          <PaymentInstructionsCard data={instructions} />
        </div>
      )}

      {!instructions && (
        <p className="mt-6 text-center text-neutral-600">
          We&apos;ll contact you shortly to confirm your order. You can also view it from your account.
        </p>
      )}

      <div className="mt-8 flex justify-center gap-3">
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

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">Loading…</div>}>
      <OrderConfirmationContent />
    </Suspense>
  )
}
