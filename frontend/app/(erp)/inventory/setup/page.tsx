'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft, RefreshCw, Plus, Pencil, Trash2, Save, X, Loader2,
  MapPin, Tag, Package, Building2, Scissors, BookOpen, Layers,
  FolderOpen, Globe,
} from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

// ─────────── types ───────────
type Location = {
  id: number
  code: string
  name: string
  type: 'warehouse' | 'tailor' | 'store' | 'transit'
  contact_person: string | null
  phone: string | null
  address: string | null
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

type Dept = {
  id: number
  code: string
  name: string
  manager: string | null
  notes: string | null
  is_active: boolean
}

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

type Bom = {
  id: number
  bom_code: string
  product_id: number | null
  description: string | null
  status: string
  total_cost?: number
  is_active: boolean
  product?: { id: number; name: string; sku: string } | null
}

type Collection = {
  id: number
  name: string
  slug: string
  description: string | null
  sort_order: number
  is_active: boolean
}

type SectionId = 'locations' | 'categories' | 'types' | 'departments' | 'tailors' | 'boms' | 'collections' | 'marketing'

const LOCATION_TYPES = ['warehouse', 'tailor', 'store', 'transit'] as const

const TILES: { id: SectionId; label: string; desc: string; icon: any; color: string; bg: string; ring: string }[] = [
  { id: 'locations',   label: 'Stock Locations',    desc: 'Warehouses · stores · tailor · transit',      icon: MapPin,      color: 'text-cyan-700',     bg: 'bg-cyan-50',     ring: 'hover:ring-cyan-400' },
  { id: 'categories',  label: 'Product Categories', desc: 'Tags / groupings for products',               icon: Tag,         color: 'text-violet-700',   bg: 'bg-violet-50',   ring: 'hover:ring-violet-400' },
  { id: 'collections', label: 'Collections',        desc: 'Product collections e.g. Aryana Songket',     icon: FolderOpen,  color: 'text-teal-700',     bg: 'bg-teal-50',     ring: 'hover:ring-teal-400' },
  { id: 'types',       label: 'Product Types',      desc: 'Apparel · fabric · accessory · raw material', icon: Package,     color: 'text-rose-700',     bg: 'bg-rose-50',     ring: 'hover:ring-rose-400' },
  { id: 'departments', label: 'Departments',        desc: 'Production / division tags',                  icon: Building2,   color: 'text-indigo-700',   bg: 'bg-indigo-50',   ring: 'hover:ring-indigo-400' },
  { id: 'tailors',     label: 'Tailors',            desc: 'Production partners (CMT)',                   icon: Scissors,    color: 'text-fuchsia-700',  bg: 'bg-fuchsia-50',  ring: 'hover:ring-fuchsia-400' },
  { id: 'boms',        label: 'Bill of Material',   desc: 'Stitching · materials · overhead',            icon: BookOpen,    color: 'text-amber-700',    bg: 'bg-amber-50',    ring: 'hover:ring-amber-400' },
  { id: 'marketing',   label: 'SEO & Marketing',    desc: 'Google Merchant · Meta Catalog · store SEO',  icon: Globe,       color: 'text-emerald-700',  bg: 'bg-emerald-50',  ring: 'hover:ring-emerald-400' },
]

export default function InventorySetupPage() {
  const router = useRouter()
  const sp     = useSearchParams()
  const initial = (sp.get('tab') as SectionId) || null
  const [active, setActive] = useState<SectionId | null>(initial)

  // ─── Locations ───
  const [locs, setLocs]                     = useState<Location[]>([])
  const [newLoc, setNewLoc]                 = useState({ code: '', name: '', type: 'warehouse' as typeof LOCATION_TYPES[number], contact_person: '', phone: '' })
  const [editLocId, setEditLocId]           = useState<number | null>(null)
  const [editLoc, setEditLoc]               = useState<Partial<Location>>({})
  const [savingLoc, setSavingLoc]           = useState(false)

  // ─── Categories ───
  const [cats, setCats]                     = useState<Category[]>([])
  const [newCat, setNewCat]                 = useState({ name: '', description: '' })
  const [editCatId, setEditCatId]           = useState<number | null>(null)
  const [editCat, setEditCat]               = useState<Partial<Category>>({})
  const [savingCat, setSavingCat]           = useState(false)

  // ─── Product Types ───
  const [types, setTypes]                   = useState<ProdType[]>([])
  const [newType, setNewType]               = useState({ label: '', emoji: '', description: '' })
  const [editTypeId, setEditTypeId]         = useState<number | null>(null)
  const [editType, setEditType]             = useState<Partial<ProdType>>({})
  const [savingType, setSavingType]         = useState(false)

  // ─── Departments ───
  const [depts, setDepts]                   = useState<Dept[]>([])
  const [newDept, setNewDept]               = useState({ code: '', name: '', manager: '', notes: '' })
  const [editDeptId, setEditDeptId]         = useState<number | null>(null)
  const [editDept, setEditDept]             = useState<Partial<Dept>>({})
  const [savingDept, setSavingDept]         = useState(false)

  // ─── Tailors ───
  const [tailors, setTailors]               = useState<Tailor[]>([])
  const [newTailor, setNewTailor]           = useState({ tailor_code: '', name: '', contact_person: '', phone: '', payment_terms: '' })
  const [editTailorId, setEditTailorId]     = useState<number | null>(null)
  const [editTailor, setEditTailor]         = useState<Partial<Tailor>>({})
  const [savingTailor, setSavingTailor]     = useState(false)

  // ─── BOMs (read-only list with link to full editor) ───
  const [boms, setBoms]                     = useState<Bom[]>([])

  // ─── Collections ───
  const [colls, setColls]                   = useState<Collection[]>([])
  const [newColl, setNewColl]               = useState({ name: '', description: '' })
  const [editCollId, setEditCollId]         = useState<number | null>(null)
  const [editColl, setEditColl]             = useState<Partial<Collection>>({})
  const [savingColl, setSavingColl]         = useState(false)

  // ─── Marketing / SEO Settings ───
  const [mktSettings, setMktSettings]       = useState<Record<string,string>>({})
  const [savingMkt, setSavingMkt]           = useState(false)

  // ─── loaders ───
  const loadLocs = useCallback(async () => {
    try { const r = await api.get('/inventory/locations'); setLocs(r.data.data ?? []) } catch {}
  }, [])
  const loadCats = useCallback(async () => {
    try { const r = await api.get('/inventory/product-categories'); setCats(r.data.data ?? []) } catch {}
  }, [])
  const loadTypes = useCallback(async () => {
    try { const r = await api.get('/inventory/product-types'); setTypes(r.data.data ?? []) } catch {}
  }, [])
  const loadDepts = useCallback(async () => {
    try { const r = await api.get('/inventory/departments'); setDepts(r.data.data ?? []) } catch {}
  }, [])
  const loadTailors = useCallback(async () => {
    try { const r = await api.get('/inventory/tailors'); setTailors(r.data.data ?? []) } catch {}
  }, [])
  const loadBoms = useCallback(async () => {
    try { const r = await api.get('/inventory/boms'); setBoms(r.data.data ?? []) } catch {}
  }, [])
  const loadColls = useCallback(async () => {
    try { const r = await api.get('/inventory/product-collections'); setColls(r.data.data ?? []) } catch {}
  }, [])
  const loadMkt = useCallback(async () => {
    try { const r = await api.get('/inventory/settings'); setMktSettings(r.data.data ?? {}) } catch {}
  }, [])

  useEffect(() => {
    loadLocs(); loadCats(); loadTypes(); loadDepts(); loadTailors(); loadBoms(); loadColls(); loadMkt()
  }, [loadLocs, loadCats, loadTypes, loadDepts, loadTailors, loadBoms, loadColls, loadMkt])

  function refreshAll() {
    loadLocs(); loadCats(); loadTypes(); loadDepts(); loadTailors(); loadBoms(); loadColls(); loadMkt()
    toast.success('Refreshed')
  }

  // ─── Location CRUD ───
  async function addLoc() {
    const code = newLoc.code.trim().toUpperCase()
    const name = newLoc.name.trim()
    if (!code || !name) return
    setSavingLoc(true)
    try {
      await api.post('/inventory/locations', {
        code, name, type: newLoc.type,
        contact_person: newLoc.contact_person.trim() || null,
        phone: newLoc.phone.trim() || null,
        is_active: true,
      })
      setNewLoc({ code: '', name: '', type: 'warehouse', contact_person: '', phone: '' })
      await loadLocs()
      toast.success('Location added')
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
    finally { setSavingLoc(false) }
  }
  function startEditLoc(l: Location) {
    setEditLocId(l.id)
    setEditLoc({ code: l.code, name: l.name, type: l.type, contact_person: l.contact_person ?? '', phone: l.phone ?? '', is_active: l.is_active })
  }
  async function saveEditLoc(id: number) {
    try {
      await api.put(`/inventory/locations/${id}`, editLoc)
      setEditLocId(null); await loadLocs(); toast.success('Updated')
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
  }
  async function delLoc(l: Location) {
    if (!confirm(`Delete location "${l.name}"?`)) return
    try { await api.delete(`/inventory/locations/${l.id}`); await loadLocs(); toast.success('Deleted') }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
  }

  // ─── Category CRUD ───
  async function addCat() {
    const name = newCat.name.trim()
    if (!name) return
    setSavingCat(true)
    try {
      await api.post('/inventory/product-categories', { name, description: newCat.description.trim() || null })
      setNewCat({ name: '', description: '' })
      await loadCats()
      toast.success('Category added')
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
    finally { setSavingCat(false) }
  }
  function startEditCat(c: Category) {
    setEditCatId(c.id)
    setEditCat({ name: c.name, description: c.description ?? '', is_active: c.is_active })
  }
  async function saveEditCat(id: number) {
    try {
      await api.put(`/inventory/product-categories/${id}`, editCat)
      setEditCatId(null); await loadCats(); toast.success('Updated')
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
  }
  async function delCat(c: Category) {
    if (!confirm(`Deactivate "${c.name}"? (existing products keep the tag)`)) return
    try { await api.delete(`/inventory/product-categories/${c.id}`); await loadCats(); toast.success('Deactivated') }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
  }

  // ─── Product Type CRUD ───
  async function addType() {
    const label = newType.label.trim()
    if (!label) return
    setSavingType(true)
    try {
      await api.post('/inventory/product-types', {
        label, emoji: newType.emoji.trim() || null,
        description: newType.description.trim() || null,
      })
      setNewType({ label: '', emoji: '', description: '' })
      await loadTypes()
      toast.success('Type added')
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
    finally { setSavingType(false) }
  }
  function startEditType(t: ProdType) {
    setEditTypeId(t.id)
    setEditType({ label: t.label, emoji: t.emoji ?? '', description: t.description ?? '', is_active: t.is_active })
  }
  async function saveEditType(id: number) {
    try {
      await api.put(`/inventory/product-types/${id}`, editType)
      setEditTypeId(null); await loadTypes(); toast.success('Updated')
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
  }
  async function delType(t: ProdType) {
    if (t.is_system) { toast.error('System types cannot be removed'); return }
    if (!confirm(`Deactivate "${t.label}"?`)) return
    try { await api.delete(`/inventory/product-types/${t.id}`); await loadTypes(); toast.success('Deactivated') }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
  }

  // ─── Department CRUD ───
  async function addDept() {
    const code = newDept.code.trim().toUpperCase()
    const name = newDept.name.trim()
    if (!code || !name) return
    setSavingDept(true)
    try {
      await api.post('/inventory/departments', {
        code, name,
        manager: newDept.manager.trim() || null,
        notes: newDept.notes.trim() || null,
        is_active: true,
      })
      setNewDept({ code: '', name: '', manager: '', notes: '' })
      await loadDepts()
      toast.success('Department added')
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
    finally { setSavingDept(false) }
  }
  function startEditDept(d: Dept) {
    setEditDeptId(d.id)
    setEditDept({ code: d.code, name: d.name, manager: d.manager ?? '', notes: d.notes ?? '', is_active: d.is_active })
  }
  async function saveEditDept(id: number) {
    try {
      await api.put(`/inventory/departments/${id}`, editDept)
      setEditDeptId(null); await loadDepts(); toast.success('Updated')
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
  }
  async function delDept(d: Dept) {
    if (!confirm(`Delete department "${d.name}"?`)) return
    try { await api.delete(`/inventory/departments/${d.id}`); await loadDepts(); toast.success('Deleted') }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
  }

  // ─── Tailor CRUD ───
  async function addTailor() {
    const tailor_code = newTailor.tailor_code.trim().toUpperCase()
    const name = newTailor.name.trim()
    if (!tailor_code || !name) return
    setSavingTailor(true)
    try {
      await api.post('/inventory/tailors', {
        tailor_code, name,
        contact_person: newTailor.contact_person.trim() || null,
        phone: newTailor.phone.trim() || null,
        payment_terms: newTailor.payment_terms.trim() || null,
        is_active: true,
      })
      setNewTailor({ tailor_code: '', name: '', contact_person: '', phone: '', payment_terms: '' })
      await loadTailors()
      toast.success('Tailor added')
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
    finally { setSavingTailor(false) }
  }
  function startEditTailor(t: Tailor) {
    setEditTailorId(t.id)
    setEditTailor({
      tailor_code: t.tailor_code, name: t.name,
      contact_person: t.contact_person ?? '', phone: t.phone ?? '',
      payment_terms: t.payment_terms ?? '', is_active: t.is_active,
    })
  }
  async function saveEditTailor(id: number) {
    try {
      await api.put(`/inventory/tailors/${id}`, editTailor)
      setEditTailorId(null); await loadTailors(); toast.success('Updated')
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
  }
  async function delTailor(t: Tailor) {
    if (!confirm(`Delete tailor "${t.name}"?`)) return
    try { await api.delete(`/inventory/tailors/${t.id}`); await loadTailors(); toast.success('Deleted') }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
  }

  // ─── Collection CRUD ───
  async function addColl() {
    const name = newColl.name.trim()
    if (!name) return
    setSavingColl(true)
    try {
      await api.post('/inventory/product-collections', { name, description: newColl.description.trim() || null })
      setNewColl({ name: '', description: '' })
      await loadColls()
      toast.success('Collection added')
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
    finally { setSavingColl(false) }
  }
  function startEditColl(c: Collection) {
    setEditCollId(c.id)
    setEditColl({ name: c.name, description: c.description ?? '', is_active: c.is_active })
  }
  async function saveEditColl(id: number) {
    try {
      await api.put(`/inventory/product-collections/${id}`, editColl)
      setEditCollId(null); await loadColls(); toast.success('Updated')
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
  }
  async function delColl(c: Collection) {
    if (!confirm(`Deactivate collection "${c.name}"? Products will be unlinked.`)) return
    try { await api.delete(`/inventory/product-collections/${c.id}`); await loadColls(); toast.success('Deleted') }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
  }

  // ─── Marketing Settings save ───
  function setMkt(key: string, value: string) {
    setMktSettings(s => ({ ...s, [key]: value }))
  }
  async function saveMkt(group: string) {
    setSavingMkt(true)
    try {
      await api.post('/inventory/settings', { settings: mktSettings, group })
      toast.success('Settings saved')
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
    finally { setSavingMkt(false) }
  }

  // ─── render ───
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center">
            <Layers className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800">Inventory Master Setup</h1>
            <p className="text-xs text-slate-400">Locations · Categories · Collections · Types · Departments · Tailors · BOM · SEO & Marketing</p>
          </div>
        </div>
        <button onClick={refreshAll}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-600 text-white text-xs font-medium rounded-lg hover:bg-slate-700">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Tiles */}
      <section>
        <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Quick Access — Click a tile to manage</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {TILES.map(t => {
            const Icon = t.icon
            const isActive = active === t.id
            return (
              <button key={t.id} onClick={() => setActive(active === t.id ? null : t.id)}
                className={`group ${t.bg} border-2 ${isActive ? 'border-slate-700 shadow-lg ring-2 ring-slate-300' : 'border-slate-200'} rounded-xl p-3 text-left transition-all hover:shadow-md hover:-translate-y-0.5 hover:ring-2 ${t.ring}`}>
                <div className="flex items-start justify-between mb-1">
                  <Icon className={`w-5 h-5 ${t.color}`} />
                  {isActive && <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-slate-800 text-white rounded">ON</span>}
                </div>
                <div className={`text-[12px] font-bold ${t.color} mt-1`}>{t.label}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{t.desc}</div>
              </button>
            )
          })}
        </div>
        {!active && (
          <div className="mt-4 text-center text-xs text-slate-400 italic py-8 bg-slate-50/60 border border-dashed border-slate-200 rounded-xl">
            👆 Pick a tile above to manage that master
          </div>
        )}
      </section>

      {/* ─── Locations ─── */}
      {active === 'locations' && (
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-cyan-50/40">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-700" />
              <div>
                <h3 className="text-sm font-bold text-slate-800">Stock Locations</h3>
                <p className="text-[11px] text-slate-500">Warehouses, stores, tailor and transit points used in stock movements.</p>
              </div>
            </div>
            <span className="text-[11px] text-slate-500">{locs.filter(l => l.is_active).length} active</span>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-12 gap-2 mb-3 items-end">
              <div className="col-span-2">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Code</label>
                <input value={newLoc.code} onChange={e => setNewLoc(s => ({ ...s, code: e.target.value.toUpperCase() }))}
                  placeholder="WH-01" className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded font-mono uppercase focus:outline-none focus:border-cyan-500" />
              </div>
              <div className="col-span-4">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Name</label>
                <input value={newLoc.name} onChange={e => setNewLoc(s => ({ ...s, name: e.target.value }))}
                  placeholder="Main Warehouse" className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-cyan-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Type</label>
                <select value={newLoc.type} onChange={e => setNewLoc(s => ({ ...s, type: e.target.value as any }))}
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded bg-white">
                  {LOCATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Phone</label>
                <input value={newLoc.phone} onChange={e => setNewLoc(s => ({ ...s, phone: e.target.value }))}
                  placeholder="03-..." className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded" />
              </div>
              <div className="col-span-2">
                <button onClick={addLoc} disabled={savingLoc || !newLoc.code.trim() || !newLoc.name.trim()}
                  className="w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-cyan-600 text-white text-xs font-semibold rounded hover:bg-cyan-700 disabled:opacity-50">
                  {savingLoc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Add
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-24">Code</th>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600">Name</th>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-28">Type</th>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-36">Contact</th>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-32">Phone</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-20">Status</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {locs.length === 0 ? (
                    <tr><td colSpan={7} className="py-8 text-center text-slate-400 italic text-xs">No locations yet — add one above ↑</td></tr>
                  ) : locs.map((l, i) => editLocId === l.id ? (
                    <tr key={l.id} className="border-t border-slate-100 bg-cyan-50/30">
                      <td className="px-1 py-1"><input value={editLoc.code as string ?? ''} onChange={e => setEditLoc(s => ({ ...s, code: e.target.value.toUpperCase() }))} className="w-full px-2 py-1 text-xs border border-cyan-300 rounded font-mono uppercase" /></td>
                      <td className="px-1 py-1"><input value={editLoc.name as string ?? ''} onChange={e => setEditLoc(s => ({ ...s, name: e.target.value }))} className="w-full px-2 py-1 text-xs border border-cyan-300 rounded" /></td>
                      <td className="px-1 py-1">
                        <select value={editLoc.type as string ?? 'warehouse'} onChange={e => setEditLoc(s => ({ ...s, type: e.target.value as any }))}
                          className="w-full px-2 py-1 text-xs border border-cyan-300 rounded bg-white">
                          {LOCATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </td>
                      <td className="px-1 py-1"><input value={editLoc.contact_person as string ?? ''} onChange={e => setEditLoc(s => ({ ...s, contact_person: e.target.value }))} className="w-full px-2 py-1 text-xs border border-cyan-300 rounded" /></td>
                      <td className="px-1 py-1"><input value={editLoc.phone as string ?? ''} onChange={e => setEditLoc(s => ({ ...s, phone: e.target.value }))} className="w-full px-2 py-1 text-xs border border-cyan-300 rounded" /></td>
                      <td className="px-3 py-1.5 text-center">
                        <select value={editLoc.is_active ? '1' : '0'} onChange={e => setEditLoc(s => ({ ...s, is_active: e.target.value === '1' }))}
                          className="text-[10px] border border-cyan-300 rounded px-1 py-0.5 bg-white">
                          <option value="1">ACTIVE</option><option value="0">INACTIVE</option>
                        </select>
                      </td>
                      <td className="px-3 py-1 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => saveEditLoc(l.id)} className="p-1 rounded text-emerald-600 hover:bg-emerald-50"><Save className="w-3 h-3" /></button>
                          <button onClick={() => setEditLocId(null)} className="p-1 rounded text-slate-400 hover:bg-slate-100"><X className="w-3 h-3" /></button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={l.id} className={`border-t border-slate-100 hover:bg-cyan-50/40 ${i%2===0?'bg-white':'bg-slate-50/40'}`}>
                      <td className="px-3 py-1.5 font-mono font-bold text-cyan-700">{l.code}</td>
                      <td className="px-3 py-1.5 font-medium text-slate-800">{l.name}</td>
                      <td className="px-3 py-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-cyan-100 text-cyan-700 capitalize">{l.type}</span>
                      </td>
                      <td className="px-3 py-1.5 text-slate-700">{l.contact_person ?? '—'}</td>
                      <td className="px-3 py-1.5 text-slate-700">{l.phone ?? '—'}</td>
                      <td className="px-3 py-1.5 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${l.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{l.is_active ? 'ACTIVE' : 'INACTIVE'}</span>
                      </td>
                      <td className="px-3 py-1 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => startEditLoc(l)} className="p-1 rounded text-slate-400 hover:text-cyan-600 hover:bg-cyan-50"><Pencil className="w-3 h-3" /></button>
                          <button onClick={() => delLoc(l)} className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-3 h-3" /></button>
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

      {/* ─── Categories ─── */}
      {active === 'categories' && (
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-violet-50/40">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-violet-700" />
              <div>
                <h3 className="text-sm font-bold text-slate-800">Product Categories</h3>
                <p className="text-[11px] text-slate-500">Tags / groupings used on products. Slug auto-generated.</p>
              </div>
            </div>
            <span className="text-[11px] text-slate-500">{cats.filter(c => c.is_active).length} active</span>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-12 gap-2 mb-3 items-end">
              <div className="col-span-4">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Name</label>
                <input value={newCat.name} onChange={e => setNewCat(s => ({ ...s, name: e.target.value }))}
                  placeholder="e.g. Kurung Set" className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-violet-500" />
              </div>
              <div className="col-span-6">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Description</label>
                <input value={newCat.description} onChange={e => setNewCat(s => ({ ...s, description: e.target.value }))}
                  placeholder="optional" className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded" />
              </div>
              <div className="col-span-2">
                <button onClick={addCat} disabled={savingCat || !newCat.name.trim()}
                  className="w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-violet-600 text-white text-xs font-semibold rounded hover:bg-violet-700 disabled:opacity-50">
                  {savingCat ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Add
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-12">#</th>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600">Name</th>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-44">Slug</th>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600">Description</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-20">Status</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cats.length === 0 ? (
                    <tr><td colSpan={6} className="py-8 text-center text-slate-400 italic text-xs">No categories yet — add one above ↑</td></tr>
                  ) : cats.map((c, i) => editCatId === c.id ? (
                    <tr key={c.id} className="border-t border-slate-100 bg-violet-50/30">
                      <td className="px-3 py-1.5 text-slate-400">{i + 1}</td>
                      <td className="px-1 py-1"><input value={editCat.name as string ?? ''} onChange={e => setEditCat(s => ({ ...s, name: e.target.value }))} className="w-full px-2 py-1 text-xs border border-violet-300 rounded" /></td>
                      <td className="px-3 py-1.5 text-slate-400 font-mono text-[10px]">{c.slug}</td>
                      <td className="px-1 py-1"><input value={editCat.description as string ?? ''} onChange={e => setEditCat(s => ({ ...s, description: e.target.value }))} className="w-full px-2 py-1 text-xs border border-violet-300 rounded" /></td>
                      <td className="px-3 py-1.5 text-center">
                        <select value={editCat.is_active ? '1' : '0'} onChange={e => setEditCat(s => ({ ...s, is_active: e.target.value === '1' }))}
                          className="text-[10px] border border-violet-300 rounded px-1 py-0.5 bg-white">
                          <option value="1">ACTIVE</option><option value="0">INACTIVE</option>
                        </select>
                      </td>
                      <td className="px-3 py-1 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => saveEditCat(c.id)} className="p-1 rounded text-emerald-600 hover:bg-emerald-50"><Save className="w-3 h-3" /></button>
                          <button onClick={() => setEditCatId(null)} className="p-1 rounded text-slate-400 hover:bg-slate-100"><X className="w-3 h-3" /></button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={c.id} className={`border-t border-slate-100 hover:bg-violet-50/40 ${i%2===0?'bg-white':'bg-slate-50/40'}`}>
                      <td className="px-3 py-1.5 text-slate-400">{i + 1}</td>
                      <td className="px-3 py-1.5 font-medium text-slate-800">{c.name}</td>
                      <td className="px-3 py-1.5 font-mono text-[10px] text-slate-500">{c.slug}</td>
                      <td className="px-3 py-1.5 text-slate-600">{c.description ?? '—'}</td>
                      <td className="px-3 py-1.5 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${c.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{c.is_active ? 'ACTIVE' : 'INACTIVE'}</span>
                      </td>
                      <td className="px-3 py-1 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => startEditCat(c)} className="p-1 rounded text-slate-400 hover:text-violet-600 hover:bg-violet-50"><Pencil className="w-3 h-3" /></button>
                          <button onClick={() => delCat(c)} className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-3 h-3" /></button>
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

      {/* ─── Product Types ─── */}
      {active === 'types' && (
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-rose-50/40">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-rose-700" />
              <div>
                <h3 className="text-sm font-bold text-slate-800">Product Types</h3>
                <p className="text-[11px] text-slate-500">Drives the product_type field. Fabric / raw material / accessory = stock items (unified under Products). System types locked.</p>
              </div>
            </div>
            <span className="text-[11px] text-slate-500">{types.filter(t => t.is_active).length} active</span>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-12 gap-2 mb-3 items-end">
              <div className="col-span-1">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Emoji</label>
                <input value={newType.emoji} onChange={e => setNewType(s => ({ ...s, emoji: e.target.value }))}
                  placeholder="👕" className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded text-center" />
              </div>
              <div className="col-span-3">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Label</label>
                <input value={newType.label} onChange={e => setNewType(s => ({ ...s, label: e.target.value }))}
                  placeholder="Apparel" className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-rose-500" />
              </div>
              <div className="col-span-6">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Description</label>
                <input value={newType.description} onChange={e => setNewType(s => ({ ...s, description: e.target.value }))}
                  placeholder="optional" className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded" />
              </div>
              <div className="col-span-2">
                <button onClick={addType} disabled={savingType || !newType.label.trim()}
                  className="w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-rose-600 text-white text-xs font-semibold rounded hover:bg-rose-700 disabled:opacity-50">
                  {savingType ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Add
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-14">Emoji</th>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-40">Label</th>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-32">Key</th>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600">Description</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-20">Source</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-20">Status</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {types.length === 0 ? (
                    <tr><td colSpan={7} className="py-8 text-center text-slate-400 italic text-xs">No product types yet</td></tr>
                  ) : types.map((t, i) => editTypeId === t.id ? (
                    <tr key={t.id} className="border-t border-slate-100 bg-rose-50/30">
                      <td className="px-1 py-1"><input value={editType.emoji as string ?? ''} onChange={e => setEditType(s => ({ ...s, emoji: e.target.value }))} className="w-full px-2 py-1 text-xs border border-rose-300 rounded text-center" /></td>
                      <td className="px-1 py-1"><input value={editType.label as string ?? ''} onChange={e => setEditType(s => ({ ...s, label: e.target.value }))} className="w-full px-2 py-1 text-xs border border-rose-300 rounded" /></td>
                      <td className="px-3 py-1.5 font-mono text-[10px] text-slate-500">{t.key}</td>
                      <td className="px-1 py-1"><input value={editType.description as string ?? ''} onChange={e => setEditType(s => ({ ...s, description: e.target.value }))} className="w-full px-2 py-1 text-xs border border-rose-300 rounded" /></td>
                      <td className="px-3 py-1.5 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${t.is_system ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{t.is_system ? 'SYSTEM' : 'CUSTOM'}</span>
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <select value={editType.is_active ? '1' : '0'} onChange={e => setEditType(s => ({ ...s, is_active: e.target.value === '1' }))}
                          className="text-[10px] border border-rose-300 rounded px-1 py-0.5 bg-white">
                          <option value="1">ACTIVE</option><option value="0">INACTIVE</option>
                        </select>
                      </td>
                      <td className="px-3 py-1 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => saveEditType(t.id)} className="p-1 rounded text-emerald-600 hover:bg-emerald-50"><Save className="w-3 h-3" /></button>
                          <button onClick={() => setEditTypeId(null)} className="p-1 rounded text-slate-400 hover:bg-slate-100"><X className="w-3 h-3" /></button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={t.id} className={`border-t border-slate-100 hover:bg-rose-50/40 ${i%2===0?'bg-white':'bg-slate-50/40'}`}>
                      <td className="px-3 py-1.5 text-center text-base">{t.emoji ?? '·'}</td>
                      <td className="px-3 py-1.5 font-medium text-slate-800">{t.label}</td>
                      <td className="px-3 py-1.5 font-mono text-[10px] text-slate-500">{t.key}</td>
                      <td className="px-3 py-1.5 text-slate-600">{t.description ?? '—'}</td>
                      <td className="px-3 py-1.5 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${t.is_system ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{t.is_system ? 'SYSTEM' : 'CUSTOM'}</span>
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${t.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{t.is_active ? 'ACTIVE' : 'INACTIVE'}</span>
                      </td>
                      <td className="px-3 py-1 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => startEditType(t)} className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"><Pencil className="w-3 h-3" /></button>
                          <button onClick={() => delType(t)} disabled={t.is_system}
                            className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent"><Trash2 className="w-3 h-3" /></button>
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

      {/* ─── Departments ─── */}
      {active === 'departments' && (
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-indigo-50/40">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-700" />
              <div>
                <h3 className="text-sm font-bold text-slate-800">Departments</h3>
                <p className="text-[11px] text-slate-500">Production divisions / business units. Used on stock items and products.</p>
              </div>
            </div>
            <span className="text-[11px] text-slate-500">{depts.filter(d => d.is_active).length} active</span>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-12 gap-2 mb-3 items-end">
              <div className="col-span-2">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Code</label>
                <input value={newDept.code} onChange={e => setNewDept(s => ({ ...s, code: e.target.value.toUpperCase() }))}
                  placeholder="CUTTING" className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded font-mono uppercase focus:outline-none focus:border-indigo-500" />
              </div>
              <div className="col-span-4">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Name</label>
                <input value={newDept.name} onChange={e => setNewDept(s => ({ ...s, name: e.target.value }))}
                  placeholder="Cutting Department" className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-indigo-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Manager</label>
                <input value={newDept.manager} onChange={e => setNewDept(s => ({ ...s, manager: e.target.value }))}
                  placeholder="Person in charge" className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Notes</label>
                <input value={newDept.notes} onChange={e => setNewDept(s => ({ ...s, notes: e.target.value }))}
                  placeholder="optional" className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded" />
              </div>
              <div className="col-span-2">
                <button onClick={addDept} disabled={savingDept || !newDept.code.trim() || !newDept.name.trim()}
                  className="w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded hover:bg-indigo-700 disabled:opacity-50">
                  {savingDept ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Add
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-24">Code</th>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600">Name</th>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-44">Manager</th>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600">Notes</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-20">Status</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {depts.length === 0 ? (
                    <tr><td colSpan={6} className="py-8 text-center text-slate-400 italic text-xs">No departments yet — add one above ↑</td></tr>
                  ) : depts.map((d, i) => editDeptId === d.id ? (
                    <tr key={d.id} className="border-t border-slate-100 bg-indigo-50/30">
                      <td className="px-1 py-1"><input value={editDept.code as string ?? ''} onChange={e => setEditDept(s => ({ ...s, code: e.target.value.toUpperCase() }))} className="w-full px-2 py-1 text-xs border border-indigo-300 rounded font-mono uppercase" /></td>
                      <td className="px-1 py-1"><input value={editDept.name as string ?? ''} onChange={e => setEditDept(s => ({ ...s, name: e.target.value }))} className="w-full px-2 py-1 text-xs border border-indigo-300 rounded" /></td>
                      <td className="px-1 py-1"><input value={editDept.manager as string ?? ''} onChange={e => setEditDept(s => ({ ...s, manager: e.target.value }))} className="w-full px-2 py-1 text-xs border border-indigo-300 rounded" /></td>
                      <td className="px-1 py-1"><input value={editDept.notes as string ?? ''} onChange={e => setEditDept(s => ({ ...s, notes: e.target.value }))} className="w-full px-2 py-1 text-xs border border-indigo-300 rounded" /></td>
                      <td className="px-3 py-1.5 text-center">
                        <select value={editDept.is_active ? '1' : '0'} onChange={e => setEditDept(s => ({ ...s, is_active: e.target.value === '1' }))}
                          className="text-[10px] border border-indigo-300 rounded px-1 py-0.5 bg-white">
                          <option value="1">ACTIVE</option><option value="0">INACTIVE</option>
                        </select>
                      </td>
                      <td className="px-3 py-1 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => saveEditDept(d.id)} className="p-1 rounded text-emerald-600 hover:bg-emerald-50"><Save className="w-3 h-3" /></button>
                          <button onClick={() => setEditDeptId(null)} className="p-1 rounded text-slate-400 hover:bg-slate-100"><X className="w-3 h-3" /></button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={d.id} className={`border-t border-slate-100 hover:bg-indigo-50/40 ${i%2===0?'bg-white':'bg-slate-50/40'}`}>
                      <td className="px-3 py-1.5 font-mono font-bold text-indigo-700">{d.code}</td>
                      <td className="px-3 py-1.5 font-medium text-slate-800">{d.name}</td>
                      <td className="px-3 py-1.5 text-slate-700">{d.manager ?? '—'}</td>
                      <td className="px-3 py-1.5 text-slate-600 truncate max-w-[200px]">{d.notes ?? '—'}</td>
                      <td className="px-3 py-1.5 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${d.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{d.is_active ? 'ACTIVE' : 'INACTIVE'}</span>
                      </td>
                      <td className="px-3 py-1 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => startEditDept(d)} className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"><Pencil className="w-3 h-3" /></button>
                          <button onClick={() => delDept(d)} className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-3 h-3" /></button>
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

      {/* ─── Tailors ─── */}
      {active === 'tailors' && (
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-fuchsia-50/40">
            <div className="flex items-center gap-2">
              <Scissors className="w-4 h-4 text-fuchsia-700" />
              <div>
                <h3 className="text-sm font-bold text-slate-800">Tailors</h3>
                <p className="text-[11px] text-slate-500">Production partners (CMT). For full details (address / supplier link) open the tailor page.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500">{tailors.filter(t => t.is_active).length} active</span>
              <button onClick={() => router.push('/inventory/tailors')}
                className="text-[10px] text-fuchsia-700 hover:underline">Open full editor →</button>
            </div>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-12 gap-2 mb-3 items-end">
              <div className="col-span-2">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Code</label>
                <input value={newTailor.tailor_code} onChange={e => setNewTailor(s => ({ ...s, tailor_code: e.target.value.toUpperCase() }))}
                  placeholder="T-001" className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded font-mono uppercase focus:outline-none focus:border-fuchsia-500" />
              </div>
              <div className="col-span-3">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Name</label>
                <input value={newTailor.name} onChange={e => setNewTailor(s => ({ ...s, name: e.target.value }))}
                  placeholder="Kamruddin Tailor" className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-fuchsia-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Contact</label>
                <input value={newTailor.contact_person} onChange={e => setNewTailor(s => ({ ...s, contact_person: e.target.value }))}
                  placeholder="—" className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Phone</label>
                <input value={newTailor.phone} onChange={e => setNewTailor(s => ({ ...s, phone: e.target.value }))}
                  placeholder="03-..." className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded" />
              </div>
              <div className="col-span-1">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Terms</label>
                <input value={newTailor.payment_terms} onChange={e => setNewTailor(s => ({ ...s, payment_terms: e.target.value }))}
                  placeholder="N30" className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded" />
              </div>
              <div className="col-span-2">
                <button onClick={addTailor} disabled={savingTailor || !newTailor.tailor_code.trim() || !newTailor.name.trim()}
                  className="w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-fuchsia-600 text-white text-xs font-semibold rounded hover:bg-fuchsia-700 disabled:opacity-50">
                  {savingTailor ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Add
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-24">Code</th>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600">Name</th>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-36">Contact</th>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-32">Phone</th>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-24">Terms</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-20">Status</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tailors.length === 0 ? (
                    <tr><td colSpan={7} className="py-8 text-center text-slate-400 italic text-xs">No tailors yet — add one above ↑</td></tr>
                  ) : tailors.map((t, i) => editTailorId === t.id ? (
                    <tr key={t.id} className="border-t border-slate-100 bg-fuchsia-50/30">
                      <td className="px-1 py-1"><input value={editTailor.tailor_code as string ?? ''} onChange={e => setEditTailor(s => ({ ...s, tailor_code: e.target.value.toUpperCase() }))} className="w-full px-2 py-1 text-xs border border-fuchsia-300 rounded font-mono uppercase" /></td>
                      <td className="px-1 py-1"><input value={editTailor.name as string ?? ''} onChange={e => setEditTailor(s => ({ ...s, name: e.target.value }))} className="w-full px-2 py-1 text-xs border border-fuchsia-300 rounded" /></td>
                      <td className="px-1 py-1"><input value={editTailor.contact_person as string ?? ''} onChange={e => setEditTailor(s => ({ ...s, contact_person: e.target.value }))} className="w-full px-2 py-1 text-xs border border-fuchsia-300 rounded" /></td>
                      <td className="px-1 py-1"><input value={editTailor.phone as string ?? ''} onChange={e => setEditTailor(s => ({ ...s, phone: e.target.value }))} className="w-full px-2 py-1 text-xs border border-fuchsia-300 rounded" /></td>
                      <td className="px-1 py-1"><input value={editTailor.payment_terms as string ?? ''} onChange={e => setEditTailor(s => ({ ...s, payment_terms: e.target.value }))} className="w-full px-2 py-1 text-xs border border-fuchsia-300 rounded" /></td>
                      <td className="px-3 py-1.5 text-center">
                        <select value={editTailor.is_active ? '1' : '0'} onChange={e => setEditTailor(s => ({ ...s, is_active: e.target.value === '1' }))}
                          className="text-[10px] border border-fuchsia-300 rounded px-1 py-0.5 bg-white">
                          <option value="1">ACTIVE</option><option value="0">INACTIVE</option>
                        </select>
                      </td>
                      <td className="px-3 py-1 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => saveEditTailor(t.id)} className="p-1 rounded text-emerald-600 hover:bg-emerald-50"><Save className="w-3 h-3" /></button>
                          <button onClick={() => setEditTailorId(null)} className="p-1 rounded text-slate-400 hover:bg-slate-100"><X className="w-3 h-3" /></button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={t.id} className={`border-t border-slate-100 hover:bg-fuchsia-50/40 ${i%2===0?'bg-white':'bg-slate-50/40'}`}>
                      <td className="px-3 py-1.5 font-mono font-bold text-fuchsia-700">{t.tailor_code}</td>
                      <td className="px-3 py-1.5 font-medium text-slate-800">{t.name}</td>
                      <td className="px-3 py-1.5 text-slate-700">{t.contact_person ?? '—'}</td>
                      <td className="px-3 py-1.5 text-slate-700">{t.phone ?? '—'}</td>
                      <td className="px-3 py-1.5 text-slate-600">{t.payment_terms ?? '—'}</td>
                      <td className="px-3 py-1.5 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${t.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{t.is_active ? 'ACTIVE' : 'INACTIVE'}</span>
                      </td>
                      <td className="px-3 py-1 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => startEditTailor(t)} className="p-1 rounded text-slate-400 hover:text-fuchsia-600 hover:bg-fuchsia-50"><Pencil className="w-3 h-3" /></button>
                          <button onClick={() => delTailor(t)} className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-3 h-3" /></button>
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

      {/* ─── Collections ─── */}
      {active === 'collections' && (
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-teal-50/40">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-teal-700" />
              <div>
                <h3 className="text-sm font-bold text-slate-800">Product Collections</h3>
                <p className="text-[11px] text-slate-500">Group products into collections e.g. "ARYANA KURUNG KEDAH | SONGKET". Assign products in the Products page.</p>
              </div>
            </div>
            <span className="text-[11px] text-slate-500">{colls.filter(c => c.is_active).length} active</span>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-12 gap-2 mb-3 items-end">
              <div className="col-span-4">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Collection Name</label>
                <input value={newColl.name} onChange={e => setNewColl(s => ({ ...s, name: e.target.value }))}
                  placeholder="e.g. ARYANA KURUNG KEDAH | SONGKET"
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-teal-500" />
              </div>
              <div className="col-span-6">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Description (optional)</label>
                <input value={newColl.description} onChange={e => setNewColl(s => ({ ...s, description: e.target.value }))}
                  placeholder="Eid 2026 exclusive collection" className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded" />
              </div>
              <div className="col-span-2">
                <button onClick={addColl} disabled={savingColl || !newColl.name.trim()}
                  className="w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-teal-600 text-white text-xs font-semibold rounded hover:bg-teal-700 disabled:opacity-50">
                  {savingColl ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Add
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-10">#</th>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600">Collection Name</th>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-44">Slug</th>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600">Description</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-20">Status</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {colls.length === 0 ? (
                    <tr><td colSpan={6} className="py-8 text-center text-slate-400 italic text-xs">No collections yet — add one above ↑</td></tr>
                  ) : colls.map((c, i) => editCollId === c.id ? (
                    <tr key={c.id} className="border-t border-slate-100 bg-teal-50/30">
                      <td className="px-3 py-1.5 text-slate-400">{i + 1}</td>
                      <td className="px-1 py-1"><input value={editColl.name as string ?? ''} onChange={e => setEditColl(s => ({ ...s, name: e.target.value }))} className="w-full px-2 py-1 text-xs border border-teal-300 rounded" /></td>
                      <td className="px-3 py-1.5 text-slate-400 font-mono text-[10px]">{c.slug}</td>
                      <td className="px-1 py-1"><input value={editColl.description as string ?? ''} onChange={e => setEditColl(s => ({ ...s, description: e.target.value }))} className="w-full px-2 py-1 text-xs border border-teal-300 rounded" /></td>
                      <td className="px-3 py-1.5 text-center">
                        <select value={editColl.is_active ? '1' : '0'} onChange={e => setEditColl(s => ({ ...s, is_active: e.target.value === '1' }))}
                          className="text-[10px] border border-teal-300 rounded px-1 py-0.5 bg-white">
                          <option value="1">ACTIVE</option><option value="0">INACTIVE</option>
                        </select>
                      </td>
                      <td className="px-3 py-1 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => saveEditColl(c.id)} className="p-1 rounded text-emerald-600 hover:bg-emerald-50"><Save className="w-3 h-3" /></button>
                          <button onClick={() => setEditCollId(null)} className="p-1 rounded text-slate-400 hover:bg-slate-100"><X className="w-3 h-3" /></button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={c.id} className={`border-t border-slate-100 hover:bg-teal-50/40 ${i%2===0?'bg-white':'bg-slate-50/40'}`}>
                      <td className="px-3 py-1.5 text-slate-400">{i + 1}</td>
                      <td className="px-3 py-1.5 font-semibold text-slate-800">{c.name}</td>
                      <td className="px-3 py-1.5 font-mono text-[10px] text-slate-500">{c.slug}</td>
                      <td className="px-3 py-1.5 text-slate-600">{c.description ?? '—'}</td>
                      <td className="px-3 py-1.5 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${c.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{c.is_active ? 'ACTIVE' : 'INACTIVE'}</span>
                      </td>
                      <td className="px-3 py-1 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => startEditColl(c)} className="p-1 rounded text-slate-400 hover:text-teal-600 hover:bg-teal-50"><Pencil className="w-3 h-3" /></button>
                          <button onClick={() => delColl(c)} className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-3 h-3" /></button>
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

      {/* ─── BOMs (read-only list, full editor link) ─── */}
      {active === 'boms' && (
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-amber-50/40">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-700" />
              <div>
                <h3 className="text-sm font-bold text-slate-800">Bill of Material</h3>
                <p className="text-[11px] text-slate-500">Multi-line stitching · materials · overhead. Use full editor to create / edit lines.</p>
              </div>
            </div>
            <button onClick={() => router.push('/inventory/bom')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded hover:bg-amber-700">
              <Plus className="w-3.5 h-3.5" /> Open BOM editor
            </button>
          </div>
          <div className="p-4">
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-32">BOM Code</th>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600">Product</th>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600">Description</th>
                    <th className="text-right px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-28">Total Cost</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-24">Status</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-20">Open</th>
                  </tr>
                </thead>
                <tbody>
                  {boms.length === 0 ? (
                    <tr><td colSpan={6} className="py-8 text-center text-slate-400 italic text-xs">No BOMs yet — open the BOM editor to create one</td></tr>
                  ) : boms.map((b, i) => (
                    <tr key={b.id} className={`border-t border-slate-100 hover:bg-amber-50/40 ${i%2===0?'bg-white':'bg-slate-50/40'}`}>
                      <td className="px-3 py-1.5 font-mono font-bold text-amber-700">{b.bom_code}</td>
                      <td className="px-3 py-1.5 text-slate-800">{b.product?.name ?? '—'}</td>
                      <td className="px-3 py-1.5 text-slate-600 truncate max-w-[280px]">{b.description ?? '—'}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-slate-700">{b.total_cost ? Number(b.total_cost).toFixed(2) : '—'}</td>
                      <td className="px-3 py-1.5 text-center">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 capitalize">{b.status}</span>
                      </td>
                      <td className="px-3 py-1 text-center">
                        <button onClick={() => router.push(`/inventory/bom?id=${b.id}`)}
                          className="p-1 rounded text-amber-600 hover:bg-amber-50"><Pencil className="w-3 h-3" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
      {/* ─── SEO & Marketing Settings ─── */}
      {active === 'marketing' && (
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-emerald-50/40">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-700" />
              <div>
                <h3 className="text-sm font-bold text-slate-800">SEO & Marketing Identity</h3>
                <p className="text-[11px] text-slate-500">Store-level SEO defaults, Google Merchant Center, and Meta Catalog settings.</p>
              </div>
            </div>
            <button onClick={() => saveMkt('marketing')} disabled={savingMkt}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded hover:bg-emerald-700 disabled:opacity-50">
              {savingMkt ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save All
            </button>
          </div>

          <div className="p-4 space-y-6">
            {/* ── Store SEO ── */}
            <div>
              <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <span className="w-4 h-4 bg-slate-200 rounded-full flex items-center justify-center text-[9px] font-bold text-slate-600">①</span>
                Store SEO Defaults
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Store / Brand Name</label>
                  <input value={mktSettings['store_name'] ?? ''} onChange={e => setMkt('store_name', e.target.value)}
                    placeholder="CARLANISA" className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:border-emerald-400 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Store Website URL</label>
                  <input value={mktSettings['store_url'] ?? ''} onChange={e => setMkt('store_url', e.target.value)}
                    placeholder="https://carlanisa.com" className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:border-emerald-400 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Default SEO Title Template</label>
                  <input value={mktSettings['seo_title_template'] ?? ''} onChange={e => setMkt('seo_title_template', e.target.value)}
                    placeholder="{product_name} — CARLANISA" className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:border-emerald-400 focus:outline-none" />
                  <p className="text-[9px] text-slate-400 mt-0.5">Use {'{product_name}'} as placeholder</p>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Default Focus Keyword</label>
                  <input value={mktSettings['seo_focus_keyword'] ?? ''} onChange={e => setMkt('seo_focus_keyword', e.target.value)}
                    placeholder="baju kurung moden malaysia" className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:border-emerald-400 focus:outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Default Meta Description</label>
                  <textarea value={mktSettings['seo_meta_description'] ?? ''} onChange={e => setMkt('seo_meta_description', e.target.value)}
                    rows={2} placeholder="Shop premium Malaysian fashion at CARLANISA..."
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:border-emerald-400 focus:outline-none resize-none" />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Robots Directive</label>
                  <select value={mktSettings['seo_robots'] ?? 'index,follow'} onChange={e => setMkt('seo_robots', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded bg-white focus:border-emerald-400 focus:outline-none">
                    <option value="index,follow">index, follow (recommended)</option>
                    <option value="noindex,nofollow">noindex, nofollow</option>
                    <option value="noindex,follow">noindex, follow</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Twitter Card Type</label>
                  <select value={mktSettings['seo_twitter_card'] ?? 'summary_large_image'} onChange={e => setMkt('seo_twitter_card', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded bg-white focus:border-emerald-400 focus:outline-none">
                    <option value="summary_large_image">summary_large_image</option>
                    <option value="summary">summary</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ── Google Merchant ── */}
            <div>
              <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <span className="w-4 h-4 bg-slate-200 rounded-full flex items-center justify-center text-[9px] font-bold text-slate-600">②</span>
                Google Merchant Center
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Merchant ID</label>
                  <input value={mktSettings['google_merchant_id'] ?? ''} onChange={e => setMkt('google_merchant_id', e.target.value)}
                    placeholder="123456789" className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:border-emerald-400 focus:outline-none font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Default Country of Sale</label>
                  <input value={mktSettings['google_country'] ?? 'MY'} onChange={e => setMkt('google_country', e.target.value)}
                    placeholder="MY" className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:border-emerald-400 focus:outline-none uppercase" />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Default Product Condition</label>
                  <select value={mktSettings['google_condition'] ?? 'new'} onChange={e => setMkt('google_condition', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded bg-white focus:border-emerald-400 focus:outline-none">
                    <option value="new">New</option>
                    <option value="refurbished">Refurbished</option>
                    <option value="used">Used</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Default Currency</label>
                  <input value={mktSettings['google_currency'] ?? 'MYR'} onChange={e => setMkt('google_currency', e.target.value)}
                    placeholder="MYR" className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:border-emerald-400 focus:outline-none uppercase" />
                </div>
              </div>
            </div>

            {/* ── Meta / Facebook Catalog ── */}
            <div>
              <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <span className="w-4 h-4 bg-slate-200 rounded-full flex items-center justify-center text-[9px] font-bold text-slate-600">③</span>
                Meta / Facebook Catalog
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Facebook Pixel ID</label>
                  <input value={mktSettings['fb_pixel_id'] ?? ''} onChange={e => setMkt('fb_pixel_id', e.target.value)}
                    placeholder="XXXXXXXXXXXXXXXXXX" className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:border-emerald-400 focus:outline-none font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Catalog ID</label>
                  <input value={mktSettings['fb_catalog_id'] ?? ''} onChange={e => setMkt('fb_catalog_id', e.target.value)}
                    placeholder="XXXXXXXXXXXXXXXXXX" className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:border-emerald-400 focus:outline-none font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Business Manager ID</label>
                  <input value={mktSettings['fb_business_id'] ?? ''} onChange={e => setMkt('fb_business_id', e.target.value)}
                    placeholder="XXXXXXXXXXXXXXXXXX" className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:border-emerald-400 focus:outline-none font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Default Currency</label>
                  <input value={mktSettings['fb_currency'] ?? 'MYR'} onChange={e => setMkt('fb_currency', e.target.value)}
                    placeholder="MYR" className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:border-emerald-400 focus:outline-none uppercase" />
                </div>
              </div>
            </div>

            {/* ── Featured Media defaults ── */}
            <div>
              <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <span className="w-4 h-4 bg-slate-200 rounded-full flex items-center justify-center text-[9px] font-bold text-slate-600">④</span>
                Featured Media & Feed Defaults
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Watermark / Logo URL</label>
                  <input value={mktSettings['media_logo_url'] ?? ''} onChange={e => setMkt('media_logo_url', e.target.value)}
                    placeholder="https://cdn.carlanisa.com/logo.png" className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:border-emerald-400 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Default OG Image URL</label>
                  <input value={mktSettings['media_og_image'] ?? ''} onChange={e => setMkt('media_og_image', e.target.value)}
                    placeholder="https://cdn.carlanisa.com/og.jpg (1200×630)" className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:border-emerald-400 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Google Shopping Feed URL</label>
                  <input value={mktSettings['feed_google_url'] ?? ''} onChange={e => setMkt('feed_google_url', e.target.value)}
                    placeholder="https://erp.carlanisa.com/feeds/google.xml" className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:border-emerald-400 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Facebook Feed URL</label>
                  <input value={mktSettings['feed_facebook_url'] ?? ''} onChange={e => setMkt('feed_facebook_url', e.target.value)}
                    placeholder="https://erp.carlanisa.com/feeds/facebook.csv" className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:border-emerald-400 focus:outline-none" />
                </div>
              </div>
            </div>

            {/* ── Promotion Defaults ── */}
            <div>
              <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <span className="w-4 h-4 bg-slate-200 rounded-full flex items-center justify-center text-[9px] font-bold text-slate-600">⑤</span>
                Promotion & Sale Defaults
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Sale Season Label</label>
                  <input value={mktSettings['promo_sale_label'] ?? ''} onChange={e => setMkt('promo_sale_label', e.target.value)}
                    placeholder="Eid Sale 2026" className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:border-emerald-400 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Sale Start Date</label>
                  <input type="date" value={mktSettings['promo_sale_start'] ?? ''} onChange={e => setMkt('promo_sale_start', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:border-emerald-400 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Sale End Date</label>
                  <input type="date" value={mktSettings['promo_sale_end'] ?? ''} onChange={e => setMkt('promo_sale_end', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:border-emerald-400 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Max Sale Discount %</label>
                  <input type="number" min="0" max="100" value={mktSettings['promo_max_discount'] ?? ''} onChange={e => setMkt('promo_max_discount', e.target.value)}
                    placeholder="30" className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:border-emerald-400 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Min Order for Free Shipping (RM)</label>
                  <input type="number" min="0" value={mktSettings['promo_free_shipping_min'] ?? ''} onChange={e => setMkt('promo_free_shipping_min', e.target.value)}
                    placeholder="100" className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:border-emerald-400 focus:outline-none" />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button onClick={() => saveMkt('marketing')} disabled={savingMkt}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                {savingMkt ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Settings
              </button>
            </div>
          </div>
        </section>
      )}

    </div>
  )
}
