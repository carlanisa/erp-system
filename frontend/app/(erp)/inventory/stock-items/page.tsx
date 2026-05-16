'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Boxes, Plus, RefreshCw, Pencil, Trash2, X, Loader2, Save,
  Search, ArrowLeft, FilePlus,
} from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

type Dept = { id: number; code: string; name: string }
type StockItem = {
  id: number
  item_code: string
  name: string
  description: string | null
  type: 'fabric'|'accessory'|'raw_material'|'consumable'
  department_id: number | null
  department?: Dept | null
  uom: string
  color: string | null
  size: string | null
  current_stock: number
  reorder_level: number
  unit_cost: number
  costing_method: 'fifo'|'lifo'|'average'
  is_active: boolean
}

type FormShape = {
  item_code: string
  name: string
  description: string
  type: 'fabric'|'accessory'|'raw_material'|'consumable'
  department_id: string
  uom: string
  color: string
  size: string
  current_stock: string
  reorder_level: string
  unit_cost: string
  costing_method: 'fifo'|'lifo'|'average'
  is_active: boolean
}

const emptyForm: FormShape = {
  item_code: '',
  name: '',
  description: '',
  type: 'fabric',
  department_id: '',
  uom: 'METER',
  color: '',
  size: '',
  current_stock: '0',
  reorder_level: '0',
  unit_cost: '0',
  costing_method: 'average',
  is_active: true,
}

const TYPE_BADGES: Record<string, string> = {
  fabric:       'bg-blue-100 text-blue-700',
  accessory:    'bg-violet-100 text-violet-700',
  raw_material: 'bg-amber-100 text-amber-700',
  consumable:   'bg-slate-100 text-slate-700',
}

export default function MaintainStockItemsPage() {
  const router = useRouter()
  const [records, setRecords] = useState<StockItem[]>([])
  const [departments, setDepartments] = useState<Dept[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [selected, setSelected] = useState<StockItem | null>(null)

  const [mode, setMode] = useState<'list'|'create'|'edit'>('list')
  const [editing, setEditing] = useState<StockItem | null>(null)
  const [form, setForm] = useState<FormShape>(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/inventory/stock-items', { params: { search, type: typeFilter || undefined } })
      setRecords(r.data.data ?? [])
    } catch {} finally { setLoading(false) }
  }, [search, typeFilter])

  useEffect(() => { load() }, [load])
  useEffect(() => { api.get('/inventory/departments/flat').then(r => setDepartments(r.data.data ?? [])).catch(() => {}) }, [])

  const sf = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  function openCreate() { setEditing(null); setForm(emptyForm); setMode('create') }
  function openEdit(s: StockItem) {
    setEditing(s)
    setForm({
      item_code: s.item_code, name: s.name,
      description: s.description ?? '',
      type: s.type, department_id: s.department_id ? String(s.department_id) : '',
      uom: s.uom, color: s.color ?? '', size: s.size ?? '',
      current_stock: String(s.current_stock ?? 0),
      reorder_level: String(s.reorder_level ?? 0),
      unit_cost:     String(s.unit_cost     ?? 0),
      costing_method: s.costing_method,
      is_active: s.is_active,
    })
    setMode('edit')
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Item name required'); return }
    setSaving(true)
    const payload: any = {
      ...form,
      item_code:     form.item_code || undefined,
      department_id: form.department_id ? Number(form.department_id) : null,
      current_stock: parseFloat(form.current_stock) || 0,
      reorder_level: parseFloat(form.reorder_level) || 0,
      unit_cost:     parseFloat(form.unit_cost)     || 0,
    }
    try {
      if (editing) await api.put(`/inventory/stock-items/${editing.id}`, payload)
      else         await api.post('/inventory/stock-items', payload)
      toast.success(editing ? 'Updated' : 'Created')
      setMode('list'); load()
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Save failed') }
    finally { setSaving(false) }
  }

  async function handleDelete(s: StockItem) {
    if (!confirm(`Delete ${s.name}?`)) return
    try { await api.delete(`/inventory/stock-items/${s.id}`); toast.success('Deleted'); load() }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Cannot delete') }
  }

  if (mode === 'create' || mode === 'edit') {
    return (
      <div className="fixed inset-0 z-40 flex flex-col bg-slate-100">
        <div className="bg-white border-b border-slate-200 px-5 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <Boxes className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">{editing ? `Edit ${editing.item_code}` : 'New Stock Item'}</h2>
              <p className="text-xs text-slate-400">Inventory → Maintain Stock Items</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => { setEditing(null); setForm(emptyForm) }} disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 text-xs font-medium rounded">
              <FilePlus className="w-3.5 h-3.5 text-slate-500" /> New
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 disabled:opacity-60">
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
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">Item Code</label>
                <input value={form.item_code} onChange={e=>sf('item_code', e.target.value.toUpperCase())}
                  placeholder="(Auto)"
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded font-mono" />
              </div>
              <div className="col-span-6">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">Name <span className="text-red-500">*</span></label>
                <input value={form.name} onChange={e=>sf('name', e.target.value)}
                  placeholder="e.g. Cotton Plain Black"
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
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Classification</h3>
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-3">
                  <label className="block text-[11px] text-slate-500 mb-1">Type</label>
                  <select value={form.type} onChange={e=>sf('type', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white">
                    <option value="fabric">Fabric</option>
                    <option value="accessory">Accessory</option>
                    <option value="raw_material">Raw Material</option>
                    <option value="consumable">Consumable</option>
                  </select>
                </div>
                <div className="col-span-4">
                  <label className="block text-[11px] text-slate-500 mb-1">Department</label>
                  <select value={form.department_id} onChange={e=>sf('department_id', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white">
                    <option value="">— None —</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] text-slate-500 mb-1">UOM</label>
                  <input value={form.uom} onChange={e=>sf('uom', e.target.value.toUpperCase())}
                    placeholder="METER / PCS / KG"
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded font-mono uppercase" />
                </div>
                <div className="col-span-3">
                  <label className="block text-[11px] text-slate-500 mb-1">Costing Method</label>
                  <select value={form.costing_method} onChange={e=>sf('costing_method', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white">
                    <option value="average">Weighted Avg</option>
                    <option value="fifo">FIFO</option>
                    <option value="lifo">LIFO</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="border-b border-slate-100 px-4 py-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Variant</h3>
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-6">
                  <label className="block text-[11px] text-slate-500 mb-1">Color</label>
                  <input value={form.color} onChange={e=>sf('color', e.target.value)}
                    placeholder="e.g. Black / Royal Blue"
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded" />
                </div>
                <div className="col-span-6">
                  <label className="block text-[11px] text-slate-500 mb-1">Size</label>
                  <input value={form.size} onChange={e=>sf('size', e.target.value)}
                    placeholder="e.g. 60 inch / S / M / L"
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded" />
                </div>
              </div>
            </div>

            <div className="border-b border-slate-100 px-4 py-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Stock & Cost</h3>
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-4">
                  <label className="block text-[11px] text-slate-500 mb-1">Current Stock {editing && <span className="text-amber-600 text-[10px]">(read-only after creation, use Stock Adjust)</span>}</label>
                  <input type="number" step="0.001" disabled={!!editing}
                    value={form.current_stock} onChange={e=>sf('current_stock', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded text-right font-mono disabled:bg-slate-100 disabled:text-slate-500" />
                </div>
                <div className="col-span-4">
                  <label className="block text-[11px] text-slate-500 mb-1">Reorder Level</label>
                  <input type="number" step="0.001" value={form.reorder_level} onChange={e=>sf('reorder_level', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded text-right font-mono" />
                </div>
                <div className="col-span-4">
                  <label className="block text-[11px] text-slate-500 mb-1">Unit Cost (RM)</label>
                  <input type="number" step="0.01" value={form.unit_cost} onChange={e=>sf('unit_cost', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded text-right font-mono" />
                </div>
              </div>
            </div>

            <div className="px-4 py-3">
              <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">Description</label>
              <textarea value={form.description} onChange={e=>sf('description', e.target.value)}
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
          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
            <Boxes className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800">Maintain Stock Items</h1>
            <p className="text-xs text-slate-400">Inventory → Maintain Stock Items</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700">
            <Plus className="w-3.5 h-3.5" /> New Item
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
            placeholder="Search by name, code, color..."
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded" />
        </div>
        <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}
          className="px-3 py-1.5 text-xs border border-slate-200 rounded bg-white">
          <option value="">All types</option>
          <option value="fabric">Fabric</option>
          <option value="accessory">Accessory</option>
          <option value="raw_material">Raw Material</option>
          <option value="consumable">Consumable</option>
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
              <th className="text-left px-3 py-2 font-semibold">Color / Size</th>
              <th className="text-left px-3 py-2 font-semibold">UOM</th>
              <th className="text-right px-3 py-2 font-semibold">Stock</th>
              <th className="text-right px-3 py-2 font-semibold">Reorder</th>
              <th className="text-right px-3 py-2 font-semibold">Unit Cost</th>
              <th className="text-right px-3 py-2 font-semibold">Stock Value</th>
              <th className="text-center px-3 py-2 font-semibold">Status</th>
              <th className="text-center px-3 py-2 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? Array.from({length:6}).map((_,i)=>(
              <tr key={i} className={i%2===0?'bg-white':'bg-slate-50'}>
                {Array.from({length:12}).map((_,j)=>(<td key={j} className="px-3 py-2"><div className="h-3 bg-slate-100 rounded animate-pulse" /></td>))}
              </tr>
            )) : records.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-16 text-center text-slate-400">
                  <Boxes className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No stock items found</p>
                  <button onClick={openCreate} className="mt-2 px-3 py-1.5 bg-blue-600 text-white text-xs rounded">Create First Item</button>
                </td>
              </tr>
            ) : records.map((s, idx) => {
              const isSel = selected?.id === s.id
              const lowStock = Number(s.reorder_level ?? 0) > 0 && Number(s.current_stock ?? 0) <= Number(s.reorder_level ?? 0)
              const colorSize = [s.color, s.size].filter(Boolean).join(' / ') || '—'
              return (
                <tr key={s.id}
                  onClick={()=>setSelected(s)}
                  onDoubleClick={()=>openEdit(s)}
                  className={`border-b border-slate-100 cursor-pointer transition-colors ${
                    isSel ? 'bg-blue-100 ring-1 ring-inset ring-blue-400'
                          : idx%2===0 ? 'bg-white hover:bg-blue-50' : 'bg-slate-50/60 hover:bg-blue-50'
                  }`}>
                  <td className="px-2 py-1.5 text-center text-slate-400">{idx+1}</td>
                  <td className="px-3 py-1.5 font-mono font-bold text-blue-700">{s.item_code}</td>
                  <td className="px-3 py-1.5 font-medium text-slate-800">{s.name}</td>
                  <td className="px-3 py-1.5">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${TYPE_BADGES[s.type]}`}>{s.type.replace('_',' ')}</span>
                  </td>
                  <td className="px-3 py-1.5 text-slate-700">{colorSize}</td>
                  <td className="px-3 py-1.5 font-mono text-slate-500">{s.uom}</td>
                  <td className={`px-3 py-1.5 text-right font-mono font-semibold ${lowStock ? 'text-amber-600' : 'text-slate-800'}`}>
                    {Number(s.current_stock ?? 0).toFixed(2)}
                    {lowStock && <span className="ml-1 text-[9px] text-amber-600">⚠</span>}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-slate-500">{Number(s.reorder_level ?? 0).toFixed(2)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-slate-700">{Number(s.unit_cost ?? 0).toFixed(2)}</td>
                  <td className="px-3 py-1.5 text-right font-mono font-semibold text-emerald-700">
                    {(Number(s.current_stock ?? 0) * Number(s.unit_cost ?? 0)).toFixed(2)}
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${s.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                      {s.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-center" onClick={e=>e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={()=>openEdit(s)} className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50"><Pencil className="w-3 h-3"/></button>
                      <button onClick={()=>handleDelete(s)} className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-3 h-3"/></button>
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
