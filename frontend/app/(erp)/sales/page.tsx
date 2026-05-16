'use client'

import Link from 'next/link'
import {
  ShoppingCart, ScanLine, ClipboardList, FileText, Undo2,
  BarChart3, BarChart2, FileText as FileText2, Users,
  TrendingUp, Receipt, Calculator, AlertCircle, ScrollText,
  PackageCheck,
} from 'lucide-react'

const MODULES = [
  {
    title: 'POS',
    href:  '/sales/pos',
    icon:  ScanLine,
    color: 'text-rose-600',
    bg:    'bg-rose-50',
    border:'border-rose-100',
    desc:  'Walk-in counter sale & receipt print',
  },
  {
    title: 'Sales Order',
    href:  '/sales/orders',
    icon:  ClipboardList,
    color: 'text-blue-600',
    bg:    'bg-blue-50',
    border:'border-blue-100',
    desc:  'Capture customer order before invoice',
  },
  {
    title: 'Sale Invoice',
    href:  '/sales/invoices',
    icon:  FileText,
    color: 'text-indigo-600',
    bg:    'bg-indigo-50',
    border:'border-indigo-100',
    desc:  'Issue customer bill, decrement stock',
  },
  {
    title: 'Sale Return',
    href:  '/sales/returns',
    icon:  Undo2,
    color: 'text-emerald-600',
    bg:    'bg-emerald-50',
    border:'border-emerald-100',
    desc:  'Customer return — refund or credit note',
  },
  {
    title: 'Order Management',
    href:  '/sales/order-management',
    icon:  PackageCheck,
    color: 'text-amber-600',
    bg:    'bg-amber-50',
    border:'border-amber-100',
    desc:  'Shopee, TikTok & website orders — pack with scanner',
  },
]

const REPORTS = [
  { label: 'Sales Summary',          href: '/sales/reports?tab=summary',     icon: BarChart3   },
  { label: 'Sales by Customer',      href: '/sales/reports?tab=customer',    icon: Users       },
  { label: 'Sales by Product',       href: '/sales/reports?tab=product',     icon: TrendingUp  },
  { label: 'Sales by Agent / Area',  href: '/sales/reports?tab=agent',       icon: ScrollText  },
  { label: 'Returns Summary',        href: '/sales/reports?tab=returns',     icon: Undo2       },
  { label: 'Daily POS Close',        href: '/sales/reports?tab=pos-close',   icon: Receipt     },
  { label: 'A/R Aging',              href: '/sales/reports?tab=aging',       icon: AlertCircle },
  { label: 'Customer Statement',     href: '/sales/reports?tab=statement',   icon: FileText2   },
  { label: 'Tax Summary',            href: '/sales/reports?tab=tax',         icon: Calculator  },
]

export default function SalesPage() {
  return (
    <div className="flex gap-6 h-full">
      <div className="flex-1 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Sales</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Accounts Receivable — orders, invoices, POS &amp; returns
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Sale Invoices',  value: 0, sub: 'Phase 1 — wiring next', color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'Sales Orders',   value: 0, sub: 'Phase 4',               color: 'text-blue-600',   bg: 'bg-blue-50' },
            { label: 'Sale Returns',   value: 0, sub: 'Phase 2',               color: 'text-emerald-600',bg: 'bg-emerald-50' },
            { label: 'POS Sales (Today)', value: 0, sub: 'Phase 3',            color: 'text-rose-600',   bg: 'bg-rose-50' },
          ].map(s => (
            <div key={s.label} className="card">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
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
