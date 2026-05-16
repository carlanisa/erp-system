'use client'

import { useMemo } from 'react'
import { Plus, Trash2, Printer, Download, Mail, MessageCircle } from 'lucide-react'

/* ── Types ─────────────────────────────────────────────────────────────── */
export type SizeKey = 'xs' | 's' | 'm' | 'l' | 'xl' | 'xxl' | 'xxxl' | 'xxxxl'
export const SIZES: SizeKey[] = ['xs', 's', 'm', 'l', 'xl', 'xxl', 'xxxl', 'xxxxl']
export const SIZE_LABELS: Record<SizeKey, string> = {
  xs: 'XS', s: 'S', m: 'M', l: 'L',
  xl: 'XL', xxl: '2XL', xxxl: '3XL', xxxxl: '4XL',
}

export type CuttingFormat = 'simple' | 'production' | 'detailed'

export type CuttingPiece = { name: string; length: number; pcs: number }

export type CuttingRow = {
  id: string
  kod: string                           // ITEM column — product name e.g. "Cotton Plain"
  swatch_color: string                  // hex for colour swatch
  color_name: string                    // e.g. WINE RED
  pcs: Record<SizeKey, number>
  total_meter?: number                  // total fabric sent (e.g. 20m)
  total_pcs?: number                    // optional manual override
  avg_per_piece?: number                // m per single piece (e.g. 4m / suit)
  stock_by_size?: Partial<Record<SizeKey, number>>  // existing inventory per size (so user sees what's already in stock)
  // Detailed-format extras
  top_material?: string
  bottom_material?: string
  rolls?: number
  pieces?: CuttingPiece[]
}

export type CuttingNote = { label: string; text: string }

export type CuttingHeader = {
  order_no: string
  design: string
  date: string
  tailor: string
  vendor?: string
  receive_date?: string
  delivery_date?: string
  payment_date?: string
  payment_terms?: string
  inv_no?: string
  total_rolls?: string
  product_image_url?: string
  notes?: CuttingNote[]
  prepared_by?: string
  approved_by?: string
}

export type CuttingSheetData = {
  format: CuttingFormat
  header: CuttingHeader
  rows: CuttingRow[]
}

/* ── Helpers ───────────────────────────────────────────────────────────── */
export function emptyRow(): CuttingRow {
  return {
    id: Math.random().toString(36).slice(2, 9),
    kod: '',
    swatch_color: '#cccccc',
    color_name: '',
    pcs: { xs: 0, s: 0, m: 0, l: 0, xl: 0, xxl: 0, xxxl: 0, xxxxl: 0 },
    rolls: 0,
    pieces: [],
    total_meter: 0,
    avg_per_piece: 0,
  }
}

// Estimated pieces from total fabric ÷ avg per piece (e.g. 20m ÷ 4m/suit = 5 suits).
const rowEstPieces = (r: CuttingRow) => {
  const tot = Number(r.total_meter) || 0
  const avg = Number(r.avg_per_piece) || 0
  return avg > 0 ? Math.floor(tot / avg) : 0
}

// Live balance — Total Meter minus (allocated pieces × avg per piece).
const rowBalanceMeter = (r: CuttingRow) => {
  const tot = Number(r.total_meter) || 0
  const avg = Number(r.avg_per_piece) || 0
  const allocatedPcs = SIZES.reduce((s, k) => s + (Number(r.pcs[k]) || 0), 0)
  return Math.max(0, tot - allocatedPcs * avg)
}

export function emptySheet(format: CuttingFormat = 'simple'): CuttingSheetData {
  return {
    format,
    header: {
      order_no: '', design: '', date: new Date().toISOString().slice(0, 10),
      tailor: '', notes: [], prepared_by: '', approved_by: '',
    },
    rows: [emptyRow()],
  }
}

const rowPcs = (r: CuttingRow) =>
  SIZES.reduce((s, k) => s + (Number(r.pcs[k]) || 0), 0)

const rowMeter = (r: CuttingRow) => {
  if (r.total_meter && r.total_meter > 0) return r.total_meter
  if (r.pieces && r.pieces.length) {
    return r.pieces.reduce((s, p) => s + (Number(p.length) || 0) * (Number(p.pcs) || 0), 0)
  }
  return 0
}

/* ── Main editor ───────────────────────────────────────────────────────── */
export default function CuttingSheet({
  value, onChange,
  onPrint, onEmail, onWhatsapp,
}: {
  value: CuttingSheetData
  onChange: (next: CuttingSheetData) => void
  onPrint?: () => void
  onEmail?: () => void
  onWhatsapp?: () => void
}) {
  const { format, header, rows } = value

  const totals = useMemo(() => {
    const sizeTotals: Record<SizeKey, number> = { xs: 0, s: 0, m: 0, l: 0, xl: 0, xxl: 0, xxxl: 0, xxxxl: 0 }
    let meter = 0, pcs = 0, rolls = 0
    rows.forEach(r => {
      SIZES.forEach(k => sizeTotals[k] += Number(r.pcs[k]) || 0)
      meter += rowMeter(r)
      pcs += rowPcs(r)
      rolls += Number(r.rolls) || 0
    })
    return { sizeTotals, meter, pcs, rolls }
  }, [rows])

  const setHeader = (patch: Partial<CuttingHeader>) =>
    onChange({ ...value, header: { ...header, ...patch } })

  const setRow = (id: string, patch: Partial<CuttingRow>) =>
    onChange({ ...value, rows: rows.map(r => r.id === id ? { ...r, ...patch } : r) })

  const setPcs = (id: string, k: SizeKey, n: number) =>
    setRow(id, { pcs: { ...rows.find(r => r.id === id)!.pcs, [k]: n } })

  const addRow = () => onChange({ ...value, rows: [...rows, emptyRow()] })
  const delRow = (id: string) => onChange({ ...value, rows: rows.filter(r => r.id !== id) })

  const setFormat = (f: CuttingFormat) => onChange({ ...value, format: f })

  const handlePrint = () => onPrint ? onPrint() : window.print()

  return (
    <div className="space-y-4">
      {/* ── Toolbar (hidden on print) ─────────────────────────── */}
      <div className="cs-no-print flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-white border border-slate-200 rounded-lg shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Format:</span>
          {(['simple', 'production', 'detailed'] as CuttingFormat[]).map(f => (
            <button key={f} onClick={() => setFormat(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                format === f
                  ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}>
              {f === 'simple' ? 'A · Simple' : f === 'production' ? 'B · Production Spec' : 'C · Detailed Material'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handlePrint} className="btn-outline flex items-center gap-1.5 text-xs">
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
          {onEmail && <button onClick={onEmail} className="btn-outline flex items-center gap-1.5 text-xs"><Mail className="w-3.5 h-3.5" /> Email</button>}
          {onWhatsapp && <button onClick={onWhatsapp} className="btn-outline flex items-center gap-1.5 text-xs"><MessageCircle className="w-3.5 h-3.5" /> WhatsApp</button>}
        </div>
      </div>

      {/* ── Header editor (hidden on print) ───────────────────── */}
      <div className="cs-no-print bg-white border border-slate-200 rounded-lg shadow-sm p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-3">Sheet Header</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Order No"      value={header.order_no}      onChange={v => setHeader({ order_no: v })} />
          <Field label="Design"        value={header.design}        onChange={v => setHeader({ design: v })} />
          <Field label="Date"          type="date" value={header.date} onChange={v => setHeader({ date: v })} />
          <Field label="Tailor"        value={header.tailor}        onChange={v => setHeader({ tailor: v })} />
          {format !== 'simple' && (
            <>
              <Field label="Vendor"         value={header.vendor || ''}         onChange={v => setHeader({ vendor: v })} />
              <Field label="Receive Date"   type="date" value={header.receive_date || ''}   onChange={v => setHeader({ receive_date: v })} />
              <Field label="Delivery Date"  type="date" value={header.delivery_date || ''}  onChange={v => setHeader({ delivery_date: v })} />
              <Field label="Payment Date"   type="date" value={header.payment_date || ''}   onChange={v => setHeader({ payment_date: v })} />
              <Field label="Payment Terms"  value={header.payment_terms || ''}  onChange={v => setHeader({ payment_terms: v })} placeholder="30 days after delivery"/>
              <Field label="Invoice No"     value={header.inv_no || ''}         onChange={v => setHeader({ inv_no: v })} />
              <Field label="Total Rolls"    value={header.total_rolls || ''}    onChange={v => setHeader({ total_rolls: v })} />
              <Field label="Product Image URL" value={header.product_image_url || ''} onChange={v => setHeader({ product_image_url: v })} />
            </>
          )}
          <Field label="Prepared By" value={header.prepared_by || ''} onChange={v => setHeader({ prepared_by: v })} />
          <Field label="Approved By" value={header.approved_by || ''} onChange={v => setHeader({ approved_by: v })} />
        </div>

        {format === 'production' && (
          <NotesEditor
            notes={header.notes || []}
            onChange={n => setHeader({ notes: n })}
          />
        )}
      </div>

      {/* ── Row editor (hidden on print) ──────────────────────── */}
      <div className="cs-no-print bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-slate-50">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Color Rows</div>
          <button onClick={addRow} className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent-soft)] rounded">
            <Plus className="w-3.5 h-3.5" /> Add Color
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-center w-8 px-2 py-2 text-slate-500 uppercase tracking-wide">#</th>
                <th className="text-left px-2 py-2 text-slate-500 uppercase tracking-wide w-24">ITEM</th>
                <th className="text-left px-2 py-2 text-slate-500 uppercase tracking-wide w-16">Swatch</th>
                <th className="text-left px-2 py-2 text-slate-500 uppercase tracking-wide w-32">Color Name</th>
                {format === 'detailed' && (
                  <>
                    <th className="text-left px-2 py-2 text-slate-500 uppercase tracking-wide w-40">Top Material</th>
                    <th className="text-left px-2 py-2 text-slate-500 uppercase tracking-wide w-40">Bottom Material</th>
                    <th className="text-right px-2 py-2 text-slate-500 uppercase tracking-wide w-14">Rolls</th>
                  </>
                )}
                {SIZES.map(k => (
                  <th key={k} className="text-right px-2 py-2 text-slate-500 uppercase tracking-wide w-12">{SIZE_LABELS[k]}</th>
                ))}
                <th className="text-right px-2 py-2 text-slate-500 uppercase tracking-wide w-16">Pcs</th>
                <th className="text-right px-2 py-2 text-slate-500 uppercase tracking-wide w-20">Total Meter</th>
                <th className="text-right px-2 py-2 text-slate-500 uppercase tracking-wide w-16">Avg/Pc (m)</th>
                <th className="text-right px-2 py-2 text-slate-500 uppercase tracking-wide w-16">Est Pcs</th>
                <th className="text-right px-2 py-2 text-emerald-600 uppercase tracking-wide w-20">Balance (m)</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-2 py-1.5 text-center text-slate-400">{i + 1}</td>
                  <td className="px-1 py-1.5">
                    <input value={r.kod} onChange={e => setRow(r.id, { kod: e.target.value })}
                      className="w-full px-1.5 py-1 border border-slate-200 rounded font-mono text-[11px]" />
                  </td>
                  <td className="px-1 py-1.5">
                    <input type="color" value={r.swatch_color}
                      onChange={e => setRow(r.id, { swatch_color: e.target.value })}
                      className="w-10 h-7 border border-slate-200 rounded cursor-pointer" />
                  </td>
                  <td className="px-1 py-1.5">
                    <input value={r.color_name} onChange={e => setRow(r.id, { color_name: e.target.value })}
                      className="w-full px-1.5 py-1 border border-slate-200 rounded text-[11px] uppercase" />
                  </td>
                  {format === 'detailed' && (
                    <>
                      <td className="px-1 py-1.5">
                        <input value={r.top_material || ''} onChange={e => setRow(r.id, { top_material: e.target.value })}
                          placeholder="Cotton Sulam (KJK)"
                          className="w-full px-1.5 py-1 border border-slate-200 rounded text-[11px]" />
                      </td>
                      <td className="px-1 py-1.5">
                        <input value={r.bottom_material || ''} onChange={e => setRow(r.id, { bottom_material: e.target.value })}
                          placeholder="Cotton Mix Poly (1735)"
                          className="w-full px-1.5 py-1 border border-slate-200 rounded text-[11px]" />
                      </td>
                      <td className="px-1 py-1.5">
                        <input type="number" value={r.rolls || 0}
                          onChange={e => setRow(r.id, { rolls: Number(e.target.value) || 0 })}
                          className="w-full px-1.5 py-1 border border-slate-200 rounded text-right font-mono text-[11px]" />
                      </td>
                    </>
                  )}
                  {SIZES.map(k => {
                    const stock = r.stock_by_size?.[k]
                    const stockKnown = stock !== undefined
                    return (
                      <td key={k} className="px-1 py-1.5 align-top">
                        <input type="number" value={r.pcs[k] || 0}
                          onChange={e => setPcs(r.id, k, Number(e.target.value) || 0)}
                          className="w-full px-1 py-1 border border-slate-200 rounded text-right font-mono text-[11px]" />
                        {stockKnown && (
                          <div className={`text-[9px] mt-0.5 text-center font-mono ${stock === 0 ? 'text-red-500' : stock <= 2 ? 'text-amber-600' : 'text-slate-400'}`}
                               title={`In-stock for ${SIZE_LABELS[k]}: ${stock}`}>
                            stk: {stock}
                          </div>
                        )}
                      </td>
                    )
                  })}
                  <td className="px-2 py-1.5 text-right font-mono font-semibold text-[var(--accent)]">{rowPcs(r)}</td>
                  <td className="px-2 py-1.5 text-right">
                    <input type="number" step="0.01" value={r.total_meter ?? rowMeter(r)}
                      onChange={e => setRow(r.id, { total_meter: Number(e.target.value) || 0 })}
                      className="w-full px-1 py-1 border border-slate-200 rounded text-right font-mono text-[11px]" />
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <input type="number" step="0.01" value={r.avg_per_piece ?? 0}
                      onChange={e => setRow(r.id, { avg_per_piece: Number(e.target.value) || 0 })}
                      placeholder="4" title="Meters per single piece (e.g. 4m / suit)"
                      className="w-full px-1 py-1 border border-slate-200 rounded text-right font-mono text-[11px]" />
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono font-semibold text-slate-700">{rowEstPieces(r) || '—'}</td>
                  <td className="px-2 py-1.5 text-right font-mono font-bold" style={{ color: rowBalanceMeter(r) === 0 && (r.total_meter || 0) > 0 ? '#059669' : '#0f766e' }}>{rowBalanceMeter(r).toFixed(2)}</td>
                  <td className="px-1 py-1.5 text-center">
                    <button onClick={() => delRow(r.id)} disabled={rows.length === 1}
                      className="text-slate-400 hover:text-red-600 disabled:opacity-30">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 border-t-2 border-slate-300">
              <tr>
                <td colSpan={format === 'detailed' ? 7 : 4} className="px-2 py-2 text-right text-[11px] uppercase font-semibold text-slate-600">Total</td>
                {SIZES.map(k => (
                  <td key={k} className="px-2 py-2 text-right font-mono font-bold text-slate-700">{totals.sizeTotals[k]}</td>
                ))}
                <td className="px-2 py-2 text-right font-mono font-bold text-[var(--accent)]">{totals.pcs}</td>
                <td className="px-2 py-2 text-right font-mono font-bold text-slate-700">{totals.meter.toFixed(2)}</td>
                <td />
                <td className="px-2 py-2 text-right font-mono font-bold text-slate-700">{rows.reduce((s, r) => s + rowEstPieces(r), 0)}</td>
                <td className="px-2 py-2 text-right font-mono font-bold text-emerald-700">{rows.reduce((s, r) => s + rowBalanceMeter(r), 0).toFixed(2)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── Live preview / print sheet ────────────────────────── */}
      <div className="cs-print-area bg-white border border-slate-200 rounded-lg shadow-sm">
        {format === 'simple'     && <SimpleSheet     header={header} rows={rows} totals={totals} />}
        {format === 'production' && <ProductionSheet header={header} rows={rows} totals={totals} />}
        {format === 'detailed'   && <DetailedSheet   header={header} rows={rows} totals={totals} />}
      </div>

      {/* Per-page print isolation: hide everything except .cs-print-area when printing this component. */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden !important; }
          .cs-print-area, .cs-print-area * { visibility: visible !important; }
          .cs-print-area {
            position: absolute !important;
            inset: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
          }
          .cs-no-print { display: none !important; }
          @page { size: A4 landscape; margin: 10mm; }
        }
      `}</style>
    </div>
  )
}

/* ── Format A · Simple (CARLANISA-style) ───────────────────────────────── */
function SimpleSheet({ header, rows, totals }: { header: CuttingHeader; rows: CuttingRow[]; totals: any }) {
  return (
    <div className="p-8 font-sans" style={{ color: '#1a1a1a' }}>
      <div className="grid grid-cols-2 mb-6">
        <div className="space-y-1 text-sm">
          <HeaderLine label="ORDER NO" value={header.order_no} />
          <HeaderLine label="DESIGN"   value={header.design} />
          <HeaderLine label="DATE"     value={header.date} />
          <HeaderLine label="TAILOR"   value={header.tailor} />
        </div>
        <div className="text-right">
          <div className="text-xl font-extrabold tracking-[0.25em] text-slate-800">CUTTING SHEET</div>
          <div className="text-[11px] text-slate-400 uppercase tracking-widest mt-1">Production · {header.date}</div>
        </div>
      </div>

      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr className="bg-slate-100">
            <th className="border border-slate-400 px-2 py-2 text-left">Swatch</th>
            <th className="border border-slate-400 px-2 py-2 text-left">Color Name</th>
            {SIZES.map(k => <th key={k} className="border border-slate-400 px-2 py-2 text-center">{SIZE_LABELS[k]}</th>)}
            <th className="border border-slate-400 px-2 py-2 text-center">Total Meter</th>
            <th className="border border-slate-400 px-2 py-2 text-center">Total Pcs</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id}>
              <td className="border border-slate-400 px-2 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded border border-slate-300" style={{ background: r.swatch_color }} />
                  <span className="font-mono text-[11px] text-slate-500">{r.kod}</span>
                </div>
              </td>
              <td className="border border-slate-400 px-2 py-3 font-semibold uppercase">{r.color_name}</td>
              {SIZES.map(k => (
                <td key={k} className="border border-slate-400 px-2 py-3 text-center font-mono">{r.pcs[k] || ''}</td>
              ))}
              <td className="border border-slate-400 px-2 py-3 text-center font-mono">{rowMeter(r) ? rowMeter(r).toFixed(2) : ''}</td>
              <td className="border border-slate-400 px-2 py-3 text-center font-mono font-bold">{rowPcs(r) || ''}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-slate-50">
            <td colSpan={2} className="border border-slate-400 px-2 py-2 text-right font-bold">TOTAL</td>
            {SIZES.map(k => <td key={k} className="border border-slate-400 px-2 py-2 text-center font-mono font-bold">{totals.sizeTotals[k] || ''}</td>)}
            <td className="border border-slate-400 px-2 py-2 text-center font-mono font-bold">{totals.meter ? totals.meter.toFixed(2) : ''}</td>
            <td className="border border-slate-400 px-2 py-2 text-center font-mono font-bold text-base">{totals.pcs || ''}</td>
          </tr>
        </tfoot>
      </table>

      <div className="mt-12 grid grid-cols-2 text-xs">
        <div>
          <div className="border-t border-slate-400 pt-2 inline-block min-w-[200px]">
            <span className="font-semibold tracking-wide">PREPARED BY:</span> {header.prepared_by || ''}
          </div>
        </div>
        <div className="text-right">
          <div className="border-t border-slate-400 pt-2 inline-block min-w-[200px]">
            <span className="font-semibold tracking-wide">APPROVED BY:</span> {header.approved_by || ''}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Format B · Production Spec (with image + design notes) ────────────── */
function ProductionSheet({ header, rows, totals }: { header: CuttingHeader; rows: CuttingRow[]; totals: any }) {
  return (
    <div className="p-8 font-sans" style={{ color: '#1a1a1a' }}>
      <div className="border-b-2 border-slate-800 pb-3 mb-5 grid grid-cols-3 gap-4 items-start">
        <div className="space-y-0.5 text-[12px]">
          <div><span className="font-semibold w-32 inline-block">NO PO</span>: {header.order_no}</div>
          <div><span className="font-semibold w-32 inline-block">RECEIVE DATE</span>: {header.receive_date || header.date}</div>
          <div><span className="font-semibold w-32 inline-block">VENDOR</span>: {header.vendor || header.tailor}</div>
          <div><span className="font-semibold w-32 inline-block">DELIVERY DATE</span>: {header.delivery_date || ''}</div>
          <div><span className="font-semibold w-32 inline-block">PAYMENT DATE</span>: {header.payment_date || ''}</div>
          {header.payment_terms && <div className="text-[10px] text-slate-500 italic">({header.payment_terms})</div>}
        </div>
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-widest text-slate-400">RECEIVE STOCK MATERIAL & PRODUCTION</div>
        </div>
        <div className="text-right">
          <div className="inline-block border border-slate-400 px-3 py-1.5">
            <div className="text-[10px] tracking-widest uppercase text-slate-500">PO NO</div>
            <div className="text-base font-bold font-mono">{header.order_no}</div>
          </div>
          <div className="mt-2 text-[11px] space-y-0.5">
            <div>ROLL : <span className="font-bold font-mono">{header.total_rolls || totals.rolls || ''}</span></div>
            <div>INV : <span className="font-bold font-mono">{header.inv_no || ''}</span></div>
          </div>
        </div>
      </div>

      <div className="text-center mb-6">
        <h1 className="text-3xl font-extrabold tracking-[0.15em] uppercase" style={{ color: '#1a1a1a' }}>{header.design || 'DESIGN NAME'}</h1>
      </div>

      <div className="grid grid-cols-12 gap-4 mb-6">
        <div className="col-span-5">
          {header.product_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={header.product_image_url} alt={header.design}
                 className="w-full max-h-[420px] object-contain border border-slate-200 rounded" />
          ) : (
            <div className="w-full h-[360px] border-2 border-dashed border-slate-300 rounded flex items-center justify-center text-slate-400 text-sm italic">
              Product Image (paste URL in header)
            </div>
          )}
        </div>
        <div className="col-span-7 grid grid-cols-2 gap-3 content-start">
          {(header.notes && header.notes.length > 0 ? header.notes : []).map((n, i) => (
            <div key={i} className="border border-slate-200 rounded p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Detail {i + 1}</div>
              <div className="text-sm font-bold uppercase mb-1">{n.label}</div>
              <div className="text-[12px] text-slate-700 leading-snug">{n.text}</div>
            </div>
          ))}
          {(!header.notes || header.notes.length === 0) && (
            <div className="col-span-2 text-center text-slate-400 italic text-sm py-6">
              Add design notes (BAHU, LEHER, KAIN LIPAT etc.) in the header section
            </div>
          )}
        </div>
      </div>

      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="bg-slate-100">
            <th className="border border-slate-400 px-2 py-2 text-left">ITEM</th>
            <th className="border border-slate-400 px-2 py-2 text-left">Color</th>
            {SIZES.map(k => <th key={k} className="border border-slate-400 px-2 py-2 text-center">{SIZE_LABELS[k]}</th>)}
            <th className="border border-slate-400 px-2 py-2 text-center">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id}>
              <td className="border border-slate-400 px-2 py-2 font-mono">{r.kod}</td>
              <td className="border border-slate-400 px-2 py-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded border border-slate-300" style={{ background: r.swatch_color }} />
                  <span className="font-semibold uppercase">{r.color_name}</span>
                </div>
              </td>
              {SIZES.map(k => (
                <td key={k} className="border border-slate-400 px-2 py-2 text-center font-mono">{r.pcs[k] || ''}</td>
              ))}
              <td className="border border-slate-400 px-2 py-2 text-center font-mono font-bold">{rowPcs(r) || ''}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-slate-50">
            <td colSpan={2} className="border border-slate-400 px-2 py-2 text-right font-bold">TOTAL</td>
            {SIZES.map(k => <td key={k} className="border border-slate-400 px-2 py-2 text-center font-mono font-bold">{totals.sizeTotals[k] || ''}</td>)}
            <td className="border border-slate-400 px-2 py-2 text-center font-mono font-bold">{totals.pcs || ''}</td>
          </tr>
        </tfoot>
      </table>

      <div className="mt-10 grid grid-cols-2 text-xs">
        <div className="border-t border-slate-400 pt-2"><span className="font-semibold tracking-wide">PREPARED BY:</span> {header.prepared_by || ''}</div>
        <div className="text-right border-t border-slate-400 pt-2"><span className="font-semibold tracking-wide">APPROVED BY:</span> {header.approved_by || ''}</div>
      </div>
    </div>
  )
}

/* ── Format C · Detailed Material (COLOR-BLAST style) ─────────────────── */
function DetailedSheet({ header, rows, totals }: { header: CuttingHeader; rows: CuttingRow[]; totals: any }) {
  return (
    <div className="p-6 font-sans text-[10px]" style={{ color: '#1a1a1a' }}>
      <div className="border-b border-slate-800 pb-2 mb-3 grid grid-cols-3 gap-3 items-start">
        <div className="space-y-0.5 text-[10px]">
          <div><span className="font-semibold w-28 inline-block">RECEIVE DATE</span>: {header.receive_date || header.date}</div>
          <div><span className="font-semibold w-28 inline-block">VENDOR</span>: {header.vendor || header.tailor}</div>
          <div><span className="font-semibold w-28 inline-block">DELIVERY DATE</span>: {header.delivery_date || ''}</div>
          <div><span className="font-semibold w-28 inline-block">PAYMENT DATE</span>: {header.payment_date || ''}</div>
          {header.payment_terms && <div className="italic text-slate-500">({header.payment_terms})</div>}
        </div>
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">RECEIVE STOCK MATERIAL & PRODUCTION</div>
          <div className="text-xl font-extrabold tracking-[0.15em] uppercase">{header.design}</div>
        </div>
        <div className="text-right text-[10px]">
          {header.product_image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={header.product_image_url} alt="" className="inline-block h-16 object-contain border border-slate-200 rounded" />
          )}
        </div>
      </div>

      <table className="w-full border-collapse text-[10px]">
        <thead>
          <tr className="bg-slate-100">
            <th className="border border-slate-400 px-1.5 py-1.5 w-[100px] text-left">ITEM &<br />Colour No</th>
            <th className="border border-slate-400 px-1.5 py-1.5 w-[80px] text-left">Colour</th>
            <th className="border border-slate-400 px-1.5 py-1.5 w-[180px] text-center">MATERIAL</th>
            <th className="border border-slate-400 px-1.5 py-1.5 w-[28px] text-center">No</th>
            <th className="border border-slate-400 px-1.5 py-1.5 w-[60px] text-center">Length<br />(Meter)</th>
            <th className="border border-slate-400 px-1.5 py-1.5 w-[28px] text-center">QTY<br />(pcs)</th>
            <th className="border border-slate-400 px-1.5 py-1.5 w-[40px] text-center">Roll</th>
            {SIZES.map(k => <th key={k} className="border border-slate-400 px-1 py-1.5 w-[34px] text-center">{SIZE_LABELS[k]}</th>)}
            <th className="border border-slate-400 px-1.5 py-1.5 w-[42px] text-center">Total</th>
          </tr>
        </thead>
        {rows.map(r => {
          const piecesOrDefault: CuttingPiece[] = r.pieces && r.pieces.length
            ? r.pieces
            : [{ name: 'BAJU', length: 0, pcs: 0 }, { name: 'KAIN', length: 0, pcs: 0 }]
          const padded = [...piecesOrDefault, ...Array.from({ length: Math.max(0, 9 - piecesOrDefault.length) }, () => ({ name: '', length: 0, pcs: 0 }))]
          const fabricLengthTotal = piecesOrDefault.reduce((s, p) => s + (Number(p.length) || 0) * (Number(p.pcs) || 0), 0)
          const piecesTotal = piecesOrDefault.reduce((s, p) => s + (Number(p.pcs) || 0), 0)
          return (
            <tbody key={r.id} className="border-b-2 border-slate-400">
              {padded.map((p, idx) => (
                <tr key={idx}>
                  {idx === 0 && (
                    <>
                      <td className="border border-slate-400 px-1.5 py-1 align-middle font-mono text-center" rowSpan={padded.length + 1}>
                        {r.kod}
                      </td>
                      <td className="border border-slate-400 px-1.5 py-1 align-middle text-center font-semibold uppercase" rowSpan={padded.length + 1}>
                        <div className="w-8 h-8 mx-auto mb-1 rounded border border-slate-300" style={{ background: r.swatch_color }} />
                        {r.color_name}
                      </td>
                      <td className="border border-slate-400 px-1.5 py-1 text-center text-[9px]" rowSpan={padded.length + 1}>
                        <div className="text-slate-500 mb-1">
                          Top : <span className="font-semibold">{r.top_material || '—'}</span>
                        </div>
                        <div className="text-slate-500">
                          Bottom : <span className="font-semibold">{r.bottom_material || '—'}</span>
                        </div>
                      </td>
                    </>
                  )}
                  <td className="border border-slate-400 px-1 py-1 text-center font-mono text-slate-400">{idx + 1}</td>
                  <td className="border border-slate-400 px-1.5 py-1 font-semibold uppercase">{p.name}</td>
                  <td className="border border-slate-400 px-1 py-1 text-center font-mono">{p.length || ''}</td>
                  <td className="border border-slate-400 px-1 py-1 text-center font-mono">{p.pcs || ''}</td>
                  {idx === 0 && (
                    <>
                      <td className="border border-slate-400 px-1 py-1 text-center align-middle font-mono font-bold" rowSpan={padded.length + 1}>{r.rolls || ''}</td>
                      {SIZES.map(k => (
                        <td key={k} className="border border-slate-400 px-1 py-1 text-center align-middle font-mono" rowSpan={padded.length + 1}>{r.pcs[k] || ''}</td>
                      ))}
                      <td className="border border-slate-400 px-1 py-1 text-center align-middle font-mono font-bold" rowSpan={padded.length + 1}>{rowPcs(r) || ''}</td>
                    </>
                  )}
                </tr>
              ))}
              <tr className="bg-slate-50">
                <td colSpan={3} className="border border-slate-400 px-1.5 py-1 text-right font-bold uppercase">Total</td>
                <td className="border border-slate-400 px-1 py-1 text-center font-mono font-bold">{fabricLengthTotal || ''}</td>
                <td className="border border-slate-400 px-1 py-1 text-center font-mono font-bold">{piecesTotal || ''}</td>
              </tr>
            </tbody>
          )
        })}
        <tfoot>
          <tr className="bg-slate-100">
            <td colSpan={3} className="border border-slate-400 px-1.5 py-1.5 text-right font-bold uppercase text-[11px]">GRAND TOTAL</td>
            <td className="border border-slate-400 px-1 py-1.5 text-center font-mono font-bold text-red-700">{totals.meter ? totals.meter.toFixed(0) : ''}</td>
            <td className="border border-slate-400 px-1 py-1.5 text-center font-mono font-bold text-red-700">
              {rows.reduce((s, r) => s + (r.pieces?.reduce((a, p) => a + (Number(p.pcs) || 0), 0) || 0), 0) || ''}
            </td>
            <td className="border border-slate-400 px-1 py-1.5 text-center font-mono font-bold">{totals.rolls || ''}</td>
            {SIZES.map(k => <td key={k} className="border border-slate-400 px-1 py-1.5 text-center font-mono font-bold">{totals.sizeTotals[k] || ''}</td>)}
            <td className="border border-slate-400 px-1 py-1.5 text-center font-mono font-bold text-[11px]">{totals.pcs || ''}</td>
          </tr>
        </tfoot>
      </table>

      <div className="mt-6 grid grid-cols-2 text-[10px]">
        <div className="border-t border-slate-400 pt-1"><span className="font-semibold tracking-wide">PREPARED BY:</span> {header.prepared_by || ''}</div>
        <div className="text-right border-t border-slate-400 pt-1"><span className="font-semibold tracking-wide">DATE:</span> {header.date}</div>
      </div>
    </div>
  )
}

/* ── Field helpers ─────────────────────────────────────────────────────── */
function Field({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string
}) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-wide text-slate-500 mb-1">{label}</span>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-[var(--accent)]" />
    </label>
  )
}

function HeaderLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center text-sm">
      <span className="font-bold w-24 tracking-wide">{label}</span>
      <span className="mx-1">-</span>
      <span className="border-b border-dotted border-slate-400 flex-1 px-2 py-0.5 min-h-[1.4em]">{value}</span>
    </div>
  )
}

function NotesEditor({ notes, onChange }: { notes: CuttingNote[]; onChange: (n: CuttingNote[]) => void }) {
  return (
    <div className="mt-4 border-t border-slate-100 pt-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Design Notes (callouts)</div>
        <button onClick={() => onChange([...notes, { label: '', text: '' }])}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent-soft)] rounded">
          <Plus className="w-3.5 h-3.5" /> Add Note
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {notes.map((n, i) => (
          <div key={i} className="flex items-start gap-2 border border-slate-200 rounded p-2">
            <div className="flex-1 space-y-1">
              <input value={n.label} onChange={e => onChange(notes.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                placeholder="LABEL (e.g. BAHU SEPERTI BIASA)"
                className="w-full px-2 py-1 text-xs border border-slate-200 rounded font-semibold uppercase" />
              <textarea value={n.text} onChange={e => onChange(notes.map((x, j) => j === i ? { ...x, text: e.target.value } : x))}
                placeholder="Description..." rows={2}
                className="w-full px-2 py-1 text-xs border border-slate-200 rounded" />
            </div>
            <button onClick={() => onChange(notes.filter((_, j) => j !== i))}
              className="text-slate-400 hover:text-red-600 p-1">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {notes.length === 0 && <div className="col-span-2 text-center text-slate-400 italic text-xs py-3">No design notes yet</div>}
      </div>
    </div>
  )
}
