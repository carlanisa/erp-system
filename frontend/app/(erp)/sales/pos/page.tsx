'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, Plus, Minus, Trash2, X, ScanLine, User, ArrowLeft,
  CreditCard, Banknote, Building2, Printer, Check, AlertCircle,
} from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/lib/auth-store'

// ───────────────────── Types ─────────────────────
type LocationMap = Record<string, number>   // { HQ: 5, SHAHALAM: 5, KL: 0, BANGI: 0 }
type Branch      = { id: number; code: string; name: string }

type Variant = {
  id: number; sku: string; barcode?: string | null
  color?: string | null; size?: string | null; label: string
  sale_price: number; stock: number
  locations: LocationMap
}
type Product = {
  id: number; sku: string; barcode?: string | null
  name: string; category?: string | null; image_url?: string | null
  sale_price: number; tax_rate: number; stock: number; uom: string
  has_variants: boolean; variants: Variant[]
  locations: LocationMap
}
type CartLine = {
  key: string                     // unique row key
  item_code: string
  description: string
  color?: string; size?: string
  qty: number
  unit_price: number
  discount: number                // absolute amount
  tax_rate: number
}

const ALL = '__ALL__'

// ───────────────────── Page ─────────────────────
export default function PosPage() {
  const router = useRouter()
  const { user } = useAuthStore()

  const [products, setProducts]     = useState<Product[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [branches, setBranches]     = useState<Branch[]>([])
  const [activeCat, setActiveCat]   = useState<string>(ALL)
  const [search, setSearch]         = useState('')
  const [cart, setCart]             = useState<CartLine[]>([])
  const [walkInName, setWalkInName] = useState('Walk-in Customer')
  const [discountTotal, setDiscountTotal] = useState(0)

  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  // Modal state
  const [variantPickerProduct, setVariantPickerProduct] = useState<Product | null>(null)
  const [showPayment, setShowPayment] = useState(false)
  const [receipt, setReceipt]         = useState<any | null>(null)
  const [posting, setPosting]         = useState(false)

  const [now, setNow] = useState(new Date())
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t) }, [])

  // Fetch product catalogue once on mount
  useEffect(() => {
    api.get('/sales/pos/products').then(r => {
      setProducts(r.data.data?.products ?? [])
      setCategories(r.data.data?.categories ?? [])
      setBranches(r.data.data?.branches ?? [])
      setLoading(false)
    }).catch(e => {
      setError(e.response?.data?.message ?? 'Failed to load products')
      setLoading(false)
    })
  }, [])

  // ───── Filtering ─────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products.filter(p => {
      if (activeCat !== ALL && p.category !== activeCat) return false
      if (!q) return true
      return p.name.toLowerCase().includes(q)
        || p.sku.toLowerCase().includes(q)
        || (p.barcode ?? '').toLowerCase().includes(q)
    })
  }, [products, search, activeCat])

  // ───── Totals (computed from cart) ─────
  const totals = useMemo(() => {
    let subtotal = 0, taxTotal = 0
    cart.forEach(l => {
      const lineNet = l.qty * l.unit_price - l.discount
      subtotal += lineNet
      taxTotal += lineNet * (l.tax_rate / 100)
    })
    const afterDiscount = Math.max(0, subtotal - discountTotal)
    const taxOnDiscounted = subtotal > 0 ? taxTotal * (afterDiscount / subtotal) : 0
    const grand = afterDiscount + taxOnDiscounted
    return {
      subtotal,
      tax_total: taxOnDiscounted,
      grand,
    }
  }, [cart, discountTotal])

  // ───── Stock lookup (capped from product catalogue) ─────
  function getAvailableStock(item_code: string): number {
    for (const p of products) {
      if (p.has_variants) {
        const v = p.variants.find(x => x.sku === item_code)
        if (v) return v.stock
      } else if (p.sku === item_code) {
        return p.stock
      }
    }
    return 0   // unknown SKU — block add
  }

  // ───── Cart helpers ─────
  const [stockWarning, setStockWarning] = useState<string | null>(null)
  function warn(msg: string) {
    setStockWarning(msg)
    setTimeout(() => setStockWarning(null), 2500)
  }

  function addProduct(p: Product, variant?: Variant) {
    const sku   = variant?.sku ?? p.sku
    const price = variant?.sale_price ?? p.sale_price
    const desc  = variant ? `${p.name} — ${variant.label}` : p.name
    const key   = `${sku}`
    const available = variant?.stock ?? p.stock

    setCart(prev => {
      const existing = prev.find(l => l.key === key)
      const currentQty = existing?.qty ?? 0
      if (currentQty >= available) {
        warn(`Out of stock — only ${available} available (${desc})`)
        return prev
      }
      if (existing) return prev.map(l => l.key === key ? { ...l, qty: l.qty + 1 } : l)
      return [...prev, {
        key,
        item_code: sku,
        description: desc,
        color: variant?.color ?? undefined,
        size:  variant?.size  ?? undefined,
        qty: 1,
        unit_price: price,
        discount: 0,
        tax_rate: p.tax_rate ?? 0,
      }]
    })
  }

  function changeQty(key: string, delta: number) {
    setCart(prev => prev
      .map(l => {
        if (l.key !== key) return l
        const available = getAvailableStock(l.item_code)
        const next = l.qty + delta
        if (next > available) {
          warn(`Out of stock — only ${available} available (${l.description})`)
          return { ...l, qty: available }
        }
        return { ...l, qty: Math.max(0, next) }
      })
      .filter(l => l.qty > 0))
  }
  function removeLine(key: string) { setCart(prev => prev.filter(l => l.key !== key)) }
  function clearCart() { setCart([]); setDiscountTotal(0) }

  function onProductClick(p: Product) {
    if (p.has_variants && p.variants.length > 0) setVariantPickerProduct(p)
    else addProduct(p)
  }

  // ───── Checkout ─────
  async function handlePay(method: 'cash' | 'card' | 'bank_transfer', tendered: number) {
    if (cart.length === 0) return
    setPosting(true)
    try {
      const lines = cart.map(l => {
        const lineNet = l.qty * l.unit_price - l.discount
        const tax     = lineNet * (l.tax_rate / 100)
        return {
          item_code:   l.item_code,
          description: l.description,
          color:       l.color,
          size:        l.size,
          qty:         l.qty,
          uom:         'UNIT',
          unit_price:  l.unit_price,
          discount:    l.discount,
          tax_rate:    l.tax_rate,
          tax_amount:  Number(tax.toFixed(2)),
          amount:      Number((lineNet + tax).toFixed(2)),
        }
      })

      const res = await api.post('/sales/pos/checkout', {
        walk_in_name:   walkInName,
        amount:         Number(totals.grand.toFixed(2)),
        discount_total: Number(discountTotal.toFixed(2)),
        tax_total:      Number(totals.tax_total.toFixed(2)),
        lines,
        payment: {
          method,
          amount:   Number(totals.grand.toFixed(2)),
          tendered: method === 'cash' ? tendered : undefined,
        },
      })

      setShowPayment(false)
      setReceipt({
        invoice: res.data.data.invoice,
        change:  res.data.data.change,
        tendered,
        method,
      })
      clearCart()
    } catch (e: any) {
      alert(e.response?.data?.message ?? 'Checkout failed. Please retry.')
    } finally {
      setPosting(false)
    }
  }

  // ───── UI ─────
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900 text-white flex items-center justify-center text-sm">
        Loading POS catalogue…
      </div>
    )
  }
  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-sm mb-4">{error}</p>
          <button onClick={() => router.push('/sales')} className="px-4 py-2 bg-white text-slate-900 rounded-lg text-sm">Back to Sales</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-100 text-slate-800">

      {/* ── Stock-cap toast (floating) ──────── */}
      {stockWarning && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] bg-rose-600 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
          <AlertCircle className="w-4 h-4" /> {stockWarning}
        </div>
      )}

      {/* ── Top Bar ─────────────────────────── */}
      <header className="flex items-center justify-between px-5 py-2.5 bg-slate-900 text-white shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/sales')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium hover:bg-white/10 rounded-md">
            <ArrowLeft className="w-3.5 h-3.5" /> Exit POS
          </button>
          <div className="w-7 h-7 bg-rose-500 rounded-md flex items-center justify-center">
            <ScanLine className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">POS Terminal</p>
            <p className="text-[10px] text-slate-400 leading-tight">Branch HQ &middot; Mayne AB ERP</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-slate-300">{now.toLocaleDateString()} &middot; {now.toLocaleTimeString()}</span>
          <span className="px-2 py-1 bg-white/10 rounded-md">{user?.name ?? 'Cashier'}</span>
        </div>
      </header>

      {/* ── Body: products (left) + cart (right) ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── PRODUCTS PANE ─────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 bg-white border-r border-slate-200">

          {/* Search + categories */}
          <div className="px-4 py-3 border-b border-slate-200 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, SKU, or scan barcode…"
                autoFocus
                className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1 -mb-1 scrollbar-thin">
              <CatChip label="All" active={activeCat === ALL} onClick={() => setActiveCat(ALL)} count={products.length} />
              {categories.map(c => (
                <CatChip key={c} label={c} active={activeCat === c} onClick={() => setActiveCat(c)}
                  count={products.filter(p => p.category === c).length} />
              ))}
            </div>
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {filtered.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                No products found.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {filtered.map(p => (
                  <button key={p.id} onClick={() => onProductClick(p)}
                    className="group bg-white border border-slate-200 rounded-xl p-3 text-left hover:border-rose-400 hover:shadow-md transition-all">
                    <div className="aspect-square bg-slate-50 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                      {p.image_url
                        ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                        : <span className="text-2xl font-bold text-slate-300">{p.name.charAt(0)}</span>}
                    </div>
                    <p className="text-xs font-semibold text-slate-700 truncate group-hover:text-rose-600">{p.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{p.sku}{p.has_variants ? ` · ${p.variants.length} variants` : ''}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-sm font-bold text-rose-600">{formatCurrency(p.sale_price)}</span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${p.stock > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        Stock {p.stock}
                      </span>
                    </div>
                    <StockBreakdown
                      locations={p.locations}
                      branches={branches}
                      hint={p.has_variants ? 'aggregate (variant-wise inside)' : undefined}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── CART PANE ─────────────────────── */}
        <aside className="w-[380px] flex flex-col bg-slate-50">

          {/* Customer */}
          <div className="px-4 py-3 border-b border-slate-200 bg-white">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Customer</label>
            <div className="flex items-center gap-2 mt-1">
              <User className="w-4 h-4 text-slate-400" />
              <input value={walkInName} onChange={e => setWalkInName(e.target.value)}
                className="flex-1 text-sm bg-transparent border-none focus:outline-none" />
            </div>
          </div>

          {/* Lines */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 text-xs">
                <ScanLine className="w-10 h-10 text-slate-300 mb-2" />
                Cart is empty.<br />Click a product on the left to start.
              </div>
            ) : cart.map(l => {
              const lineNet   = l.qty * l.unit_price - l.discount
              const available = getAvailableStock(l.item_code)
              const atMax     = l.qty >= available
              return (
                <div key={l.key} className="bg-white border border-slate-200 rounded-lg p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-700 truncate">{l.description}</p>
                      <p className="text-[10px] text-slate-400">
                        {l.item_code} <span className="ml-1 text-slate-500">· stock {available}</span>
                      </p>
                    </div>
                    <button onClick={() => removeLine(l.key)} className="text-slate-300 hover:text-rose-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => changeQty(l.key, -1)} className="w-6 h-6 bg-slate-100 hover:bg-slate-200 rounded-md flex items-center justify-center">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className={`w-8 text-center text-sm font-semibold ${atMax ? 'text-rose-600' : ''}`}>{l.qty}</span>
                      <button onClick={() => changeQty(l.key, +1)} disabled={atMax}
                        className={`w-6 h-6 rounded-md flex items-center justify-center ${
                          atMax ? 'bg-slate-50 text-slate-300 cursor-not-allowed' : 'bg-slate-100 hover:bg-slate-200'
                        }`}>
                        <Plus className="w-3 h-3" />
                      </button>
                      <span className="text-[10px] text-slate-400 ml-1">× {formatCurrency(l.unit_price)}</span>
                    </div>
                    <span className="text-sm font-bold text-slate-800">{formatCurrency(lineNet)}</span>
                  </div>
                  {atMax && (
                    <p className="mt-1.5 text-[10px] text-rose-600 font-semibold">
                      ⚠ Max stock — only {available} available
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          {/* Totals + Pay */}
          <div className="border-t border-slate-200 bg-white p-4 space-y-2.5">
            <Row label="Subtotal" value={formatCurrency(totals.subtotal)} />
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Bill Discount</span>
              <input type="number" value={discountTotal || ''}
                onChange={e => setDiscountTotal(Math.max(0, Number(e.target.value) || 0))}
                placeholder="0.00"
                className="w-24 text-right text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-rose-400" />
            </div>
            <Row label="Tax" value={formatCurrency(totals.tax_total)} />
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-sm font-semibold text-slate-800">Total</span>
              <span className="text-xl font-bold text-rose-600">{formatCurrency(totals.grand)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button onClick={clearCart} disabled={cart.length === 0}
                className="px-3 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-50">
                Clear
              </button>
              <button onClick={() => setShowPayment(true)} disabled={cart.length === 0}
                className="px-3 py-2.5 text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-lg disabled:bg-slate-300 disabled:cursor-not-allowed">
                PAY
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* ── Modals ─────────────────────────── */}
      {variantPickerProduct && (
        <VariantPicker
          product={variantPickerProduct}
          branches={branches}
          onClose={() => setVariantPickerProduct(null)}
          onPick={v => { addProduct(variantPickerProduct, v); setVariantPickerProduct(null) }}
        />
      )}

      {showPayment && (
        <PaymentModal
          total={totals.grand}
          onClose={() => setShowPayment(false)}
          onPay={handlePay}
          posting={posting}
        />
      )}

      {receipt && (
        <ReceiptModal
          data={receipt}
          cashier={user?.name ?? 'Cashier'}
          onClose={() => setReceipt(null)}
        />
      )}
    </div>
  )
}

// ───────────────────── Sub-components ─────────────────────

function CatChip({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
        active ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}>
      {label} <span className={`text-[10px] ${active ? 'text-rose-100' : 'text-slate-400'}`}>({count})</span>
    </button>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-xs font-semibold text-slate-700">{value}</span>
    </div>
  )
}

function VariantPicker({
  product, branches, onClose, onPick,
}: { product: Product; branches: Branch[]; onClose: () => void; onPick: (v: Variant) => void }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <div>
            <h3 className="text-sm font-bold text-slate-800">{product.name}</h3>
            <p className="text-xs text-slate-400">Pick a variant</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-2">
          {product.variants.map(v => (
            <button key={v.id} onClick={() => onPick(v)}
              disabled={v.stock <= 0}
              className="border border-slate-200 rounded-lg p-3 text-left hover:border-rose-400 disabled:opacity-40 disabled:cursor-not-allowed">
              <p className="text-sm font-semibold text-slate-700">{v.label}</p>
              <p className="text-[10px] text-slate-400">{v.sku}</p>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-sm font-bold text-rose-600">{formatCurrency(v.sale_price)}</span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${v.stock > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  Total {v.stock}
                </span>
              </div>
              <StockBreakdown locations={v.locations} branches={branches} />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function StockBreakdown({
  locations, branches, hint,
}: {
  locations: LocationMap; branches: Branch[]; hint?: string
}) {
  if (branches.length === 0) return null

  return (
    <div className="mt-2 pt-1.5 border-t border-dashed border-slate-200 space-y-1">
      {/* Physical branches only — online channels share the same pool, not shown here */}
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-[10px] text-slate-500 font-semibold">📍</span>
        {branches.map(b => {
          const qty = locations[b.code] ?? 0
          const isHQ = b.code === 'HQ'
          return (
            <span key={b.code}
              title={b.name}
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                qty > 0
                  ? (isHQ ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800')
                  : 'bg-slate-100 text-slate-500'
              }`}>
              {b.code}:{qty}
            </span>
          )
        })}
      </div>

      {hint && <p className="text-[10px] text-slate-500 italic">{hint}</p>}
    </div>
  )
}

function PaymentModal({
  total, onClose, onPay, posting,
}: { total: number; onClose: () => void; onPay: (m: 'cash' | 'card' | 'bank_transfer', t: number) => void; posting: boolean }) {
  const [method, setMethod]     = useState<'cash' | 'card' | 'bank_transfer'>('cash')
  const [tendered, setTendered] = useState<number>(total)
  useEffect(() => setTendered(total), [total])

  const change = Math.max(0, tendered - total)
  const insufficient = method === 'cash' && tendered < total

  function quickTender(amount: number) { setTendered(amount) }
  const ROUNDS = [total, Math.ceil(total / 5) * 5, Math.ceil(total / 10) * 10, Math.ceil(total / 50) * 50, Math.ceil(total / 100) * 100]
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .filter(v => v >= total)
    .slice(0, 5)

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-800">Payment</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="text-center py-3 bg-slate-50 rounded-xl">
            <p className="text-xs text-slate-500">Total Due</p>
            <p className="text-3xl font-bold text-rose-600 mt-1">{formatCurrency(total)}</p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <MethodBtn label="Cash"  icon={Banknote}    active={method === 'cash'} onClick={() => setMethod('cash')} />
            <MethodBtn label="Card"  icon={CreditCard}  active={method === 'card'} onClick={() => setMethod('card')} />
            <MethodBtn label="Bank"  icon={Building2}   active={method === 'bank_transfer'} onClick={() => setMethod('bank_transfer')} />
          </div>

          {method === 'cash' && (
            <>
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Tendered</label>
                <input type="number" value={tendered || ''} step="0.01"
                  onChange={e => setTendered(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full mt-1 text-2xl font-bold text-right border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-400" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ROUNDS.map(v => (
                  <button key={v} onClick={() => quickTender(v)}
                    className="flex-1 text-xs font-semibold py-2 bg-slate-100 hover:bg-slate-200 rounded">
                    {formatCurrency(v)}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                <span className="text-xs font-semibold text-emerald-700">Change</span>
                <span className="text-lg font-bold text-emerald-700">{formatCurrency(change)}</span>
              </div>
            </>
          )}
        </div>

        <div className="px-5 pb-5">
          <button
            disabled={posting || insufficient}
            onClick={() => onPay(method, tendered)}
            className="w-full py-3 text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-xl disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {posting ? 'Processing…' : insufficient ? 'Insufficient cash tendered' : (<><Check className="w-4 h-4" /> Confirm &amp; Save</>)}
          </button>
        </div>
      </div>
    </div>
  )
}

function MethodBtn({ label, icon: Icon, active, onClick }: { label: string; icon: any; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`flex flex-col items-center justify-center py-3 rounded-xl border transition-all ${
        active ? 'bg-rose-50 border-rose-400 text-rose-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
      }`}>
      <Icon className="w-5 h-5 mb-1" />
      <span className="text-xs font-medium">{label}</span>
    </button>
  )
}

function ReceiptModal({ data, cashier, onClose }: { data: any; cashier: string; onClose: () => void }) {
  const inv = data.invoice
  function print() {
    document.body.classList.add('pos-printing')
    setTimeout(() => {
      window.print()
      document.body.classList.remove('pos-printing')
    }, 50)
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4 pos-receipt-wrapper" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 no-print">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-500" /> Sale Completed
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div id="pos-receipt" className="p-5 font-mono text-[11px] text-slate-800">
          <div className="text-center mb-3">
            <p className="text-sm font-bold">Mayne AB ERP</p>
            <p className="text-[10px] text-slate-500">POS Receipt</p>
          </div>
          <div className="border-t border-b border-dashed border-slate-300 py-2 mb-2">
            <div className="flex justify-between"><span>Receipt #</span><span className="font-bold">{inv.si_number}</span></div>
            <div className="flex justify-between"><span>Date</span><span>{new Date(inv.date).toLocaleDateString()} {new Date(inv.created_at).toLocaleTimeString()}</span></div>
            <div className="flex justify-between"><span>Cashier</span><span>{cashier}</span></div>
            <div className="flex justify-between"><span>Customer</span><span>{inv.walk_in_name ?? '—'}</span></div>
          </div>
          <table className="w-full mb-2">
            <tbody>
              {inv.lines.map((l: any) => (
                <tr key={l.id} className="align-top">
                  <td className="pr-2">
                    <div>{l.description}</div>
                    <div className="text-slate-400">{l.qty} × {formatCurrency(l.unit_price)}</div>
                  </td>
                  <td className="text-right whitespace-nowrap">{formatCurrency(l.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-dashed border-slate-300 pt-2 space-y-0.5">
            {Number(inv.discount_total) > 0 && (
              <div className="flex justify-between"><span>Discount</span><span>−{formatCurrency(inv.discount_total)}</span></div>
            )}
            {Number(inv.tax_total) > 0 && (
              <div className="flex justify-between"><span>Tax</span><span>{formatCurrency(inv.tax_total)}</span></div>
            )}
            <div className="flex justify-between font-bold text-sm pt-1"><span>TOTAL</span><span>{formatCurrency(inv.amount)}</span></div>
            <div className="flex justify-between"><span>Tendered ({data.method})</span><span>{formatCurrency(data.tendered)}</span></div>
            <div className="flex justify-between"><span>Change</span><span>{formatCurrency(data.change)}</span></div>
          </div>
          <p className="text-center text-[10px] text-slate-400 mt-4">Thank you. Please come again.</p>
        </div>

        <div className="grid grid-cols-2 gap-2 p-4 border-t border-slate-200 no-print">
          <button onClick={onClose}
            className="px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg">
            New Sale
          </button>
          <button onClick={print}
            className="px-3 py-2 text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-lg flex items-center justify-center gap-1.5">
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
        </div>
      </div>
    </div>
  )
}
