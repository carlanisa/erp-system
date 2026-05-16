'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ClipboardList, ScanLine, FileText, Globe, RefreshCw,
  ArrowLeft, MapPin, ShoppingBag, Eye, Printer, Loader2,
  ChevronLeft, ChevronRight, X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { openPdf, openPdfAndPrint } from '@/lib/pdf'
import { formatCurrency, formatDate } from '@/lib/utils'

// ─────────────────── Types ───────────────────
type Order = {
  id: number
  si_number: string
  source: string             // 'pos' | 'erp' | 'online'
  branch_code: string
  date: string
  customer?: { id: number; name: string } | null
  walk_in_name?: string | null
  amount: number
  paid_amount: number
  reference?: string | null
  is_cancelled: boolean
  payment_status: 'paid' | 'partial' | 'unpaid'
  created_by?: number | null
  created_by_user?: { name: string } | null
  createdBy?: { name: string } | null
}

type Dashboard = {
  from: string
  to: string
  total_orders: number
  total_sales: number
  total_paid: number
  outstanding: number
  by_source: { source: string; count: number; total: number }[]
  by_branch: { branch_code: string; count: number; total: number }[]
  by_day:    { day: string; count: number; total: number }[]
}

const SOURCE_META: Record<string, { label: string; bg: string; text: string; icon: any }> = {
  pos:    { label: 'POS Counter', bg: 'bg-rose-100',    text: 'text-rose-800',    icon: ScanLine },
  erp:    { label: 'ERP Manual',  bg: 'bg-indigo-100',  text: 'text-indigo-800',  icon: FileText },
  online: { label: 'Online',      bg: 'bg-emerald-100', text: 'text-emerald-800', icon: Globe },
}

function todayStr() { return new Date().toISOString().slice(0, 10) }

// ─────────────────── Column filter shape (Excel-style, like PV) ───────────────────
type ColFilters = {
  order_no: string
  date:     string
  source:   string
  branch:   string
  customer: string
  amount:   string
  status:   string
}
const emptyColFilters: ColFilters = {
  order_no: '', date: '', source: '', branch: '', customer: '', amount: '', status: '',
}

// ─────────────────── Page ───────────────────
export default function SalesOrdersPage() {
  const router = useRouter()

  const [from, setFrom] = useState(todayStr())
  const [to, setTo]     = useState(todayStr())
  const [sourceFilter, setSource] = useState('')
  const [branchFilter, setBranch] = useState('')
  const [page, setPage]           = useState(1)

  // Per-column filters (Excel-style row inside table head)
  const [colF, setColF] = useState<ColFilters>(emptyColFilters)
  const cf = (k: keyof ColFilters, v: string) => setColF(p => ({ ...p, [k]: v }))

  const [orders, setOrders]   = useState<Order[]>([])
  const [meta, setMeta]       = useState<{ total: number; last_page: number; grand_total: number; order_count: number }>({
    total: 0, last_page: 1, grand_total: 0, order_count: 0,
  })
  const [stats, setStats]     = useState<Dashboard | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(() => {
    setLoading(true)
    const params: any = { from, to, page, per_page: 25 }
    if (sourceFilter) params.source = sourceFilter
    if (branchFilter) params.branch_code = branchFilter

    Promise.all([
      api.get('/sales/orders', { params }),
      api.get('/sales/orders/dashboard', { params: { from, to } }),
    ]).then(([listRes, statsRes]) => {
      setOrders(listRes.data.data ?? [])
      setMeta({
        total:       listRes.data.meta?.total ?? 0,
        last_page:   listRes.data.meta?.last_page ?? 1,
        grand_total: listRes.data.meta?.grand_total ?? 0,
        order_count: listRes.data.meta?.order_count ?? 0,
      })
      setStats(statsRes.data.data)
      setLoading(false)
    }).catch(e => {
      toast.error(e.response?.data?.message ?? 'Failed to load')
      setLoading(false)
    })
  }, [from, to, sourceFilter, branchFilter, page])

  useEffect(reload, [reload])

  // Client-side per-column filtering on top of the server-side range/filter set
  const filteredOrders = useMemo(() => orders.filter(o => {
    const sm = SOURCE_META[o.source]?.label ?? o.source
    const cust = o.customer?.name ?? o.walk_in_name ?? ''
    return (
      (!colF.order_no || o.si_number.toLowerCase().includes(colF.order_no.toLowerCase())) &&
      (!colF.date     || formatDate(o.date).toLowerCase().includes(colF.date.toLowerCase())) &&
      (!colF.source   || sm.toLowerCase().includes(colF.source.toLowerCase()) || o.source.toLowerCase().includes(colF.source.toLowerCase())) &&
      (!colF.branch   || (o.branch_code ?? '').toLowerCase().includes(colF.branch.toLowerCase())) &&
      (!colF.customer || cust.toLowerCase().includes(colF.customer.toLowerCase())) &&
      (!colF.amount   || String(o.amount).includes(colF.amount)) &&
      (!colF.status   || o.payment_status.toLowerCase().includes(colF.status.toLowerCase()))
    )
  }), [orders, colF])

  const hasColFilter = Object.values(colF).some(v => v !== '')

  // Quick presets
  function setRange(preset: 'today' | 'yesterday' | 'last7' | 'last30' | 'mtd') {
    const today = new Date()
    if (preset === 'today') { setFrom(todayStr()); setTo(todayStr()) }
    if (preset === 'yesterday') {
      const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
      setFrom(y); setTo(y)
    }
    if (preset === 'last7') {
      const start = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10)
      setFrom(start); setTo(todayStr())
    }
    if (preset === 'last30') {
      const start = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10)
      setFrom(start); setTo(todayStr())
    }
    if (preset === 'mtd') {
      const m = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
      setFrom(m); setTo(todayStr())
    }
    setPage(1)
  }

  // Derived: ensure all configured sources show in by_source even if 0
  const sourceCards = useMemo(() => {
    const known = ['pos', 'erp', 'online']
    const map = Object.fromEntries((stats?.by_source ?? []).map(r => [r.source, r]))
    return known.map(src => ({
      source: src,
      count:  map[src]?.count ?? 0,
      total:  map[src]?.total ?? 0,
    }))
  }, [stats])

  function viewPdf(o: Order) {
    openPdf(`/sales/invoices/${o.id}/pdf`, `${o.si_number}.pdf`)
      .catch((e: any) => toast.error(e.response?.data?.message ?? 'Failed to open PDF'))
  }
  function printPdf(o: Order) {
    openPdfAndPrint(`/sales/invoices/${o.id}/pdf`, `${o.si_number}.pdf`)
      .catch((e: any) => toast.error(e.response?.data?.message ?? 'Failed to open PDF'))
  }

  // ─────────────────── Render ───────────────────
  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/sales')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200">
            <ArrowLeft className="w-3.5 h-3.5" /> Sales
          </button>
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Sales Orders — Daily Aggregator</h1>
            <p className="text-xs text-slate-500">
              Every sale from every branch &amp; channel in one view.
              {stats && ` ${meta.order_count} orders · ${formatCurrency(meta.grand_total)} for selected range.`}
            </p>
          </div>
        </div>
        <button onClick={reload} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* ── Date range picker + presets ── */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500">FROM</label>
          <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1) }}
            className="px-2 py-1.5 text-sm border border-slate-200 rounded" />
          <label className="text-xs font-semibold text-slate-500 ml-2">TO</label>
          <input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1) }}
            className="px-2 py-1.5 text-sm border border-slate-200 rounded" />
        </div>
        <div className="flex items-center gap-1 ml-auto">
          {(['today', 'yesterday', 'last7', 'last30', 'mtd'] as const).map(p => (
            <button key={p} onClick={() => setRange(p)}
              className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-700 rounded">
              {p === 'today' ? 'Today' : p === 'yesterday' ? 'Yesterday' :
               p === 'last7' ? 'Last 7d' : p === 'last30' ? 'Last 30d' : 'MTD'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Orders" value={String(stats?.total_orders ?? 0)}
          sub="in selected range" color="text-blue-700"   bg="bg-blue-50" />
        <StatCard label="Total Sales" value={formatCurrency(stats?.total_sales ?? 0)}
          sub={`${stats?.total_orders ?? 0} orders`} color="text-emerald-700" bg="bg-emerald-50" />
        <StatCard label="Paid To-Date" value={formatCurrency(stats?.total_paid ?? 0)}
          sub={stats && stats.total_sales > 0 ? `${Math.round(100 * stats.total_paid / stats.total_sales)}% collected` : '—'}
          color="text-indigo-700" bg="bg-indigo-50" />
        <StatCard label="Outstanding" value={formatCurrency(stats?.outstanding ?? 0)}
          sub={stats?.outstanding ? 'awaiting payment' : 'all clear'}
          color={stats && stats.outstanding > 0 ? 'text-amber-700' : 'text-slate-500'}
          bg={stats && stats.outstanding > 0 ? 'bg-amber-50' : 'bg-slate-50'} />
      </div>

      {/* ── By Source breakdown ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {sourceCards.map(s => {
          const meta = SOURCE_META[s.source] ?? { label: s.source, bg: 'bg-slate-100', text: 'text-slate-700', icon: ShoppingBag }
          const Icon = meta.icon
          return (
            <button key={s.source}
              onClick={() => { setSource(sourceFilter === s.source ? '' : s.source); setPage(1) }}
              className={`text-left bg-white border ${sourceFilter === s.source ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200'} rounded-xl p-3 hover:border-blue-300 transition`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 ${meta.bg} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-4.5 h-4.5 ${meta.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700">{meta.label}</p>
                  <p className="text-[10px] text-slate-400">{s.count} order{s.count !== 1 ? 's' : ''}</p>
                </div>
                <p className={`text-base font-bold ${meta.text}`}>{formatCurrency(s.total)}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* ── By Branch breakdown ── */}
      {(stats?.by_branch?.length ?? 0) > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <MapPin className="w-3.5 h-3.5 text-slate-500" />
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide">Branches</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {stats!.by_branch.map(b => (
              <button key={b.branch_code}
                onClick={() => { setBranch(branchFilter === b.branch_code ? '' : b.branch_code); setPage(1) }}
                className={`text-left p-2.5 border ${branchFilter === b.branch_code ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-slate-50'} rounded-lg hover:border-blue-300 transition`}>
                <p className="text-[10px] font-semibold text-slate-500">{b.branch_code}</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">{formatCurrency(b.total)}</p>
                <p className="text-[10px] text-slate-400">{b.count} order{b.count !== 1 ? 's' : ''}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Filter bar (Excel-style) ── */}
      <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
        <span className="text-slate-500">
          Type into any column header below to filter the list (Excel-style).
        </span>
        {(sourceFilter || branchFilter) && (
          <span className="text-slate-400">
            Tile filters active:
            {sourceFilter && <span className="ml-1.5 px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded text-[10px]">{sourceFilter}</span>}
            {branchFilter && <span className="ml-1 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px]">{branchFilter}</span>}
            <button onClick={() => { setSource(''); setBranch(''); setPage(1) }}
              className="ml-1.5 text-blue-600 hover:underline">clear</button>
          </span>
        )}
        {hasColFilter && (
          <>
            <div className="w-px h-4 bg-slate-300 mx-1" />
            <button onClick={() => setColF(emptyColFilters)}
              className="flex items-center gap-1 px-2 py-0.5 text-red-500 hover:bg-red-50 rounded">
              <X className="w-3 h-3" /> Clear column filters
            </button>
            <span className="text-amber-600 font-medium ml-1">
              {filteredOrders.length} of {orders.length} shown
            </span>
          </>
        )}
      </div>

      {/* ── Orders table ── */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-2.5">Order #</th>
                <th className="text-left px-4 py-2.5">Date</th>
                <th className="text-left px-4 py-2.5">Source</th>
                <th className="text-left px-4 py-2.5">Branch</th>
                <th className="text-left px-4 py-2.5">Customer</th>
                <th className="text-right px-4 py-2.5">Amount</th>
                <th className="text-center px-4 py-2.5">Status</th>
                <th className="text-right px-4 py-2.5 w-24">View</th>
              </tr>
              {/* Excel-style per-column filter row */}
              <tr className="bg-slate-100 border-y border-slate-200">
                <th className="px-2 py-1">
                  <input value={colF.order_no} onChange={e => cf('order_no', e.target.value)}
                    placeholder="Filter…"
                    className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-400 normal-case font-normal text-slate-700" />
                </th>
                <th className="px-2 py-1">
                  <input value={colF.date} onChange={e => cf('date', e.target.value)}
                    placeholder="Filter…"
                    className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-400 normal-case font-normal text-slate-700" />
                </th>
                <th className="px-2 py-1">
                  <input value={colF.source} onChange={e => cf('source', e.target.value)}
                    placeholder="Filter…"
                    className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-400 normal-case font-normal text-slate-700" />
                </th>
                <th className="px-2 py-1">
                  <input value={colF.branch} onChange={e => cf('branch', e.target.value)}
                    placeholder="Filter…"
                    className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-400 normal-case font-normal text-slate-700" />
                </th>
                <th className="px-2 py-1">
                  <input value={colF.customer} onChange={e => cf('customer', e.target.value)}
                    placeholder="Filter…"
                    className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-400 normal-case font-normal text-slate-700" />
                </th>
                <th className="px-2 py-1">
                  <input value={colF.amount} onChange={e => cf('amount', e.target.value)}
                    placeholder="Filter…"
                    className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-400 normal-case font-normal text-right text-slate-700" />
                </th>
                <th className="px-2 py-1">
                  <input value={colF.status} onChange={e => cf('status', e.target.value)}
                    placeholder="Filter…"
                    className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-400 normal-case font-normal text-slate-700" />
                </th>
                <th className="px-2 py-1" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin inline-block" /> Loading…
                </td></tr>
              ) : filteredOrders.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-slate-400 text-sm">
                  {hasColFilter ? 'No orders match the column filters.' : 'No orders in this range.'}
                </td></tr>
              ) : filteredOrders.map(o => {
                const sm = SOURCE_META[o.source] ?? { label: o.source, bg: 'bg-slate-100', text: 'text-slate-700', icon: ShoppingBag }
                const SourceIcon = sm.icon
                return (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-mono text-xs font-semibold text-blue-700">{o.si_number}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-600">{formatDate(o.date)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${sm.bg} ${sm.text}`}>
                        <SourceIcon className="w-3 h-3" />
                        {sm.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs font-semibold text-slate-700">{o.branch_code}</td>
                    <td className="px-4 py-2.5">
                      <div className="text-xs font-medium text-slate-700">{o.customer?.name ?? o.walk_in_name ?? '—'}</div>
                      {o.reference && <div className="text-[10px] text-slate-400">{o.reference}</div>}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs font-semibold text-slate-800">{formatCurrency(o.amount)}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        o.payment_status === 'paid'    ? 'bg-emerald-100 text-emerald-800' :
                        o.payment_status === 'partial' ? 'bg-amber-100   text-amber-800'   :
                                                         'bg-rose-100    text-rose-800'
                      }`}>{o.payment_status.toUpperCase()}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => viewPdf(o)} title="View PDF"
                          className="p-1.5 text-slate-500 hover:bg-slate-100 rounded">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => printPdf(o)} title="Print"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {meta.last_page > 1 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 bg-slate-50">
            <span className="text-xs text-slate-500">Page {page} of {meta.last_page}</span>
            <div className="flex items-center gap-1">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="p-1.5 hover:bg-slate-100 rounded disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
              <button disabled={page >= meta.last_page} onClick={() => setPage(p => p + 1)}
                className="p-1.5 hover:bg-slate-100 rounded disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────── StatCard ───────────────────
function StatCard({ label, value, sub, color, bg }: {
  label: string; value: string; sub?: string; color: string; bg: string
}) {
  return (
    <div className={`${bg} border border-transparent rounded-xl p-3.5`}>
      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-bold ${color} mt-1`}>{value}</p>
      {sub && <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>}
    </div>
  )
}
