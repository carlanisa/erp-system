'use client'

// Inline BOM editor panel — used inside Master Setup (/inventory/setup) so users don't have
// to navigate away to a separate /inventory/bom page. Self-contained: fetches products + items,
// holds its own form state, calls the backend, then signals parent via `onClose`/`onSaved`.

import { useEffect, useMemo, useState } from 'react'
import {
  GitBranch, Plus, Trash2, X, Loader2, Save, FilePlus, ChevronUp, ChevronDown,
} from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

type Product   = { id: number; sku: string; name: string; uom?: string }
type StockItem = { id: number; item_code: string; name: string; uom: string; color?: string|null; size?: string|null; unit_cost?: number }
type LineKind  = 'material' | 'tailor_service' | 'overhead'

type BomLineForm = {
  kind:          LineKind
  stock_item_id: number | ''
  service_name:  string
  qty:           string
  uom:           string
  unit_cost:     string
  notes:         string
}

type BomShape = {
  id: number
  bom_number?: string
  bom_code?: string
  product_id: number
  product?: Product | null
  version?: number
  is_active: boolean
  output_qty?: number
  output_uom?: string
  notes?: string | null
  lines?: Array<{
    id: number
    kind: LineKind
    stock_item_id: number | null
    service_name: string | null
    qty: number
    uom: string | null
    unit_cost: number
    notes: string | null
  }>
}

const newLine = (kind: LineKind = 'material'): BomLineForm => ({
  kind, stock_item_id: '', service_name: '', qty: '', uom: '', unit_cost: '', notes: '',
})

export default function BomEditorPanel({
  bomId,
  onClose,
  onSaved,
}: {
  bomId: number | 'new'
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = bomId !== 'new'

  const [bom, setBom] = useState<BomShape | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [items, setItems]       = useState<StockItem[]>([])
  const [loading, setLoading]   = useState(isEdit)
  const [saving, setSaving]     = useState(false)

  const [productId, setProductId] = useState<string>('')
  const [version, setVersion]     = useState<string>('1')
  const [isActive, setIsActive]   = useState<boolean>(true)
  const [outputQty, setOutputQty] = useState<string>('1')
  const [outputUom, setOutputUom] = useState<string>('PCS')
  const [notes, setNotes]         = useState<string>('')
  const [lines, setLines]         = useState<BomLineForm[]>([newLine()])

  // Load options (products + stock items) once
  useEffect(() => {
    // Apparel products — these are the *output* of BOMs
    api.get('/inventory/products', { params: { per_page: 500, product_type: 'apparel' } })
      .then(r => setProducts(r.data.data ?? [])).catch(() => {})
    api.get('/inventory/stock-items/flat')
      .then(r => setItems(r.data.data ?? [])).catch(() => {})
  }, [])

  // If editing, load the BOM by id
  useEffect(() => {
    if (bomId === 'new') return
    setLoading(true)
    api.get(`/inventory/boms/${bomId}`).then(r => {
      const b: BomShape = r.data.data ?? r.data
      setBom(b)
      setProductId(String(b.product_id ?? ''))
      setVersion(String(b.version ?? 1))
      setIsActive(!!b.is_active)
      setOutputQty(String(b.output_qty ?? 1))
      setOutputUom(b.output_uom ?? 'PCS')
      setNotes(b.notes ?? '')
      const ls = b.lines ?? []
      setLines(ls.length ? ls.map(l => ({
        kind:          l.kind ?? 'material',
        stock_item_id: l.stock_item_id ?? '',
        service_name:  l.service_name ?? '',
        qty:           String(l.qty),
        uom:           l.uom ?? '',
        unit_cost:     String(l.unit_cost ?? 0),
        notes:         l.notes ?? '',
      })) : [newLine()])
    }).catch(() => toast.error('Failed to load BOM'))
      .finally(() => setLoading(false))
  }, [bomId])

  const itemMap = useMemo(() => Object.fromEntries(items.map(i => [i.id, i])), [items])

  function setLine(idx: number, patch: Partial<BomLineForm>) {
    setLines(rows => rows.map((r, i) => i === idx ? { ...r, ...patch } : r))
  }
  function removeLine(idx: number) {
    setLines(rows => rows.length > 1 ? rows.filter((_, i) => i !== idx) : rows)
  }
  function moveLine(idx: number, delta: -1 | 1) {
    setLines(rows => {
      const j = idx + delta
      if (j < 0 || j >= rows.length) return rows
      const copy = [...rows]; const t = copy[idx]; copy[idx] = copy[j]; copy[j] = t
      return copy
    })
  }
  function pickItem(idx: number, stockItemId: string) {
    const id = stockItemId ? Number(stockItemId) : ''
    const itm = id ? itemMap[id] : null
    setLine(idx, { stock_item_id: id as any, uom: itm?.uom ?? '', unit_cost: itm?.unit_cost ? String(itm.unit_cost) : '' })
  }
  function setLineKind(idx: number, kind: LineKind) {
    setLines(rows => rows.map((r, i) => i === idx ? {
      ...r,
      kind,
      stock_item_id: kind === 'material' ? r.stock_item_id : '',
      service_name:  kind === 'material' ? '' : r.service_name,
      uom:           kind === 'material' ? r.uom : (r.uom || 'PCS'),
    } : r))
  }

  const lineCostFor = (l: BomLineForm): number => {
    const qty = parseFloat(l.qty) || 0
    if (l.kind === 'material') {
      const itm = l.stock_item_id ? itemMap[l.stock_item_id as number] : null
      return qty * Number(itm?.unit_cost ?? 0)
    }
    return qty * (parseFloat(l.unit_cost) || 0)
  }

  const breakdown = lines.reduce(
    (acc, l) => {
      const c = lineCostFor(l)
      acc[l.kind] = (acc[l.kind] ?? 0) + c
      acc.grand += c
      return acc
    },
    { material: 0, tailor_service: 0, overhead: 0, grand: 0 } as Record<string, number>
  )

  async function handleSave() {
    if (!productId) { toast.error('Select a product'); return }
    const cleanLines = lines.filter(l => {
      if (Number(l.qty) <= 0) return false
      if (l.kind === 'material') return !!l.stock_item_id
      return !!l.service_name.trim()
    })
    if (!cleanLines.length) { toast.error('Add at least one valid line'); return }
    setSaving(true)
    const payload = {
      product_id: Number(productId),
      version:    Number(version) || undefined,
      is_active:  isActive,
      output_qty: parseFloat(outputQty) || 1,
      output_uom: outputUom || 'PCS',
      notes:      notes || null,
      lines: cleanLines.map(l => ({
        kind:          l.kind,
        stock_item_id: l.kind === 'material' ? Number(l.stock_item_id) : null,
        service_name:  l.kind === 'material' ? null : l.service_name,
        qty:           parseFloat(l.qty),
        uom:           l.uom || null,
        unit_cost:     parseFloat(l.unit_cost) || 0,
        notes:         l.notes || null,
      })),
    }
    try {
      if (isEdit) await api.put(`/inventory/boms/${bomId}`, payload)
      else        await api.post('/inventory/boms', payload)
      toast.success(isEdit ? 'BOM updated' : 'BOM created')
      onSaved()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Save failed')
    } finally { setSaving(false) }
  }

  if (loading) return (
    <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400">
      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2"/> Loading BOM…
    </div>
  )

  return (
    <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-amber-50/40">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-amber-700"/>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              {isEdit ? `Edit BOM ${bom?.bom_number || bom?.bom_code || ''}` : 'New Bill of Material'}
            </h3>
            <p className="text-[11px] text-slate-500">Recipe per finished product — material + stitching + overhead</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-xs font-bold rounded hover:bg-amber-700 disabled:opacity-60">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Save className="w-3.5 h-3.5"/>}
            Save BOM
          </button>
          <button onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-500 text-white text-xs font-medium rounded hover:bg-slate-600">
            <X className="w-3.5 h-3.5"/> Close
          </button>
        </div>
      </div>

      {/* Header form */}
      <div className="border-b border-slate-100 px-4 py-3 grid grid-cols-12 gap-3">
        <div className="col-span-6">
          <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">Product (Finished Good) <span className="text-red-500">*</span></label>
          <select value={productId} onChange={e=>setProductId(e.target.value)}
            className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white">
            <option value="">— Select product —</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">Version</label>
          <input type="number" min="1" value={version} onChange={e=>setVersion(e.target.value)}
            className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded text-right font-mono"/>
        </div>
        <div className="col-span-2">
          <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">Output Qty</label>
          <input type="number" step="0.001" value={outputQty} onChange={e=>setOutputQty(e.target.value)}
            className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded text-right font-mono"/>
        </div>
        <div className="col-span-2">
          <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">Output UOM</label>
          <input value={outputUom} onChange={e=>setOutputUom(e.target.value.toUpperCase())}
            className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded font-mono uppercase"/>
        </div>
        <div className="col-span-9">
          <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">Notes</label>
          <input value={notes} onChange={e=>setNotes(e.target.value)}
            placeholder="Recipe instructions / variations..."
            className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded"/>
        </div>
        <div className="col-span-3">
          <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">Active BOM</label>
          <select value={isActive ? '1' : '0'} onChange={e=>setIsActive(e.target.value === '1')}
            className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white">
            <option value="1">Active (default for product)</option>
            <option value="0">Inactive</option>
          </select>
        </div>
      </div>

      {/* Lines */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Recipe Lines (Material + Tailor Service + Overhead)</h4>
          <div className="flex gap-1">
            <button onClick={() => setLines(r => [...r, newLine('material')])}
              className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded hover:bg-blue-100">
              <Plus className="w-3 h-3"/> Material
            </button>
            <button onClick={() => setLines(r => [...r, newLine('tailor_service')])}
              className="flex items-center gap-1 px-2.5 py-1 bg-fuchsia-50 text-fuchsia-700 text-xs font-medium rounded hover:bg-fuchsia-100">
              <Plus className="w-3 h-3"/> Tailor Service
            </button>
            <button onClick={() => setLines(r => [...r, newLine('overhead')])}
              className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded hover:bg-amber-100">
              <Plus className="w-3 h-3"/> Overhead
            </button>
          </div>
        </div>

        <div className="border border-slate-200 rounded overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-slate-100">
              <tr>
                <th className="text-center w-8 px-2 py-1.5 text-[10px] uppercase">#</th>
                <th className="text-left px-3 py-1.5 text-[11px] uppercase w-32">Kind</th>
                <th className="text-left px-3 py-1.5 text-[11px] uppercase">Item / Service</th>
                <th className="text-right px-3 py-1.5 text-[11px] uppercase w-24">Qty</th>
                <th className="text-left px-3 py-1.5 text-[11px] uppercase w-20">UOM</th>
                <th className="text-right px-3 py-1.5 text-[11px] uppercase w-28">Unit Cost</th>
                <th className="text-right px-3 py-1.5 text-[11px] uppercase w-28">Line Cost</th>
                <th className="text-center px-2 py-1.5 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => {
                const itm = l.kind === 'material' && l.stock_item_id ? itemMap[l.stock_item_id as number] : null
                const itmCost = Number(itm?.unit_cost ?? 0)
                const unitCost = l.kind === 'material' ? itmCost : (parseFloat(l.unit_cost) || 0)
                const lineCost = (parseFloat(l.qty) || 0) * unitCost
                const kindBg = l.kind === 'material' ? 'bg-blue-50 text-blue-700'
                             : l.kind === 'tailor_service' ? 'bg-fuchsia-50 text-fuchsia-700'
                             : 'bg-amber-50 text-amber-700'
                return (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="text-center text-slate-400 px-2 py-1">{i + 1}</td>
                    <td className="px-2 py-1">
                      <select value={l.kind} onChange={e=>setLineKind(i, e.target.value as LineKind)}
                        className={`w-full px-2 py-1 text-[10px] font-bold uppercase border border-slate-200 rounded ${kindBg}`}>
                        <option value="material">Material</option>
                        <option value="tailor_service">Tailor</option>
                        <option value="overhead">Overhead</option>
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      {l.kind === 'material' ? (
                        <select value={l.stock_item_id || ''} onChange={e=>pickItem(i, e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded bg-white">
                          <option value="">— Select stock item —</option>
                          {items.map(it => (
                            <option key={it.id} value={it.id}>
                              {it.item_code} — {it.name}{it.color ? ` (${it.color})` : ''}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input value={l.service_name} onChange={e=>setLine(i, { service_name: e.target.value })}
                          placeholder={l.kind === 'tailor_service' ? 'e.g. Stitching, Embroidery' : 'e.g. Packing, Hanger, Tag'}
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded"/>
                      )}
                    </td>
                    <td className="px-1 py-1">
                      <input type="number" step="0.001" value={l.qty} onChange={e=>setLine(i, { qty: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded text-right font-mono"/>
                    </td>
                    <td className="px-1 py-1">
                      <input value={l.uom} onChange={e=>setLine(i, { uom: e.target.value.toUpperCase() })}
                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded font-mono uppercase"/>
                    </td>
                    <td className="px-1 py-1">
                      {l.kind === 'material' ? (
                        <div className="px-2 py-1 text-right font-mono text-slate-500 text-xs">{itmCost.toFixed(2)}</div>
                      ) : (
                        <input type="number" step="0.01" value={l.unit_cost} onChange={e=>setLine(i, { unit_cost: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded text-right font-mono"/>
                      )}
                    </td>
                    <td className="px-2 py-1 text-right font-mono font-semibold text-slate-700">{lineCost.toFixed(2)}</td>
                    <td className="px-1 py-1 text-center">
                      <div className="flex justify-center gap-0.5">
                        <button onClick={()=>moveLine(i, -1)} className="p-0.5 text-slate-400 hover:text-amber-600"><ChevronUp className="w-3 h-3"/></button>
                        <button onClick={()=>moveLine(i,  1)} className="p-0.5 text-slate-400 hover:text-amber-600"><ChevronDown className="w-3 h-3"/></button>
                        <button onClick={()=>removeLine(i)}    className="p-0.5 text-slate-400 hover:text-red-600"><Trash2 className="w-3 h-3"/></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-blue-50/40 border-t border-slate-200">
                <td colSpan={6} className="px-3 py-1.5 text-right text-slate-500 text-[11px] uppercase">Material:</td>
                <td className="px-3 py-1.5 text-right font-mono text-blue-700">RM {breakdown.material.toFixed(2)}</td>
                <td></td>
              </tr>
              <tr className="bg-fuchsia-50/40">
                <td colSpan={6} className="px-3 py-1.5 text-right text-slate-500 text-[11px] uppercase">Tailor Service (billed to tailor):</td>
                <td className="px-3 py-1.5 text-right font-mono text-fuchsia-700">RM {breakdown.tailor_service.toFixed(2)}</td>
                <td></td>
              </tr>
              <tr className="bg-amber-50/40">
                <td colSpan={6} className="px-3 py-1.5 text-right text-slate-500 text-[11px] uppercase">Overhead:</td>
                <td className="px-3 py-1.5 text-right font-mono text-amber-700">RM {breakdown.overhead.toFixed(2)}</td>
                <td></td>
              </tr>
              <tr className="bg-slate-700 text-white font-semibold">
                <td colSpan={6} className="px-3 py-2 text-right text-[11px] uppercase tracking-wider">Total Cost / Output:</td>
                <td className="px-3 py-2 text-right font-mono">RM {breakdown.grand.toFixed(2)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </section>
  )
}
