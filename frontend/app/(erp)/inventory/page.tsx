'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Package, ClipboardList, GitBranch, Scissors,
  BarChart2, AlertCircle, TrendingUp, FileText, ShoppingCart, Send,
  Settings,
} from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

type InvStats = {
  total_products:     number
  total_stock_items:  number
  total_tailors:      number
  low_stock:          number
  total_movements:    number
  total_stock_value:  number
}

const MODULES = [
  // Masters
  { title: 'Master Setup',           href: '/inventory/setup',        icon: Settings,  color: 'text-slate-700',  bg: 'bg-slate-50',  border:'border-slate-200',  desc: 'Locations · Categories · Types · Departments · Tailors · BOM' },
  { title: 'Products',               href: '/inventory/products',     icon: Package,   color: 'text-violet-600', bg: 'bg-violet-50', border:'border-violet-100', desc: 'Finished goods + fabric / raw materials (single SKU master)' },

  // Production workflow — single document tracks order → issue → receipts → bill
  { title: 'Send to Tailor (Production Order)', href: '/inventory/send-to-tailor', icon: Send, color: 'text-fuchsia-700', bg: 'bg-gradient-to-br from-fuchsia-50 to-teal-50', border:'border-fuchsia-200', desc: 'Order → fabric issue → receive (×N) → tailor bill — all in one document' },
]

const REPORTS = [
  { label: 'Stock On-Hand Listing',    href: '/inventory/reports/stock-on-hand',    icon: ClipboardList },
  { label: 'Stock Movement Listing',   href: '/inventory/reports/movement',         icon: TrendingUp    },
  { label: 'Reorder Level Report',     href: '/inventory/reports/reorder',          icon: AlertCircle   },
  { label: 'Stock Valuation',          href: '/inventory/reports/valuation',        icon: BarChart2     },
  { label: 'Tailor WIP (At Tailor)',   href: '/inventory/reports/tailor-wip',       icon: Scissors      },
  { label: 'BOM Costing Report',       href: '/inventory/reports/bom-costing',      icon: GitBranch     },
  { label: 'Stock Card (per item)',    href: '/inventory/reports/stock-card',       icon: FileText      },
  { label: 'Receive vs Issue Summary', href: '/inventory/reports/receive-vs-issue', icon: ShoppingCart  },
]

export default function InventoryPage() {
  const [stats, setStats] = useState<InvStats | null>(null)

  useEffect(() => {
    Promise.all([
      api.get('/inventory/products',     { params: { per_page: 1 } }).catch(() => null),
      api.get('/inventory/stock-items',  {}).catch(() => null),
      api.get('/inventory/tailors',      {}).catch(() => null),
      api.get('/inventory/stock-movements', { params: { per_page: 1 } }).catch(() => null),
    ]).then(([prods, items, tailors, movements]) => {
      const itemList: any[] = items?.data?.data ?? []
      const lowStock   = itemList.filter(i => Number(i.current_stock ?? 0) <= Number(i.reorder_level ?? 0) && Number(i.reorder_level ?? 0) > 0).length
      const stockValue = itemList.reduce((s, i) => s + (Number(i.current_stock ?? 0) * Number(i.unit_cost ?? 0)), 0)
      setStats({
        total_products:    prods?.data?.meta?.total ?? prods?.data?.data?.length ?? 0,
        total_stock_items: itemList.length,
        total_tailors:     tailors?.data?.data?.length ?? 0,
        low_stock:         lowStock,
        total_movements:   movements?.data?.meta?.total ?? movements?.data?.data?.length ?? 0,
        total_stock_value: stockValue,
      })
    }).catch(() => {})
  }, [])

  return (
    <div className="flex gap-6 h-full">
      <div className="flex-1 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <Package className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Inventory</h1>
            <p className="text-sm text-slate-500 mt-0.5">Fabric, products, tailor-flow &amp; stock movements</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Stock Items',     value: stats?.total_stock_items ?? 0,                                                    sub: 'Fabric & raw materials',          color: 'text-blue-600',    bg: 'bg-blue-50' },
            { label: 'Stock Value',     value: stats ? formatCurrency(stats.total_stock_value) : '—',                            sub: 'On-hand × unit cost',             color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Active Tailors',  value: stats?.total_tailors ?? 0,                                                        sub: 'Production partners',             color: 'text-rose-600',    bg: 'bg-rose-50' },
            { label: 'Low Stock Items', value: stats?.low_stock ?? 0,                                                            sub: 'At or below reorder level',       color: 'text-amber-600',   bg: 'bg-amber-50' },
          ].map(s => (
            <div key={s.label} className="card">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value as any}</div>
              <div className="text-xs font-medium text-slate-600 mt-0.5">{s.label}</div>
              <div className="text-xs text-slate-400 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {MODULES.map(m => {
            const Icon = m.icon
            return (
              <Link key={m.href} href={m.href}
                className={`card border ${m.border} hover:shadow-lg transition-all group flex flex-col items-center text-center py-6 gap-3`}>
                <div className={`w-16 h-16 ${m.bg} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm`}>
                  <Icon className={`w-8 h-8 ${m.color}`} />
                </div>
                <div>
                  <p className={`font-semibold text-sm ${m.color}`}>{m.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{m.desc}</p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      <div className="w-64 shrink-0">
        <div className="card sticky top-0">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
            <BarChart2 className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-slate-800 text-sm">Reports</h3>
          </div>
          <div className="space-y-0.5">
            {REPORTS.map(r => {
              const Icon = r.icon
              return (
                <Link key={r.href} href={r.href}
                  className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-colors group">
                  <Icon className="w-3.5 h-3.5 shrink-0 text-slate-400 group-hover:text-blue-500" />
                  <span className="text-xs font-medium">{r.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
