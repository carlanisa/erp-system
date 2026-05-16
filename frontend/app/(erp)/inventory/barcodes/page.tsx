'use client'

// Barcode print workflow:
//   1. Pick a finished product (apparel/fabric/accessory) with variants
//   2. For each variant, set qty to print (defaults to current stock)
//   3. Adjust label size (width/height mm) + barcode height + font + labels-per-row
//   4. Live preview shows the label grid as it will print
//   5. Click Print → browser dialog → labels print only (rest of UI hidden via @media print)

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft, Printer, RefreshCw, Search, Tag, Settings as SettingsIcon, Package,
} from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import JsBarcode from 'jsbarcode'

type Variant = {
  id: number
  sku: string
  barcode?: string | null
  color?: string | null
  size?: string | null
  stock?: number
  sale_price?: number
}
type Product = {
  id: number
  sku: string
  name: string
  product_type?: string
  sale_price?: number
  variants?: Variant[]
}

// Inline barcode component — renders SVG via JsBarcode
function Barcode({ value, height, fontSize, displayValue = true }: { value: string; height: number; fontSize: number; displayValue?: boolean }) {
  const ref = useRef<SVGSVGElement>(null)
  useEffect(() => {
    if (!ref.current || !value) return
    try {
      JsBarcode(ref.current, value, {
        format: 'CODE128',
        height,
        fontSize,
        displayValue,
        textAlign: 'center',   // center the SKU text under the bars
        textPosition: 'bottom',
        textMargin: 1,
        margin: 2,
        background: '#ffffff',
        lineColor: '#000000',
      })
    } catch {
      // invalid value — render empty SVG
    }
  }, [value, height, fontSize, displayValue])
  // display: block + margin auto so the SVG itself centers within the label box
  return <svg ref={ref} style={{ display: 'block', margin: '0 auto', maxWidth: '100%' }} />
}

export default function BarcodePrintPage() {
  const router = useRouter()
  const sp = useSearchParams()
  const initialProductId = sp.get('productId') || ''

  // ── State ──
  const [products, setProducts]       = useState<Product[]>([])
  const [productId, setProductId]     = useState(initialProductId)
  const [productSearch, setSearch]    = useState('')
  const [loadingProducts, setLoading] = useState(true)
  const [qtyByVariant, setQty]        = useState<Record<number, number>>({})

  // Label settings
  const [labelW, setLabelW]           = useState('50')   // mm
  const [labelH, setLabelH]           = useState('30')   // mm
  const [barcodeH, setBarcodeH]       = useState('40')   // px (SVG units)
  const [fontSize, setFontSize]       = useState('12')   // px
  const [perRow, setPerRow]           = useState('3')    // labels per row
  const [showName, setShowName]       = useState(true)
  const [showVariant, setShowVariant] = useState(true)
  const [showPrice, setShowPrice]     = useState(true)
  const [showSku, setShowSku]         = useState(false)

  // ── Load apparel + fabric + accessory products with variants (paginated) ──
  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const types = ['apparel', 'fabric', 'accessory']
        const collected: Product[] = []
        for (const t of types) {
          let page = 1
          while (page <= 6) {
            const r = await api.get('/inventory/products', { params: { per_page: 500, product_type: t, page } })
            collected.push(...(r.data?.data ?? []))
            const last = r.data?.meta?.last_page ?? 1
            if (page >= last) break
            page++
          }
        }
        // Only show products with variants (those have printable barcodes)
        setProducts(collected.filter(p => (p.variants?.length ?? 0) > 0))
      } catch { toast.error('Could not load products') } finally { setLoading(false) }
    })()
  }, [])

  const selectedProduct = useMemo(() => products.find(p => String(p.id) === productId) || null, [products, productId])
  const filteredProducts = useMemo(() => {
    if (!productSearch) return products.slice(0, 50)  // cap for perf
    const q = productSearch.toLowerCase()
    return products.filter(p => p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)).slice(0, 50)
  }, [products, productSearch])

  // Reset qty when product changes
  useEffect(() => { setQty({}) }, [productId])

  // ── Compute labels to print ──
  const labels = useMemo(() => {
    if (!selectedProduct) return [] as Array<{ variant: Variant; product: Product; idx: number }>
    const out: Array<{ variant: Variant; product: Product; idx: number }> = []
    for (const v of (selectedProduct.variants ?? [])) {
      const q = qtyByVariant[v.id] || 0
      for (let i = 0; i < q; i++) out.push({ variant: v, product: selectedProduct, idx: i + 1 })
    }
    return out
  }, [selectedProduct, qtyByVariant])

  function setAllToStock() {
    if (!selectedProduct) return
    const next: Record<number, number> = {}
    for (const v of (selectedProduct.variants ?? [])) {
      next[v.id] = Math.max(0, Math.floor(Number(v.stock ?? 0)))
    }
    setQty(next)
  }

  function setAllToValue(n: number) {
    if (!selectedProduct) return
    const next: Record<number, number> = {}
    for (const v of (selectedProduct.variants ?? [])) {
      next[v.id] = n
    }
    setQty(next)
  }

  function handlePrint() {
    if (labels.length === 0) { toast.error('Select qty for at least one variant'); return }
    window.print()
  }

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-slate-50">
      {/* ─── Header (hidden on print) ─── */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded border border-slate-200">
            <ArrowLeft className="w-3.5 h-3.5"/> Back
          </button>
          <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center">
            <Tag className="w-5 h-5 text-amber-600"/>
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800">Barcode Print</h1>
            <p className="text-xs text-slate-400">Inventory → Print product barcodes (CODE128)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Labels: <b className="text-slate-700">{labels.length}</b></span>
          <button onClick={handlePrint} disabled={labels.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-xs font-bold rounded hover:bg-amber-700 disabled:opacity-50">
            <Printer className="w-3.5 h-3.5"/> Print {labels.length || ''} labels
          </button>
        </div>
      </div>

      {/* ─── Main split: left controls / right preview ─── */}
      <div className="flex-1 overflow-hidden flex no-print">
        {/* ─── LEFT: Product picker + variant qty ─── */}
        <div className="w-[460px] border-r border-slate-200 bg-white overflow-y-auto flex flex-col">
          {/* Product picker */}
          <div className="px-4 py-3 border-b border-slate-100">
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Select Product</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"/>
              <input value={productSearch} onChange={e => setSearch(e.target.value)}
                placeholder="Search by SKU or name…"
                className="w-full pl-8 pr-2.5 py-1.5 text-sm border border-slate-200 rounded"/>
            </div>
            <div className="mt-2 max-h-48 overflow-y-auto border border-slate-100 rounded bg-slate-50/40">
              {loadingProducts ? (
                <div className="text-xs text-slate-400 italic text-center py-4">Loading products…</div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-xs text-slate-400 italic text-center py-4">No products match — products need variants</div>
              ) : filteredProducts.map(p => (
                <div key={p.id}
                  onClick={() => setProductId(String(p.id))}
                  className={`px-3 py-1.5 text-xs cursor-pointer border-b border-slate-100 hover:bg-amber-50 ${productId === String(p.id) ? 'bg-amber-100 font-semibold' : ''}`}>
                  <span className="font-mono text-amber-700">{p.sku}</span> — {p.name}
                  <span className="text-slate-400 ml-1">({p.variants?.length} variants)</span>
                </div>
              ))}
            </div>
          </div>

          {/* Variants qty selector */}
          {selectedProduct && (
            <div className="px-4 py-3 border-b border-slate-100 flex-1">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Variants & Qty to Print</label>
                <div className="flex gap-1">
                  <button onClick={() => setAllToValue(1)}
                    className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-700 rounded hover:bg-slate-200">All ×1</button>
                  <button onClick={setAllToStock}
                    className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200">Set = Stock</button>
                  <button onClick={() => setAllToValue(0)}
                    className="px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-700 rounded hover:bg-rose-200">Clear</button>
                </div>
              </div>
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-2 py-1 text-[10px] uppercase text-slate-500">SKU</th>
                    <th className="text-left px-2 py-1 text-[10px] uppercase text-slate-500">Color</th>
                    <th className="text-left px-2 py-1 text-[10px] uppercase text-slate-500">Size</th>
                    <th className="text-right px-2 py-1 text-[10px] uppercase text-slate-500">Stock</th>
                    <th className="text-right px-2 py-1 text-[10px] uppercase text-amber-700">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedProduct.variants ?? []).map(v => (
                    <tr key={v.id} className="border-t border-slate-100">
                      <td className="px-2 py-1 font-mono text-blue-700 truncate max-w-[140px]" title={v.sku}>{v.sku}</td>
                      <td className="px-2 py-1 uppercase text-slate-700">{v.color || '—'}</td>
                      <td className="px-2 py-1 font-mono">{v.size || '—'}</td>
                      <td className="px-2 py-1 text-right text-slate-500 font-mono">{v.stock ?? 0}</td>
                      <td className="px-1 py-1">
                        <input type="number" min="0" step="1"
                          value={qtyByVariant[v.id] ?? ''}
                          onChange={e => setQty(p => ({ ...p, [v.id]: Math.max(0, Number(e.target.value) || 0) }))}
                          placeholder="0"
                          className="w-16 px-1.5 py-0.5 text-xs border border-amber-200 rounded text-right font-mono focus:outline-none focus:border-amber-500"/>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ─── MIDDLE: Label settings ─── */}
        <div className="w-[320px] border-r border-slate-200 bg-white overflow-y-auto">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <SettingsIcon className="w-4 h-4 text-amber-600"/>
            <h3 className="text-sm font-bold text-slate-800">Label Settings</h3>
          </div>
          <div className="px-4 py-3 space-y-3">
            {/* Size group */}
            <div>
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Size (per label)</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">Width (mm)</label>
                  <input type="number" min="10" max="200" value={labelW} onChange={e => setLabelW(e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-slate-200 rounded text-right font-mono"/>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">Height (mm)</label>
                  <input type="number" min="10" max="200" value={labelH} onChange={e => setLabelH(e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-slate-200 rounded text-right font-mono"/>
                </div>
              </div>
            </div>

            {/* Barcode group */}
            <div>
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Barcode</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">Bar height (px)</label>
                  <input type="number" min="20" max="120" value={barcodeH} onChange={e => setBarcodeH(e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-slate-200 rounded text-right font-mono"/>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">SKU font (px)</label>
                  <input type="number" min="6" max="24" value={fontSize} onChange={e => setFontSize(e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-slate-200 rounded text-right font-mono"/>
                </div>
              </div>
            </div>

            {/* Layout */}
            <div>
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Layout</h4>
              <label className="block text-[10px] text-slate-500 mb-0.5">Labels per row</label>
              <select value={perRow} onChange={e => setPerRow(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-slate-200 rounded bg-white">
                <option value="1">1 (single column)</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
              </select>
            </div>

            {/* Show options */}
            <div>
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Show on Label</h4>
              <div className="space-y-1 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={showName} onChange={e => setShowName(e.target.checked)}/>
                  Product Name
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={showVariant} onChange={e => setShowVariant(e.target.checked)}/>
                  Variant (Color / Size)
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={showPrice} onChange={e => setShowPrice(e.target.checked)}/>
                  Price (RM)
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={showSku} onChange={e => setShowSku(e.target.checked)}/>
                  SKU label (above barcode)
                </label>
              </div>
            </div>

            {/* Quick presets */}
            <div className="pt-2 border-t border-slate-100">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Quick Presets</h4>
              <div className="grid grid-cols-2 gap-1">
                <button onClick={() => { setLabelW('40'); setLabelH('25'); setBarcodeH('30'); setFontSize('10'); setPerRow('4') }}
                  className="px-2 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 rounded">40×25 small</button>
                <button onClick={() => { setLabelW('50'); setLabelH('30'); setBarcodeH('40'); setFontSize('12'); setPerRow('3') }}
                  className="px-2 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 rounded">50×30 default</button>
                <button onClick={() => { setLabelW('70'); setLabelH('40'); setBarcodeH('50'); setFontSize('14'); setPerRow('2') }}
                  className="px-2 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 rounded">70×40 medium</button>
                <button onClick={() => { setLabelW('100'); setLabelH('50'); setBarcodeH('60'); setFontSize('16'); setPerRow('1') }}
                  className="px-2 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 rounded">100×50 large</button>
              </div>
            </div>
          </div>
        </div>

        {/* ─── RIGHT: Live preview ─── */}
        <div className="flex-1 bg-slate-100 overflow-y-auto p-4 print-area">
          <div className="bg-white rounded shadow-sm p-4 mx-auto" style={{ maxWidth: '100%' }}>
            <div className="print-grid" style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${perRow}, ${labelW}mm)`,
              gap: '4mm',
              justifyContent: 'flex-start',
            }}>
              {labels.length === 0 ? (
                <div className="col-span-full text-center text-slate-400 italic text-sm py-12 no-print">
                  <Package className="w-10 h-10 mx-auto mb-2 opacity-30"/>
                  Pick a product, set qty for variants, then click Print
                </div>
              ) : labels.map((lbl, i) => (
                <LabelBox key={i}
                  variant={lbl.variant}
                  product={lbl.product}
                  width={parseFloat(labelW)}
                  height={parseFloat(labelH)}
                  barcodeH={parseFloat(barcodeH)}
                  fontSize={parseFloat(fontSize)}
                  showName={showName}
                  showVariant={showVariant}
                  showPrice={showPrice}
                  showSku={showSku}/>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Print-only grid (no UI chrome) */}
      {labels.length > 0 && (
        <div className="print-only-area" style={{ display: 'none' }}>
          <div className="print-grid" style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${perRow}, ${labelW}mm)`,
            gap: '2mm',
          }}>
            {labels.map((lbl, i) => (
              <LabelBox key={`p-${i}`}
                variant={lbl.variant}
                product={lbl.product}
                width={parseFloat(labelW)}
                height={parseFloat(labelH)}
                barcodeH={parseFloat(barcodeH)}
                fontSize={parseFloat(fontSize)}
                showName={showName}
                showVariant={showVariant}
                showPrice={showPrice}
                showSku={showSku}/>
            ))}
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 5mm; }
          body * { visibility: hidden !important; }
          .print-only-area, .print-only-area * { visibility: visible !important; }
          .print-only-area { display: block !important; position: absolute !important; inset: 0 !important; padding: 0 !important; background: white !important; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  )
}

function LabelBox({
  variant, product, width, height, barcodeH, fontSize, showName, showVariant, showPrice, showSku,
}: {
  variant: Variant; product: Product;
  width: number; height: number; barcodeH: number; fontSize: number;
  showName: boolean; showVariant: boolean; showPrice: boolean; showSku: boolean;
}) {
  const code = variant.barcode || variant.sku
  const variantText = [variant.color, variant.size].filter(Boolean).join(' · ').toUpperCase()
  const price = Number(variant.sale_price ?? product.sale_price ?? 0)
  return (
    <div style={{
      width:  `${width}mm`,
      height: `${height}mm`,
      border: '1px dashed #cbd5e1',
      padding: '1mm 2mm',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
      boxSizing: 'border-box',
      background: 'white',
      fontFamily: 'monospace',
    }}>
      {showName && (
        <div style={{ fontSize: `${Math.max(7, fontSize - 4)}px`, fontWeight: 600, textAlign: 'center', lineHeight: 1.1, marginBottom: '0.5mm', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {product.name}
        </div>
      )}
      {showVariant && variantText && (
        <div style={{ fontSize: `${Math.max(6, fontSize - 5)}px`, color: '#475569', textAlign: 'center', marginBottom: '0.5mm' }}>
          {variantText}
        </div>
      )}
      {showSku && (
        <div style={{ fontSize: `${Math.max(7, fontSize - 4)}px`, fontWeight: 700, fontFamily: 'monospace', marginBottom: '0.5mm' }}>
          {code}
        </div>
      )}
      <div style={{ maxWidth: '100%', width: '100%', display: 'flex', justifyContent: 'center' }}>
        <Barcode value={code} height={barcodeH} fontSize={fontSize}/>
      </div>
      {showPrice && price > 0 && (
        <div style={{ fontSize: `${fontSize}px`, fontWeight: 800, marginTop: '0.5mm' }}>
          RM {price.toFixed(2)}
        </div>
      )}
    </div>
  )
}
