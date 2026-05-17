'use client'

// Tailor Expense Audit Report — for auditors to see all tailor-related expenses
// at a glance, grouped by tailor with date-range filter and grand totals.

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, RefreshCw, Printer, Scissors, FileText, Calendar,
} from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

type Order = {
  order_no: string
  date: string
  pi_id: number
  pi_number: string
  pi_date: string
  pieces: number
  amount: number
  paid: number
  outstanding: number
  pi_status: string
  description: string | null
}
type TailorGroup = {
  tailor_id: number
  tailor_code: string | null
  tailor_name: string | null
  supplier_code: string | null
  orders: Order[]
  totals: {
    orders_count: number
    pieces: number
    amount: number
    paid: number
    outstanding: number
  }
}
type ReportData = {
  data: TailorGroup[]
  grand_total: {
    orders_count: number
    pieces: number
    amount: number
    paid: number
    outstanding: number
  }
  date_range: { from: string | null; to: string | null }
}

// Default to current month start / today
function defaultFrom(): string {
  const d = new Date(); d.setDate(1)
  return d.toISOString().slice(0, 10)
}
function defaultTo(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function TailorExpenseReportPage() {
  const router = useRouter()
  const [from, setFrom] = useState<string>(defaultFrom())
  const [to, setTo]     = useState<string>(defaultTo())
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/inventory/reports/tailor-expense', { params: { from, to } })
      setData(r.data?.data ?? null)
    } catch {} finally { setLoading(false) }
  }, [from, to])

  useEffect(() => { load() }, [load])

  const handlePrint = () => window.print()

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-slate-50">
      {/* Header — hidden on print */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded border border-slate-200">
            <ArrowLeft className="w-3.5 h-3.5"/> Back
          </button>
          <div className="w-9 h-9 bg-fuchsia-50 rounded-xl flex items-center justify-center">
            <Scissors className="w-5 h-5 text-fuchsia-600"/>
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800">Tailor Expense Audit Report</h1>
            <p className="text-xs text-slate-400">Inventory → Reports → All tailor-related expenses grouped by tailor</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-600 text-white text-xs font-medium rounded-lg hover:bg-slate-700">
            <RefreshCw className="w-3.5 h-3.5"/> Refresh
          </button>
          <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 bg-fuchsia-600 text-white text-xs font-medium rounded-lg hover:bg-fuchsia-700">
            <Printer className="w-3.5 h-3.5"/> Print
          </button>
        </div>
      </div>

      {/* Filters — hidden on print */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-3 no-print">
        <Calendar className="w-3.5 h-3.5 text-slate-400"/>
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-slate-500">From:</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="px-2 py-1 text-xs border border-slate-200 rounded font-mono"/>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-slate-500">To:</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="px-2 py-1 text-xs border border-slate-200 rounded font-mono"/>
        </div>
        <div className="ml-auto text-[11px] text-slate-500">
          {data && (
            <>Tailors: <b className="text-slate-700">{data.data.length}</b> · Invoices: <b className="text-slate-700">{data.grand_total.orders_count}</b></>
          )}
        </div>
      </div>

      {/* Report Body */}
      <div className="flex-1 overflow-auto p-4 print-area">
        <div className="max-w-5xl mx-auto bg-white border border-slate-200 rounded-lg shadow-sm">
          {/* Print header */}
          <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Tailor Expense Audit Report</h2>
                <p className="text-xs text-slate-500 mt-0.5">Outsourced production cost summary · grouped per tailor</p>
              </div>
              <div className="text-right text-xs text-slate-600">
                <div>Period: <b className="font-mono">{from || '—'} to {to || '—'}</b></div>
                <div className="mt-1">Generated: {new Date().toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            {loading ? (
              <div className="text-center text-slate-400 py-12 text-sm">Loading report…</div>
            ) : !data || data.data.length === 0 ? (
              <div className="text-center text-slate-400 py-12">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-30"/>
                <p className="text-sm">No tailor expenses in this date range</p>
              </div>
            ) : (
              <>
                {data.data.map((group, gi) => (
                  <div key={group.tailor_id} className={`${gi > 0 ? 'mt-6' : ''}`}>
                    {/* Tailor header */}
                    <div className="bg-fuchsia-50 border-l-4 border-fuchsia-500 px-3 py-2 mb-2 rounded">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-bold text-fuchsia-900">{group.tailor_name || '—'}</div>
                          <div className="text-[10px] text-fuchsia-700 font-mono">
                            Tailor Code: <b>{group.tailor_code}</b>
                            {group.supplier_code && <> · Auto-Supplier: <b>{group.supplier_code}</b></>}
                          </div>
                        </div>
                        <div className="text-right text-xs">
                          <div className="text-[10px] text-slate-500 uppercase">Invoices · Pieces · Amount</div>
                          <div className="font-mono">
                            <b className="text-fuchsia-700">{group.totals.orders_count}</b>
                            {' · '}
                            <b className="text-fuchsia-700">{group.totals.pieces}</b>
                            {' · '}
                            <b className="text-fuchsia-700">RM {group.totals.amount.toFixed(2)}</b>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Orders table */}
                    <table className="w-full text-xs">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="text-center w-8 px-2 py-1.5 text-[10px] uppercase font-semibold text-slate-600">#</th>
                          <th className="text-left px-2 py-1.5 text-[10px] uppercase font-semibold text-slate-600 w-24">TO Date</th>
                          <th className="text-left px-2 py-1.5 text-[10px] uppercase font-semibold text-slate-600 w-28">TO Ref</th>
                          <th className="text-left px-2 py-1.5 text-[10px] uppercase font-semibold text-slate-600 w-28">PI Ref</th>
                          <th className="text-right px-2 py-1.5 text-[10px] uppercase font-semibold text-slate-600 w-16">Pieces</th>
                          <th className="text-right px-2 py-1.5 text-[10px] uppercase font-semibold text-slate-600 w-24">Amount</th>
                          <th className="text-right px-2 py-1.5 text-[10px] uppercase font-semibold text-emerald-700 w-24">Paid</th>
                          <th className="text-right px-2 py-1.5 text-[10px] uppercase font-semibold text-amber-700 w-24">Outstanding</th>
                          <th className="text-center px-2 py-1.5 text-[10px] uppercase font-semibold text-slate-600 w-20">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.orders.map((o, i) => (
                          <tr key={o.pi_id} className="border-t border-slate-100">
                            <td className="px-2 py-1.5 text-center text-slate-400">{i + 1}</td>
                            <td className="px-2 py-1.5 font-mono text-slate-700">{o.date}</td>
                            <td className="px-2 py-1.5 font-mono font-semibold text-fuchsia-700">{o.order_no}</td>
                            <td className="px-2 py-1.5 font-mono font-semibold text-blue-700">{o.pi_number}</td>
                            <td className="px-2 py-1.5 text-right font-mono">{o.pieces}</td>
                            <td className="px-2 py-1.5 text-right font-mono font-semibold">{o.amount.toFixed(2)}</td>
                            <td className="px-2 py-1.5 text-right font-mono text-emerald-700">{o.paid.toFixed(2)}</td>
                            <td className="px-2 py-1.5 text-right font-mono font-semibold text-amber-700">{o.outstanding.toFixed(2)}</td>
                            <td className="px-2 py-1.5 text-center">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                o.outstanding <= 0.01 ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                              }`}>{o.outstanding <= 0.01 ? 'Paid' : 'Open'}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-fuchsia-50/40 border-t-2 border-fuchsia-300">
                        <tr>
                          <td colSpan={4} className="px-2 py-1.5 text-right text-[10px] uppercase font-bold text-fuchsia-700">Subtotal — {group.tailor_name}:</td>
                          <td className="px-2 py-1.5 text-right font-mono font-bold text-fuchsia-700">{group.totals.pieces}</td>
                          <td className="px-2 py-1.5 text-right font-mono font-bold text-fuchsia-800">RM {group.totals.amount.toFixed(2)}</td>
                          <td className="px-2 py-1.5 text-right font-mono font-bold text-emerald-700">RM {group.totals.paid.toFixed(2)}</td>
                          <td className="px-2 py-1.5 text-right font-mono font-bold text-amber-700">RM {group.totals.outstanding.toFixed(2)}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ))}

                {/* Grand Total */}
                <div className="mt-8 border-t-4 border-slate-700 pt-4">
                  <div className="bg-slate-700 text-white rounded p-3">
                    <div className="text-[11px] font-bold uppercase tracking-wide mb-2">Grand Total — All Tailors</div>
                    <div className="grid grid-cols-5 gap-4 text-xs">
                      <div>
                        <div className="text-[10px] text-slate-300 uppercase">Invoices</div>
                        <div className="text-base font-bold font-mono">{data.grand_total.orders_count}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-300 uppercase">Pieces</div>
                        <div className="text-base font-bold font-mono">{data.grand_total.pieces}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-300 uppercase">Total Invoiced</div>
                        <div className="text-base font-extrabold font-mono">RM {data.grand_total.amount.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-emerald-200 uppercase">Paid</div>
                        <div className="text-base font-bold font-mono text-emerald-200">RM {data.grand_total.paid.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-amber-200 uppercase">Outstanding</div>
                        <div className="text-base font-extrabold font-mono text-amber-200">RM {data.grand_total.outstanding.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Audit notes */}
                <div className="mt-6 bg-slate-50 border border-slate-200 rounded p-3 text-[11px] text-slate-600 space-y-1">
                  <p><b className="text-slate-800">📋 Audit notes:</b></p>
                  <ul className="list-disc pl-5 space-y-0.5">
                    <li>Each invoice (PI-XXXXX) is auto-generated from a Tailor Order (TO-XXXXX) — fully traceable.</li>
                    <li>Tailor suppliers are coded <span className="font-mono bg-slate-100 px-1 rounded">SUP-T-XXXX</span> (the "T" prefix distinguishes them from regular vendors).</li>
                    <li>Amounts shown are <b>stitching/labor only</b> — raw material (fabric) cost is NOT charged to tailor; it's tracked separately under Purchase Invoices to fabric suppliers.</li>
                    <li>"Outstanding" = invoice amount − payments recorded against that PI.</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          body * { visibility: hidden !important; }
          .print-area, .print-area * { visibility: visible !important; }
          .print-area { position: absolute !important; inset: 0 !important; padding: 0 !important; background: white !important; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  )
}
