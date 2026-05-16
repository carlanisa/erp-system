'use client'

import { useEffect, useState } from 'react'
import { Sparkles, Copy, X, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { storefrontApi } from '@/lib/storefront-api'
import type { Intervention } from '@/lib/storefront-signals'

type Voucher = NonNullable<Intervention['voucher']>

export function VoucherToast({ voucher, onClose }: { voucher: Voucher; onClose: () => void }) {
  const [remaining, setRemaining] = useState<string>('')
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    if (!voucher.expires_at) return
    const exp = new Date(voucher.expires_at).getTime()
    const tick = () => {
      const ms = exp - Date.now()
      if (ms <= 0) { setRemaining('expired'); onClose(); return }
      const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000)
      setRemaining(`${m}:${String(s).padStart(2, '0')}`)
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [voucher.expires_at, onClose])

  async function copy() {
    try {
      await navigator.clipboard.writeText(voucher.code)
      toast.success('Coupon code copied!')
    } catch {}
  }

  async function applyNow() {
    setApplying(true)
    try {
      const { data } = await storefrontApi.post('/coupons/apply', { code: voucher.code })
      toast.success(data.message || 'Applied!')
      onClose()
      window.dispatchEvent(new CustomEvent('storefront:cart-refresh'))
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Could not apply')
    } finally { setApplying(false) }
  }

  return (
    <div className="pointer-events-auto fixed bottom-24 right-5 z-50 w-[340px] max-w-[calc(100vw-2rem)] rounded-2xl border border-rose-200 bg-white p-4 shadow-2xl animate-in slide-in-from-bottom-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-rose-100">
            <Sparkles className="h-4 w-4 text-rose-500" />
          </span>
          <h4 className="text-sm font-semibold text-neutral-900">{voucher.headline || 'A little something for you'}</h4>
        </div>
        <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700"><X className="h-4 w-4" /></button>
      </div>
      {voucher.subtext && <p className="mt-1 ml-10 text-xs text-neutral-500">{voucher.subtext}</p>}
      <div className="mt-3 ml-10 flex items-center gap-2 rounded-lg border-2 border-dashed border-rose-300 bg-rose-50 px-3 py-2">
        <code className="flex-1 font-mono text-sm font-bold text-rose-700">{voucher.code}</code>
        <button onClick={copy} aria-label="Copy" className="text-rose-500 hover:text-rose-700"><Copy className="h-4 w-4" /></button>
      </div>
      <div className="mt-2 ml-10 flex items-center justify-between gap-2">
        {remaining && (
          <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
            <Clock className="h-3.5 w-3.5" /> Expires in {remaining}
          </span>
        )}
        <button onClick={applyNow} disabled={applying}
          className="ml-auto rounded-full bg-rose-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-600 disabled:opacity-60">
          {applying ? 'Applying…' : 'Apply now'}
        </button>
      </div>
    </div>
  )
}
