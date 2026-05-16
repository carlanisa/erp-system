'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import {
  ScanLine, Package, CheckCircle2, XCircle, AlertTriangle, ArrowLeft, Loader2,
} from 'lucide-react'
import Link from 'next/link'

type Item = {
  id: number
  external_sku: string
  external_variant_name?: string
  name_snapshot?: string
  image_url?: string
  qty: number
  unit_price: number
  picked_at?: string | null
  scanned_sku?: string
  variant_sku?: string
  product_sku?: string
}
type Order = {
  id: number
  external_order_id: string
  external_order_sn?: string
  channel?: { name: string; color?: string; code: string }
  awb_no?: string
  courier?: string
  status: string
  buyer_name?: string
  ship_by_date?: string
  total: number
  currency: string
  items: Item[]
  all_picked: boolean
}

function beep(ok = true) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.frequency.value = ok ? 880 : 220
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    osc.start()
    osc.stop(ctx.currentTime + (ok ? 0.12 : 0.3))
    setTimeout(() => ctx.close(), 500)
  } catch {}
}

export default function PackStationPage() {
  const params = useSearchParams()
  const router = useRouter()
  const [awb, setAwb] = useState(params.get('awb') || '')
  const [order, setOrder] = useState<Order | null>(null)
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState<{ kind: 'ok' | 'err' | 'warn'; msg: string } | null>(null)
  const [sku, setSku] = useState('')
  const awbInputRef = useRef<HTMLInputElement>(null)
  const skuInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (params.get('awb')) {
      void lookup(params.get('awb')!)
    } else {
      awbInputRef.current?.focus()
    }
  }, [])

  function showFlash(kind: 'ok' | 'err' | 'warn', msg: string) {
    setFlash({ kind, msg })
    beep(kind === 'ok')
    setTimeout(() => setFlash(null), 2500)
  }

  async function lookup(value: string) {
    const awbNo = (value || awb).trim()
    if (!awbNo) return
    setBusy(true)
    try {
      const r = await api.post('/sales/order-management/pick/lookup', { awb_no: awbNo })
      setOrder(r.data.data)
      setAwb(awbNo)
      showFlash('ok', `Order ${r.data.data.external_order_id} loaded`)
      setTimeout(() => skuInputRef.current?.focus(), 100)
    } catch (e: any) {
      setOrder(null)
      showFlash('err', e?.response?.data?.message || 'Order lookup failed')
    } finally { setBusy(false) }
  }

  async function scanSku() {
    if (!order || !sku.trim()) return
    setBusy(true)
    try {
      const r = await api.post('/sales/order-management/pick/scan', { order_id: order.id, sku: sku.trim() })
      setOrder(r.data.data.order)
      setSku('')
      showFlash('ok', 'Match confirmed')
    } catch (e: any) {
      showFlash('err', e?.response?.data?.message || 'SKU does not match')
      setSku('')
    } finally {
      setBusy(false)
      skuInputRef.current?.focus()
    }
  }

  async function confirmPacked() {
    if (!order) return
    setBusy(true)
    try {
      await api.post('/sales/order-management/pick/confirm', { order_id: order.id })
      showFlash('ok', 'Packed & marked shipped')
      setOrder(null)
      setAwb('')
      setTimeout(() => awbInputRef.current?.focus(), 200)
    } catch (e: any) {
      showFlash('err', e?.response?.data?.message || 'Could not confirm')
    } finally { setBusy(false) }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/sales/order-management" className="text-slate-500 hover:text-slate-800">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
          <ScanLine className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800">Pack Station</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Scan the airway bill, then scan each product SKU to verify before packing.
          </p>
        </div>
      </div>

      {flash && (
        <div className={`p-3 rounded-lg border flex items-center gap-2 ${
          flash.kind === 'ok'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : flash.kind === 'warn'
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {flash.kind === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : flash.kind === 'warn' ? <AlertTriangle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          <span className="text-sm font-medium">{flash.msg}</span>
        </div>
      )}

      <div className="card">
        <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">1. Scan Airway Bill</label>
        <div className="mt-2 flex gap-2">
          <input
            ref={awbInputRef}
            value={awb}
            onChange={(e) => setAwb(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && lookup(awb)}
            placeholder="Scan or type AWB number…"
            className="flex-1 px-4 py-3 text-base font-mono border-2 border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            autoComplete="off"
          />
          <button onClick={() => lookup(awb)} disabled={busy || !awb.trim()} className="btn btn-primary">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Look up'}
          </button>
        </div>
      </div>

      {order && (
        <>
          <div className="card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: order.channel?.color || '#64748b' }} />
                  {order.channel?.name}
                </div>
                <div className="text-lg font-bold text-slate-800 mt-1">Order {order.external_order_id}</div>
                {order.external_order_sn && <div className="text-xs text-slate-500">{order.external_order_sn}</div>}
                <div className="text-xs text-slate-600 mt-2">
                  Buyer: <strong>{order.buyer_name || '—'}</strong> · Ship by: <strong>{order.ship_by_date || '—'}</strong>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500">AWB</div>
                <div className="font-mono font-semibold text-slate-800">{order.awb_no || '—'}</div>
                <div className="text-xs text-slate-500 mt-2">Total</div>
                <div className="font-semibold text-slate-800">{order.currency} {Number(order.total).toFixed(2)}</div>
              </div>
            </div>
          </div>

          <div className="card">
            <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">2. Scan each product SKU</label>
            <div className="mt-2 flex gap-2">
              <input
                ref={skuInputRef}
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && scanSku()}
                placeholder="Scan product SKU / barcode on the dress tag…"
                className="flex-1 px-4 py-3 text-base font-mono border-2 border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                autoComplete="off"
                disabled={order.all_picked}
              />
              <button onClick={scanSku} disabled={busy || !sku.trim() || order.all_picked} className="btn btn-secondary">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Scan'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {order.items.map(item => {
              const picked = !!item.picked_at
              return (
                <div key={item.id} className={`card border-2 transition-all ${
                  picked ? 'border-emerald-300 bg-emerald-50/40' : 'border-slate-200'
                }`}>
                  <div className="flex gap-3">
                    <div className="w-24 h-24 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {item.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image_url} alt={item.name_snapshot || ''} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-8 h-8 text-slate-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800 line-clamp-2">
                        {item.name_snapshot || '—'}
                      </div>
                      {item.external_variant_name && (
                        <div className="text-xs text-slate-500 mt-0.5">{item.external_variant_name}</div>
                      )}
                      <div className="mt-1.5 font-mono text-xs text-slate-700">
                        SKU: <strong>{item.external_sku}</strong>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">Qty: {item.qty} · {order.currency} {Number(item.unit_price).toFixed(2)}</div>
                      <div className="mt-2">
                        {picked ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Picked ({item.scanned_sku})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                            <Package className="w-3.5 h-3.5" /> Pending scan
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex justify-end">
            <button
              onClick={confirmPacked}
              disabled={busy || !order.all_picked}
              className={`btn ${order.all_picked ? 'btn-primary' : 'btn-secondary opacity-60'} inline-flex items-center gap-2 px-6 py-3`}
            >
              <CheckCircle2 className="w-4 h-4" />
              {order.all_picked ? 'Confirm Packed & Ship' : `Scan all items first (${order.items.filter(i => !i.picked_at).length} remaining)`}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
