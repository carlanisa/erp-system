'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Layers, Plus, RefreshCw, Pencil, Trash2, X, Loader2, Save,
  Search, ArrowLeft, FilePlus,
} from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

type Location = {
  id: number
  code: string
  name: string
  type: 'warehouse'|'tailor'|'store'|'transit'
  address: string | null
  contact_person: string | null
  phone: string | null
  is_active: boolean
}

type FormShape = {
  code: string
  name: string
  type: 'warehouse'|'tailor'|'store'|'transit'
  address: string
  contact_person: string
  phone: string
  is_active: boolean
}

const emptyForm: FormShape = {
  code: '',
  name: '',
  type: 'warehouse',
  address: '',
  contact_person: '',
  phone: '',
  is_active: true,
}

const TYPE_BADGES: Record<string, string> = {
  warehouse: 'bg-blue-100 text-blue-700',
  tailor:    'bg-rose-100 text-rose-700',
  store:     'bg-violet-100 text-violet-700',
  transit:   'bg-amber-100 text-amber-700',
}

export default function MaintainLocationsPage() {
  const router = useRouter()
  const [records, setRecords] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [selected, setSelected] = useState<Location | null>(null)

  const [mode, setMode] = useState<'list'|'create'|'edit'>('list')
  const [editing, setEditing] = useState<Location | null>(null)
  const [form, setForm] = useState<FormShape>(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/inventory/locations', { params: { search, type: typeFilter || undefined } })
      setRecords(r.data.data ?? [])
    } catch {} finally { setLoading(false) }
  }, [search, typeFilter])

  useEffect(() => { load() }, [load])

  const sf = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  function openCreate() { setEditing(null); setForm(emptyForm); setMode('create') }
  function openEdit(l: Location) {
    setEditing(l)
    setForm({
      code: l.code, name: l.name, type: l.type,
      address: l.address ?? '', contact_person: l.contact_person ?? '',
      phone: l.phone ?? '', is_active: l.is_active,
    })
    setMode('edit')
  }

  async function handleSave() {
    if (!form.code.trim() || !form.name.trim()) { toast.error('Code & Name required'); return }
    setSaving(true)
    try {
      if (editing) await api.put(`/inventory/locations/${editing.id}`, form)
      else         await api.post('/inventory/locations', form)
      toast.success(editing ? 'Updated' : 'Created')
      setMode('list'); load()
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Save failed') }
    finally { setSaving(false) }
  }

  async function handleDelete(l: Location) {
    if (!confirm(`Delete location ${l.name}?`)) return
    try { await api.delete(`/inventory/locations/${l.id}`); toast.success('Deleted'); load() }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Cannot delete') }
  }

  if (mode === 'create' || mode === 'edit') {
    return (
      <div className="fixed inset-0 z-40 flex flex-col bg-slate-100">
        <div className="bg-white border-b border-slate-200 px-5 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
              <Layers className="w-4 h-4 text-slate-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">{editing ? `Edit ${editing.code}` : 'New Location'}</h2>
              <p className="text-xs text-slate-400">Inventory → Stock Locations</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => { setEditing(null); setForm(emptyForm) }} disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded">
              <FilePlus className="w-3.5 h-3.5 text-slate-500" /> New
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 text-white text-xs font-medium rounded hover:bg-slate-800 disabled:opacity-60">
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
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">Code <span className="text-red-500">*</span></label>
                <input value={form.code} onChange={e=>sf('code', e.target.value.toUpperCase())}
                  placeholder="e.g. WH-MAIN"
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded font-mono uppercase" />
              </div>
              <div className="col-span-6">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">Name <span className="text-red-500">*</span></label>
                <input value={form.name} onChange={e=>sf('name', e.target.value)}
                  placeholder="e.g. Main Warehouse"
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded font-medium" />
              </div>
              <div className="col-span-3">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">Type</label>
                <select value={form.type} onChange={e=>sf('type', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white">
                  <option value="warehouse">Warehouse</option>
                  <option value="tailor">Tailor</option>
                  <option value="store">Store</option>
                  <option value="transit">Transit</option>
                </select>
              </div>
            </div>
            <div className="border-b border-slate-100 px-4 py-3 grid grid-cols-12 gap-3">
              <div className="col-span-6">
                <label className="block text-[11px] text-slate-500 mb-1">Contact Person</label>
                <input value={form.contact_person} onChange={e=>sf('contact_person', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded" />
              </div>
              <div className="col-span-3">
                <label className="block text-[11px] text-slate-500 mb-1">Phone</label>
                <input value={form.phone} onChange={e=>sf('phone', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded font-mono" />
              </div>
              <div className="col-span-3">
                <label className="block text-[11px] text-slate-500 mb-1">Status</label>
                <select value={form.is_active ? '1' : '0'} onChange={e=>sf('is_active', e.target.value==='1')}
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white">
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
              </div>
            </div>
            <div className="px-4 py-3">
              <label className="block text-[11px] text-slate-500 mb-1">Address</label>
              <textarea value={form.address} onChange={e=>sf('address', e.target.value)}
                rows={3}
                className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded" />
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
          <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center">
            <Layers className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800">Stock Locations</h1>
            <p className="text-xs text-slate-400">Inventory → Stock Locations</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 text-white text-xs font-medium rounded-lg hover:bg-slate-800">
            <Plus className="w-3.5 h-3.5" /> New Location
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
            placeholder="Search by name or code..."
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded" />
        </div>
        <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}
          className="px-3 py-1.5 text-xs border border-slate-200 rounded bg-white">
          <option value="">All types</option>
          <option value="warehouse">Warehouse</option>
          <option value="tailor">Tailor</option>
          <option value="store">Store</option>
          <option value="transit">Transit</option>
        </select>
        <div className="text-xs text-slate-500">{records.length} record{records.length!==1?'s':''}</div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-700 text-white">
              <th className="w-8 px-2 py-2 text-center font-medium">#</th>
              <th className="text-left px-3 py-2 font-semibold">Code</th>
              <th className="text-left px-3 py-2 font-semibold">Name</th>
              <th className="text-left px-3 py-2 font-semibold">Type</th>
              <th className="text-left px-3 py-2 font-semibold">Contact</th>
              <th className="text-left px-3 py-2 font-semibold">Phone</th>
              <th className="text-left px-3 py-2 font-semibold">Address</th>
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
                  <Layers className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No locations found</p>
                  <button onClick={openCreate} className="mt-2 px-3 py-1.5 bg-slate-700 text-white text-xs rounded">Create First Location</button>
                </td>
              </tr>
            ) : records.map((l, idx) => {
              const isSel = selected?.id === l.id
              return (
                <tr key={l.id}
                  onClick={()=>setSelected(l)}
                  onDoubleClick={()=>openEdit(l)}
                  className={`border-b border-slate-100 cursor-pointer transition-colors ${
                    isSel ? 'bg-slate-200 ring-1 ring-inset ring-slate-400'
                          : idx%2===0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/60 hover:bg-slate-100'
                  }`}>
                  <td className="px-2 py-1.5 text-center text-slate-400">{idx+1}</td>
                  <td className="px-3 py-1.5 font-mono font-bold text-slate-700">{l.code}</td>
                  <td className="px-3 py-1.5 font-medium text-slate-800">{l.name}</td>
                  <td className="px-3 py-1.5">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${TYPE_BADGES[l.type]}`}>{l.type}</span>
                  </td>
                  <td className="px-3 py-1.5 text-slate-700">{l.contact_person ?? '—'}</td>
                  <td className="px-3 py-1.5 font-mono text-slate-600">{l.phone ?? '—'}</td>
                  <td className="px-3 py-1.5 text-slate-500 truncate max-w-md">{l.address ?? '—'}</td>
                  <td className="px-3 py-1.5 text-center">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${l.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                      {l.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-center" onClick={e=>e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={()=>openEdit(l)} className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"><Pencil className="w-3 h-3"/></button>
                      <button onClick={()=>handleDelete(l)} className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-3 h-3"/></button>
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
