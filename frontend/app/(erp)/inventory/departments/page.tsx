'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2, Plus, RefreshCw, Pencil, Trash2, X, Loader2, Save,
  Search, ArrowLeft, FilePlus, MapPin, Scissors, BookOpen, Package, ShoppingBag,
  Send, Tag, Layers,
} from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

type Dept = {
  id: number
  code: string
  name: string
  manager: string | null
  notes: string | null
  is_active: boolean
}

type Category = {
  id: number
  name: string
  slug: string
  parent_id: number | null
  sort_order: number
  is_active: boolean
  description: string | null
}

type ProdType = {
  id: number
  key: string
  label: string
  emoji: string | null
  description: string | null
  sort_order: number
  is_system: boolean
  is_active: boolean
}

type Location = {
  id: number
  code: string
  name: string
  type: 'warehouse' | 'tailor' | 'store' | 'transit'
  contact_person: string | null
  phone: string | null
  is_active: boolean
}

const LOCATION_TYPES = ['warehouse', 'tailor', 'store', 'transit'] as const

type TileColor = 'cyan' | 'fuchsia' | 'amber' | 'violet' | 'rose' | 'indigo'
type Tile = { kind: 'link'; href: string; label: string; desc: string; icon: any; color: TileColor }
            | { kind: 'scroll'; anchor: string; label: string; desc: string; icon: any; color: TileColor }

const QUICK_TILES: Tile[] = [
  { kind: 'scroll', anchor: 'locations',          label: 'Stock Locations',  desc: 'Warehouses · stores · transit',    icon: MapPin,    color: 'cyan' },
  { kind: 'scroll', anchor: 'categories',         label: 'Product Categories', desc: 'Manage tags for products',       icon: Tag,       color: 'violet' },
  { kind: 'scroll', anchor: 'types',              label: 'Product Types',    desc: 'Apparel · fabric · accessory etc.', icon: Package,   color: 'rose' },
  { kind: 'scroll', anchor: 'departments',        label: 'Departments',      desc: 'Production / division tags',        icon: Building2, color: 'indigo' },
  { kind: 'link',   href: '/inventory/tailors',   label: 'Add Tailor',       desc: 'Production partners (CMT)',        icon: Scissors,  color: 'fuchsia' },
  { kind: 'link',   href: '/inventory/bom',       label: 'Bill of Material', desc: 'Stitching · packaging · overhead', icon: BookOpen,  color: 'amber' },
]

const TILE_THEME: Record<TileColor, { bg: string; text: string; ring: string }> = {
  cyan:     { bg: 'bg-cyan-50',     text: 'text-cyan-700',     ring: 'hover:ring-cyan-400' },
  fuchsia:  { bg: 'bg-fuchsia-50',  text: 'text-fuchsia-700',  ring: 'hover:ring-fuchsia-400' },
  amber:    { bg: 'bg-amber-50',    text: 'text-amber-700',    ring: 'hover:ring-amber-400' },
  violet:   { bg: 'bg-violet-50',   text: 'text-violet-700',   ring: 'hover:ring-violet-400' },
  rose:     { bg: 'bg-rose-50',     text: 'text-rose-700',     ring: 'hover:ring-rose-400' },
  indigo:   { bg: 'bg-indigo-50',   text: 'text-indigo-700',   ring: 'hover:ring-indigo-400' },
}

const emptyForm = {
  code: '',
  name: '',
  manager: '',
  notes: '',
  is_active: true,
}

export default function MaintainDepartmentPage() {
  const router = useRouter()
  const [records, setRecords] = useState<Dept[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Dept | null>(null)

  const [mode, setMode] = useState<'list'|'create'|'edit'>('list')
  const [editing, setEditing] = useState<Dept | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  // Categories master (managed inline)
  const [categories, setCategories] = useState<Category[]>([])
  const [newCategory, setNewCategory] = useState('')
  const [savingCat, setSavingCat] = useState(false)
  const [editingCatId, setEditingCatId] = useState<number | null>(null)
  const [editingCatName, setEditingCatName] = useState('')

  // Product Types master (managed inline)
  const [types, setTypes] = useState<ProdType[]>([])
  const [newTypeLabel, setNewTypeLabel] = useState('')
  const [newTypeEmoji, setNewTypeEmoji] = useState('')
  const [savingType, setSavingType] = useState(false)
  const [editingTypeId, setEditingTypeId] = useState<number | null>(null)
  const [editingTypeLabel, setEditingTypeLabel] = useState('')
  const [editingTypeEmoji, setEditingTypeEmoji] = useState('')

  // Stock Locations master (managed inline — quick add/edit)
  const [locations, setLocations] = useState<Location[]>([])
  const [newLocCode, setNewLocCode] = useState('')
  const [newLocName, setNewLocName] = useState('')
  const [newLocType, setNewLocType] = useState<typeof LOCATION_TYPES[number]>('warehouse')
  const [savingLoc, setSavingLoc] = useState(false)
  const [editingLocId, setEditingLocId] = useState<number | null>(null)
  const [editingLocCode, setEditingLocCode] = useState('')
  const [editingLocName, setEditingLocName] = useState('')
  const [editingLocType, setEditingLocType] = useState<typeof LOCATION_TYPES[number]>('warehouse')

  // Active section — tile click switches view (only one panel at a time)
  type SectionId = 'locations' | 'categories' | 'types' | 'departments' | null
  const [activeSection, setActiveSection] = useState<SectionId>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/inventory/departments', { params: { search } })
      setRecords(r.data.data ?? [])
    } catch {} finally { setLoading(false) }
  }, [search])

  const loadCategories = useCallback(async () => {
    try { const r = await api.get('/inventory/product-categories'); setCategories(r.data.data ?? []) } catch {}
  }, [])

  const loadTypes = useCallback(async () => {
    try { const r = await api.get('/inventory/product-types'); setTypes(r.data.data ?? []) } catch {}
  }, [])

  const loadLocations = useCallback(async () => {
    try { const r = await api.get('/inventory/locations'); setLocations(r.data.data ?? []) } catch {}
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadCategories() }, [loadCategories])
  useEffect(() => { loadTypes() }, [loadTypes])
  useEffect(() => { loadLocations() }, [loadLocations])

  // ── Product Type CRUD ──────────────────────────────────────
  async function addType() {
    const label = newTypeLabel.trim()
    if (!label) return
    setSavingType(true)
    try {
      await api.post('/inventory/product-types', { label, emoji: newTypeEmoji.trim() || null })
      setNewTypeLabel(''); setNewTypeEmoji('')
      await loadTypes()
      toast.success('Type added')
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') } finally { setSavingType(false) }
  }
  async function saveTypeEdit(id: number) {
    const label = editingTypeLabel.trim()
    if (!label) { setEditingTypeId(null); return }
    try {
      await api.put(`/inventory/product-types/${id}`, { label, emoji: editingTypeEmoji.trim() || null })
      setEditingTypeId(null); setEditingTypeLabel(''); setEditingTypeEmoji('')
      await loadTypes()
      toast.success('Type updated')
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
  }
  async function removeType(t: ProdType) {
    if (t.is_system) { toast.error('System types cannot be removed'); return }
    if (!confirm(`Deactivate "${t.label}"?`)) return
    try { await api.delete(`/inventory/product-types/${t.id}`); await loadTypes(); toast.success('Type deactivated') }
    catch { toast.error('Failed') }
  }

  // ── Stock Location CRUD (compact inline) ───────────────────
  async function addLocation() {
    const code = newLocCode.trim().toUpperCase()
    const name = newLocName.trim()
    if (!code || !name) return
    setSavingLoc(true)
    try {
      await api.post('/inventory/locations', { code, name, type: newLocType, is_active: true })
      setNewLocCode(''); setNewLocName(''); setNewLocType('warehouse')
      await loadLocations()
      toast.success('Location added')
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') } finally { setSavingLoc(false) }
  }
  function startEditLocation(l: Location) {
    setEditingLocId(l.id); setEditingLocCode(l.code); setEditingLocName(l.name); setEditingLocType(l.type)
  }
  async function saveLocationEdit(id: number) {
    const code = editingLocCode.trim().toUpperCase()
    const name = editingLocName.trim()
    if (!code || !name) { setEditingLocId(null); return }
    try {
      await api.put(`/inventory/locations/${id}`, { code, name, type: editingLocType })
      setEditingLocId(null)
      await loadLocations()
      toast.success('Location updated')
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
  }
  async function removeLocation(l: Location) {
    if (!confirm(`Delete location "${l.name}"?`)) return
    try { await api.delete(`/inventory/locations/${l.id}`); await loadLocations(); toast.success('Location deleted') }
    catch { toast.error('Failed') }
  }

  async function addCategory() {
    const name = newCategory.trim()
    if (!name) return
    setSavingCat(true)
    try {
      await api.post('/inventory/product-categories', { name })
      setNewCategory('')
      await loadCategories()
      toast.success('Category added')
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to add')
    } finally { setSavingCat(false) }
  }

  async function saveCategoryEdit(id: number) {
    const name = editingCatName.trim()
    if (!name) { setEditingCatId(null); return }
    try {
      await api.put(`/inventory/product-categories/${id}`, { name })
      setEditingCatId(null); setEditingCatName('')
      await loadCategories()
      toast.success('Category updated')
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
  }

  async function removeCategory(c: Category) {
    if (!confirm(`Deactivate "${c.name}"? (existing products keep the tag)`)) return
    try {
      await api.delete(`/inventory/product-categories/${c.id}`)
      await loadCategories()
      toast.success('Category deactivated')
    } catch { toast.error('Failed') }
  }

  const sf = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  function openCreate() {
    setEditing(null); setForm(emptyForm); setMode('create')
  }
  function openEdit(d: Dept) {
    setEditing(d)
    setForm({
      code:    d.code,
      name:    d.name,
      manager: d.manager ?? '',
      notes:   d.notes ?? '',
      is_active: d.is_active,
    })
    setMode('edit')
  }

  async function handleSave() {
    if (!form.code.trim()) { toast.error('Department code is required'); return }
    if (!form.name.trim()) { toast.error('Department name is required'); return }
    setSaving(true)
    try {
      if (editing) {
        await api.put(`/inventory/departments/${editing.id}`, form)
        toast.success('Department updated')
      } else {
        await api.post('/inventory/departments', form)
        toast.success('Department created')
      }
      setMode('list'); load()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Save failed')
    } finally { setSaving(false) }
  }

  async function handleDelete(d: Dept) {
    if (!confirm(`Delete department ${d.name}?`)) return
    try {
      await api.delete(`/inventory/departments/${d.id}`)
      toast.success('Deleted'); load()
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Cannot delete') }
  }

  // ── FORM VIEW ─────────────────────────────────────────────
  if (mode === 'create' || mode === 'edit') {
    return (
      <div className="fixed inset-0 z-40 flex flex-col bg-slate-100">
        <div className="bg-white border-b border-slate-200 px-5 py-2.5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
              <Building2 className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                {editing ? `Edit ${editing.code}` : 'New Department'}
              </h2>
              <p className="text-xs text-slate-400">Inventory → Maintain Department</p>
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
            <div className="border-b border-slate-100 px-4 py-3 grid grid-cols-12 gap-3 items-center">
              <div className="col-span-3">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Department Code <span className="text-red-500">*</span></label>
                <input value={form.code} onChange={e=>sf('code', e.target.value.toUpperCase())}
                  placeholder="e.g. CUTTING"
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded font-mono uppercase" />
              </div>
              <div className="col-span-6">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Name <span className="text-red-500">*</span></label>
                <input value={form.name} onChange={e=>sf('name', e.target.value)}
                  placeholder="e.g. Cutting Department"
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
            <div className="border-b border-slate-100 px-4 py-3">
              <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Manager / Head</label>
              <input value={form.manager} onChange={e=>sf('manager', e.target.value)}
                placeholder="Person in charge of this department"
                className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded" />
            </div>
            <div className="px-4 py-3">
              <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Notes</label>
              <textarea value={form.notes} onChange={e=>sf('notes', e.target.value)}
                rows={3}
                className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── MASTER DATA HUB ─────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-slate-50">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center">
            <Layers className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800">Master Data Setup</h1>
            <p className="text-xs text-slate-400">Inventory → Setup hub for departments, locations, tailors, BOM, categories, types</p>
          </div>
        </div>
        <button onClick={() => { load(); loadCategories() }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-600 text-white text-xs font-medium rounded-lg hover:bg-slate-700">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

        {/* ── Quick Tiles (each tile opens its panel inline; click again to close) ── */}
        <section>
          <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Quick Access — Click a tile to manage</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {QUICK_TILES.map((t, i) => {
              const Icon = t.icon
              const theme = TILE_THEME[t.color]
              const isActive = t.kind === 'scroll' && activeSection === t.anchor
              const handleClick = () => {
                if (t.kind === 'link') {
                  router.push(t.href)
                } else {
                  setActiveSection(activeSection === (t.anchor as SectionId) ? null : (t.anchor as SectionId))
                }
              }
              return (
                <button key={i} type="button" onClick={handleClick}
                  className={`group ${theme.bg} border-2 ${isActive ? 'border-slate-700 shadow-lg ring-2 ring-slate-300' : 'border-slate-200'} rounded-xl p-3 text-left transition-all hover:shadow-md hover:-translate-y-0.5 hover:ring-2 ${theme.ring}`}>
                  <div className="flex items-start justify-between mb-1">
                    <Icon className={`w-5 h-5 ${theme.text}`} />
                    {isActive && <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-slate-800 text-white rounded">ON</span>}
                  </div>
                  <div className={`text-[12px] font-bold ${theme.text} mt-1`}>{t.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{t.desc}</div>
                </button>
              )
            })}
          </div>
          {!activeSection && (
            <div className="mt-4 text-center text-xs text-slate-400 italic py-8 bg-slate-50/60 border border-dashed border-slate-200 rounded-xl">
              👆 Pick a tile above to open its master data panel
            </div>
          )}
        </section>

        {/* ── Stock Locations Master (inline CRUD) ── */}
        {activeSection === 'locations' && (
        <section id="locations" className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden scroll-mt-4">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-cyan-50/40">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-700" />
              <div>
                <h3 className="text-sm font-bold text-slate-800">Stock Locations</h3>
                <p className="text-[11px] text-slate-500">Warehouses, tailors, stores, transit. <a href="/inventory/locations" className="text-cyan-600 underline">Open full editor</a> for address / contact / phone fields.</p>
              </div>
            </div>
            <span className="text-[11px] text-slate-500">{locations.filter(l=>l.is_active).length} active</span>
          </div>
          <div className="p-4">
            {/* Add row */}
            <div className="grid grid-cols-12 gap-2 mb-3 items-end">
              <div className="col-span-2">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Code</label>
                <input value={newLocCode} onChange={e=>setNewLocCode(e.target.value.toUpperCase())}
                  placeholder="LOC-WH"
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded font-mono uppercase focus:outline-none focus:border-cyan-500"/>
              </div>
              <div className="col-span-5">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Name</label>
                <input value={newLocName} onChange={e=>setNewLocName(e.target.value)}
                  placeholder="Main Warehouse"
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-cyan-500"/>
              </div>
              <div className="col-span-3">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Type</label>
                <select value={newLocType} onChange={e=>setNewLocType(e.target.value as any)}
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:border-cyan-500">
                  {LOCATION_TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <button onClick={addLocation} disabled={savingLoc || !newLocCode.trim() || !newLocName.trim()}
                  className="w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-cyan-600 text-white text-xs font-semibold rounded hover:bg-cyan-700 disabled:opacity-50">
                  {savingLoc ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Plus className="w-3.5 h-3.5"/>}
                  Add Row
                </button>
              </div>
            </div>
            {/* List */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-28">Code</th>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600">Name</th>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-32">Type</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-20">Status</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {locations.length === 0 ? (
                    <tr><td colSpan={5} className="py-8 text-center text-slate-400 italic text-xs">No locations yet — add one above ↑</td></tr>
                  ) : locations.map((l, i) => editingLocId === l.id ? (
                    <tr key={l.id} className="border-t border-slate-100 bg-cyan-50/30">
                      <td className="px-1 py-1"><input value={editingLocCode} onChange={e=>setEditingLocCode(e.target.value.toUpperCase())} className="w-full px-2 py-1 text-xs border border-cyan-300 rounded font-mono uppercase"/></td>
                      <td className="px-1 py-1"><input value={editingLocName} onChange={e=>setEditingLocName(e.target.value)} className="w-full px-2 py-1 text-xs border border-cyan-300 rounded"/></td>
                      <td className="px-1 py-1">
                        <select value={editingLocType} onChange={e=>setEditingLocType(e.target.value as any)}
                          className="w-full px-2 py-1 text-xs border border-cyan-300 rounded bg-white">
                          {LOCATION_TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${l.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{l.is_active ? 'ACTIVE' : 'INACTIVE'}</span>
                      </td>
                      <td className="px-3 py-1 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={()=>saveLocationEdit(l.id)} title="Save" className="p-1 rounded text-emerald-600 hover:bg-emerald-50"><Save className="w-3 h-3"/></button>
                          <button onClick={()=>setEditingLocId(null)} title="Cancel" className="p-1 rounded text-slate-400 hover:bg-slate-100"><X className="w-3 h-3"/></button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={l.id} className={`border-t border-slate-100 hover:bg-cyan-50/40 ${i%2===0?'bg-white':'bg-slate-50/40'}`}>
                      <td className="px-3 py-1.5 font-mono font-bold text-cyan-700">{l.code}</td>
                      <td className="px-3 py-1.5 font-medium text-slate-800">{l.name}</td>
                      <td className="px-3 py-1.5"><span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600">{l.type}</span></td>
                      <td className="px-3 py-1.5 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${l.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{l.is_active ? 'ACTIVE' : 'INACTIVE'}</span>
                      </td>
                      <td className="px-3 py-1 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={()=>startEditLocation(l)} title="Edit" className="p-1 rounded text-slate-400 hover:text-cyan-600 hover:bg-cyan-50"><Pencil className="w-3 h-3"/></button>
                          <button onClick={()=>removeLocation(l)} title="Delete" className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-3 h-3"/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
        )}

        {/* ── Product Categories Master ── */}
        {activeSection === 'categories' && (
        <section id="categories" className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden scroll-mt-4">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-violet-50/40">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-violet-700" />
              <div>
                <h3 className="text-sm font-bold text-slate-800">Product Categories</h3>
                <p className="text-[11px] text-slate-500">Used as dropdown when creating products. Add / edit / deactivate.</p>
              </div>
            </div>
            <span className="text-[11px] text-slate-500">{categories.filter(c=>c.is_active).length} active</span>
          </div>
          <div className="p-4">
            {/* Add row */}
            <div className="grid grid-cols-12 gap-2 mb-3 items-end">
              <div className="col-span-10">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Category Name</label>
                <input value={newCategory} onChange={e=>setNewCategory(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addCategory() }}
                  placeholder="e.g. Baju Kurung, Songket, Lace…"
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-violet-500"/>
              </div>
              <div className="col-span-2">
                <button onClick={addCategory} disabled={savingCat || !newCategory.trim()}
                  className="w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-violet-600 text-white text-xs font-semibold rounded hover:bg-violet-700 disabled:opacity-50">
                  {savingCat ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Plus className="w-3.5 h-3.5"/>}
                  Add Row
                </button>
              </div>
            </div>
            {/* List */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-center px-2 py-2 text-[10px] uppercase font-semibold text-slate-600 w-10">#</th>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600">Name</th>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-40">Slug</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-24">Status</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.length === 0 ? (
                    <tr><td colSpan={5} className="py-8 text-center text-slate-400 italic text-xs">No categories yet — add one above ↑</td></tr>
                  ) : categories.map((c, i) => editingCatId === c.id ? (
                    <tr key={c.id} className="border-t border-slate-100 bg-violet-50/30">
                      <td className="px-2 py-1.5 text-center text-slate-400">{i+1}</td>
                      <td className="px-1 py-1">
                        <input value={editingCatName} onChange={e => setEditingCatName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveCategoryEdit(c.id); if (e.key === 'Escape') { setEditingCatId(null); setEditingCatName('') } }}
                          autoFocus
                          className="w-full px-2 py-1 text-xs border border-violet-300 rounded"/>
                      </td>
                      <td className="px-3 py-1.5 font-mono text-[10px] text-slate-400">{c.slug}</td>
                      <td className="px-3 py-1.5 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${c.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{c.is_active ? 'ACTIVE' : 'INACTIVE'}</span>
                      </td>
                      <td className="px-3 py-1 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => saveCategoryEdit(c.id)} title="Save" className="p-1 rounded text-emerald-600 hover:bg-emerald-50"><Save className="w-3 h-3"/></button>
                          <button onClick={() => { setEditingCatId(null); setEditingCatName('') }} title="Cancel" className="p-1 rounded text-slate-400 hover:bg-slate-100"><X className="w-3 h-3"/></button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={c.id} className={`border-t border-slate-100 hover:bg-violet-50/40 ${i%2===0?'bg-white':'bg-slate-50/40'}`}>
                      <td className="px-2 py-1.5 text-center text-slate-400">{i+1}</td>
                      <td className="px-3 py-1.5 font-medium text-slate-800">{c.name}</td>
                      <td className="px-3 py-1.5 font-mono text-[10px] text-slate-400">{c.slug}</td>
                      <td className="px-3 py-1.5 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${c.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{c.is_active ? 'ACTIVE' : 'INACTIVE'}</span>
                      </td>
                      <td className="px-3 py-1 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => { setEditingCatId(c.id); setEditingCatName(c.name) }} title="Edit" className="p-1 rounded text-slate-400 hover:text-violet-600 hover:bg-violet-50"><Pencil className="w-3 h-3"/></button>
                          {c.is_active && (
                            <button onClick={() => removeCategory(c)} title="Deactivate" className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-3 h-3"/></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
        )}

        {/* ── Product Types (managed inline) ── */}
        {activeSection === 'types' && (
        <section id="types" className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden scroll-mt-4">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-rose-50/40">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-rose-700" />
              <div>
                <h3 className="text-sm font-bold text-slate-800">Product Types</h3>
                <p className="text-[11px] text-slate-500">Apparel · Fabric · Accessory · Service · Raw Material — add custom ones (e.g. Shoes, Bags). System types are locked.</p>
              </div>
            </div>
            <span className="text-[11px] text-slate-500">{types.filter(t=>t.is_active).length} active</span>
          </div>
          <div className="p-4">
            {/* Add row */}
            <div className="grid grid-cols-12 gap-2 mb-3 items-end">
              <div className="col-span-2">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Emoji (opt.)</label>
                <input value={newTypeEmoji} onChange={e=>setNewTypeEmoji(e.target.value)}
                  placeholder="👞"
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded text-center focus:outline-none focus:border-rose-500"/>
              </div>
              <div className="col-span-8">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Label</label>
                <input value={newTypeLabel} onChange={e=>setNewTypeLabel(e.target.value)}
                  onKeyDown={e=>{ if (e.key==='Enter') addType() }}
                  placeholder="e.g. Shoes (per pair)"
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-rose-500"/>
              </div>
              <div className="col-span-2">
                <button onClick={addType} disabled={savingType || !newTypeLabel.trim()}
                  className="w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-rose-600 text-white text-xs font-semibold rounded hover:bg-rose-700 disabled:opacity-50">
                  {savingType ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Plus className="w-3.5 h-3.5"/>}
                  Add Row
                </button>
              </div>
            </div>
            {/* List */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-center px-2 py-2 text-[10px] uppercase font-semibold text-slate-600 w-12">Emoji</th>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600">Label</th>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-32">Key</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-24">Source</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {types.length === 0 ? (
                    <tr><td colSpan={5} className="py-6 text-center text-slate-400 italic text-xs">No types yet</td></tr>
                  ) : types.map((t, i) => editingTypeId === t.id ? (
                    <tr key={t.id} className="border-t border-slate-100 bg-rose-50/30">
                      <td className="px-1 py-1"><input value={editingTypeEmoji} onChange={e=>setEditingTypeEmoji(e.target.value)} className="w-full px-2 py-1 text-xs border border-rose-300 rounded text-center"/></td>
                      <td className="px-1 py-1"><input value={editingTypeLabel} onChange={e=>setEditingTypeLabel(e.target.value)} className="w-full px-2 py-1 text-xs border border-rose-300 rounded"/></td>
                      <td className="px-3 py-1.5 font-mono text-[10px] text-slate-500">{t.key}</td>
                      <td className="px-3 py-1.5 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${t.is_system ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>{t.is_system ? 'SYSTEM' : 'CUSTOM'}</span>
                      </td>
                      <td className="px-3 py-1 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={()=>saveTypeEdit(t.id)} title="Save" className="p-1 rounded text-emerald-600 hover:bg-emerald-50"><Save className="w-3 h-3"/></button>
                          <button onClick={()=>{ setEditingTypeId(null); setEditingTypeLabel(''); setEditingTypeEmoji('') }} title="Cancel" className="p-1 rounded text-slate-400 hover:bg-slate-100"><X className="w-3 h-3"/></button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={t.id} className={`border-t border-slate-100 hover:bg-rose-50/40 ${i%2===0?'bg-white':'bg-slate-50/40'}`}>
                      <td className="px-3 py-1.5 text-center text-base">{t.emoji ?? '—'}</td>
                      <td className="px-3 py-1.5 font-medium text-slate-800">{t.label}{t.description && <span className="text-[10px] text-slate-400 block">{t.description}</span>}</td>
                      <td className="px-3 py-1.5 font-mono text-[10px] text-slate-500">{t.key}</td>
                      <td className="px-3 py-1.5 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${t.is_system ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>{t.is_system ? 'SYSTEM' : 'CUSTOM'}</span>
                      </td>
                      <td className="px-3 py-1 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={()=>{ setEditingTypeId(t.id); setEditingTypeLabel(t.label); setEditingTypeEmoji(t.emoji ?? '') }} title="Edit label / emoji"
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"><Pencil className="w-3 h-3"/></button>
                          {!t.is_system && (
                            <button onClick={()=>removeType(t)} title="Delete" className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-3 h-3"/></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
        )}

        {/* ── Departments CRUD ── */}
        {activeSection === 'departments' && (
        <section id="departments" className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden scroll-mt-4">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-indigo-50/40">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-700"/>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Departments</h3>
                <p className="text-[11px] text-slate-500">Production / division tags for stock items and orders.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                <input value={search} onChange={e=>setSearch(e.target.value)}
                  placeholder="Search…"
                  className="pl-7 pr-2.5 py-1 text-[11px] border border-slate-200 rounded w-40 focus:outline-none focus:border-indigo-400"/>
              </div>
              <button onClick={openCreate}
                className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 text-white text-[11px] font-semibold rounded hover:bg-indigo-700">
                <Plus className="w-3 h-3" /> New
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="w-8 px-2 py-2 text-center text-[10px] uppercase font-semibold text-slate-600">#</th>
                  <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600">Code</th>
                  <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600">Name</th>
                  <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600">Manager</th>
                  <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600">Notes</th>
                  <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-20">Status</th>
                  <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? Array.from({length:3}).map((_,i)=>(
                  <tr key={i} className="border-t border-slate-100">
                    {Array.from({length:7}).map((_,j)=>(<td key={j} className="px-3 py-2"><div className="h-3 bg-slate-100 rounded animate-pulse" /></td>))}
                  </tr>
                )) : records.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-xs">No departments yet</p>
                      <button onClick={openCreate} className="mt-2 px-3 py-1 bg-indigo-600 text-white text-[11px] rounded">Create First</button>
                    </td>
                  </tr>
                ) : records.map((d, idx) => (
                  <tr key={d.id}
                    onDoubleClick={() => openEdit(d)}
                    className={`border-t border-slate-100 cursor-pointer hover:bg-indigo-50/40 ${idx%2===0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                    <td className="px-2 py-1.5 text-center text-slate-400">{idx+1}</td>
                    <td className="px-3 py-1.5 font-mono font-bold text-indigo-700">{d.code}</td>
                    <td className="px-3 py-1.5 font-medium text-slate-800">{d.name}</td>
                    <td className="px-3 py-1.5 text-slate-700">{d.manager ?? '—'}</td>
                    <td className="px-3 py-1.5 text-slate-500 truncate max-w-md">{d.notes ?? '—'}</td>
                    <td className="px-3 py-1.5 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${d.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                        {d.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-center" onClick={e=>e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={()=>openEdit(d)} title="Edit" className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"><Pencil className="w-3 h-3"/></button>
                        <button onClick={()=>handleDelete(d)} title="Delete" className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-3 h-3"/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        )}

      </div>
    </div>
  )
}
