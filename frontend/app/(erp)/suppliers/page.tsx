'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Users, ShoppingCart, Banknote,
  FileMinus, FilePlus, BarChart2,
  FileText, ClipboardList, Receipt,
  Wallet, AlertCircle, ScrollText, TrendingUp,
  Calculator, Truck, Undo2,
} from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

type SupplierStats = {
  total_suppliers: number
  active_suppliers: number
  total_ap_deposits: number
  ap_deposit_amount: number
  total_pv_to_suppliers: number
  pv_amount: number
}

const MODULES = [
  {
    title: 'Maintain Supplier',
    href:  '/suppliers/maintain',
    icon:  Users,
    color: 'text-indigo-600',
    bg:    'bg-indigo-50',
    border:'border-indigo-100',
    desc:  'Add, edit & manage supplier master',
  },
  {
    title: 'Supplier Deposit',
    href:  '/accounting/ap-deposit',
    icon:  Wallet,
    color: 'text-orange-600',
    bg:    'bg-orange-50',
    border:'border-orange-100',
    desc:  'Advance payments to suppliers (AP)',
  },
  {
    title: 'Purchase (Supplier Invoice)',
    href:  '/suppliers/purchase',
    icon:  ShoppingCart,
    color: 'text-blue-600',
    bg:    'bg-blue-50',
    border:'border-blue-100',
    desc:  'Record supplier bills you receive',
  },
  {
    title: 'Purchase Return',
    href:  '/suppliers/purchase-return',
    icon:  Undo2,
    color: 'text-emerald-600',
    bg:    'bg-emerald-50',
    border:'border-emerald-100',
    desc:  'Return goods to supplier (Debit Note)',
  },
  {
    title: 'Supplier Debit Note',
    href:  '/suppliers/debit-note',
    icon:  FilePlus,
    color: 'text-violet-600',
    bg:    'bg-violet-50',
    border:'border-violet-100',
    desc:  'Goods returned / debit raised',
  },
  {
    title: 'Supplier Credit Note',
    href:  '/suppliers/credit-note',
    icon:  FileMinus,
    color: 'text-rose-600',
    bg:    'bg-rose-50',
    border:'border-rose-100',
    desc:  'Credit memo issued to supplier',
  },
]

const REPORTS = [
  { label: 'Supplier Statement of Account',         href: '/suppliers/reports/statement',        icon: FileText      },
  { label: 'Supplier Document Listing',             href: '/suppliers/reports/document-listing', icon: ClipboardList },
  { label: 'Supplier Deposit Listing',              href: '/suppliers/reports/deposit-listing',  icon: Wallet        },
  { label: 'Supplier Balance Report',               href: '/suppliers/reports/balance',          icon: Calculator    },
  { label: 'Supplier Due Document',                 href: '/suppliers/reports/due',              icon: AlertCircle   },
  { label: 'Supplier Aging Report',                 href: '/suppliers/reports/aging',            icon: BarChart2     },
  { label: 'Supplier Post Dated Cheque Listing',    href: '/suppliers/reports/pdc',              icon: Receipt       },
  { label: 'Supplier Analysis by Document',         href: '/suppliers/reports/analysis-doc',     icon: ScrollText    },
  { label: 'Supplier Purchase & Payment Analysis',  href: '/suppliers/reports/purchase-payment', icon: TrendingUp    },
]

export default function SuppliersPage() {
  const [stats, setStats] = useState<SupplierStats | null>(null)

  useEffect(() => {
    Promise.all([
      api.get('/suppliers/list',                { params: { per_page: 1 } }),
      api.get('/suppliers/list',                { params: { per_page: 1, is_active: true } }),
      api.get('/accounting/ap-deposits',        { params: { per_page: 200 } }),
      api.get('/accounting/payment-vouchers',   { params: { per_page: 200 } }),
    ]).then(([all, active, ap, pv]) => {
      setStats({
        total_suppliers:       all.data.meta?.total ?? 0,
        active_suppliers:      active.data.meta?.total ?? 0,
        total_ap_deposits:     ap.data.meta?.total ?? 0,
        ap_deposit_amount:     (ap.data.data ?? []).reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0),
        total_pv_to_suppliers: pv.data.meta?.total ?? 0,
        pv_amount:             (pv.data.data ?? []).reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0),
      })
    }).catch(() => {})
  }, [])

  return (
    <div className="flex gap-6 h-full">
      {/* ── Main content ── */}
      <div className="flex-1 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
            <Truck className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Suppliers</h1>
            <p className="text-sm text-slate-500 mt-0.5">Accounts Payable — purchase, payments &amp; supplier ledger</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Active Suppliers',   value: stats?.active_suppliers ?? 0, sub: `${stats?.total_suppliers ?? 0} total in master`, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'A/P Deposits',       value: stats?.total_ap_deposits ?? 0, sub: stats ? formatCurrency(stats.ap_deposit_amount) : '—', color: 'text-orange-600', bg: 'bg-orange-50' },
            { label: 'Payments to Vendors',value: stats?.total_pv_to_suppliers ?? 0, sub: stats ? formatCurrency(stats.pv_amount) : '—', color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Purchase Invoices',  value: 0, sub: 'Module coming soon',  color: 'text-blue-600',   bg: 'bg-blue-50' },
          ].map(s => (
            <div key={s.label} className="card">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs font-medium text-slate-600 mt-0.5">{s.label}</div>
              <div className="text-xs text-slate-400 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Module grid — like ELBS / GL */}
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

      {/* ── Reports Panel (right side like ELBS / GL) ── */}
      <div className="w-64 shrink-0">
        <div className="card sticky top-0">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
            <BarChart2 className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-sm">Reports</h3>
          </div>
          <div className="space-y-0.5">
            {REPORTS.map(r => {
              const Icon = r.icon
              return (
                <Link key={r.href} href={r.href}
                  className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors group">
                  <Icon className="w-3.5 h-3.5 shrink-0 text-slate-400 group-hover:text-indigo-500" />
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
