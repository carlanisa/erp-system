'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, RefreshCw, Pencil, Trash2, X, Loader2, Save, Search, ArrowLeft, FilePlus,
  ChevronUp, ChevronDown, Ban, FileText, type LucideIcon,
} from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

export type MovementType = 'receipt'|'issue'|'adjust'|'transfer'|'send_tailor'|'receive_tailor'

export type MovementConfig = {
  type:           MovementType
  title:          string
  breadcrumb:     string
  icon:           LucideIcon
  accent:         { color: string; bg: string; bgHover: string; ring: string; btn: string; btnHover: string }
  showFromLoc:    boolean
  showToLoc:      boolean
  showTailor:     boolean
  showProductBom: boolean   // for receive_tailor: product + BOM auto-pull
  itemKind:       'stock_item' | 'product' | 'either'
  numberPrefix:   string    // for display only
  saveLabel?:     string
  qtySigned?:     boolean   // adjust → allow negative qty
}

type StockItem = { id:number; item_code:string; name:string; uom:string; color?:string|null; size?:string|null; current_stock?:number; unit_cost?:number }
type Product   = { id:number; sku:string; name:string; uom?:string }
type Location  = { id:number; code:string; name:string; type:string }
type Tailor    = { id:number; tailor_code:string; name:string; location_id:number|null }

type LineForm = {
  stock_item_id: number | ''
  product_id:    number | ''
  qty:           string
  uom:           string
  unit_cost:     string
  notes:         string
}

type Movement = {
  id: number
  movement_no: string
  type: MovementType
  date: string
  from_location_id: number | null
  to_location_id:   number | null
  tailor_id:        number | null
  product_id:       number | null
  bom_id:           number | null
  total_qty:  number
  total_cost: number
  reference: string | null
  notes:     string | null
  status: 'draft'|'posted'|'cancelled'
  is_cancelled: boolean
  from_location?: Location|null
  to_location?:   Location|null
  tailor?:        Tailor|null
  product?:       Product|null
  lines: Array<{ id:number; stock_item_id:number|null; product_id:number|null; qty:number; uom:string|null; unit_cost:number; total_cost:number; notes:string|null; stock_item?:StockItem|null; product?:Product|null }>
}

const newLine = (): LineForm => ({ stock_item_id: '', product_id: '', qty: '', uom: '', unit_cost: '', notes: '' })

export default function StockMovementPage({ config }: { config: MovementConfig }) {
  const router = useRouter()

  const [records, setRecords] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [selected, setSelected] = useState<Movement | null>(null)

  const [items, setItems]         = useState<StockItem[]>([])
  const [products, setProducts]   = useState<Product[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [tailors, setTailors]     = useState<Tailor[]>([])

  const [mode, setMode] = useState<'list'|'create'|'edit'>('list')
  const [editing, setEditing] = useState<Movement | null>(null)
  const [saving, setSaving] = useState(false)

  const today = new Date().toISOString().split('T')[0]
  const [dateStr, setDateStr]   = useState(today)
  const [fromLoc, setFromLoc]   = useState<string>('')
  const [toLoc,   setToLoc]     = useState<string>('')
  const [tailorId, setTailorId] = useState<string>('')
  const [productId, setProductId] = useState<string>('')
  const [bomId, setBomId]       = useState<string>('')
  const [bomDetail, setBomDetail] = useState<any | null>(null)
  const [reference, setReference] = useState<string>('')
  const [notes, setNotes]       = useState<string>('')
  const [lines, setLines]       = useState<LineForm[]>([newLine()])

  const itemMap     = useMemo(() => Object.fromEntries(items.map(i => [i.id, i])), [items])
  const productMap  = useMemo(() => Object.fromEntries(products.map(p => [p.id, p])), [products])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/inventory/stock-movements', { params: { type: config.type, search } })
      setRecords(r.data.data ?? [])
    } catch {} finally { setLoading(false) }
  }, [config.type, search])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    api.get('/inventory/stock-items/flat').then(r => setItems(r.data.data ?? [])).catch(() => {})
    api.get('/inventory/products', { params: { per_page: 500 } }).then(r => setProducts(r.data.data ?? [])).catch(() => {})
    api.get('/inventory/locations/flat').then(r => setLocations(r.data.data ?? [])).catch(() => {})
    api.get('/inventory/tailors/flat').then(r => setTailors(r.data.data ?? [])).catch(() => {})
  }, [])

  function resetForm() {
    setDateStr(today); setFromLoc(''); setToLoc(''); setTailorId('')
    setProductId(''); setBomId(''); setBomDetail(null); setReference(''); setNotes('')
    setLines([newLine()])
  }
  function openCreate() { setEditing(null); resetForm(); setMode('create') }
  function openEdit(m: Movement) {
    setEditing(m)
    setDateStr(m.date.split('T')[0])
    setFromLoc(m.from_location_id ? String(m.from_location_id) : '')
    setToLoc(m.to_location_id ? String(m.to_location_id) : '')
    setTailorId(m.tailor_id ? String(m.tailor_id) : '')
    setProductId(m.product_id ? String(m.product_id) : '')
    setBomId(m.bom_id ? String(m.bom_id) : '')
    setReference(m.reference ?? '')
    setNotes(m.notes ?? '')
    setLines(m.lines.length ? m.lines.map(l => ({
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
    setLines(rs => {
      const j = i + d; if (j < 0 || j >= rs.length) return rs
      const c = [...rs]; [c[i], c[j]] = [c[j], c[i]]; return c
    })
  }
  function pickItem(i: number, id: string) {
    const stockId = id ? Number(id) : ''
    const itm = stockId ? itemMap[stockId] : null
    setLine(i, { stock_item_id: stockId as any, product_id: '', uom: itm?.uom ?? '', unit_cost: itm?.unit_cost ? String(itm.unit_cost) : '0' })
  }
  function pickProduct(i: number, id: string) {
    const pid = id ? Number(id) : ''
    const p = pid ? productMap[pid] : null
    setLine(i, { product_id: pid as any, stock_item_id: '', uom: p?.uom ?? 'PCS' })
  }

  // BOM auto-pull (receive_tailor)
  async function loadBomForProduct(pid: string) {
    setProductId(pid)
    if (!pid) { setBomId(''); setBomDetail(null); return }
    try {
      const r = await api.get('/inventory/boms', { params: { product_id: pid } })
      const list: any[] = r.data.data ?? []
      const active = list.find(b => b.is_active) ?? list[0]
      if (!active) {
        toast('No BOM found for this product. Lines will be empty.', { icon: 'ℹ️' })
        setBomId(''); setBomDetail(null)
        return
      }
      setBomId(String(active.id))
      setBomDetail(active)
      // Pre-fill the receive line: ONE product line. Material consumption
      // is auto-added by the backend on save (no need to clutter the form).
      const product = productMap[Number(pid)]
      setLines([{
        stock_item_id: '',
        product_id:    Number(pid) as any,
        qty:           String(active.output_qty ?? 1),
        uom:           product?.uom ?? active.output_uom ?? 'PCS',
        unit_cost:     '0',
        notes:         `Per BOM ${active.bom_number} v${active.version}`,
      }])
      toast.success(`BOM ${active.bom_number} loaded`)
    } catch {
      toast.error('Could not load BOM')
    }
  }

  // For receive_tailor: compute live preview of material consumption + costs
  const consumptionPreview = useMemo(() => {
    if (config.type !== 'receive_tailor' || !bomDetail) return null
    const productLine = lines.find(l => l.product_id && Number(l.product_id) === Number(bomDetail.product_id))
    const productQty  = parseFloat(productLine?.qty ?? '0') || 0
    const outputQty   = Number(bomDetail.output_qty || 1)
    const mult        = outputQty > 0 ? productQty / outputQty : 0
    const materials = (bomDetail.lines as any[] ?? []).filter(l => l.kind === 'material').map(l => {
      const qty = +(Number(l.qty) * mult).toFixed(3)
      const unitCost = Number(l.stock_item?.unit_cost ?? 0)
      const cost = qty * unitCost
      return { ...l, _qty: qty, _unitCost: unitCost, _cost: cost, _stockAfter: Number(l.stock_item?.current_stock ?? 0) - qty }
    })
    const services  = (bomDetail.lines as any[] ?? []).filter(l => l.kind === 'tailor_service').map(l => ({
      ...l, _qty: +(Number(l.qty) * mult).toFixed(3), _cost: +(Number(l.qty) * mult * Number(l.unit_cost ?? 0)).toFixed(2),
    }))
    const overheads = (bomDetail.lines as any[] ?? []).filter(l => l.kind === 'overhead').map(l => ({
      ...l, _qty: +(Number(l.qty) * mult).toFixed(3), _cost: +(Number(l.qty) * mult * Number(l.unit_cost ?? 0)).toFixed(2),
    }))
    const totalMat  = materials.reduce((s, l) => s + l._cost, 0)
    const totalSvc  = services.reduce((s, l) => s + l._cost, 0)
    const totalOvh  = overheads.reduce((s, l) => s + l._cost, 0)
    return {
      productQty, mult, materials, services, overheads,
      totalMat, totalSvc, totalOvh,
      total: totalMat + totalSvc + totalOvh,
    }
  }, [config.type, bomDetail, lines])

  async function handleSave() {
    if (!dateStr) { toast.error('Date required'); return }
    if (config.showTailor && !tailorId) { toast.error('Select a tailor'); return }
    if (config.type === 'transfer' && (!fromLoc || !toLoc)) { toast.error('Both From & To locations required'); return }

    const cleanLines = lines.filter(l => (l.stock_item_id || l.product_id) && Number(l.qty) !== 0 && (config.qtySigned || Number(l.qty) > 0))
    if (!cleanLines.length) { toast.error('Add at least one valid line'); return }

    setSaving(true)
    const payload: any = {
      type: config.type,
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
      if (editing) {
        // Update — server should reverse old + apply new. Simpler: cancel + recreate.
        await api.put(`/inventory/stock-movements/${editing.id}`, payload)
      } else {
        await api.post('/inventory/stock-movements', payload)
      }
      toast.success(editing ? 'Updated' : 'Posted')
      setMode('list'); load()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Save failed')
    } finally { setSaving(false) }
  }

  async function handleDelete(m: Movement) {
    if (!confirm(`Delete ${m.movement_no}? Stock effects will be reversed.`)) return
    try { await api.delete(`/inventory/stock-movements/${m.id}`); toast.success('Deleted (reversed)'); load() }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Cannot delete') }
  }
  async function handleCancel(m: Movement) {
    if (!confirm(`Cancel ${m.movement_no}? Stock effects will be reversed.`)) return
    try { await api.post(`/inventory/stock-movements/${m.id}/cancel`); toast.success('Cancelled'); load() }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Cancel failed') }
  }

  async function handleGenerateTailorBill(m: Movement) {
    if (!confirm(`Generate Tailor Bill (PI) for ${m.movement_no}? Only stitching/labor lines will be billed.`)) return
    try {
      const r = await api.post(`/inventory/stock-movements/${m.id}/generate-tailor-bill`)
      const pi = r.data.data
      toast.success(`Bill ${pi.pi_number} created (RM ${Number(pi.amount).toFixed(2)})`)
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Bill generation failed') }
  }

  const totalQty  = lines.reduce((s, l) => s + (parseFloat(l.qty) || 0), 0)
  const totalCost = lines.reduce((s, l) => s + (parseFloat(l.qty) || 0) * (parseFloat(l.unit_cost) || 0), 0)

  const Icon = config.icon
  const colorBtn  = `${config.accent.btn} ${config.accent.btnHover} text-white`
  const filteredLocations = locations  // could filter by type later

  // ── FORM ─────────────────────────────────────────────────
  if (mode === 'create' || mode === 'edit') {
    return (
      <div className="fixed inset-0 z-40 flex flex-col bg-slate-100">
        <div className="bg-white border-b border-slate-200 px-5 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 ${config.accent.bg} rounded-lg flex items-center justify-center`}>
              <Icon className={`w-4 h-4 ${config.accent.color}`} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                {editing ? `Edit ${editing.movement_no}` : `New ${config.title}`}
              </h2>
              <p className="text-xs text-slate-400">Inventory → {config.breadcrumb}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => { setEditing(null); resetForm() }} disabled={saving}
              className={`flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 ${config.accent.bgHover} text-slate-700 text-xs font-medium rounded`}>
              <FilePlus className="w-3.5 h-3.5 text-slate-500" /> New
            </button>
            <button onClick={handleSave} disabled={saving}
              className={`flex items-center gap-1.5 px-3 py-1.5 ${colorBtn} text-xs font-medium rounded disabled:opacity-60`}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {config.saveLabel ?? 'Post'}
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
            {/* Header fields */}
            <div className="border-b border-slate-100 px-4 py-3 grid grid-cols-12 gap-3">
              <div className="col-span-2">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">Date <span className="text-red-500">*</span></label>
                <input type="date" value={dateStr} onChange={e=>setDateStr(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded font-mono" />
              </div>

              {config.showFromLoc && (
                <div className="col-span-3">
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">From Location</label>
                  <select value={fromLoc} onChange={e=>setFromLoc(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white">
                    <option value="">— None —</option>
                    {filteredLocations.map(l => <option key={l.id} value={l.id}>{l.code} — {l.name}</option>)}
                  </select>
                </div>
              )}

              {config.showToLoc && (
                <div className="col-span-3">
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">To Location</label>
                  <select value={toLoc} onChange={e=>setToLoc(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white">
                    <option value="">— None —</option>
                    {filteredLocations.map(l => <option key={l.id} value={l.id}>{l.code} — {l.name}</option>)}
                  </select>
                </div>
              )}

              {config.showTailor && (
                <div className="col-span-3">
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">Tailor <span className="text-red-500">*</span></label>
                  <select value={tailorId} onChange={e=>{
                    setTailorId(e.target.value)
                    const t = tailors.find(x => String(x.id) === e.target.value)
                    if (t?.location_id) {
                      if (config.type === 'send_tailor')   setToLoc(String(t.location_id))
                      if (config.type === 'receive_tailor')setFromLoc(String(t.location_id))
                    }
                  }}
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white">
                    <option value="">— Select —</option>
                    {tailors.map(t => <option key={t.id} value={t.id}>{t.tailor_code} — {t.name}</option>)}
                  </select>
                </div>
              )}

              {config.showProductBom && (
                <div className="col-span-4">
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">Product (Finished Good) <span className="text-red-500">*</span></label>
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
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Lines</h3>
                <button onClick={addLine}
                  className={`flex items-center gap-1 px-2.5 py-1 ${config.accent.bg} ${config.accent.color} text-xs font-medium rounded hover:opacity-80`}>
                  <Plus className="w-3 h-3" /> Add Line
                </button>
              </div>
              <div className="border border-slate-200 rounded overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="text-center w-8 px-2 py-1.5 text-[10px] uppercase">#</th>
                      <th className="text-left px-3 py-1.5 text-[11px] uppercase">{config.itemKind === 'product' ? 'Product' : 'Stock Item'}</th>
                      <th className="text-right px-3 py-1.5 text-[11px] uppercase w-24">Qty {config.qtySigned && <span className="text-amber-500 normal-case font-normal text-[10px]">(±)</span>}</th>
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
                      const lineTot = (parseFloat(l.qty) || 0) * (parseFloat(l.unit_cost) || 0)
                      return (
                        <tr key={i} className="border-t border-slate-100">
                          <td className="text-center text-slate-400 px-2 py-1">{i+1}</td>
                          <td className="px-2 py-1">
                            {config.itemKind === 'product' ? (
                              <select value={l.product_id || ''} onChange={e=>pickProduct(i, e.target.value)}
                                className="w-full px-2 py-1 text-xs border border-slate-200 rounded bg-white">
                                <option value="">— Select —</option>
                                {products.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
                              </select>
                            ) : config.itemKind === 'either' ? (
                              <select value={l.stock_item_id ? `i:${l.stock_item_id}` : (l.product_id ? `p:${l.product_id}` : '')}
                                onChange={e => {
                                  const v = e.target.value
                                  if (v.startsWith('i:')) pickItem(i, v.slice(2))
                                  else if (v.startsWith('p:')) pickProduct(i, v.slice(2))
                                  else setLine(i, { stock_item_id: '', product_id: '' })
                                }}
                                className="w-full px-2 py-1 text-xs border border-slate-200 rounded bg-white">
                                <option value="">— Select —</option>
                                <optgroup label="Stock Items">
                                  {items.map(it => <option key={`i-${it.id}`} value={`i:${it.id}`}>{it.item_code} — {it.name}</option>)}
                                </optgroup>
                                <optgroup label="Products">
                                  {products.map(p => <option key={`p-${p.id}`} value={`p:${p.id}`}>{p.sku} — {p.name}</option>)}
                                </optgroup>
                              </select>
                            ) : (
                              <select value={l.stock_item_id || ''} onChange={e=>pickItem(i, e.target.value)}
                                className="w-full px-2 py-1 text-xs border border-slate-200 rounded bg-white">
                                <option value="">— Select —</option>
                                {items.map(it => (
                                  <option key={it.id} value={it.id}>
                                    {it.item_code} — {it.name}{it.color ? ` (${it.color})` : ''} · stock: {Number(it.current_stock ?? 0).toFixed(2)} {it.uom}
                                  </option>
                                ))}
                              </select>
                            )}
                          </td>
                          <td className="px-1 py-1">
                            <input type="number" step="0.001"
                              value={l.qty} onChange={e=>setLine(i, { qty: e.target.value })}
                              className="w-full px-2 py-1 text-xs border border-slate-200 rounded text-right font-mono" />
                          </td>
                          <td className="px-1 py-1">
                            <input value={l.uom} onChange={e=>setLine(i, { uom: e.target.value.toUpperCase() })}
                              className="w-full px-2 py-1 text-xs border border-slate-200 rounded font-mono uppercase" />
                          </td>
                          <td className="px-1 py-1">
                            <input type="number" step="0.01" value={l.unit_cost} onChange={e=>setLine(i, { unit_cost: e.target.value })}
                              className="w-full px-2 py-1 text-xs border border-slate-200 rounded text-right font-mono" />
                          </td>
                          <td className="px-2 py-1 text-right font-mono font-semibold text-slate-700">{lineTot.toFixed(2)}</td>
                          <td className="px-1 py-1">
                            <input value={l.notes} onChange={e=>setLine(i, { notes: e.target.value })}
                              className="w-full px-2 py-1 text-xs border border-slate-200 rounded" />
                          </td>
                          <td className="px-1 py-1 text-center">
                            <div className="flex justify-center gap-0.5">
                              <button onClick={()=>moveLine(i,-1)} className={`p-0.5 text-slate-400 hover:${config.accent.color}`}><ChevronUp className="w-3 h-3"/></button>
                              <button onClick={()=>moveLine(i, 1)} className={`p-0.5 text-slate-400 hover:${config.accent.color}`}><ChevronDown className="w-3 h-3"/></button>
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
                      <td className={`px-3 py-1.5 text-right font-mono ${config.accent.color}`}>RM {totalCost.toFixed(2)}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* BOM consumption preview (receive_tailor only) */}
            {consumptionPreview && consumptionPreview.productQty > 0 && (
              <div className="border-t border-slate-100 px-4 py-3 bg-teal-50/30">
                <h3 className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-2">
                  BOM Cost Breakdown · {consumptionPreview.productQty} pcs (auto-calculated on save)
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {/* Materials column */}
                  <div className="bg-white border border-slate-200 rounded p-2">
                    <div className="text-[10px] font-bold uppercase text-blue-700 mb-1">Materials (auto-deducted from stock)</div>
                    {consumptionPreview.materials.length === 0 ? (
                      <div className="text-xs text-slate-400">— no material lines —</div>
                    ) : (
                      <div className="space-y-1">
                        {consumptionPreview.materials.map((l: any, i: number) => (
                          <div key={i} className="flex justify-between text-[11px] gap-2">
                            <div className="flex-1 truncate">
                              <span className="font-mono font-bold text-blue-700">{l.stock_item?.item_code}</span>
                              <span className="text-slate-600 ml-1">{l.stock_item?.name}</span>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-mono">{l._qty} {l.uom ?? l.stock_item?.uom}</div>
                              <div className="text-[10px] text-slate-500">RM {l._cost.toFixed(2)}</div>
                              <div className={`text-[9px] ${l._stockAfter < 0 ? 'text-red-600 font-bold' : 'text-emerald-600'}`}>after: {l._stockAfter.toFixed(2)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="border-t border-slate-100 mt-2 pt-1 flex justify-between text-xs">
                      <span className="font-semibold text-blue-700">Subtotal</span>
                      <span className="font-mono font-semibold text-blue-700">RM {consumptionPreview.totalMat.toFixed(2)}</span>
                    </div>
                  </div>
                  {/* Services column */}
                  <div className="bg-white border border-slate-200 rounded p-2">
                    <div className="text-[10px] font-bold uppercase text-fuchsia-700 mb-1">Tailor Service (billable to tailor)</div>
                    {consumptionPreview.services.length === 0 ? (
                      <div className="text-xs text-slate-400">— no service lines —</div>
                    ) : (
                      <div className="space-y-1">
                        {consumptionPreview.services.map((l: any, i: number) => (
                          <div key={i} className="flex justify-between text-[11px] gap-2">
                            <div className="flex-1 truncate">
                              <span className="text-slate-700">{l.service_name}</span>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-mono">{l._qty} × RM {Number(l.unit_cost).toFixed(2)}</div>
                              <div className="text-[10px] text-slate-500">RM {l._cost.toFixed(2)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="border-t border-slate-100 mt-2 pt-1 flex justify-between text-xs">
                      <span className="font-semibold text-fuchsia-700">Subtotal</span>
                      <span className="font-mono font-semibold text-fuchsia-700">RM {consumptionPreview.totalSvc.toFixed(2)}</span>
                    </div>
                  </div>
                  {/* Overhead column */}
                  <div className="bg-white border border-slate-200 rounded p-2">
                    <div className="text-[10px] font-bold uppercase text-amber-700 mb-1">Overhead (internal)</div>
                    {consumptionPreview.overheads.length === 0 ? (
                      <div className="text-xs text-slate-400">— no overhead lines —</div>
                    ) : (
                      <div className="space-y-1">
                        {consumptionPreview.overheads.map((l: any, i: number) => (
                          <div key={i} className="flex justify-between text-[11px] gap-2">
                            <div className="flex-1 truncate"><span className="text-slate-700">{l.service_name}</span></div>
                            <div className="text-right shrink-0">
                              <div className="font-mono">{l._qty} × RM {Number(l.unit_cost).toFixed(2)}</div>
                              <div className="text-[10px] text-slate-500">RM {l._cost.toFixed(2)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="border-t border-slate-100 mt-2 pt-1 flex justify-between text-xs">
                      <span className="font-semibold text-amber-700">Subtotal</span>
                      <span className="font-mono font-semibold text-amber-700">RM {consumptionPreview.totalOvh.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex justify-end items-center gap-3 text-sm">
                  <span className="text-slate-500 text-xs uppercase tracking-wide">Total Production Cost:</span>
                  <span className="px-3 py-1 bg-slate-700 text-white rounded font-mono font-bold">RM {consumptionPreview.total.toFixed(2)}</span>
                  <span className="text-slate-400 text-[10px]">({(consumptionPreview.total / Math.max(consumptionPreview.productQty, 1)).toFixed(2)} per pc)</span>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="border-t border-slate-100 px-4 py-3">
              <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">Notes</label>
              <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2}
                placeholder="Internal notes about this movement..."
                className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── LIST ─────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/inventory')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <div className={`w-9 h-9 ${config.accent.bg} rounded-xl flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${config.accent.color}`} />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800">{config.title}</h1>
            <p className="text-xs text-slate-400">Inventory → {config.breadcrumb}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openCreate} className={`flex items-center gap-1.5 px-3 py-1.5 ${colorBtn} text-xs font-medium rounded-lg`}>
            <Plus className="w-3.5 h-3.5" /> New
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
            placeholder={`Search ${config.numberPrefix} or reference...`}
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded" />
        </div>
        <div className="text-xs text-slate-500">{records.length} record{records.length!==1?'s':''}</div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-700 text-white">
              <th className="w-8 px-2 py-2 text-center font-medium">#</th>
              <th className="text-left px-3 py-2 font-semibold">No.</th>
              <th className="text-left px-3 py-2 font-semibold">Date</th>
              {config.showFromLoc && <th className="text-left px-3 py-2 font-semibold">From</th>}
              {config.showToLoc   && <th className="text-left px-3 py-2 font-semibold">To</th>}
              {config.showTailor  && <th className="text-left px-3 py-2 font-semibold">Tailor</th>}
              {config.showProductBom && <th className="text-left px-3 py-2 font-semibold">Product</th>}
              <th className="text-right px-3 py-2 font-semibold">Total Qty</th>
              <th className="text-right px-3 py-2 font-semibold">Total Cost</th>
              <th className="text-left px-3 py-2 font-semibold">Reference</th>
              <th className="text-center px-3 py-2 font-semibold">Status</th>
              <th className="text-center px-3 py-2 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? Array.from({length:6}).map((_,i)=>(
              <tr key={i} className={i%2===0?'bg-white':'bg-slate-50'}>
                {Array.from({length:10}).map((_,j)=>(<td key={j} className="px-3 py-2"><div className="h-3 bg-slate-100 rounded animate-pulse" /></td>))}
              </tr>
            )) : records.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-16 text-center text-slate-400">
                  <Icon className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No records yet</p>
                  <button onClick={openCreate} className={`mt-2 px-3 py-1.5 ${colorBtn} text-xs rounded`}>Create First {config.title}</button>
                </td>
              </tr>
            ) : records.map((m, idx) => {
              const isSel = selected?.id === m.id
              return (
                <tr key={m.id}
                  onClick={()=>setSelected(m)}
                  onDoubleClick={()=>!m.is_cancelled && openEdit(m)}
                  className={`border-b border-slate-100 cursor-pointer transition-colors ${
                    isSel ? `${config.accent.bg} ring-1 ring-inset ${config.accent.ring}`
                          : idx%2===0 ? `bg-white ${config.accent.bgHover}` : `bg-slate-50/60 ${config.accent.bgHover}`
                  } ${m.is_cancelled ? 'opacity-60 line-through decoration-red-400' : ''}`}>
                  <td className="px-2 py-1.5 text-center text-slate-400">{idx+1}</td>
                  <td className={`px-3 py-1.5 font-mono font-bold ${config.accent.color}`}>{m.movement_no}</td>
                  <td className="px-3 py-1.5 font-mono text-slate-600">{(m.date || '').split('T')[0]}</td>
                  {config.showFromLoc && <td className="px-3 py-1.5 text-slate-700">{m.from_location?.code ?? '—'}</td>}
                  {config.showToLoc   && <td className="px-3 py-1.5 text-slate-700">{m.to_location?.code ?? '—'}</td>}
                  {config.showTailor  && <td className="px-3 py-1.5 text-slate-700">{m.tailor?.name ?? '—'}</td>}
                  {config.showProductBom && <td className="px-3 py-1.5 text-slate-700">{m.product?.sku ?? '—'}</td>}
                  <td className="px-3 py-1.5 text-right font-mono">{Number(m.total_qty ?? 0).toFixed(2)}</td>
                  <td className="px-3 py-1.5 text-right font-mono font-semibold text-slate-700">{Number(m.total_cost ?? 0).toFixed(2)}</td>
                  <td className="px-3 py-1.5 text-slate-500 truncate max-w-[140px]">{m.reference ?? '—'}</td>
                  <td className="px-3 py-1.5 text-center">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      m.is_cancelled ? 'bg-red-100 text-red-700'
                      : m.status === 'posted' ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-200 text-slate-600'
                    }`}>{m.is_cancelled ? 'CANCELLED' : m.status.toUpperCase()}</span>
                  </td>
                  <td className="px-3 py-1.5 text-center" onClick={e=>e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={()=>openEdit(m)} disabled={m.is_cancelled} className={`p-1 rounded text-slate-400 ${config.accent.bgHover} disabled:opacity-30`} title="Edit"><Pencil className="w-3 h-3"/></button>
                      {config.type === 'receive_tailor' && !m.is_cancelled && (
                        <button onClick={()=>handleGenerateTailorBill(m)} className="p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50" title="Generate Tailor Bill (PI)"><FileText className="w-3 h-3"/></button>
                      )}
                      {!m.is_cancelled && <button onClick={()=>handleCancel(m)} className="p-1 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50" title="Cancel (reverse stock)"><Ban className="w-3 h-3"/></button>}
                      <button onClick={()=>handleDelete(m)} className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50" title="Delete"><Trash2 className="w-3 h-3"/></button>
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
