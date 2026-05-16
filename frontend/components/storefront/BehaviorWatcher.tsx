'use client'

import { useEffect, useRef, useState } from 'react'
import { sendSignal, type Intervention } from '@/lib/storefront-signals'
import { VoucherToast } from './VoucherToast'

/**
 * Watches the page for behavioral signals and forwards them to the backend.
 *  - First add-to-cart (welcome voucher)
 *  - Idle in cart > 90s
 *  - Exit intent (cursor leaves viewport top)
 *  - Threshold-near (subtotal close to free-shipping bar)
 *
 * When the backend returns a voucher offer, render a sticky VoucherToast.
 */
export function BehaviorWatcher() {
  const [voucher, setVoucher] = useState<Intervention['voucher']>(null)
  const idleRef = useRef<number | null>(null)
  const triggeredRef = useRef<Record<string, boolean>>({})

  function fire(event: string, payload: any = {}) {
    if (triggeredRef.current[event]) return
    triggeredRef.current[event] = true
    sendSignal(event, payload).then((r) => {
      if (r?.voucher) setVoucher(r.voucher)
    })
  }

  useEffect(() => {
    // Exit-intent: cursor leaves through top edge of viewport
    function onMouseOut(e: MouseEvent) {
      if (e.clientY <= 5 && !e.relatedTarget) fire('exit_intent', {})
    }
    document.addEventListener('mouseout', onMouseOut)

    // Idle timer: only meaningful on /cart and /checkout
    function resetIdle() {
      if (idleRef.current) window.clearTimeout(idleRef.current)
      const path = window.location.pathname
      if (path.startsWith('/cart') || path.startsWith('/checkout')) {
        idleRef.current = window.setTimeout(() => fire('idle', { path }), 90_000)
      }
    }
    const idleEvents: (keyof DocumentEventMap)[] = ['mousemove', 'click', 'keydown', 'scroll']
    idleEvents.forEach((e) => document.addEventListener(e, resetIdle))
    resetIdle()

    // Cart events from the store
    function onAdd(e: any) {
      const isFirst = e?.detail?.firstInSession
      if (isFirst) fire('add_to_cart_first', {})
    }
    function onSubtotal(e: any) {
      const subtotal = Number(e?.detail?.subtotal ?? 0)
      // RM150 = WM free-shipping bar; nudge when within RM50
      if (subtotal >= 100 && subtotal < 150) fire('threshold_near', { subtotal })
    }
    window.addEventListener('storefront:item-added', onAdd)
    window.addEventListener('storefront:cart-subtotal', onSubtotal)

    return () => {
      document.removeEventListener('mouseout', onMouseOut)
      idleEvents.forEach((e) => document.removeEventListener(e, resetIdle))
      window.removeEventListener('storefront:item-added', onAdd)
      window.removeEventListener('storefront:cart-subtotal', onSubtotal)
      if (idleRef.current) window.clearTimeout(idleRef.current)
    }
  }, [])

  if (!voucher) return null
  return <VoucherToast voucher={voucher} onClose={() => setVoucher(null)} />
}
