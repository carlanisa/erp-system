'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  FileOutput, FileInput, BookOpen, GitMerge,
  Landmark, ArrowDownCircle, ArrowUpCircle,
  BarChart2, FileText, TrendingUp, Scale, ClipboardList,
  Receipt, DollarSign,
} from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

type GLStats = {
  total_pv: number
  total_or: number
  total_je: number
  total_ar_deposit: number
  total_ap_deposit: number
  pv_amount: number
  or_amount: number
}

const MODULES = [
  {
    title: 'Payment Voucher',
    href:  '/accounting/payment-voucher',
    icon:  FileOutput,
    color: 'text-red-600',
    bg:    'bg-red-50',
    border:'border-red-100',
    desc:  'Record outgoing payments (PV)',
  },
  {
    title: 'Official Receipt',
    href:  '/accounting/official-receipt',
    icon:  FileInput,
    color: 'text-green-600',
    bg:    'bg-green-50',
    border:'border-green-100',
    desc:  'Record incoming receipts (OR)',
  },
  {
    title: 'Account Maintenance',
    href:  '/accounting/chart-of-accounts',
    icon:  BookOpen,
    color: 'text-indigo-600',
    bg:    'bg-indigo-50',
    border:'border-indigo-100',
    desc:  'Manage chart of accounts',
  },
  {
    title: 'Journal Entry',
    href:  '/accounting/journal-entries',
    icon:  GitMerge,
    color: 'text-blue-600',
    bg:    'bg-blue-50',
    border:'border-blue-100',
    desc:  'Double-entry journal records (JE)',
  },
  {
    title: 'Bank Reconciliation',
    href:  '/accounting/bank-reconciliation',
    icon:  Landmark,
    color: 'text-purple-600',
    bg:    'bg-purple-50',
    border:'border-purple-100',
    desc:  'Match bank statement with books',
  },
  {
    title: 'A/R Deposit',
    href:  '/accounting/ar-deposit',
    icon:  ArrowDownCircle,
    color: 'text-teal-600',
    bg:    'bg-teal-50',
    border:'border-teal-100',
    desc:  'Customer advance deposits',
  },
  {
    title: 'A/P Deposit',
    href:  '/accounting/ap-deposit',
    icon:  ArrowUpCircle,
    color: 'text-orange-600',
    bg:    'bg-orange-50',
    border:'border-orange-100',
    desc:  'Supplier advance deposits',
  },
]

const REPORTS = [
  { label: 'GL Cash Book Listing',       href: '/accounting/reports/cashbook',       icon: FileText   },
  { label: 'Journal Transaction Listing', href: '/accounting/reports/journal-listing',icon: ClipboardList },
  { label: 'Transaction Summary',         href: '/accounting/reports/tx-summary',     icon: BarChart2  },
  { label: 'Bank Reconciliation Listing', href: '/accounting/reports/bank-recon',     icon: Landmark   },
  { label: 'Ledger Report',               href: '/accounting/reports/ledger',          icon: BookOpen   },
  { label: 'Trial Balance',               href: '/accounting/reports/trial-balance',   icon: Scale      },
  { label: 'Receipt & Payment Report',    href: '/accounting/reports/receipt-payment', icon: Receipt    },
  { label: 'Profit & Loss Statement',     href: '/accounting/reports/pnl',             icon: TrendingUp },
  { label: 'Balance Sheet',               href: '/accounting/reports/balance-sheet',   icon: DollarSign },
]

export default function GeneralLedgerPage() {
  const [stats, setStats] = useState<GLStats | null>(null)

  useEffect(() => {
    Promise.all([
      api.get('/accounting/payment-vouchers', { params: { per_page: 1 } }),
      api.get('/accounting/official-receipts', { params: { per_page: 1 } }),
      api.get('/accounting/journal-entries',   { params: { per_page: 1 } }),
      api.get('/accounting/ar-deposits',       { params: { per_page: 1 } }),
      api.get('/accounting/ap-deposits',       { params: { per_page: 1 } }),
    ]).then(([pv, or_, je, ar, ap]) => {
      setStats({
        total_pv:       pv.data.meta?.total  ?? 0,
        total_or:       or_.data.meta?.total ?? 0,
        total_je:       je.data.meta?.total  ?? 0,
        total_ar_deposit: ar.data.meta?.total ?? 0,
        total_ap_deposit: ap.data.meta?.total ?? 0,
        pv_amount: pv.data.data?.reduce((s: number, r: any) => s + r.amount, 0) ?? 0,
        or_amount: or_.data.data?.reduce((s: number, r: any) => s + r.amount, 0) ?? 0,
      })
    }).catch(() => {})
  }, [])

  return (
    <div className="flex gap-6 h-full">
      {/* ── Main content ── */}
      <div className="flex-1 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-800">General Ledger</h1>
          <p className="text-sm text-slate-500 mt-0.5">Complete accounting & financial management</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Payment Vouchers', value: stats?.total_pv      ?? 0, sub: stats ? formatCurrency(stats.pv_amount) : '—', color: 'text-red-600',   bg: 'bg-red-50'   },
            { label: 'Official Receipts', value: stats?.total_or     ?? 0, sub: stats ? formatCurrency(stats.or_amount) : '—', color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Journal Entries',   value: stats?.total_je     ?? 0, sub: 'Double-entry records',                         color: 'text-blue-600',  bg: 'bg-blue-50'  },
            { label: 'A/R + A/P Deposits',value: (stats?.total_ar_deposit ?? 0) + (stats?.total_ap_deposit ?? 0), sub: 'Total deposits', color: 'text-purple-600',bg: 'bg-purple-50'},
          ].map(s => (
            <div key={s.label} className="card">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs font-medium text-slate-600 mt-0.5">{s.label}</div>
              <div className="text-xs text-slate-400 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Module grid — like ELBS */}
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

      {/* ── Reports Panel (right side like ELBS) ── */}
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
