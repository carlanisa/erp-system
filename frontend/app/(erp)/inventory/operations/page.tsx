'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Workflow, ArrowLeft, RefreshCw, ArrowDownToLine, ArrowUpFromLine,
  Send, Scissors, Wrench, Repeat, GitBranch, Plus, Loader2, Save, X,
  FileText, FilePlus, Trash2, Pencil, ChevronUp, ChevronDown, Ban,
} from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

type Tab = 'fabric_send'|'receive_tailor'|'stock_received'|'adjust'|'transfer'|'bom'

const TABS: Array<{ key: Tab; label: string; sub: string; color: string; bg: string; ring: string; icon: any }> = [
  { key: 'fabric_send',     label: 'Fabric Send',           sub: 'Issue raw materials to tailor',  color: 'text-fuchsia-700', bg: 'bg-fuchsia-50', ring: 'ring-fuchsia-400', icon: Send },
  { key: 'receive_tailor',  label: 'Receive from Tailor',   sub: 'Finished goods + auto-deduct',   color: 'text-teal-700',    bg: 'bg-teal-50',    ring: 'ring-teal-400',    icon: Scissors },
  { key: 'stock_received',  label: 'Stock Received',        sub: 'Fabric intake (purchase / GRN)', color: 'text-emerald-700', bg: 'bg-emerald-50', ring: 'ring-emerald-400', icon: ArrowDownToLine },
  { key: 'adjust',          label: 'Stock Adjustment',      sub: 'Recount, write-off, gain',       color: 'text-amber-700',   bg: 'bg-amber-50',   ring: 'ring-amber-400',   icon: Wrench },
  { key: 'transfer',        label: 'Location Transfer',     sub: 'Move stock between locations',   color: 'text-blue-700',    bg: 'bg-blue-50',    ring: 'ring-blue-400',    icon: Repeat },
  { key: 'bom',             label: 'Bill of Material',      sub: 'Product recipes',                color: 'text-cyan-700',    bg: 'bg-cyan-50',    ring: 'ring-cyan-400',    icon: GitBranch },
]

const TYPE_FOR_TAB: Record<Exclude<Tab,'bom'>, string> = {
  fabric_send:    'send_tailor',
  receive_tailor: 'receive_tailor',
  stock_received: 'receipt',
  adjust:         'adjust',
  transfer:       'transfer',
}

type StockItem = { id:number; item_code:string; name:string; uom:string; color?:string|null; size?:string|null; current_stock?:number; unit_cost?:number }
type Product   = { id:number; sku:string; name:string; uom?:string }
type Location  = { id:number; code:string; name:string; type:string }
type Tailor    = { id:number; tailor_code:string; name:string; location_id:number|null }
type LineForm  = { stock_item_id: number|''; product_id: number|''; qty: string; uom: string; unit_cost: string; notes: string }
type Movement  = any
type Bom       = any

const newLine = (): LineForm => ({ stock_item_id: '', product_id: '', qty: '', uom: '', unit_cost: '', notes: '' })

export default function OperationsPage() {
  const router = useRouter()
  const sp     = useSearchParams()
  const initialTab = (sp.get('tab') as Tab) || 'fabric_send'

  const [tab, setTab]     = useState<Tab>(initialTab)
  const [mode, setMode]   = useState<'list'|'create'|'edit'>('list')

  const [items, setItems]         = useState<StockItem[]>([])
  const [products, setProducts]   = useState<Product[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [tailors, setTailors]     = useState<Tailor[]>([])
  const [boms, setBoms]           = useState<Bom[]>([])

  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading]     = useState(false)

  const [editing, setEditing] = useState<Movement | null>(null)
  const [saving, setSaving]   = useState(false)

  const today = new Date().toISOString().split('T')[0]
  const [dateStr, setDateStr]     = useState(today)
  const [fromLoc, setFromLoc]     = useState('')
  const [toLoc, setToLoc]         = useState('')
  const [tailorId, setTailorId]   = useState('')
  const [productId, setProductId] = useState('')
  const [bomId, setBomId]         = useState('')
  const [bomDetail, setBomDetail] = useState<any|null>(null)
  const [reference, setReference] = useState('')
  const [notes, setNotes]         = useState('')
  const [lines, setLines]         = useState<LineForm[]>([newLine()])

  const itemMap    = useMemo(() => Object.fromEntries(items.map(i => [i.id, i])), [items])
  const productMap = useMemo(() => Object.fromEntries(products.map(p => [p.id, p])), [products])
  const tailorMap  = useMemo(() => Object.fromEntries(tailors.map(t => [t.id, t])), [tailors])
  const tabConfig  = TABS.find(t => t.key === tab)!

  // ─── data loading ───
  useEffect(() => {
    api.get('/inventory/stock-items/flat').then(r => setItems(r.data.data ?? [])).catch(()=>{})
    api.get('/inventory/products', { params: { per_page: 500 } }).then(r => setProducts(r.data.data ?? [])).catch(()=>{})
    api.get('/inventory/locations/flat').then(r => setLocations(r.data.data ?? [])).catch(()=>{})
    api.get('/inventory/tailors/flat').then(r => setTailors(r.data.data ?? [])).catch(()=>{})
  }, [])

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      if (tab === 'bom') {
        const r = await api.get('/inventory/boms')
        setBoms(r.data.data ?? [])
      } else {
        const r = await api.get('/inventory/stock-movements', { params: { type: TYPE_FOR_TAB[tab as Exclude<Tab,'bom'>] } })
        setMovements(r.data.data ?? [])
      }
    } catch {} finally { setLoading(false) }
  }, [tab])

  useEffect(() => { loadList() }, [loadList])

  // sync URL when tab changes
  useEffect(() => {
    const params = new URLSearchParams(sp.toString()); params.set('tab', tab)
    router.replace(`/inventory/operations?${params.toString()}`, { scroll: false })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  // ─── form helpers ───
  function resetForm() {
    setDateStr(today); setFromLoc(''); setToLoc(''); setTailorId('')
    setProductId(''); setBomId(''); setBomDetail(null); setReference(''); setNotes('')
    setLines([newLine()])
  }
  function openCreate() { setEditing(null); resetForm(); setMode('create') }
  function openEdit(m: Movement) {
    setEditing(m)
    setDateStr((m.date || '').split('T')[0])
    setFromLoc(m.from_location_id ? String(m.from_location_id) : '')
    setToLoc(m.to_location_id ? String(m.to_location_id) : '')
    setTailorId(m.tailor_id ? String(m.tailor_id) : '')
    setProductId(m.product_id ? String(m.product_id) : '')
    setBomId(m.bom_id ? String(m.bom_id) : '')
    setReference(m.reference ?? '')
    setNotes(m.notes ?? '')
    setLines((m.lines ?? []).length ? m.lines.map((l: any) => ({
      stock_item_id: l.stock_item_id ?? '',
      product_id:    l.product_id    ?? '',
      qty:           String(l.qty),
      uom:           l.uom ?? '',
      unit_cost:     String(l.unit_cost ?? 0),
      notes:         l.notes ?? '',
    })) : [newLine()])
    setMode('edit')
  }
  function setLine(i: number, patch: Partial<LineForm>) {
    setLines(rs => rs.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  }
  function addLine() { setLines(rs => [...rs, newLine()]) }
  function removeLine(i: number) { setLines(rs => rs.length > 1 ? rs.filter((_, idx) => idx !== i) : rs) }
  function moveLine(i: number, d: -1|1) {
    setLines(rs => { const j = i + d; if (j < 0 || j >= rs.length) return rs; const c = [...rs]; [c[i], c[j]] = [c[j], c[i]]; return c })
  }
  function pickItem(i: number, id: string) {
    const sid = id ? Number(id) : ''; const itm = sid ? itemMap[sid] : null
    setLine(i, { stock_item_id: sid as any, product_id: '', uom: itm?.uom ?? '', unit_cost: itm?.unit_cost ? String(itm.unit_cost) : '0' })
  }
  function pickProduct(i: number, id: string) {
    const pid = id ? Number(id) : ''; const p = pid ? productMap[pid] : null
    setLine(i, { product_id: pid as any, stock_item_id: '', uom: p?.uom ?? 'PCS' })
  }

  // ─── BOM auto-pull (receive_tailor) ───
  async function loadBomForProduct(pid: string) {
    setProductId(pid)
    if (!pid) { setBomId(''); setBomDetail(null); return }
    try {
      const r = await api.get('/inventory/boms', { params: { product_id: pid } })
      const list: any[] = r.data.data ?? []
      const active = list.find(b => b.is_active) ?? list[0]
      if (!active) { toast('No BOM found.', { icon: 'ℹ️' }); setBomId(''); setBomDetail(null); return }
      setBomId(String(active.id)); setBomDetail(active)
      const product = productMap[Number(pid)]
      setLines([{
        stock_item_id: '', product_id: Number(pid) as any,
        qty: String(active.output_qty ?? 1),
        uom: product?.uom ?? active.output_uom ?? 'PCS',
        unit_cost: '0',
        notes: `Per BOM ${active.bom_number} v${active.version}`,
      }])
      toast.success(`BOM ${active.bom_number} loaded`)
    } catch { toast.error('Could not load BOM') }
  }

  // ─── consumption preview (receive_tailor) ───
  const consumptionPreview = useMemo(() => {
    if (tab !== 'receive_tailor' || !bomDetail) return null
    const pl = lines.find(l => l.product_id && Number(l.product_id) === Number(bomDetail.product_id))
    const productQty = parseFloat(pl?.qty ?? '0') || 0
    const outputQty = Number(bomDetail.output_qty || 1)
    const mult = outputQty > 0 ? productQty / outputQty : 0
    const mat = (bomDetail.lines as any[] ?? []).filter(l => l.kind === 'material').map(l => {
      const qty = +(Number(l.qty) * mult).toFixed(3)
      const uc  = Number(l.stock_item?.unit_cost ?? 0)
      return { ...l, _qty: qty, _unitCost: uc, _cost: qty*uc, _stockAfter: Number(l.stock_item?.current_stock ?? 0) - qty }
    })
    const svc = (bomDetail.lines as any[] ?? []).filter(l => l.kind === 'tailor_service').map(l => ({ ...l, _qty: +(Number(l.qty)*mult).toFixed(3), _cost: +(Number(l.qty)*mult*Number(l.unit_cost ?? 0)).toFixed(2) }))
    const ovh = (bomDetail.lines as any[] ?? []).filter(l => l.kind === 'overhead').map(l => ({ ...l, _qty: +(Number(l.qty)*mult).toFixed(3), _cost: +(Number(l.qty)*mult*Number(l.unit_cost ?? 0)).toFixed(2) }))
    const tm = mat.reduce((s, l) => s + l._cost, 0)
    const ts = svc.reduce((s, l) => s + l._cost, 0)
    const to = ovh.reduce((s, l) => s + l._cost, 0)
    return { productQty, mat, svc, ovh, tm, ts, to, total: tm+ts+to }
  }, [tab, bomDetail, lines])

  // ─── save / delete / cancel / bill ───
  async function handleSave() {
    if (tab === 'bom') return  // BOM has its own page; keep simple
    if (!dateStr) { toast.error('Date required'); return }
    if (tab === 'receive_tailor' && !tailorId) { toast.error('Select a tailor'); return }
    if (tab === 'fabric_send' && !tailorId)    { toast.error('Select a tailor'); return }
    if (tab === 'transfer' && (!fromLoc || !toLoc)) { toast.error('Both From & To required'); return }

    const allowSigned = tab === 'adjust'
    const cleanLines = lines.filter(l => (l.stock_item_id || l.product_id) && Number(l.qty) !== 0 && (allowSigned || Number(l.qty) > 0))
    if (!cleanLines.length) { toast.error('Add at least one line'); return }

    const movementType = TYPE_FOR_TAB[tab as Exclude<Tab,'bom'>]

    setSaving(true)
    const payload: any = {
      type: movementType,
      date: dateStr,
      from_location_id: fromLoc   ? Number(fromLoc)   : null,
      to_location_id:   toLoc     ? Number(toLoc)     : null,
      tailor_id:        tailorId  ? Number(tailorId)  : null,
      product_id:       productId ? Number(productId) : null,
      bom_id:           bomId     ? Number(bomId)     : null,
      reference:        reference || null,
      notes:            notes     || null,
      lines: cleanLines.map(l => ({
        stock_item_id: l.stock_item_id ? Number(l.stock_item_id) : null,
        product_id:    l.product_id    ? Number(l.product_id)    : null,
        qty:           parseFloat(l.qty),
        uom:           l.uom || null,
        unit_cost:     parseFloat(l.unit_cost) || 0,
        notes:         l.notes || null,
      })),
    }

    try {
      if (editing) await api.put(`/inventory/stock-movements/${editing.id}`, payload)
      else         await api.post('/inventory/stock-movements', payload)
      toast.success(editing ? 'Updated' : 'Posted')
      setMode('list'); loadList()
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Save failed') }
    finally { setSaving(false) }
  }

  async function handleDelete(m: Movement) {
    if (!confirm(`Delete ${m.movement_no}? Stock effects will be reversed.`)) return
    try { await api.delete(`/inventory/stock-movements/${m.id}`); toast.success('Deleted'); loadList() }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
  }
  async function handleCancel(m: Movement) {
    if (!confirm(`Cancel ${m.movement_no}?`)) return
    try { await api.post(`/inventory/stock-movements/${m.id}/cancel`); toast.success('Cancelled'); loadList() }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
  }
  async function handleGenerateBill(m: Movement) {
    if (!confirm(`Generate Tailor Bill for ${m.movement_no}? Only stitching/labor lines will be billed.`)) return
    try {
      const r = await api.post(`/inventory/stock-movements/${m.id}/generate-tailor-bill`)
      const pi = r.data.data
      toast.success(`Bill ${pi.pi_number} created (RM ${Number(pi.amount).toFixed(2)})`)
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
  }

  // ─── tab visibility helpers ───
  const showTailor   = tab === 'fabric_send' || tab === 'receive_tailor'
  const showFromLoc  = tab !== 'stock_received' && tab !== 'bom'
  const showToLoc    = tab !== 'fabric_send' || true  // show always (tailor location auto-fill on send)
  const showBomPicker = tab === 'receive_tailor'
  const itemKindForLines: 'stock_item' | 'product' | 'either' =
    tab === 'receive_tailor' ? 'product'
    : tab === 'transfer' || tab === 'adjust' ? 'either'
    : 'stock_item'

  const totalQty  = lines.reduce((s, l) => s + (parseFloat(l.qty) || 0), 0)
  const totalCost = lines.reduce((s, l) => s + (parseFloat(l.qty) || 0) * (parseFloat(l.unit_cost) || 0), 0)

  // ─── header bar with global tabs ───
  const tabBar = (
    <div className="bg-white border-b border-slate-200 px-4 pt-2">
      <div className="flex items-center gap-1 flex-wrap">
        {TABS.map(t => {
          const Icon = t.icon
          const active = tab === t.key
          return (
            <button key={t.key} onClick={() => { setTab(t.key); setMode('list') }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-xs font-semibold transition-colors border-b-2 ${
                active ? `${t.bg} ${t.color} border-current shadow-sm` : 'text-slate-500 border-transparent hover:bg-slate-50'
              }`}>
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          )
        })}
      </div>
    </div>
  )

  // ─── BOM tab renders the full BOM list inline ───
  if (tab === 'bom' && mode === 'list') {
    return (
      <div className="fixed inset-0 z-40 flex flex-col bg-white">
        <TopBar router={router} tabConfig={tabConfig} loadList={loadList} bomMode />
        {tabBar}
        <div className="flex-1 overflow-auto p-4">
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-700 text-white">
                <tr>
                  <th className="px-2 py-2 w-8 text-center">#</th>
                  <th className="px-3 py-2 text-left">BOM No.</th>
                  <th className="px-3 py-2 text-left">Product</th>
                  <th className="px-3 py-2 text-center">Version</th>
                  <th className="px-3 py-2 text-right">Output</th>
                  <th className="px-3 py-2 text-center">Lines</th>
                  <th className="px-3 py-2 text-center">Active</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={7} className="py-8 text-center text-slate-400">Loading…</td></tr>
                : boms.length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center text-slate-400">
                    <GitBranch className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No BOMs yet</p>
                    <button onClick={() => router.push('/inventory/bom')} className="mt-2 px-3 py-1.5 bg-cyan-600 text-white text-xs rounded">Open BOM Editor</button>
                  </td></tr>
                ) : boms.map((b: any, idx: number) => (
                  <tr key={b.id} onClick={() => router.push(`/inventory/bom`)} className="border-b border-slate-100 hover:bg-cyan-50 cursor-pointer">
                    <td className="px-2 py-1.5 text-center text-slate-400">{idx+1}</td>
                    <td className="px-3 py-1.5 font-mono font-bold text-cyan-700">{b.bom_number}</td>
                    <td className="px-3 py-1.5">{b.product?.sku} <span className="text-slate-500 font-normal">— {b.product?.name}</span></td>
                    <td className="px-3 py-1.5 text-center font-mono">v{b.version}</td>
                    <td className="px-3 py-1.5 text-right font-mono">{Number(b.output_qty).toFixed(2)} {b.output_uom}</td>
                    <td className="px-3 py-1.5 text-center font-mono">{b.lines?.length ?? 0}</td>
                    <td className="px-3 py-1.5 text-center"><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${b.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{b.is_active ? 'ACTIVE' : 'INACTIVE'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            <p>BOM editor opens in dedicated page (Recipe Lines need full screen for material/tailor-service/overhead). Click any row above or <button onClick={() => router.push('/inventory/bom')} className="text-cyan-600 underline">go to BOM editor</button>.</p>
          </div>
        </div>
      </div>
    )
  }

  // ─── form view ───
  if (mode === 'create' || mode === 'edit') {
    return (
      <div className="fixed inset-0 z-40 flex flex-col bg-slate-100">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-5 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 ${tabConfig.bg} rounded-lg flex items-center justify-center`}>
              <tabConfig.icon className={`w-4 h-4 ${tabConfig.color}`} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">{editing ? `Edit ${editing.movement_no}` : `New ${tabConfig.label}`}</h2>
              <p className="text-xs text-slate-400">Inventory → Operations → {tabConfig.label}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => { setEditing(null); resetForm() }} disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded">
              <FilePlus className="w-3.5 h-3.5 text-slate-500" /> New
            </button>
            <button onClick={handleSave} disabled={saving}
              className={`flex items-center gap-1.5 px-3 py-1.5 ${tabConfig.bg.replace('50','600')} text-white text-xs font-medium rounded hover:opacity-90 disabled:opacity-60`}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
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

        {tabBar}

        <div className="flex-1 overflow-y-auto p-4">
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
            {/* Header fields */}
            <div className="border-b border-slate-100 px-4 py-3 grid grid-cols-12 gap-3">
              <div className="col-span-2">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">Date *</label>
                <input type="date" value={dateStr} onChange={e=>setDateStr(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded font-mono" />
              </div>
              {showFromLoc && (
                <div className="col-span-3">
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">From Location</label>
                  <select value={fromLoc} onChange={e=>setFromLoc(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white">
                    <option value="">— None —</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.code} — {l.name}</option>)}
                  </select>
                </div>
              )}
              {showToLoc && (
                <div className="col-span-3">
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">To Location</label>
                  <select value={toLoc} onChange={e=>setToLoc(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white">
                    <option value="">— None —</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.code} — {l.name}</option>)}
                  </select>
                </div>
              )}
              {showTailor && (
                <div className="col-span-3">
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">Tailor *</label>
                  <select value={tailorId} onChange={e=>{
                    setTailorId(e.target.value)
                    const t = tailorMap[Number(e.target.value)]
                    if (t?.location_id) {
                      if (tab === 'fabric_send')   setToLoc(String(t.location_id))
                      if (tab === 'receive_tailor')setFromLoc(String(t.location_id))
                    }
                  }} className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white">
                    <option value="">— Select —</option>
                    {tailors.map(t => <option key={t.id} value={t.id}>{t.tailor_code} — {t.name}</option>)}
                  </select>
                </div>
              )}
              {showBomPicker && (
                <div className="col-span-4">
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">Product (Finished Good) *</label>
                  <select value={productId} onChange={e=>loadBomForProduct(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white">
                    <option value="">— Select —</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
                  </select>
                  {bomId && <p className="text-[10px] text-emerald-600 mt-0.5">BOM loaded (id #{bomId})</p>}
                </div>
              )}
              <div className="col-span-3">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">Reference</label>
                <input value={reference} onChange={e=>setReference(e.target.value)}
                  placeholder="e.g. PI-001 / DO-123"
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded font-mono" />
              </div>
            </div>

            {/* Lines */}
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-slate-500 uppercase">Lines</h3>
                <button onClick={addLine} className={`flex items-center gap-1 px-2.5 py-1 ${tabConfig.bg} ${tabConfig.color} text-xs font-medium rounded hover:opacity-80`}>
                  <Plus className="w-3 h-3" /> Add Line
                </button>
              </div>
              <div className="border border-slate-200 rounded overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="text-center w-8 px-2 py-1.5 text-[10px] uppercase">#</th>
                      <th className="text-left px-3 py-1.5 text-[11px] uppercase">{itemKindForLines === 'product' ? 'Product' : 'Stock Item'}</th>
                      <th className="text-right px-3 py-1.5 text-[11px] uppercase w-24">Qty {tab === 'adjust' && <span className="text-amber-500 normal-case font-normal text-[10px]">(±)</span>}</th>
                      <th className="text-left px-3 py-1.5 text-[11px] uppercase w-20">UOM</th>
                      <th className="text-right px-3 py-1.5 text-[11px] uppercase w-28">Unit Cost</th>
                      <th className="text-right px-3 py-1.5 text-[11px] uppercase w-28">Total</th>
                      <th className="text-left px-3 py-1.5 text-[11px] uppercase">Notes</th>
                      <th className="text-center px-2 py-1.5 w-20"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l, i) => {
                      const itm = l.stock_item_id ? itemMap[l.stock_item_id as number] : null
                      const lt  = (parseFloat(l.qty) || 0) * (parseFloat(l.unit_cost) || 0)
                      return (
                        <tr key={i} className="border-t border-slate-100">
                          <td className="text-center text-slate-400 px-2 py-1">{i+1}</td>
                          <td className="px-2 py-1">
                            {itemKindForLines === 'product' ? (
                              <select value={l.product_id || ''} onChange={e=>pickProduct(i, e.target.value)} className="w-full px-2 py-1 text-xs border border-slate-200 rounded bg-white">
                                <option value="">— Select —</option>
                                {products.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
                              </select>
                            ) : itemKindForLines === 'either' ? (
                              <select value={l.stock_item_id ? `i:${l.stock_item_id}` : (l.product_id ? `p:${l.product_id}` : '')} onChange={e => {
                                const v = e.target.value
                                if (v.startsWith('i:')) pickItem(i, v.slice(2))
                                else if (v.startsWith('p:')) pickProduct(i, v.slice(2))
                                else setLine(i, { stock_item_id: '', product_id: '' })
                              }} className="w-full px-2 py-1 text-xs border border-slate-200 rounded bg-white">
                                <option value="">— Select —</option>
                                <optgroup label="Stock Items">
                                  {items.map(it => <option key={`i-${it.id}`} value={`i:${it.id}`}>{it.item_code} — {it.name}</option>)}
                                </optgroup>
                                <optgroup label="Products">
                                  {products.map(p => <option key={`p-${p.id}`} value={`p:${p.id}`}>{p.sku} — {p.name}</option>)}
                                </optgroup>
                              </select>
                            ) : (
                              <select value={l.stock_item_id || ''} onChange={e=>pickItem(i, e.target.value)} className="w-full px-2 py-1 text-xs border border-slate-200 rounded bg-white">
                                <option value="">— Select —</option>
                                {items.map(it => (
                                  <option key={it.id} value={it.id}>
                                    {it.item_code} — {it.name}{it.color ? ` (${it.color})` : ''} · stock: {Number(it.current_stock ?? 0).toFixed(2)} {it.uom}
                                  </option>
                                ))}
                              </select>
                            )}
                          </td>
                          <td className="px-1 py-1"><input type="number" step="0.001" value={l.qty} onChange={e=>setLine(i, { qty: e.target.value })} className="w-full px-2 py-1 text-xs border border-slate-200 rounded text-right font-mono" /></td>
                          <td className="px-1 py-1"><input value={l.uom} onChange={e=>setLine(i, { uom: e.target.value.toUpperCase() })} className="w-full px-2 py-1 text-xs border border-slate-200 rounded font-mono uppercase" /></td>
                          <td className="px-1 py-1"><input type="number" step="0.01" value={l.unit_cost} onChange={e=>setLine(i, { unit_cost: e.target.value })} className="w-full px-2 py-1 text-xs border border-slate-200 rounded text-right font-mono" /></td>
                          <td className="px-2 py-1 text-right font-mono font-semibold text-slate-700">{lt.toFixed(2)}</td>
                          <td className="px-1 py-1"><input value={l.notes} onChange={e=>setLine(i, { notes: e.target.value })} className="w-full px-2 py-1 text-xs border border-slate-200 rounded" /></td>
                          <td className="px-1 py-1 text-center">
                            <div className="flex justify-center gap-0.5">
                              <button onClick={()=>moveLine(i,-1)} className="p-0.5 text-slate-400 hover:text-slate-700"><ChevronUp className="w-3 h-3"/></button>
                              <button onClick={()=>moveLine(i, 1)} className="p-0.5 text-slate-400 hover:text-slate-700"><ChevronDown className="w-3 h-3"/></button>
                              <button onClick={()=>removeLine(i)} className="p-0.5 text-slate-400 hover:text-red-600"><Trash2 className="w-3 h-3"/></button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 border-t border-slate-200 font-semibold">
                      <td colSpan={2} className="px-3 py-1.5 text-right text-slate-500 text-xs uppercase">Totals:</td>
                      <td className="px-3 py-1.5 text-right font-mono">{totalQty.toFixed(2)}</td>
                      <td colSpan={2}></td>
                      <td className={`px-3 py-1.5 text-right font-mono ${tabConfig.color}`}>RM {totalCost.toFixed(2)}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Receive-from-Tailor: BOM cost preview */}
            {consumptionPreview && consumptionPreview.productQty > 0 && (
              <div className="border-t border-slate-100 px-4 py-3 bg-teal-50/30">
                <h3 className="text-xs font-semibold text-teal-700 uppercase mb-2">BOM Cost Breakdown · {consumptionPreview.productQty} pcs (auto-calculated on save)</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white border border-slate-200 rounded p-2">
                    <div className="text-[10px] font-bold uppercase text-blue-700 mb-1">Materials (auto-deducted)</div>
                    {consumptionPreview.mat.map((l: any, i: number) => (
                      <div key={i} className="flex justify-between text-[11px] gap-2">
                        <div className="flex-1 truncate"><span className="font-mono font-bold text-blue-700">{l.stock_item?.item_code}</span> <span className="text-slate-600">{l.stock_item?.name}</span></div>
                        <div className="text-right shrink-0">
                          <div className="font-mono">{l._qty} {l.uom ?? l.stock_item?.uom}</div>
                          <div className="text-[10px] text-slate-500">RM {l._cost.toFixed(2)}</div>
                          <div className={`text-[9px] ${l._stockAfter < 0 ? 'text-red-600 font-bold' : 'text-emerald-600'}`}>after: {l._stockAfter.toFixed(2)}</div>
                        </div>
                      </div>
                    ))}
                    <div className="border-t border-slate-100 mt-2 pt-1 flex justify-between text-xs"><span className="font-semibold text-blue-700">Subtotal</span><span className="font-mono font-semibold text-blue-700">RM {consumptionPreview.tm.toFixed(2)}</span></div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded p-2">
                    <div className="text-[10px] font-bold uppercase text-fuchsia-700 mb-1">Tailor Service (billable)</div>
                    {consumptionPreview.svc.map((l: any, i: number) => (
                      <div key={i} className="flex justify-between text-[11px] gap-2">
                        <div className="flex-1 truncate"><span className="text-slate-700">{l.service_name}</span></div>
                        <div className="text-right shrink-0"><div className="font-mono">{l._qty} × RM {Number(l.unit_cost).toFixed(2)}</div><div className="text-[10px] text-slate-500">RM {l._cost.toFixed(2)}</div></div>
                      </div>
                    ))}
                    <div className="border-t border-slate-100 mt-2 pt-1 flex justify-between text-xs"><span className="font-semibold text-fuchsia-700">Subtotal</span><span className="font-mono font-semibold text-fuchsia-700">RM {consumptionPreview.ts.toFixed(2)}</span></div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded p-2">
                    <div className="text-[10px] font-bold uppercase text-amber-700 mb-1">Overhead (internal)</div>
                    {consumptionPreview.ovh.map((l: any, i: number) => (
                      <div key={i} className="flex justify-between text-[11px] gap-2">
                        <div className="flex-1 truncate"><span className="text-slate-700">{l.service_name}</span></div>
                        <div className="text-right shrink-0"><div className="font-mono">{l._qty} × RM {Number(l.unit_cost).toFixed(2)}</div><div className="text-[10px] text-slate-500">RM {l._cost.toFixed(2)}</div></div>
                      </div>
                    ))}
                    <div className="border-t border-slate-100 mt-2 pt-1 flex justify-between text-xs"><span className="font-semibold text-amber-700">Subtotal</span><span className="font-mono font-semibold text-amber-700">RM {consumptionPreview.to.toFixed(2)}</span></div>
                  </div>
                </div>
                <div className="mt-2 flex justify-end items-center gap-3 text-sm">
                  <span className="text-slate-500 text-xs uppercase">Total Production Cost:</span>
                  <span className="px-3 py-1 bg-slate-700 text-white rounded font-mono font-bold">RM {consumptionPreview.total.toFixed(2)}</span>
                  <span className="text-slate-400 text-[10px]">({(consumptionPreview.total / Math.max(consumptionPreview.productQty, 1)).toFixed(2)} per pc)</span>
                </div>
              </div>
            )}

            <div className="border-t border-slate-100 px-4 py-3">
              <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">Notes</label>
              <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2} placeholder="Internal notes..." className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── list view (movements) ───
  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white">
      <TopBar router={router} tabConfig={tabConfig} loadList={loadList} onNew={openCreate} />
      {tabBar}

      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-700 text-white">
              <th className="w-8 px-2 py-2 text-center font-medium">#</th>
              <th className="text-left px-3 py-2 font-semibold">No.</th>
              <th className="text-left px-3 py-2 font-semibold">Date</th>
              <th className="text-left px-3 py-2 font-semibold">From</th>
              <th className="text-left px-3 py-2 font-semibold">To</th>
              {showTailor && <th className="text-left px-3 py-2 font-semibold">Tailor</th>}
              {tab === 'receive_tailor' && <th className="text-left px-3 py-2 font-semibold">Product</th>}
              <th className="text-right px-3 py-2 font-semibold">Total Qty</th>
              <th className="text-right px-3 py-2 font-semibold">Total Cost</th>
              <th className="text-left px-3 py-2 font-semibold">Reference</th>
              <th className="text-center px-3 py-2 font-semibold">Status</th>
              <th className="text-center px-3 py-2 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={12} className="py-8 text-center text-slate-400">Loading…</td></tr>
            : movements.length === 0 ? (
              <tr><td colSpan={12} className="py-16 text-center text-slate-400">
                <tabConfig.icon className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No records yet</p>
                <button onClick={openCreate} className={`mt-2 px-3 py-1.5 ${tabConfig.bg.replace('50','600')} text-white text-xs rounded hover:opacity-90`}>Create First {tabConfig.label}</button>
              </td></tr>
            ) : movements.map((m, idx) => (
              <tr key={m.id}
                onDoubleClick={()=>!m.is_cancelled && openEdit(m)}
                className={`border-b border-slate-100 cursor-pointer transition-colors ${idx%2===0 ? `bg-white ${tabConfig.bg.replace('50','50/60')}` : `bg-slate-50/60`} ${m.is_cancelled ? 'opacity-60 line-through decoration-red-400' : ''}`}>
                <td className="px-2 py-1.5 text-center text-slate-400">{idx+1}</td>
                <td className={`px-3 py-1.5 font-mono font-bold ${tabConfig.color}`}>{m.movement_no}</td>
                <td className="px-3 py-1.5 font-mono text-slate-600">{(m.date || '').split('T')[0]}</td>
                <td className="px-3 py-1.5 text-slate-700">{m.from_location?.code ?? '—'}</td>
                <td className="px-3 py-1.5 text-slate-700">{m.to_location?.code ?? '—'}</td>
                {showTailor && <td className="px-3 py-1.5 text-slate-700">{m.tailor?.name ?? '—'}</td>}
                {tab === 'receive_tailor' && <td className="px-3 py-1.5 text-slate-700">{m.product?.sku ?? '—'}</td>}
                <td className="px-3 py-1.5 text-right font-mono">{Number(m.total_qty ?? 0).toFixed(2)}</td>
                <td className="px-3 py-1.5 text-right font-mono font-semibold text-slate-700">{Number(m.total_cost ?? 0).toFixed(2)}</td>
                <td className="px-3 py-1.5 text-slate-500 truncate max-w-[140px]">{m.reference ?? '—'}</td>
                <td className="px-3 py-1.5 text-center">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${m.is_cancelled ? 'bg-red-100 text-red-700' : m.status === 'posted' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                    {m.is_cancelled ? 'CANCELLED' : m.status.toUpperCase()}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={()=>openEdit(m)} disabled={m.is_cancelled} className={`p-1 rounded text-slate-400 ${tabConfig.bg.replace('50','50')}`}><Pencil className="w-3 h-3"/></button>
                    {tab === 'receive_tailor' && !m.is_cancelled && (
                      <button onClick={()=>handleGenerateBill(m)} className="p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50" title="Generate Tailor Bill"><FileText className="w-3 h-3"/></button>
                    )}
                    {!m.is_cancelled && <button onClick={()=>handleCancel(m)} className="p-1 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50" title="Cancel"><Ban className="w-3 h-3"/></button>}
                    <button onClick={()=>handleDelete(m)} className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50" title="Delete"><Trash2 className="w-3 h-3"/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TopBar({ router, tabConfig, loadList, onNew, bomMode }: { router: any; tabConfig: any; loadList: () => void; onNew?: () => void; bomMode?: boolean }) {
  const Icon = tabConfig.icon
  return (
    <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
        <div className={`w-9 h-9 ${tabConfig.bg} rounded-xl flex items-center justify-center`}>
          <Workflow className={`w-5 h-5 ${tabConfig.color}`} />
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-800">Inventory Operations</h1>
          <p className="text-xs text-slate-400">{tabConfig.label} — {tabConfig.sub}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {!bomMode && onNew && (
          <button onClick={onNew} className={`flex items-center gap-1.5 px-3 py-1.5 ${tabConfig.bg.replace('50','600')} text-white text-xs font-medium rounded-lg hover:opacity-90`}>
            <Plus className="w-3.5 h-3.5" /> New
          </button>
        )}
        {bomMode && (
          <button onClick={() => router.push('/inventory/bom')} className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 text-white text-xs font-medium rounded-lg hover:bg-cyan-700">
            <Plus className="w-3.5 h-3.5" /> Open BOM Editor
          </button>
        )}
        <button onClick={loadList} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-600 text-white text-xs font-medium rounded-lg hover:bg-slate-700">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>
    </div>
  )
}
