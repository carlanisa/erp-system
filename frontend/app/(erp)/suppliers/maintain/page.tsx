'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users, Plus, RefreshCw, Pencil, Trash2, X, Loader2, Save,
  Search, ArrowLeft, FilePlus, Copy,
  ChevronFirst, ChevronLast, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

type Supplier = {
  id: number
  supplier_code: string | null
  name: string
  contact_person: string | null
  email: string | null
  phone: string | null
  mobile: string | null
  address: string | null
  city: string | null
  country: string | null
  tax_number: string | null
  payment_terms: string | null
  opening_balance: number
  credit_limit: number
  bank_name: string | null
  bank_account_number: string | null
  notes: string | null
  is_active: boolean
}

const emptyForm = {
  supplier_code: '',
  name: '',
  contact_person: '',
  email: '',
  phone: '',
  mobile: '',
  address: '',
  city: '',
  country: 'Malaysia',
  tax_number: '',
  payment_terms: 'Net 30',
  opening_balance: '0',
  credit_limit: '0',
  bank_name: '',
  bank_account_number: '',
  notes: '',
  is_active: true,
}

export default function MaintainSupplierPage() {
  const router = useRouter()
  const [records, setRecords] = useState<Supplier[]>([])
  const [page, setPage]       = useState(1)
  const [perPage]             = useState(50)
  const [meta, setMeta]       = useState({ last_page: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [selected, setSelected] = useState<Supplier | null>(null)

  const [mode, setMode] = useState<'list'|'create'|'edit'>('list')
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/suppliers/list', { params: { page, per_page: perPage, search } })
      setRecords(r.data.data)
      setMeta(r.data.meta)
    } catch {} finally { setLoading(false) }
  }, [page, perPage, search])

  useEffect(() => { load() }, [load])

  const sf = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setMode('create')
  }

  function openEdit(s: Supplier) {
    setEditing(s)
    setForm({
      supplier_code: s.supplier_code ?? '',
      name: s.name,
      contact_person: s.contact_person ?? '',
      email: s.email ?? '',
      phone: s.phone ?? '',
      mobile: s.mobile ?? '',
      address: s.address ?? '',
      city: s.city ?? '',
      country: s.country ?? 'Malaysia',
      tax_number: s.tax_number ?? '',
      payment_terms: s.payment_terms ?? 'Net 30',
      opening_balance: String(s.opening_balance ?? 0),
      credit_limit: String(s.credit_limit ?? 0),
      bank_name: s.bank_name ?? '',
      bank_account_number: s.bank_account_number ?? '',
      notes: s.notes ?? '',
      is_active: s.is_active,
    })
    setMode('edit')
  }

  function duplicateSupplier(s: Supplier) {
    setEditing(null)
    setForm({
      supplier_code: '',     // auto-generated on save
      name: s.name + ' (copy)',
      contact_person: s.contact_person ?? '',
      email: '',
      phone: s.phone ?? '',
      mobile: s.mobile ?? '',
      address: s.address ?? '',
      city: s.city ?? '',
      country: s.country ?? 'Malaysia',
      tax_number: '',
      payment_terms: s.payment_terms ?? 'Net 30',
      opening_balance: '0',
      credit_limit: String(s.credit_limit ?? 0),
      bank_name: s.bank_name ?? '',
      bank_account_number: '',
      notes: s.notes ?? '',
      is_active: true,
    })
    setMode('create')
    toast.success(`Duplicated from ${s.supplier_code ?? s.name}`)
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Supplier name is required'); return }
    setSaving(true)
    const payload = {
      ...form,
      supplier_code: form.supplier_code || null,
      opening_balance: parseFloat(form.opening_balance) || 0,
      credit_limit:    parseFloat(form.credit_limit)    || 0,
    }
    try {
      if (editing) {
        await api.put(`/suppliers/list/${editing.id}`, payload)
        toast.success('Supplier updated')
      } else {
        const r = await api.post('/suppliers/list', payload)
        toast.success(`Created ${r.data.data.supplier_code}`)
      }
      setMode('list'); load()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Save failed')
    } finally { setSaving(false) }
  }

  async function handleDelete(s: Supplier) {
    if (!confirm(`Delete ${s.name}?`)) return
    try {
      await api.delete(`/suppliers/list/${s.id}`)
      toast.success('Deleted'); load()
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Cannot delete') }
  }

  const recordStart = (page-1)*perPage+1
  const recordEnd   = Math.min(page*perPage, meta.total)

  // ── FORM VIEW ─────────────────────────────────────────────────────────────
  if (mode === 'create' || mode === 'edit') {
    return (
      <div className="fixed inset-0 z-40 flex flex-col bg-slate-100">
        {/* Header bar */}
        <div className="bg-white border-b border-slate-200 px-5 py-2.5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                {editing ? `Edit ${editing.supplier_code ?? editing.name}` : 'New Supplier'}
              </h2>
              <p className="text-xs text-slate-400">Suppliers → Maintain Supplier</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => { setEditing(null); setForm(emptyForm) }} disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 text-xs font-medium rounded">
              <FilePlus className="w-3.5 h-3.5 text-slate-500" /> New
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700 disabled:opacity-60">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save
            </button>
            <button onClick={() => editing && handleDelete(editing)} disabled={!editing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-700 text-xs font-medium rounded disabled:opacity-40">
              <Trash2 className="w-3.5 h-3.5 text-red-500" /> Delete
            </button>
            <button onClick={() => setMode('list')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded hover:bg-red-600">
              <X className="w-3.5 h-3.5" /> Close
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
            {/* Top row */}
            <div className="border-b border-slate-100 px-4 py-3 grid grid-cols-12 gap-3 items-center">
              <div className="col-span-3">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Supplier Code</label>
                <input value={form.supplier_code} onChange={e=>sf('supplier_code', e.target.value)}
                  placeholder="(Auto)"
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded font-mono" />
              </div>
              <div className="col-span-6">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Supplier Name <span className="text-red-500">*</span></label>
                <input value={form.name} onChange={e=>sf('name', e.target.value)}
                  placeholder="e.g. Global Traders Sdn Bhd"
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded font-medium" />
              </div>
              <div className="col-span-3">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Status</label>
                <select value={form.is_active ? '1' : '0'} onChange={e=>sf('is_active', e.target.value==='1')}
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white">
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
              </div>
            </div>

            {/* Contact */}
            <div className="border-b border-slate-100 px-4 py-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Contact</h3>
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-4">
                  <label className="block text-[11px] text-slate-500 mb-1">Contact Person</label>
                  <input value={form.contact_person} onChange={e=>sf('contact_person', e.target.value)}
                    placeholder="Mr. / Ms. ..."
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded" />
                </div>
                <div className="col-span-4">
                  <label className="block text-[11px] text-slate-500 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e=>sf('email', e.target.value)}
                    placeholder="email@example.com"
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] text-slate-500 mb-1">Phone</label>
                  <input value={form.phone} onChange={e=>sf('phone', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded font-mono" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] text-slate-500 mb-1">Mobile</label>
                  <input value={form.mobile} onChange={e=>sf('mobile', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded font-mono" />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="border-b border-slate-100 px-4 py-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Address</h3>
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-12">
                  <label className="block text-[11px] text-slate-500 mb-1">Address</label>
                  <textarea value={form.address} onChange={e=>sf('address', e.target.value)}
                    rows={2}
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded" />
                </div>
                <div className="col-span-6">
                  <label className="block text-[11px] text-slate-500 mb-1">City</label>
                  <input value={form.city} onChange={e=>sf('city', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded" />
                </div>
                <div className="col-span-6">
                  <label className="block text-[11px] text-slate-500 mb-1">Country</label>
                  <input value={form.country} onChange={e=>sf('country', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded" />
                </div>
              </div>
            </div>

            {/* Financial */}
            <div className="border-b border-slate-100 px-4 py-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Financial</h3>
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-3">
                  <label className="block text-[11px] text-slate-500 mb-1">Tax / GST No.</label>
                  <input value={form.tax_number} onChange={e=>sf('tax_number', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded font-mono" />
                </div>
                <div className="col-span-3">
                  <label className="block text-[11px] text-slate-500 mb-1">Payment Terms</label>
                  <input value={form.payment_terms} onChange={e=>sf('payment_terms', e.target.value)}
                    placeholder="Net 30"
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded" />
                </div>
                <div className="col-span-3">
                  <label className="block text-[11px] text-slate-500 mb-1">Opening Balance (RM)</label>
                  <input type="number" step="0.01" value={form.opening_balance} onChange={e=>sf('opening_balance', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded text-right font-mono" />
                </div>
                <div className="col-span-3">
                  <label className="block text-[11px] text-slate-500 mb-1">Credit Limit (RM)</label>
                  <input type="number" step="0.01" value={form.credit_limit} onChange={e=>sf('credit_limit', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded text-right font-mono" />
                </div>
              </div>
            </div>

            {/* Bank */}
            <div className="border-b border-slate-100 px-4 py-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Bank Details</h3>
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-6">
                  <label className="block text-[11px] text-slate-500 mb-1">Bank Name</label>
                  <input value={form.bank_name} onChange={e=>sf('bank_name', e.target.value)}
                    placeholder="e.g. Maybank"
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded" />
                </div>
                <div className="col-span-6">
                  <label className="block text-[11px] text-slate-500 mb-1">Bank Account Number</label>
                  <input value={form.bank_account_number} onChange={e=>sf('bank_account_number', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded font-mono" />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="px-4 py-3">
              <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Notes</label>
              <textarea value={form.notes} onChange={e=>sf('notes', e.target.value)}
                rows={3}
                placeholder="Any internal notes about this supplier..."
                className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── LIST VIEW ─────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/suppliers')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
            title="Back to Suppliers">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800">Maintain Supplier</h1>
            <p className="text-xs text-slate-400">Suppliers → Maintain Supplier</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700">
            <Plus className="w-3.5 h-3.5" /> New Supplier
          </button>
          <button onClick={load}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-600 text-white text-xs font-medium rounded-lg hover:bg-slate-700">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 border-b border-slate-200">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input value={search} onChange={e=>{setSearch(e.target.value); setPage(1)}}
            placeholder="Search by name, code, email, phone..."
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-700 text-white">
              <th className="w-8 px-2 py-2 text-center font-medium">#</th>
              <th className="text-left px-3 py-2 font-semibold">Code</th>
              <th className="text-left px-3 py-2 font-semibold">Supplier Name</th>
              <th className="text-left px-3 py-2 font-semibold">Contact</th>
              <th className="text-left px-3 py-2 font-semibold">Phone</th>
              <th className="text-left px-3 py-2 font-semibold">Email</th>
              <th className="text-left px-3 py-2 font-semibold">Tax No.</th>
              <th className="text-right px-3 py-2 font-semibold">Op. Balance</th>
              <th className="text-center px-3 py-2 font-semibold">Status</th>
              <th className="text-center px-3 py-2 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({length: 8}).map((_,i) => (
                <tr key={i} className={i%2===0?'bg-white':'bg-slate-50'}>
                  {Array.from({length:10}).map((_,j) => (
                    <td key={j} className="px-3 py-2"><div className="h-3 bg-slate-100 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-16 text-center text-slate-400">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No suppliers found</p>
                  <button onClick={openCreate} className="mt-2 btn-primary text-xs px-3 py-1.5">Create First Supplier</button>
                </td>
              </tr>
            ) : records.map((s, idx) => {
              const isSel = selected?.id === s.id
              return (
                <tr key={s.id}
                  onClick={() => setSelected(s)}
                  onDoubleClick={() => openEdit(s)}
                  className={`border-b border-slate-100 cursor-pointer transition-colors ${
                    isSel ? 'bg-indigo-100 ring-1 ring-inset ring-indigo-400'
                          : idx%2===0 ? 'bg-white hover:bg-indigo-50' : 'bg-slate-50/60 hover:bg-indigo-50'
                  }`}>
                  <td className="px-2 py-1.5 text-center text-slate-400">{(page-1)*perPage+idx+1}</td>
                  <td className="px-3 py-1.5 font-mono font-bold text-indigo-700">{s.supplier_code}</td>
                  <td className="px-3 py-1.5 font-medium text-slate-800">{s.name}</td>
                  <td className="px-3 py-1.5 text-slate-700">{s.contact_person ?? '—'}</td>
                  <td className="px-3 py-1.5 font-mono text-slate-600">{s.phone ?? '—'}</td>
                  <td className="px-3 py-1.5 text-slate-600">{s.email ?? '—'}</td>
                  <td className="px-3 py-1.5 font-mono text-slate-500">{s.tax_number ?? '—'}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-slate-700">{(s.opening_balance ?? 0).toFixed(2)}</td>
                  <td className="px-3 py-1.5 text-center">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${s.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                      {s.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-center" onClick={e=>e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={()=>openEdit(s)} title="Edit" className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"><Pencil className="w-3 h-3"/></button>
                      <button onClick={()=>duplicateSupplier(s)} title="Duplicate" className="p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"><Copy className="w-3 h-3"/></button>
                      <button onClick={()=>handleDelete(s)} title="Delete" className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-3 h-3"/></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-t border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <button onClick={()=>setPage(1)} disabled={page===1} className="p-1 rounded hover:bg-slate-200 disabled:opacity-40"><ChevronFirst className="w-4 h-4 text-slate-600"/></button>
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="p-1 rounded hover:bg-slate-200 disabled:opacity-40"><ChevronLeft className="w-4 h-4 text-slate-600"/></button>
          <span className="px-2">Record <span className="font-semibold">{records.length>0?recordStart:0}–{recordEnd}</span> of <span className="font-semibold">{meta.total}</span></span>
          <button onClick={()=>setPage(p=>Math.min(meta.last_page,p+1))} disabled={page===meta.last_page} className="p-1 rounded hover:bg-slate-200 disabled:opacity-40"><ChevronRight className="w-4 h-4 text-slate-600"/></button>
          <button onClick={()=>setPage(meta.last_page)} disabled={page===meta.last_page} className="p-1 rounded hover:bg-slate-200 disabled:opacity-40"><ChevronLast className="w-4 h-4 text-slate-600"/></button>
        </div>
        <div className="text-xs text-slate-500">
          Page {page} of {meta.last_page} &nbsp;·&nbsp; Total: <span className="font-bold text-slate-800">{meta.total}</span>
        </div>
      </div>
    </div>
  )
}
