'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Scissors, Plus, RefreshCw, Pencil, Trash2, X, Loader2, Save,
  Search, ArrowLeft, FilePlus,
} from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

type Tailor = {
  id: number
  tailor_code: string
  name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  address: string | null
  payment_terms: string | null
  location_id: number | null
  notes: string | null
  is_active: boolean
}

const emptyForm = {
  tailor_code: '',
  name: '',
  contact_person: '',
  phone: '',
  email: '',
  address: '',
  payment_terms: 'Net 30',
  notes: '',
  is_active: true,
}

export default function MaintainTailorsPage() {
  const router = useRouter()
  const [records, setRecords] = useState<Tailor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Tailor | null>(null)

  const [mode, setMode] = useState<'list'|'create'|'edit'>('list')
  const [editing, setEditing] = useState<Tailor | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await api.get('/inventory/tailors', { params: { search } }); setRecords(r.data.data ?? []) }
    catch {} finally { setLoading(false) }
  }, [search])

  useEffect(() => { load() }, [load])

  const sf = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  function openCreate() { setEditing(null); setForm(emptyForm); setMode('create') }
  function openEdit(t: Tailor) {
    setEditing(t)
    setForm({
      tailor_code:    t.tailor_code,
      name:           t.name,
      contact_person: t.contact_person ?? '',
      phone:          t.phone ?? '',
      email:          t.email ?? '',
      address:        t.address ?? '',
      payment_terms:  t.payment_terms ?? '',
      notes:          t.notes ?? '',
      is_active:      t.is_active,
    })
    setMode('edit')
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Tailor name is required'); return }
    setSaving(true)
    const payload = { ...form, tailor_code: form.tailor_code || undefined }
    try {
      if (editing) await api.put(`/inventory/tailors/${editing.id}`, payload)
      else         await api.post('/inventory/tailors', payload)
      toast.success(editing ? 'Updated' : 'Created')
      setMode('list'); load()
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Save failed') }
    finally { setSaving(false) }
  }

  async function handleDelete(t: Tailor) {
    if (!confirm(`Delete ${t.name}?`)) return
    try { await api.delete(`/inventory/tailors/${t.id}`); toast.success('Deleted'); load() }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Cannot delete') }
  }

  if (mode === 'create' || mode === 'edit') {
    return (
      <div className="fixed inset-0 z-40 flex flex-col bg-slate-100">
        <div className="bg-white border-b border-slate-200 px-5 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-rose-50 rounded-lg flex items-center justify-center">
              <Scissors className="w-4 h-4 text-rose-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">{editing ? `Edit ${editing.tailor_code}` : 'New Tailor'}</h2>
              <p className="text-xs text-slate-400">Inventory → Maintain Tailors</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => { setEditing(null); setForm(emptyForm) }} disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-700 text-xs font-medium rounded">
              <FilePlus className="w-3.5 h-3.5 text-slate-500" /> New
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white text-xs font-medium rounded hover:bg-rose-700 disabled:opacity-60">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save
            </button>
            <button onClick={() => editing && handleDelete(editing)} disabled={!editing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-700 text-xs font-medium rounded disabled:opacity-40">
              <Trash2 className="w-3.5 h-3.5 text-red-500" /> Delete
            </button>
            <button onClick={() => setMode('list')} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded hover:bg-red-600">
              <X className="w-3.5 h-3.5" /> Close
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3 grid grid-cols-12 gap-3">
              <div className="col-span-3">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">Tailor Code</label>
                <input value={form.tailor_code} onChange={e=>sf('tailor_code', e.target.value.toUpperCase())}
                  placeholder="(Auto: TLR-XXXX)"
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded font-mono" />
              </div>
              <div className="col-span-6">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">Name <span className="text-red-500">*</span></label>
                <input value={form.name} onChange={e=>sf('name', e.target.value)}
                  placeholder="e.g. Suharto Tailoring"
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded font-medium" />
              </div>
              <div className="col-span-3">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">Status</label>
                <select value={form.is_active ? '1' : '0'} onChange={e=>sf('is_active', e.target.value==='1')}
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white">
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
              </div>
            </div>

            <div className="border-b border-slate-100 px-4 py-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Contact</h3>
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-4">
                  <label className="block text-[11px] text-slate-500 mb-1">Contact Person</label>
                  <input value={form.contact_person} onChange={e=>sf('contact_person', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded" />
                </div>
                <div className="col-span-3">
                  <label className="block text-[11px] text-slate-500 mb-1">Phone</label>
                  <input value={form.phone} onChange={e=>sf('phone', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded font-mono" />
                </div>
                <div className="col-span-5">
                  <label className="block text-[11px] text-slate-500 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e=>sf('email', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded" />
                </div>
              </div>
            </div>

            <div className="border-b border-slate-100 px-4 py-3 grid grid-cols-12 gap-3">
              <div className="col-span-12">
                <label className="block text-[11px] text-slate-500 mb-1">Address</label>
                <textarea value={form.address} onChange={e=>sf('address', e.target.value)}
                  rows={2}
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded" />
              </div>
              <div className="col-span-4">
                <label className="block text-[11px] text-slate-500 mb-1">Payment Terms</label>
                <input value={form.payment_terms} onChange={e=>sf('payment_terms', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded" />
              </div>
              <div className="col-span-8">
                <label className="block text-[11px] text-slate-500 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e=>sf('notes', e.target.value)}
                  rows={1}
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded" />
              </div>
            </div>

            <div className="px-4 py-3 bg-slate-50 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">Note:</span> A matching stock-location of type "tailor" is auto-created/updated for movement tracking.
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <div className="w-9 h-9 bg-rose-50 rounded-xl flex items-center justify-center">
            <Scissors className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800">Maintain Tailors</h1>
            <p className="text-xs text-slate-400">Inventory → Maintain Tailors</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white text-xs font-medium rounded-lg hover:bg-rose-700">
            <Plus className="w-3.5 h-3.5" /> New Tailor
          </button>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-600 text-white text-xs font-medium rounded-lg hover:bg-slate-700">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 border-b border-slate-200">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search by name, code, contact, phone..."
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded" />
        </div>
        <div className="text-xs text-slate-500">{records.length} record{records.length!==1?'s':''}</div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-700 text-white">
              <th className="w-8 px-2 py-2 text-center font-medium">#</th>
              <th className="text-left px-3 py-2 font-semibold">Code</th>
              <th className="text-left px-3 py-2 font-semibold">Name</th>
              <th className="text-left px-3 py-2 font-semibold">Contact Person</th>
              <th className="text-left px-3 py-2 font-semibold">Phone</th>
              <th className="text-left px-3 py-2 font-semibold">Email</th>
              <th className="text-left px-3 py-2 font-semibold">Payment Terms</th>
              <th className="text-center px-3 py-2 font-semibold">Status</th>
              <th className="text-center px-3 py-2 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? Array.from({length:6}).map((_,i)=>(
              <tr key={i} className={i%2===0?'bg-white':'bg-slate-50'}>
                {Array.from({length:9}).map((_,j)=>(<td key={j} className="px-3 py-2"><div className="h-3 bg-slate-100 rounded animate-pulse" /></td>))}
              </tr>
            )) : records.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-16 text-center text-slate-400">
                  <Scissors className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No tailors found</p>
                  <button onClick={openCreate} className="mt-2 px-3 py-1.5 bg-rose-600 text-white text-xs rounded">Create First Tailor</button>
                </td>
              </tr>
            ) : records.map((t, idx) => {
              const isSel = selected?.id === t.id
              return (
                <tr key={t.id}
                  onClick={()=>setSelected(t)}
                  onDoubleClick={()=>openEdit(t)}
                  className={`border-b border-slate-100 cursor-pointer transition-colors ${
                    isSel ? 'bg-rose-100 ring-1 ring-inset ring-rose-400'
                          : idx%2===0 ? 'bg-white hover:bg-rose-50' : 'bg-slate-50/60 hover:bg-rose-50'
                  }`}>
                  <td className="px-2 py-1.5 text-center text-slate-400">{idx+1}</td>
                  <td className="px-3 py-1.5 font-mono font-bold text-rose-700">{t.tailor_code}</td>
                  <td className="px-3 py-1.5 font-medium text-slate-800">{t.name}</td>
                  <td className="px-3 py-1.5 text-slate-700">{t.contact_person ?? '—'}</td>
                  <td className="px-3 py-1.5 font-mono text-slate-600">{t.phone ?? '—'}</td>
                  <td className="px-3 py-1.5 text-slate-600">{t.email ?? '—'}</td>
                  <td className="px-3 py-1.5 text-slate-500">{t.payment_terms ?? '—'}</td>
                  <td className="px-3 py-1.5 text-center">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${t.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                      {t.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-center" onClick={e=>e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={()=>openEdit(t)} className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"><Pencil className="w-3 h-3"/></button>
                      <button onClick={()=>handleDelete(t)} className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-3 h-3"/></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
