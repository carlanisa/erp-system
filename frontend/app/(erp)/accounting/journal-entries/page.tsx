'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  GitMerge, Plus, Search, RefreshCw, Printer, Eye, Pencil, Trash2,
  ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, X, Loader2,
  PlusCircle, MinusCircle, ArrowLeft, ScanEye,
} from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

type Account = { id: number; name: string; code: string }
type JLine = { account_id: string; type: 'debit' | 'credit'; amount: string; description: string }
type JEntry = {
  id: number
  number: string
  date: string
  description: string
  reference: string | null
  status: string
  lines: { id: number; account: Account; type: string; amount: number; description: string | null }[]
}

// Column filter state
type ColFilters = {
  entry_no: string
  date: string
  description: string
  reference: string
  status: string
}

const emptyColFilters: ColFilters = {
  entry_no: '', date: '', description: '', reference: '', status: '',
}

const emptyLine: JLine = { account_id: '', type: 'debit', amount: '', description: '' }

const emptyForm = {
  date: new Date().toISOString().slice(0,10),
  description: '',
  reference: '',
  status: 'draft',
  lines: [
    { ...emptyLine, type: 'debit'  as const },
    { ...emptyLine, type: 'credit' as const },
  ],
}

export default function JournalEntriesPage() {
  const router = useRouter()
  const [records, setRecords]     = useState<JEntry[]>([])
  const [accounts, setAccounts]   = useState<Account[]>([])
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatus] = useState('')
  const [page, setPage]           = useState(1)
  const [perPage]                 = useState(20)
  const [meta, setMeta]           = useState({ last_page: 1, total: 0 })
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState<JEntry | null>(null)
  const [expanded, setExpanded]   = useState<number | null>(null)

  const [modal, setModal]   = useState(false)
  const [editing, setEditing] = useState<JEntry | null>(null)
  const [form, setForm]     = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [previewing, setPreviewing] = useState<JEntry | null>(null)

  // Column-level filters (client-side on current page data)
  const [colF, setColF] = useState<ColFilters>(emptyColFilters)

  useEffect(() => {
    api.get('/accounting/accounts/flat').then(r => setAccounts(r.data.data))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/accounting/journal-entries', {
        params: { search, status: statusFilter, page, per_page: perPage },
      })
      setRecords(r.data.data)
      setMeta(r.data.meta)
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }, [search, statusFilter, page, perPage])

  useEffect(() => { load() }, [load])

  // ── Client-side column filtering ──────────────────────────────
  const filtered = useMemo(() => {
    return records.filter(r => {
      return (
        (!colF.entry_no    || r.number.toLowerCase().includes(colF.entry_no.toLowerCase()))          &&
        (!colF.date        || formatDate(r.date).toLowerCase().includes(colF.date.toLowerCase()))    &&
        (!colF.description || r.description.toLowerCase().includes(colF.description.toLowerCase()))  &&
        (!colF.reference   || (r.reference ?? '').toLowerCase().includes(colF.reference.toLowerCase())) &&
        (!colF.status      || r.status.toLowerCase().includes(colF.status.toLowerCase()))
      )
    })
  }, [records, colF])

  const hasColFilter = Object.values(colF).some(v => v !== '')

  function cf(k: keyof ColFilters, v: string) {
    setColF(p => ({ ...p, [k]: v }))
  }

  function clearColFilters() {
    setColF(emptyColFilters)
  }

  function openAdd() {
    setEditing(null)
    setForm({ ...emptyForm, lines: [
      { account_id: '', type: 'debit',  amount: '', description: '' },
      { account_id: '', type: 'credit', amount: '', description: '' },
    ]})
    setModal(true)
  }

  function openEdit(e: JEntry) {
    setEditing(e)
    setForm({
      date: e.date.slice(0,10),
      description: e.description,
      reference: e.reference ?? '',
      status: e.status,
      lines: e.lines.map(l => ({
        account_id: String(l.account.id),
        type: l.type as 'debit'|'credit',
        amount: String(l.amount),
        description: l.description ?? '',
      })),
    })
    setModal(true)
  }

  function addLine(type: 'debit'|'credit') {
    setForm(p => ({ ...p, lines: [...p.lines, { account_id:'', type, amount:'', description:'' }] }))
  }

  function removeLine(idx: number) {
    setForm(p => ({ ...p, lines: p.lines.filter((_,i) => i !== idx) }))
  }

  function updateLine(idx: number, key: keyof JLine, val: string) {
    setForm(p => ({
      ...p,
      lines: p.lines.map((l,i) => i===idx ? { ...l, [key]: val } : l),
    }))
  }

  const totalDebit  = form.lines.filter(l=>l.type==='debit').reduce((s,l)=>s+(parseFloat(l.amount)||0),0)
  const totalCredit = form.lines.filter(l=>l.type==='credit').reduce((s,l)=>s+(parseFloat(l.amount)||0),0)
  const balanced    = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0

  async function save() {
    if (!form.description) { toast.error('Enter a description'); return }
    if (!balanced) { toast.error('Debits must equal credits'); return }
    if (form.lines.some(l => !l.account_id || !l.amount)) { toast.error('Fill all line items'); return }

    setSaving(true)
    try {
      const payload = {
        ...form,
        lines: form.lines.map(l => ({ ...l, amount: parseFloat(l.amount) })),
      }
      if (editing) {
        const r = await api.put(`/accounting/journal-entries/${editing.id}`, payload)
        setRecords(prev => prev.map(x => x.id === editing.id ? r.data.data : x))
        toast.success('Updated')
      } else {
        await api.post('/accounting/journal-entries', payload)
        toast.success('Journal entry created')
        load()
      }
      setModal(false)
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Error')
    } finally { setSaving(false) }
  }

  async function handleDelete(e: JEntry) {
    if (!confirm(`Delete ${e.number}?`)) return
    try {
      await api.delete(`/accounting/journal-entries/${e.id}`)
      toast.success('Deleted')
      load()
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Cannot delete') }
  }

  const from = (page-1)*perPage+1
  const to   = Math.min(page*perPage, meta.total)

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
          <div className="w-9 h-9 bg-violet-600 rounded-lg flex items-center justify-center">
            <GitMerge className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Journal Entries</h1>
            <p className="text-xs text-slate-500">Double-entry bookkeeping — debits must equal credits</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openAdd} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> New Journal Entry
          </button>
          <button onClick={() => window.print()} className="btn-secondary flex items-center gap-2 text-sm">
            <Printer className="w-4 h-4" /> Print Listing
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
        {hasColFilter && (
          <>
            <div className="w-px h-5 bg-slate-500 mx-1" />
            <button onClick={clearColFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-300 hover:bg-slate-600 rounded border border-transparent hover:border-slate-500">
              <X className="w-3.5 h-3.5" /> Clear Filters
            </button>
            <span className="text-xs text-amber-400 font-medium ml-1">
              {filtered.length} of {records.length} shown
            </span>
          </>
        )}
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}
              placeholder="Search entries…"
              className="pl-7 pr-3 py-1 text-xs rounded bg-slate-600 border border-slate-500 text-white placeholder-slate-400 focus:outline-none focus:border-violet-400 w-48" />
          </div>
          <select value={statusFilter} onChange={e=>{setStatus(e.target.value);setPage(1)}}
            className="py-1 px-2 text-xs rounded bg-slate-600 border border-slate-500 text-white focus:outline-none">
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="posted">Posted</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-700 text-slate-200 sticky top-0">
              <th className="px-2 py-2 text-center w-8 font-medium">#</th>
              <th className="px-3 py-2 text-left font-medium">Entry No</th>
              <th className="px-3 py-2 text-left font-medium">Date</th>
              <th className="px-3 py-2 text-left font-medium">Description</th>
              <th className="px-3 py-2 text-left font-medium">Reference</th>
              <th className="px-3 py-2 text-right font-medium">Total Debit</th>
              <th className="px-3 py-2 text-center font-medium">Status</th>
              <th className="px-3 py-2 text-center font-medium w-16">Action</th>
            </tr>

            {/* ── Column filter inputs row (ELBS style) ── */}
            <tr className="bg-slate-600 border-b-2 border-slate-500">
              <th className="px-2 py-1" />
              {/* Entry No */}
              <th className="px-1.5 py-1">
                <input
                  value={colF.entry_no}
                  onChange={e => cf('entry_no', e.target.value)}
                  placeholder="Filter…"
                  className="w-full px-2 py-1 text-xs bg-slate-500 border border-slate-400 rounded text-white placeholder-slate-300 focus:outline-none focus:border-yellow-400 focus:bg-slate-400"
                />
              </th>
              {/* Date */}
              <th className="px-1.5 py-1">
                <input
                  value={colF.date}
                  onChange={e => cf('date', e.target.value)}
                  placeholder="Filter…"
                  className="w-full px-2 py-1 text-xs bg-slate-500 border border-slate-400 rounded text-white placeholder-slate-300 focus:outline-none focus:border-yellow-400 focus:bg-slate-400"
                />
              </th>
              {/* Description */}
              <th className="px-1.5 py-1">
                <input
                  value={colF.description}
                  onChange={e => cf('description', e.target.value)}
                  placeholder="Filter…"
                  className="w-full px-2 py-1 text-xs bg-slate-500 border border-slate-400 rounded text-white placeholder-slate-300 focus:outline-none focus:border-yellow-400 focus:bg-slate-400"
                />
              </th>
              {/* Reference */}
              <th className="px-1.5 py-1">
                <input
                  value={colF.reference}
                  onChange={e => cf('reference', e.target.value)}
                  placeholder="Filter…"
                  className="w-full px-2 py-1 text-xs bg-slate-500 border border-slate-400 rounded text-white placeholder-slate-300 focus:outline-none focus:border-yellow-400 focus:bg-slate-400"
                />
              </th>
              {/* Total Debit — no filter */}
              <th className="px-2 py-1" />
              {/* Status */}
              <th className="px-1.5 py-1">
                <input
                  value={colF.status}
                  onChange={e => cf('status', e.target.value)}
                  placeholder="Filter…"
                  className="w-full px-2 py-1 text-xs bg-slate-500 border border-slate-400 rounded text-white placeholder-slate-300 focus:outline-none focus:border-yellow-400 focus:bg-slate-400"
                />
              </th>
              <th className="px-2 py-1" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-slate-400">
                {hasColFilter ? 'No records match the column filters' : 'No journal entries found'}
              </td></tr>
            ) : filtered.map((r, i) => {
              const rowNum   = (page-1)*perPage+i+1
              const isSel    = selected?.id === r.id
              const isExp    = expanded === r.id
              const debitSum = r.lines?.filter(l=>l.type==='debit').reduce((s,l)=>s+l.amount,0) ?? 0
              return (
                <>
                  <tr key={r.id}
                    onClick={() => { setSelected(r); setExpanded(isExp ? null : r.id) }}
                    className={`${i%2===0?'bg-white':'bg-slate-50'} ${isSel?'ring-1 ring-inset ring-violet-400':''} cursor-pointer hover:bg-violet-50 transition-colors`}>
                    <td className="px-2 py-1.5 text-center text-slate-400">{rowNum}</td>
                    <td className="px-3 py-1.5 font-mono text-violet-700 font-semibold">{r.number}</td>
                    <td className="px-3 py-1.5 text-slate-600">{formatDate(r.date)}</td>
                    <td className="px-3 py-1.5 text-slate-800 font-medium">{r.description}</td>
                    <td className="px-3 py-1.5 text-slate-500 font-mono">{r.reference ?? '—'}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-slate-800">{debitSum.toFixed(2)}</td>
                    <td className="px-3 py-1.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${r.status==='posted'?'bg-green-100 text-green-700':'bg-amber-100 text-amber-700'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <div className="flex justify-center gap-1" onClick={e=>e.stopPropagation()}>
                        <button onClick={()=>setPreviewing(r)} title="Preview / Print" className="p-1 hover:text-violet-600 text-slate-400 rounded"><ScanEye className="w-3 h-3" /></button>
                        <button onClick={()=>openEdit(r)} title="Edit" className="p-1 hover:text-violet-600 text-slate-400 rounded"><Pencil className="w-3 h-3" /></button>
                        <button onClick={()=>handleDelete(r)} title="Delete" className="p-1 hover:text-red-500 text-slate-400 rounded"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </td>
                  </tr>
                  {isExp && r.lines && (
                    <tr key={`exp-${r.id}`} className="bg-violet-50">
                      <td colSpan={8} className="px-8 py-2">
                        <table className="w-full text-xs border border-violet-200 rounded">
                          <thead>
                            <tr className="bg-violet-100 text-violet-700">
                              <th className="px-3 py-1 text-left">Account</th>
                              <th className="px-3 py-1 text-left">Description</th>
                              <th className="px-3 py-1 text-right">Debit</th>
                              <th className="px-3 py-1 text-right">Credit</th>
                            </tr>
                          </thead>
                          <tbody>
                            {r.lines.map((l,li) => (
                              <tr key={li} className="border-t border-violet-100">
                                <td className="px-3 py-1 font-mono text-slate-700">{l.account.code} — {l.account.name}</td>
                                <td className="px-3 py-1 text-slate-600">{l.description ?? '—'}</td>
                                <td className="px-3 py-1 text-right font-mono text-slate-800">{l.type==='debit'?l.amount.toFixed(2):'—'}</td>
                                <td className="px-3 py-1 text-right font-mono text-slate-800">{l.type==='credit'?l.amount.toFixed(2):'—'}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-violet-200 bg-violet-50 font-semibold">
                              <td colSpan={2} className="px-3 py-1 text-right text-violet-700">Totals</td>
                              <td className="px-3 py-1 text-right font-mono">{r.lines.filter(l=>l.type==='debit').reduce((s,l)=>s+l.amount,0).toFixed(2)}</td>
                              <td className="px-3 py-1 text-right font-mono">{r.lines.filter(l=>l.type==='credit').reduce((s,l)=>s+l.amount,0).toFixed(2)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>

          {/* ── Footer total row ── */}
          {filtered.length > 0 && (
            <tfoot className="bg-slate-700 text-white sticky bottom-0">
              <tr>
                <td colSpan={8} className="px-3 py-2 text-xs font-semibold text-right">
                  {hasColFilter ? `${filtered.length} filtered` : `${meta.total} entries`}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Footer Navigator */}
      <div className="bg-slate-100 border-t border-slate-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button onClick={()=>setPage(1)} disabled={page===1} className="p-1 rounded hover:bg-slate-200 disabled:opacity-40"><ChevronFirst className="w-4 h-4 text-slate-600" /></button>
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="p-1 rounded hover:bg-slate-200 disabled:opacity-40"><ChevronLeft className="w-4 h-4 text-slate-600" /></button>
          <span className="text-xs text-slate-600 px-2">Record <span className="font-semibold">{from}–{to}</span> of <span className="font-semibold">{meta.total}</span></span>
          <button onClick={()=>setPage(p=>Math.min(meta.last_page,p+1))} disabled={page===meta.last_page} className="p-1 rounded hover:bg-slate-200 disabled:opacity-40"><ChevronRight className="w-4 h-4 text-slate-600" /></button>
          <button onClick={()=>setPage(meta.last_page)} disabled={page===meta.last_page} className="p-1 rounded hover:bg-slate-200 disabled:opacity-40"><ChevronLast className="w-4 h-4 text-slate-600" /></button>
        </div>
        <span className="text-xs text-slate-500">
          Total Entries: <span className="font-semibold text-slate-700">{meta.total}</span>
        </span>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h2 className="font-bold text-slate-800 text-lg">
                {editing ? `Edit ${editing.number}` : 'New Journal Entry'}
              </h2>
              <button onClick={()=>setModal(false)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 space-y-4">
              {/* Header fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Date <span className="text-red-500">*</span></label>
                  <input type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Reference</label>
                  <input value={form.reference} onChange={e=>setForm(p=>({...p,reference:e.target.value}))} placeholder="Ref no." className="form-input" />
                </div>
              </div>

              <div>
                <label className="form-label">Description / Narration <span className="text-red-500">*</span></label>
                <input value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="Journal description…" className="form-input" />
              </div>

              {/* Lines table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="form-label mb-0">Journal Lines</label>
                  <div className="flex gap-2">
                    <button onClick={()=>addLine('debit')} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                      <PlusCircle className="w-3.5 h-3.5" /> Add Debit
                    </button>
                    <button onClick={()=>addLine('credit')} className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800">
                      <PlusCircle className="w-3.5 h-3.5" /> Add Credit
                    </button>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600">
                        <th className="px-3 py-2 text-left font-medium">Account</th>
                        <th className="px-3 py-2 text-left font-medium w-20">Type</th>
                        <th className="px-3 py-2 text-right font-medium w-28">Amount (RM)</th>
                        <th className="px-3 py-2 text-left font-medium">Description</th>
                        <th className="px-2 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.lines.map((line, idx) => (
                        <tr key={idx} className={`border-t border-slate-100 ${line.type==='debit'?'bg-blue-50/50':'bg-green-50/50'}`}>
                          <td className="px-2 py-1">
                            <select
                              value={line.account_id}
                              onChange={e=>updateLine(idx,'account_id',e.target.value)}
                              className="w-full text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-violet-400"
                            >
                              <option value="">Select account…</option>
                              {accounts.map(a=><option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                            </select>
                          </td>
                          <td className="px-2 py-1">
                            <select
                              value={line.type}
                              onChange={e=>updateLine(idx,'type',e.target.value)}
                              className={`w-full text-xs border rounded px-2 py-1 focus:outline-none font-semibold ${line.type==='debit'?'border-blue-200 text-blue-700':'border-green-200 text-green-700'}`}
                            >
                              <option value="debit">Dr</option>
                              <option value="credit">Cr</option>
                            </select>
                          </td>
                          <td className="px-2 py-1">
                            <input
                              type="number" min="0.01" step="0.01"
                              value={line.amount}
                              onChange={e=>updateLine(idx,'amount',e.target.value)}
                              placeholder="0.00"
                              className="w-full text-xs border border-slate-200 rounded px-2 py-1 text-right focus:outline-none focus:border-violet-400 font-mono"
                            />
                          </td>
                          <td className="px-2 py-1">
                            <input
                              value={line.description}
                              onChange={e=>updateLine(idx,'description',e.target.value)}
                              placeholder="Note…"
                              className="w-full text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-violet-400"
                            />
                          </td>
                          <td className="px-2 py-1 text-center">
                            {form.lines.length > 2 && (
                              <button onClick={()=>removeLine(idx)} className="text-red-400 hover:text-red-600">
                                <MinusCircle className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-xs">
                        <td colSpan={2} className="px-3 py-2 text-slate-600">Totals</td>
                        <td className="px-3 py-2">
                          <div className="text-right space-y-0.5">
                            <div className="text-blue-700">Dr: {totalDebit.toFixed(2)}</div>
                            <div className="text-green-700">Cr: {totalCredit.toFixed(2)}</div>
                          </div>
                        </td>
                        <td colSpan={2} className="px-3 py-2">
                          {balanced ? (
                            <span className="text-green-600 font-semibold">✓ Balanced</span>
                          ) : (
                            <span className="text-red-500 font-semibold">
                              Diff: {Math.abs(totalDebit - totalCredit).toFixed(2)}
                            </span>
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-6">
                <label className="form-label mb-0">Status:</label>
                {['draft','posted'].map(s => (
                  <label key={s} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="je-status" value={s} checked={form.status===s} onChange={()=>setForm(p=>({...p,status:s}))} className="accent-violet-600" />
                    <span className="text-sm capitalize text-slate-700">{s}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-100">
              <button onClick={()=>setModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={save} disabled={saving||!balanced} className="btn-primary flex items-center gap-2 disabled:opacity-50">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editing ? 'Update Entry' : 'Post Journal Entry'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Print Preview overlay ── */}
      {previewing && (() => {
        const r = previewing
        const debitTotal  = (r.lines ?? []).filter(l => l.type === 'debit').reduce((s,l) => s + l.amount, 0)
        const creditTotal = (r.lines ?? []).filter(l => l.type === 'credit').reduce((s,l) => s + l.amount, 0)
        return (
          <div className="je-print-host fixed inset-0 z-50 flex flex-col bg-slate-200">
            {/* Toolbar — hidden on print */}
            <div className="bg-white border-b border-slate-200 px-5 py-2.5 flex items-center justify-between flex-shrink-0 print:hidden">
              <div className="flex items-center gap-3">
                <button onClick={() => setPreviewing(null)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center">
                  <ScanEye className="w-4 h-4 text-violet-600" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Journal Entry Preview · {r.number}</h2>
                  <p className="text-xs text-slate-400">Click Print to send to printer</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-xs font-medium rounded hover:bg-violet-700">
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
                <button onClick={() => setPreviewing(null)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded hover:bg-red-600">
                  <X className="w-3.5 h-3.5" /> Close
                </button>
              </div>
            </div>

            {/* Document body */}
            <div className="flex-1 overflow-y-auto py-8 print:p-0 print:overflow-visible">
              <div className="pv-print-area mx-auto bg-white shadow-lg print:shadow-none print:mx-0
                              w-[210mm] min-h-[297mm] p-12 print:p-10 text-slate-800 font-[Arial,Helvetica,sans-serif]">
                {/* Header */}
                <div className="flex items-start justify-between border-b-2 border-slate-800 pb-4 mb-6">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">CARLANISA SDN BHD</h1>
                    <p className="text-xs text-slate-500 mt-0.5">Cloud Business Suite · ELBS ERP</p>
                    <p className="text-xs text-slate-500">www.elbs.com.my · elbsit@gmail.com</p>
                  </div>
                  <div className="text-right">
                    <h2 className="text-2xl font-bold uppercase tracking-wider">Journal Entry</h2>
                    <div className={`inline-block mt-2 px-3 py-1 border-2 rounded ${r.status==='posted'?'border-emerald-600 text-emerald-700':'border-amber-600 text-amber-700'}`}>
                      <span className="font-bold tracking-widest text-sm">{r.status.toUpperCase()}</span>
                    </div>
                  </div>
                </div>

                {/* Meta */}
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-6 text-sm">
                  <div className="flex"><span className="w-32 text-slate-500">Entry No.</span><span className="font-bold font-mono text-violet-700">{r.number}</span></div>
                  <div className="flex"><span className="w-32 text-slate-500">Date</span><span className="font-semibold">{formatDate(r.date)}</span></div>
                  <div className="flex"><span className="w-32 text-slate-500">Reference</span><span className="font-mono">{r.reference || '—'}</span></div>
                  <div className="flex"><span className="w-32 text-slate-500">Status</span><span className="font-semibold capitalize">{r.status}</span></div>
                </div>

                {/* Description */}
                <div className="border border-slate-300 rounded p-3 mb-6">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Description</div>
                  <div className="text-sm font-medium">{r.description || '—'}</div>
                </div>

                {/* Lines table */}
                <table className="w-full text-sm border-collapse mb-4">
                  <thead>
                    <tr className="bg-slate-800 text-white">
                      <th className="px-3 py-2 text-left font-semibold w-12">#</th>
                      <th className="px-3 py-2 text-left font-semibold w-28">A/C Code</th>
                      <th className="px-3 py-2 text-left font-semibold">Account Title</th>
                      <th className="px-3 py-2 text-left font-semibold">Description</th>
                      <th className="px-3 py-2 text-right font-semibold w-32">Debit (RM)</th>
                      <th className="px-3 py-2 text-right font-semibold w-32">Credit (RM)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(r.lines ?? []).map((l, i) => (
                      <tr key={l.id} className="border-b border-slate-200">
                        <td className="px-3 py-2 text-slate-500">{i+1}</td>
                        <td className="px-3 py-2 font-mono">{l.account.code}</td>
                        <td className="px-3 py-2 font-medium">{l.account.name}</td>
                        <td className="px-3 py-2 text-slate-700">{l.description || '—'}</td>
                        <td className="px-3 py-2 text-right font-mono">{l.type==='debit'  ? l.amount.toFixed(2) : ''}</td>
                        <td className="px-3 py-2 text-right font-mono">{l.type==='credit' ? l.amount.toFixed(2) : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 border-t-2 border-slate-800">
                      <td colSpan={4} className="px-3 py-2.5 text-right font-bold">TOTAL</td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold">{debitTotal.toFixed(2)}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold">{creditTotal.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>

                {/* Balance check */}
                <div className={`mb-8 p-3 rounded border ${Math.abs(debitTotal-creditTotal)<0.01 ? 'border-emerald-300 bg-emerald-50' : 'border-red-300 bg-red-50'}`}>
                  <span className="text-xs font-semibold text-slate-600">Balance Check: </span>
                  <span className="text-xs font-mono">
                    Debits {debitTotal.toFixed(2)} = Credits {creditTotal.toFixed(2)}
                    {Math.abs(debitTotal-creditTotal)<0.01 ? ' ✓ Balanced' : ` ✗ Out by ${Math.abs(debitTotal-creditTotal).toFixed(2)}`}
                  </span>
                </div>

                {/* Signatures */}
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
