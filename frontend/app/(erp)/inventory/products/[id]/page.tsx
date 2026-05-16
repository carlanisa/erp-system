'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Package, SlidersHorizontal, Pencil,
  ArrowDownCircle, ArrowUpCircle, RefreshCw, AlertTriangle, Loader2
} from 'lucide-react'
import StockAdjustModal from '@/components/inventory/StockAdjustModal'
import ProductModal from '@/components/inventory/ProductModal'
import { PublishToWebsiteCard } from '@/components/storefront/PublishToWebsiteCard'
import { api } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { clsx } from 'clsx'
import type { Product } from '@/types/index'

type Movement = {
  id: number; type: 'in' | 'out' | 'adjustment'
  quantity: number; unit_cost: number; reference?: string
  notes?: string; created_at: string
  created_by?: { name: string }
}

const moveIcon = {
  in:         { icon: ArrowDownCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Stock In' },
  out:        { icon: ArrowUpCircle,   color: 'text-red-500',     bg: 'bg-red-50',     label: 'Stock Out' },
  adjustment: { icon: SlidersHorizontal,color:'text-amber-600',  bg: 'bg-amber-50',   label: 'Adjustment' },
}

export default function ProductDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const router   = useRouter()
  const [product, setProduct]       = useState<Product | null>(null)
  const [movements, setMovements]   = useState<Movement[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading]       = useState(true)
  const [adjustOpen, setAdjust]     = useState(false)
  const [editOpen, setEdit]         = useState(false)

  async function load() {
    setLoading(true)
    try {
      const [pRes, mRes, cRes] = await Promise.all([
        api.get(`/inventory/products/${id}`),
        api.get('/inventory/stock-movements', { params: { product_id: id } }),
        api.get('/inventory/products/categories'),
      ])
      setProduct(pRes.data.data)
      setMovements(mRes.data.data)
      setCategories(cRes.data.data)
    } catch {
      toast.error('Product not found')
      router.push('/inventory/products')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
    </div>
  )
  if (!product) return null

  const isLow = product.stock > 0 && product.stock <= product.low_stock_alert
  const isOut = product.stock === 0
  const margin = product.cost_price > 0
    ? (((product.sale_price - product.cost_price) / product.cost_price) * 100).toFixed(1)
    : null
  const stockValue = product.stock * product.cost_price

  return (
    <div className="max-w-4xl space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/inventory/products" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-slate-800">{product.name}</h1>
              <span className="font-mono text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{product.sku}</span>
              {isOut && <span className="badge-red">Out of Stock</span>}
              {isLow && !isOut && <span className="badge-yellow flex items-center gap-1"><AlertTriangle className="w-3 h-3"/>Low Stock</span>}
            </div>
            {product.category && <p className="text-sm text-slate-400 mt-0.5">{product.category}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setAdjust(true)} className="btn-outline flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4" /> Adjust Stock
          </button>
          <button onClick={() => setEdit(true)} className="btn-primary flex items-center gap-2">
            <Pencil className="w-4 h-4" /> Edit
          </button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Current Stock', value: `${product.stock} units`,
            sub: isOut ? 'Out of stock!' : isLow ? `Alert: ${product.low_stock_alert} min` : `Min: ${product.low_stock_alert}`,
            color: isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-emerald-600' },
          { label: 'Cost Price',   value: formatCurrency(product.cost_price),  sub: 'Per unit',           color: 'text-slate-800' },
          { label: 'Sale Price',   value: formatCurrency(product.sale_price),
            sub: margin ? `${margin}% margin` : 'No margin set',
            color: 'text-indigo-600' },
          { label: 'Stock Value',  value: formatCurrency(stockValue),           sub: 'At cost price',      color: 'text-slate-800' },
        ].map(card => (
          <div key={card.label} className="card">
            <p className="text-xs text-slate-400 font-medium">{card.label}</p>
            <p className={`text-xl font-bold mt-1 ${card.color}`}>{card.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Stock level bar */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-slate-700">Stock Level</p>
          <p className="text-sm text-slate-500">{product.stock} / {product.low_stock_alert * 3} units (target)</p>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
          <div
            className={clsx('h-3 rounded-full transition-all duration-500', {
              'bg-red-500':    isOut,
              'bg-amber-400':  isLow && !isOut,
              'bg-emerald-500': !isOut && !isLow,
            })}
            style={{ width: `${Math.min(100, (product.stock / (product.low_stock_alert * 3)) * 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-slate-400">
          <span>0</span>
          <span className="text-amber-600">⚠ {product.low_stock_alert} (alert)</span>
          <span>{product.low_stock_alert * 3} (target)</span>
        </div>
      </div>

      <PublishToWebsiteCard
        productId={product.id}
        initial={{
          publish_to_website: (product as any).publish_to_website ?? false,
          seo_slug: (product as any).seo_slug ?? null,
          seo_title: (product as any).seo_title ?? null,
          seo_description: (product as any).seo_description ?? null,
          size_chart_md: (product as any).size_chart_md ?? null,
        }}
        onUpdated={load}
      />

      {/* Details + Movements */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Product details */}
        <div className="card space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">Product Details</h3>
          {[
            { label: 'Category',       value: product.category ?? '—' },
            { label: 'Costing Method', value: product.costing_method?.toUpperCase() ?? '—' },
            { label: 'Low Stock Alert',value: `${product.low_stock_alert} units` },
            { label: 'Status',         value: product.is_active ? 'Active' : 'Inactive' },
          ].map(row => (
            <div key={row.label} className="flex justify-between text-sm">
              <span className="text-slate-400">{row.label}</span>
              <span className="font-medium text-slate-700">{row.value}</span>
            </div>
          ))}
          {product.description && (
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-400 mb-1">Description</p>
              <p className="text-sm text-slate-600">{product.description}</p>
            </div>
          )}
        </div>

        {/* Stock Movements */}
        <div className="card md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700">Stock Movements</h3>
            <button onClick={load} className="text-slate-400 hover:text-slate-600 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {movements.length === 0 ? (
            <div className="text-center py-8 text-slate-300">
              <Package className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">No movements yet</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {movements.map(m => {
                const cfg = moveIcon[m.type]
                const Icon = cfg.icon
                return (
                  <div key={m.id} className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0">
                    <div className={`w-8 h-8 ${cfg.bg} rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <Icon className={`w-4 h-4 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-semibold ${cfg.color}`}>
                          {m.type === 'out' ? '-' : m.type === 'adjustment' ? '=' : '+'}{m.quantity} units
                        </span>
                        <span className="text-xs text-slate-400">{formatDate(m.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>{cfg.label}</span>
                        {m.reference && <><span>·</span><span className="font-mono">{m.reference}</span></>}
                        {m.created_by && <><span>·</span><span>{m.created_by.name}</span></>}
                      </div>
                      {m.notes && <p className="text-xs text-slate-400 mt-0.5 truncate">{m.notes}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <StockAdjustModal
        open={adjustOpen} onClose={() => setAdjust(false)} onSaved={load} product={product}
      />
      <ProductModal
        open={editOpen} onClose={() => setEdit(false)} onSaved={load}
        editing={product} categories={categories}
      />
    </div>
  )
}
