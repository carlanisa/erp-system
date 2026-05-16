'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Landmark, Plus, RefreshCw, Printer, Eye, Pencil, Trash2,
  ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, X, Loader2,
  CheckCircle, AlertCircle, ArrowLeft, ScanEye,
} from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

type Account = { id: number; name: string; code: string }
type BankRec = {
  id: number
  account: Account
  month: number
  year: number
  statement_balance: number
  book_balance: number
  adjusted_balance: number
  notes: string | null
  status: string
}

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December']

const currentYear  = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1

const emptyForm = {
  account_id: '',
  month: currentMonth,
  year: currentYear,
  statement_balance: '',
  book_balance: '',
  adjusted_balance: '',
  notes: '',
  status: 'open',
}

export default function BankReconciliationPage() {
  const router = useRouter()
  const [records, setRecords]   = useState<BankRec[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [yearFilter, setYearFilter] = useState(String(currentYear))
  const [statusFilter, setStatus]   = useState('')
  const [page, setPage]   = useState(1)
  const [perPage]         = useState(20)
  const [meta, setMeta]   = useState({ last_page: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<BankRec | null>(null)

  const [modal, setModal]     = useState(false)
  const [editing, setEditing] = useState<BankRec | null>(null)
  const [form, setForm]       = useState(emptyForm)
  const [saving, setSaving]   = useState(false)
  const [previewing, setPreviewing] = useState<BankRec | null>(null)

  useEffect(() => {
    api.get('/accounting/accounts/flat').then(r => {
      // Only show bank/cash accounts
      const bankAccs = r.data.data.filter((a: Account) =>
        a.code.startsWith('1') || a.name.toLowerCase().includes('bank') || a.name.toLowerCase().includes('cash')
      )
      setAccounts(bankAccs)
    })
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/accounting/bank-reconciliations', {
        params: { year: yearFilter, status: statusFilter, page, per_page: perPage },
      })
      setRecords(r.data.data)
      setMeta(r.data.meta)
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }, [yearFilter, statusFilter, page, perPage])

  useEffect(() => { load() }, [load])

  function openAdd() {
    setEditing(null)
    setForm(emptyForm)
    setModal(true)
  }

  function openEdit(r: BankRec) {
    setEditing(r)
    setForm({
      account_id: String(r.account.id),
      month: r.month,
      year: r.year,
      statement_balance: String(r.statement_balance),
      book_balance: String(r.book_balance),
      adjusted_balance: String(r.adjusted_balance),
      notes: r.notes ?? '',
      status: r.status,
    })
    setModal(true)
  }

  const difference = (parseFloat(form.statement_balance)||0) - (parseFloat(form.book_balance)||0)
  const isBalanced = Math.abs(difference) < 0.01

  async function save() {
    if (!form.account_id) { toast.error('Select a bank account'); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        month: Number(form.month),
        year: Number(form.year),
        statement_balance: parseFloat(form.statement_balance) || 0,
        book_balance: parseFloat(form.book_balance) || 0,
        adjusted_balance: parseFloat(form.adjusted_balance) || parseFloat(form.statement_balance) || 0,
      }
      if (editing) {
        const r = await api.put(`/accounting/bank-reconciliations/${editing.id}`, payload)
        setRecords(prev => prev.map(x => x.id === editing.id ? r.data.data : x))
        toast.success('Updated')
      } else {
        await api.post('/accounting/bank-reconciliations', payload)
        toast.success('Reconciliation created')
        load()
      }
      setModal(false)
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Error') }
    finally { setSaving(false) }
  }

  async function handleDelete(r: BankRec) {
    if (!confirm(`Delete reconciliation for ${MONTHS[r.month-1]} ${r.year}?`)) return
    try {
      await api.delete(`/accounting/bank-reconciliations/${r.id}`)
      toast.success('Deleted'); load()
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Cannot delete') }
  }

  const from = (page-1)*perPage+1
  const to   = Math.min(page*perPage, meta.total)
  const f    = (k: string, v: string|number) => setForm(p => ({...p,[k]:v}))

  const yearOptions = Array.from({ length: 6 }, (_,i) => currentYear - i)

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/accounting/general-ledger')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
            title="Back to General Ledger">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <div className="w-9 h-9 bg-teal-600 rounded-lg flex items-center justify-center">
            <Landmark className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Bank Reconciliation</h1>
            <p className="text-xs text-slate-500">Match book balance with bank statement balance</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openAdd} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> New Reconciliation
          </button>
          <button onClick={() => window.print()} className="btn-secondary flex items-center gap-2 text-sm">
            <Printer className="w-4 h-4" /> Print Report
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-slate-700 px-4 py-1.5 flex items-center gap-1">
        {[
          { icon: Eye,       label: 'View',    action: () => selected && openEdit(selected) },
          { icon: Pencil,    label: 'Edit',    action: () => selected && openEdit(selected) },
          { icon: RefreshCw, label: 'Refresh', action: load },
          { icon: Printer,   label: 'Print',   action: () => window.print() },
        ].map(({ icon: Icon, label, action }) => (
          <button key={label} onClick={action}
            className="flex flex-col items-center gap-0.5 px-3 py-1 rounded text-slate-300 hover:bg-slate-600 hover:text-white transition-colors text-xs min-w-[52px]">
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <select value={yearFilter} onChange={e=>{setYearFilter(e.target.value);setPage(1)}}
            className="py-1 px-2 text-xs rounded bg-slate-600 border border-slate-500 text-white focus:outline-none">
            <option value="">All Years</option>
            {yearOptions.map(y=><option key={y} value={y}>{y}</option>)}
          </select>
          <select value={statusFilter} onChange={e=>{setStatus(e.target.value);setPage(1)}}
            className="py-1 px-2 text-xs rounded bg-slate-600 border border-slate-500 text-white focus:outline-none">
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="reconciled">Reconciled</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-700 text-slate-200 sticky top-0">
              <th className="px-2 py-2 text-center w-8 font-medium">#</th>
              <th className="px-3 py-2 text-left font-medium">Bank Account</th>
              <th className="px-3 py-2 text-left font-medium">Period</th>
              <th className="px-3 py-2 text-right font-medium">Statement Balance</th>
              <th className="px-3 py-2 text-right font-medium">Book Balance</th>
              <th className="px-3 py-2 text-right font-medium">Difference</th>
              <th className="px-3 py-2 text-right font-medium">Adjusted Balance</th>
              <th className="px-3 py-2 text-center font-medium">Status</th>
              <th className="px-3 py-2 text-center font-medium w-16">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="text-center py-12">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
              </td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-12 text-slate-400">No reconciliation records found</td></tr>
            ) : records.map((r,i) => {
              const rowNum = (page-1)*perPage+i+1
              const isSel  = selected?.id === r.id
              const diff   = r.statement_balance - r.book_balance
              const isDiff = Math.abs(diff) > 0.01
              return (
                <tr key={r.id}
                  onClick={()=>setSelected(r)}
                  onDoubleClick={()=>openEdit(r)}
                  className={`${i%2===0?'bg-white':'bg-slate-50'} ${isSel?'ring-1 ring-inset ring-teal-400':''} cursor-pointer hover:bg-teal-50 transition-colors`}>
                  <td className="px-2 py-1.5 text-center text-slate-400">{rowNum}</td>
                  <td className="px-3 py-1.5">
                    <div className="font-medium text-slate-800">{r.account?.name}</div>
                    <div className="text-slate-400 font-mono text-[10px]">{r.account?.code}</div>
                  </td>
                  <td className="px-3 py-1.5 text-slate-700 font-medium">{MONTHS[r.month-1]} {r.year}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-slate-800">{formatCurrency(r.statement_balance)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-slate-800">{formatCurrency(r.book_balance)}</td>
                  <td className={`px-3 py-1.5 text-right font-mono font-semibold ${isDiff?'text-red-600':'text-green-600'}`}>
                    {isDiff ? diff.toFixed(2) : '—'}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-slate-800">{formatCurrency(r.adjusted_balance)}</td>
                  <td className="px-3 py-1.5 text-center">
                    {r.status === 'reconciled' ? (
                      <span className="flex items-center justify-center gap-1 text-green-600 font-semibold">
                        <CheckCircle className="w-3.5 h-3.5" /> Reconciled
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-1 text-amber-600 font-semibold">
                        <AlertCircle className="w-3.5 h-3.5" /> Open
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    <div className="flex justify-center gap-1" onClick={e=>e.stopPropagation()}>
                      <button onClick={()=>setPreviewing(r)} title="Preview / Print" className="p-1 hover:text-violet-600 text-slate-400 rounded"><ScanEye className="w-3 h-3" /></button>
                      <button onClick={()=>openEdit(r)} title="Edit" className="p-1 hover:text-teal-600 text-slate-400 rounded"><Pencil className="w-3 h-3" /></button>
                      <button onClick={()=>handleDelete(r)} title="Delete" className="p-1 hover:text-red-500 text-slate-400 rounded"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="bg-slate-100 border-t border-slate-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button onClick={()=>setPage(1)} disabled={page===1} className="p-1 rounded hover:bg-slate-200 disabled:opacity-40"><ChevronFirst className="w-4 h-4 text-slate-600" /></button>
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="p-1 rounded hover:bg-slate-200 disabled:opacity-40"><ChevronLeft className="w-4 h-4 text-slate-600" /></button>
          <span className="text-xs text-slate-600 px-2">Record <span className="font-semibold">{from}–{to}</span> of <span className="font-semibold">{meta.total}</span></span>
          <button onClick={()=>setPage(p=>Math.min(meta.last_page,p+1))} disabled={page===meta.last_page} className="p-1 rounded hover:bg-slate-200 disabled:opacity-40"><ChevronRight className="w-4 h-4 text-slate-600" /></button>
          <button onClick={()=>setPage(meta.last_page)} disabled={page===meta.last_page} className="p-1 rounded hover:bg-slate-200 disabled:opacity-40"><ChevronLast className="w-4 h-4 text-slate-600" /></button>
        </div>
        <span className="text-xs text-slate-500">Total Records: <span className="font-semibold text-slate-700">{meta.total}</span></span>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h2 className="font-bold text-slate-800 text-lg">
                {editing ? 'Edit Reconciliation' : 'New Bank Reconciliation'}
              </h2>
              <button onClick={()=>setModal(false)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 space-y-4">
              {/* Bank Account */}
              <div>
                <label className="form-label">Bank Account <span className="text-red-500">*</span></label>
                <select value={form.account_id} onChange={e=>f('account_id',e.target.value)} className="form-input" disabled={!!editing}>
                  <option value="">Select bank account…</option>
                  {accounts.map(a=><option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                </select>
              </div>

              {/* Period */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Month <span className="text-red-500">*</span></label>
                  <select value={form.month} onChange={e=>f('month',Number(e.target.value))} className="form-input" disabled={!!editing}>
                    {MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Year <span className="text-red-500">*</span></label>
                  <select value={form.year} onChange={e=>f('year',Number(e.target.value))} className="form-input" disabled={!!editing}>
                    {yearOptions.map(y=><option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              {/* Balances */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Bank Statement Balance (RM)</label>
                  <input type="number" step="0.01" value={form.statement_balance}
                    onChange={e=>f('statement_balance',e.target.value)}
                    placeholder="From bank statement"
                    className="form-input font-mono" />
                </div>
                <div>
                  <label className="form-label">Book Balance (RM)</label>
                  <input type="number" step="0.01" value={form.book_balance}
                    onChange={e=>f('book_balance',e.target.value)}
                    placeholder="From accounting records"
                    className="form-input font-mono" />
                </div>
              </div>

              {/* Difference indicator */}
              {(form.statement_balance || form.book_balance) && (
                <div className={`rounded-lg px-4 py-3 flex items-center justify-between ${isBalanced?'bg-green-50 border border-green-200':'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-center gap-2">
                    {isBalanced
                      ? <CheckCircle className="w-5 h-5 text-green-600" />
                      : <AlertCircle className="w-5 h-5 text-red-500" />}
                    <span className={`text-sm font-semibold ${isBalanced?'text-green-700':'text-red-600'}`}>
                      {isBalanced ? 'Balanced — no difference' : `Difference: ${formatCurrency(Math.abs(difference))}`}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="form-label">Adjusted Balance (RM)</label>
                <input type="number" step="0.01" value={form.adjusted_balance}
                  onChange={e=>f('adjusted_balance',e.target.value)}
                  placeholder="Final adjusted balance"
                  className="form-input font-mono" />
                <p className="text-xs text-slate-400 mt-1">After outstanding cheques, deposits in transit, bank errors etc.</p>
              </div>

              <div>
                <label className="form-label">Notes / Reconciling Items</label>
                <textarea value={form.notes} onChange={e=>f('notes',e.target.value)}
                  rows={3} placeholder="List outstanding items, adjustments…"
                  className="form-input resize-none" />
              </div>

              <div className="flex items-center gap-6">
                <label className="form-label mb-0">Status:</label>
                {['open','reconciled'].map(s=>(
                  <label key={s} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="rec-status" value={s} checked={form.status===s} onChange={()=>f('status',s)} className="accent-teal-600" />
                    <span className="text-sm capitalize text-slate-700">{s}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-100">
              <button onClick={()=>setModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editing ? 'Update' : 'Save Reconciliation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Print Preview overlay ── */}
      {previewing && (() => {
        const r        = previewing
        const diff     = r.book_balance - r.statement_balance
        const adjusted = r.adjusted_balance
        return (
          <div className="br-print-host fixed inset-0 z-50 flex flex-col bg-slate-200">
            <div className="bg-white border-b border-slate-200 px-5 py-2.5 flex items-center justify-between flex-shrink-0 print:hidden">
              <div className="flex items-center gap-3">
                <button onClick={() => setPreviewing(null)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center">
                  <Landmark className="w-4 h-4 text-teal-600" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Bank Reconciliation Preview</h2>
                  <p className="text-xs text-slate-400">{r.account?.code} — {r.account?.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white text-xs font-medium rounded hover:bg-teal-700">
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
                <button onClick={() => setPreviewing(null)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded hover:bg-red-600">
                  <X className="w-3.5 h-3.5" /> Close
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-8 print:p-0 print:overflow-visible">
              <div className="pv-print-area mx-auto bg-white shadow-lg print:shadow-none print:mx-0
                              w-[210mm] min-h-[297mm] p-12 print:p-10 text-slate-800 font-[Arial,Helvetica,sans-serif]">
                <div className="flex items-start justify-between border-b-2 border-slate-800 pb-4 mb-6">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">CARLANISA SDN BHD</h1>
                    <p className="text-xs text-slate-500 mt-0.5">Cloud Business Suite · ELBS ERP</p>
                  </div>
                  <div className="text-right">
                    <h2 className="text-2xl font-bold uppercase tracking-wider">Bank Reconciliation</h2>
                    <div className={`inline-block mt-2 px-3 py-1 border-2 rounded ${r.status==='reconciled'?'border-emerald-600 text-emerald-700':'border-amber-600 text-amber-700'}`}>
                      <span className="font-bold tracking-widest text-sm">{r.status.toUpperCase()}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-6 text-sm">
                  <div className="flex"><span className="w-32 text-slate-500">Bank Account</span><span className="font-bold font-mono">{r.account?.code} — {r.account?.name}</span></div>
                  <div className="flex"><span className="w-32 text-slate-500">Period</span><span className="font-semibold">{MONTHS[r.month-1]} {r.year}</span></div>
                </div>

                <table className="w-full text-sm border-collapse mb-6">
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="px-3 py-2.5 font-medium text-slate-700">Statement Balance (per Bank)</td>
                      <td className="px-3 py-2.5 text-right font-mono text-base">RM {r.statement_balance.toFixed(2)}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="px-3 py-2.5 font-medium text-slate-700">Book Balance (per Ledger)</td>
                      <td className="px-3 py-2.5 text-right font-mono text-base">RM {r.book_balance.toFixed(2)}</td>
                    </tr>
                    <tr className="border-b-2 border-slate-800">
                      <td className="px-3 py-2.5 font-semibold text-slate-700">Difference (Book − Statement)</td>
                      <td className={`px-3 py-2.5 text-right font-mono font-bold text-base ${Math.abs(diff)<0.01?'text-emerald-700':'text-red-700'}`}>
                        RM {diff.toFixed(2)}
                      </td>
                    </tr>
                    <tr className="bg-slate-100">
                      <td className="px-3 py-3 font-bold text-slate-800">Adjusted Balance</td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-lg">RM {adjusted.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>

                {r.notes && (
                  <div className="border border-slate-300 rounded p-3 mb-6">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Reconciliation Notes</div>
                    <div className="text-sm text-slate-700 whitespace-pre-wrap">{r.notes}</div>
                  </div>
                )}

                <div className={`p-4 rounded border mb-8 ${Math.abs(diff)<0.01 ? 'border-emerald-300 bg-emerald-50' : 'border-amber-300 bg-amber-50'}`}>
                  <p className="text-sm font-semibold">
                    {Math.abs(diff)<0.01
                      ? '✓ Account is reconciled — book and statement balances match.'
                      : `⚠ Variance of RM ${Math.abs(diff).toFixed(2)} — adjustments may be required.`}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-8 pt-12">
                  {['Prepared By', 'Reviewed By', 'Approved By'].map(label => (
                    <div key={label} className="text-center">
                      <div className="border-t border-slate-700 pt-2">
                        <div className="text-xs font-semibold text-slate-700">{label}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Name &amp; Signature</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="text-center text-[10px] text-slate-400 mt-8 pt-3 border-t border-slate-200">
                  System-generated · Printed: {new Date().toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
