'use client'

import { useState } from 'react'
import {
  BarChart3, FileText, TrendingUp, TrendingDown, Banknote, Users, Package,
  Scale, Receipt, BookOpen, CreditCard, ArrowDownCircle, ArrowUpCircle,
  GitMerge, Landmark, ChevronRight, Download, Printer, Calendar,
} from 'lucide-react'

type ReportCategory = {
  id: string
  label: string
  icon: React.ElementType
  bg: string
  reports: { title: string; desc: string; icon: React.ElementType; badge?: string }[]
}

const CATEGORIES: ReportCategory[] = [
  {
    id: 'financial',
    label: 'Financial Statements',
    icon: Scale,
    bg: 'bg-indigo-600',
    reports: [
      { title: 'Profit & Loss Statement', desc: 'Revenue vs expenses for selected period',  icon: TrendingUp,  badge: 'P&L' },
      { title: 'Balance Sheet',           desc: 'Assets, liabilities and equity snapshot',  icon: Scale,       badge: 'BS'  },
      { title: 'Trial Balance',           desc: 'All account debit/credit balances',        icon: BookOpen,    badge: 'TB'  },
      { title: 'Cash Flow Statement',     desc: 'Operating, investing and financing flows', icon: Banknote,    badge: 'CF'  },
    ],
  },
  {
    id: 'gl',
    label: 'General Ledger',
    icon: BookOpen,
    bg: 'bg-slate-600',
    reports: [
      { title: 'GL Cash Book Listing',        desc: 'All payment voucher transactions',          icon: FileText,  badge: 'PV'  },
      { title: 'Journal Transaction Listing', desc: 'All journal entries with lines',            icon: GitMerge,  badge: 'JE'  },
      { title: 'Transaction Summary',         desc: 'Summary by account for a period',           icon: BarChart3, badge: 'GL'  },
      { title: 'Ledger Report',               desc: 'Individual account ledger with running bal', icon: BookOpen,  badge: 'LR'  },
      { title: 'Bank Reconciliation Listing', desc: 'Reconciled vs unreconciled items',          icon: Landmark,  badge: 'BR'  },
      { title: 'Receipt & Payment Report',    desc: 'Receipts and payments summary',             icon: Receipt,   badge: 'RP'  },
    ],
  },
  {
    id: 'receivable',
    label: 'Accounts Receivable',
    icon: ArrowDownCircle,
    bg: 'bg-sky-600',
    reports: [
      { title: 'AR Aging Report',     desc: 'Outstanding receivables aged by days',     icon: ArrowDownCircle, badge: 'AR'  },
      { title: 'Customer Statement',  desc: 'Per-customer invoice & payment history',   icon: Users,           badge: 'CS'  },
      { title: 'A/R Deposit Listing', desc: 'Customer deposits and advance payments',   icon: ArrowDownCircle, badge: 'ARD' },
      { title: 'Sales Register',      desc: 'All invoices issued in period',            icon: Receipt,         badge: 'SR'  },
    ],
  },
  {
    id: 'payable',
    label: 'Accounts Payable',
    icon: ArrowUpCircle,
    bg: 'bg-orange-600',
    reports: [
      { title: 'AP Aging Report',     desc: 'Outstanding payables aged by days',     icon: ArrowUpCircle, badge: 'AP'  },
      { title: 'Supplier Statement',  desc: 'Per-supplier payment history',          icon: CreditCard,    badge: 'SS'  },
      { title: 'A/P Deposit Listing', desc: 'Supplier deposits and advances paid',   icon: ArrowUpCircle, badge: 'APD' },
    ],
  },
  {
    id: 'hrm',
    label: 'Human Resources',
    icon: Users,
    bg: 'bg-purple-600',
    reports: [
      { title: 'Payroll Summary',      desc: 'Monthly payroll breakdown',             icon: Banknote,  badge: 'PR' },
      { title: 'Payslip Register',     desc: 'All payslips for a period',             icon: FileText,  badge: 'PS' },
      { title: 'Attendance Summary',   desc: 'Employee attendance by month',          icon: Calendar,  badge: 'AT' },
      { title: 'Leave Balance Report', desc: 'Remaining leave balances by employee',  icon: Calendar,  badge: 'LB' },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: Package,
    bg: 'bg-emerald-600',
    reports: [
      { title: 'Inventory Valuation',   desc: 'Stock value using average cost',    icon: Package,      badge: 'IV' },
      { title: 'Stock Movement Report', desc: 'In/out movements by product',       icon: TrendingUp,   badge: 'SM' },
      { title: 'Low Stock Report',      desc: 'Products below minimum quantity',   icon: TrendingDown, badge: 'LS' },
    ],
  },
]

export default function ReportsPage() {
  const [activeCategory, setActiveCategory] = useState('financial')
  const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0,10))
  const [dateTo,   setDateTo]   = useState(new Date().toISOString().slice(0,10))

  const category = CATEGORIES.find(c => c.id === activeCategory)!

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Reports</h1>
            <p className="text-xs text-slate-500">Financial and operational reports</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
              className="text-xs bg-transparent border-none outline-none text-slate-700" />
            <span className="text-slate-400 text-xs">—</span>
            <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
              className="text-xs bg-transparent border-none outline-none text-slate-700" />
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Category sidebar */}
        <aside className="w-56 bg-white border-r border-slate-200 py-3 flex-shrink-0 overflow-y-auto">
          <p className="px-4 pb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Categories</p>
          {CATEGORIES.map(cat => {
            const Icon = cat.icon
            const active = activeCategory === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  active
                    ? 'bg-indigo-50 text-indigo-700 border-r-2 border-indigo-600 font-medium'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="text-left">{cat.label}</span>
                <span className="ml-auto text-xs text-slate-400">{cat.reports.length}</span>
              </button>
            )
          })}
        </aside>

        {/* Reports grid */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className={`w-8 h-8 ${category.bg} rounded-lg flex items-center justify-center`}>
              <category.icon className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">{category.label}</h2>
              <p className="text-xs text-slate-400">{category.reports.length} reports available</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {category.reports.map(report => {
              const Icon = report.icon
              return (
                <div
                  key={report.title}
                  className="bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer group"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-9 h-9 bg-slate-100 group-hover:bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors">
                      <Icon className="w-4 h-4 text-slate-500 group-hover:text-indigo-600 transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <h3 className="text-sm font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors leading-tight">
                          {report.title}
                        </h3>
                        {report.badge && (
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono flex-shrink-0">
                            {report.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{report.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <button className="flex-1 flex items-center justify-center gap-1.5 text-xs text-slate-600 hover:text-indigo-600 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors font-medium">
                      <Printer className="w-3.5 h-3.5" /> Print
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-1.5 text-xs text-slate-600 hover:text-indigo-600 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors font-medium">
                      <Download className="w-3.5 h-3.5" /> Export
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors font-medium">
                      View <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </main>
      </div>
    </div>
  )
}
