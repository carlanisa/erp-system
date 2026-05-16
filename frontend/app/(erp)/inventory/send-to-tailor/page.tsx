'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Send, Plus, RefreshCw, Trash2, X, Loader2, Save, Search, ArrowLeft, FilePlus,
  ChevronUp, ChevronDown, Package, Scissors, ArrowRight, FileText, CheckCircle2,
  Pencil, Banknote, GitBranch, ListOrdered, BookOpen,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import toast from 'react-hot-toast'
import CuttingSheet, { emptySheet, emptyRow as emptyCuttingRow, SIZES, SIZE_LABELS, type CuttingSheetData, type CuttingRow } from '@/components/inventory/CuttingSheet'

type Tailor    = { id:number; tailor_code:string; name:string; location_id:number|null }
type Product   = { id:number; sku:string; name:string; uom?:string }
type Location  = { id:number; code:string; name:string; type:string }
type StockItem = { id:number; item_code:string; name:string; uom:string; current_stock?:number; unit_cost?:number; color?:string|null; size?:string|null }
type Account   = { id:number; code:string; name:string; type:string }

type LineKind = 'material' | 'tailor_service' | 'overhead'
type LineForm = {
  id?:           number
  kind:          LineKind
  stock_item_id: number | ''
  account_id:    number | ''
  item_code:     string
  description:   string
  service_name:  string
  color:         string
  size:          string
  roll_count:    string
  qty:           string
  uom:           string
  unit_cost:     string
  discount:      string
  notes:         string
  avg_per_piece: string   // m per piece (e.g. "4" for 4m / suit)
}
type Receipt = {
  id: number
  date: string
  qty: number
  reference: string|null
  notes: string|null
  movement_id: number|null
  movement?: any
}
type TailorOrder = any

const newLine = (kind: LineKind = 'material'): LineForm => ({
  kind, stock_item_id: '', account_id: '',
  item_code: '', description: '', service_name: '',
  color: '', size: '', roll_count: '',
  qty: '', uom: '', unit_cost: '', discount: '', notes: '',
  avg_per_piece: '',
})

const STATUS_BADGES: Record<string, string> = {
  not_submitted:     'bg-orange-100 text-orange-700 border border-orange-300',
  draft:             'bg-emerald-100 text-emerald-700 border border-emerald-300',
  fabric_issued:     'bg-pink-100 text-pink-700 border border-pink-300',
  partial_received:  'bg-pink-100 text-pink-700 border border-pink-300',
  received:          'bg-teal-100 text-teal-700 border border-teal-300',
  billed:            'bg-blue-100 text-blue-700 border border-blue-300',
  cancelled:         'bg-red-100 text-red-700 border border-red-300',
}
const STATUS_LABELS: Record<string, string> = {
  not_submitted:     'NOT SUBMITTED',
  draft:             'ORDER SUBMITTED',
  fabric_issued:     'START RECEIVING',
  partial_received:  'START RECEIVING',
  received:          'ORDER COMPLETE',
  billed:            'ISSUED · BILLED',
  cancelled:         'CANCELLED',
}

export default function TailorOrderPage() {
  const router = useRouter()

  const [orders, setOrders] = useState<TailorOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [tailors, setTailors]     = useState<Tailor[]>([])
  const [products, setProducts]   = useState<Product[]>([])              // material-type (fabric/accessory/raw)
  const [finishedProducts, setFinishedProducts] = useState<any[]>([])    // apparel-type — Step 4 receive picker
  const [locations, setLocations] = useState<Location[]>([])
  const [items, setItems]         = useState<StockItem[]>([])
  const [accounts, setAccounts]   = useState<Account[]>([])
  const [bomDetail, setBomDetail] = useState<any|null>(null)
  const [activeStep, setActiveStep] = useState<1|2|3|4|5>(1)
  const [cuttingSheet, setCuttingSheet] = useState<CuttingSheetData>(() => emptySheet('simple'))
  const [pushPlatforms, setPushPlatforms] = useState<string[]>([])
  const { user: loggedInUser } = useAuthStore()

  // ── Bill of Material — supports 4 row types ──
  //   service          → flat RM per piece. Flows to TAILOR INVOICE.
  //   accessory_piece  → qty/pc × RM/unit (e.g. CARLANISA label, 1 × RM 0.50)
  //   accessory_length → length/use × uses/pc × RM/m, with inch ↔ cm ↔ m conversion (e.g. hanging tali 4.5" × 2)
  //   overhead         → flat RM per piece (packaging, plastic, etc.)
  type BomType = 'service' | 'accessory_piece' | 'accessory_length' | 'overhead'
  type BomEntry = {
    type:            BomType
    service:         string   // description / item name
    cost:            string   // for service/overhead — manual RM/pc
    // accessory_piece
    qty_per_piece:   string   // e.g. 1
    unit_cost:       string   // RM per unit (e.g. RM 0.50 per label)
    // accessory_length
    length_per_use:  string   // e.g. 4.5
    length_unit:     'inches' | 'cm' | 'meters'
    uses_per_piece:  string   // e.g. 2
    cost_per_meter:  string   // RM per meter
  }
  const emptyBomEntry = (type: BomType = 'service'): BomEntry => ({
    type, service: '', cost: '',
    qty_per_piece: '1', unit_cost: '',
    length_per_use: '', length_unit: 'inches', uses_per_piece: '1', cost_per_meter: '',
  })
  // Convert any length to meters (39.37" = 1m, 100cm = 1m)
  const toMeters = (n: number, u: 'inches' | 'cm' | 'meters'): number =>
    u === 'inches' ? n / 39.3701 : u === 'cm' ? n / 100 : n
  // Computed cost-per-finished-piece for a single BOM row
  const lineCostPerPiece = (b: BomEntry): number => {
    if (b.type === 'accessory_piece') {
      return (parseFloat(b.qty_per_piece) || 0) * (parseFloat(b.unit_cost) || 0)
    }
    if (b.type === 'accessory_length') {
      const len   = parseFloat(b.length_per_use) || 0
      const uses  = parseFloat(b.uses_per_piece) || 0
      const totalM = toMeters(len * uses, b.length_unit)
      return totalM * (parseFloat(b.cost_per_meter) || 0)
    }
    // service or overhead — manual
    return parseFloat(b.cost) || 0
  }
  const [bomEntries, setBomEntries] = useState<BomEntry[]>([
    { ...emptyBomEntry('service'),          service: 'STITCHING',        cost: '15' },
    { ...emptyBomEntry('accessory_piece'),  service: 'CARLANISA LABEL',  qty_per_piece: '1', unit_cost: '0.50' },
    { ...emptyBomEntry('accessory_length'), service: 'HANGING TALI',     length_per_use: '4.5', length_unit: 'inches', uses_per_piece: '2', cost_per_meter: '2.00' },
    { ...emptyBomEntry('overhead'),         service: 'PACKAGING',        cost: '1'  },
  ])

  // Per-variant received & rejected tally (Step 4) — keyed by `${kod}|${color}|${size}`
  const [receivedByVariant, setReceivedByVariant] = useState<Record<string, number>>({})
  const [rejectedByVariant, setRejectedByVariant] = useState<Record<string, number>>({})
  const [stitchDeduction, setStitchDeduction]     = useState<string>('0')   // manual RM deducted from tailor bill

  // Step 4 — Product Received workflow
  //   - Staff selects the finished product (e.g. KUNTUM BAJU KURUNG MODEN)
  //   - Per-variant scan/qty entry: keyed by variant SKU
  //   - Barcode scan input auto-increments matched variant
  //   - Return Fabric: if tailor doesn't finish all pieces, fabric goes back to warehouse
  const [receiveProductId, setReceiveProductId]   = useState<string>('')   // finished product picker
  const [byVariantSku, setByVariantSku]           = useState<Record<string, number>>({}) // received count per variant SKU
  const [scanInput, setScanInput]                 = useState('')
  const [scanFeedback, setScanFeedback]           = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)
  type FabricReturn = { item_code: string; name: string; color: string; size: string; qty: string; uom: string }
  const [returnedFabric, setReturnedFabric]       = useState<FabricReturn[]>([])

  const ONLINE_PLATFORMS = [
    { id: 'shopee_my', label: 'Shopee MY',       color: '#ee4d2d' },
    { id: 'shopee_sg', label: 'Shopee SG',       color: '#ee4d2d' },
    { id: 'tiktok_my', label: 'TikTok MY',       color: '#000000' },
    { id: 'gmc',       label: 'Google Merchant', color: '#4285f4' },
    { id: 'facebook',  label: 'Facebook',        color: '#1877f2' },
  ] as const

  const togglePlatform = (id: string) =>
    setPushPlatforms(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])

  const STEPS = [
    { n: 1 as const, label: 'Tailor + Fabric Details', icon: Send },
    { n: 2 as const, label: 'Cutting Table',           icon: Scissors },
    { n: 3 as const, label: 'Bill of Material',        icon: BookOpen },
    { n: 4 as const, label: 'Product Received',        icon: Package },
    { n: 5 as const, label: 'Generate Invoice',        icon: Banknote },
  ]

  const [mode, setMode] = useState<'list'|'edit'>('list')
  const [editing, setEditing] = useState<TailorOrder | null>(null)
  const [saving, setSaving] = useState(false)

  // form fields
  const today = new Date().toISOString().split('T')[0]
  const [orderNo, setOrderNo] = useState<string>('')
  const [dateStr, setDateStr] = useState(today)
  const [dueDate, setDueDate] = useState('')
  const [tailorId, setTailorId] = useState('')
  const [productId, setProductId] = useState('')
  const [bomId, setBomId] = useState('')
  const [fromLoc, setFromLoc] = useState('')
  const [toLoc, setToLoc] = useState('')
  const [orderQty, setOrderQty] = useState('1')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<LineForm[]>([])
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [sendMovementId, setSendMovementId] = useState<number|null>(null)
  const [billPiId, setBillPiId] = useState<number|null>(null)
  const [status, setStatus] = useState<string>('draft')
  const [receivedQty, setReceivedQty] = useState<number>(0)

  // Add-receipt mini-form
  const [recDate, setRecDate]   = useState(today)
  const [recQty, setRecQty]     = useState('')
  const [recRef, setRecRef]     = useState('')
  const [recNotes, setRecNotes] = useState('')

  const itemMap    = useMemo(() => Object.fromEntries(items.map(i => [i.id, i])), [items])
  const productMap = useMemo(() => Object.fromEntries(products.map(p => [p.id, p])), [products])
  const tailorMap  = useMemo(() => Object.fromEntries(tailors.map(t => [t.id, t])), [tailors])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/inventory/tailor-orders', { params: { search }, timeout: 15000 })
      setOrders(r.data.data ?? [])
    } catch (e: any) {
      if (e?.code !== 'ERR_CANCELED') toast.error('Could not load tailor orders — check connection')
    } finally { setLoading(false) }
  }, [search])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    api.get('/inventory/tailors/flat').then(r => setTailors(r.data.data ?? [])).catch(()=>{})
    api.get('/inventory/locations/flat').then(r => setLocations(r.data.data ?? [])).catch(()=>{})
    api.get('/accounting/accounts').then(r => setAccounts(r.data.data ?? [])).catch(()=>{})

    // Apparel products — the *output* of tailoring. Drives Step 4 "Finished Product" picker.
    // Backend caps per_page at 500 and total apparel products can be 2500+ — paginate through all
    // pages, then keep only the ones that actually have variants (those are the picker entries).
    ;(async () => {
      try {
        const collected: any[] = []
        let page = 1
        // Hard cap 10 pages = 5000 products to avoid runaway
        while (page <= 10) {
          const r = await api.get('/inventory/products', { params: { per_page: 500, product_type: 'apparel', page } })
          const rows = r.data?.data ?? []
          collected.push(...rows.filter((p: any) => (p.variants?.length ?? 0) > 0))
          const last = r.data?.meta?.last_page ?? 1
          if (page >= last) break
          page++
        }
        setFinishedProducts(collected)
      } catch {}
    })()

    // Pull Products (with variants) AND Stock Items, then merge into a single `items` list.
    // Only material-type products (fabric / accessory / raw_material) are usable as cutting material —
    // apparel products are the *output*, not the input. (Backend caps per_page at 500, total can be 2500+.)
    Promise.all([
      Promise.all([
        api.get('/inventory/products', { params: { per_page: 500, product_type: 'fabric'       } }).then(r => r.data.data ?? []).catch(() => []),
        api.get('/inventory/products', { params: { per_page: 500, product_type: 'accessory'    } }).then(r => r.data.data ?? []).catch(() => []),
        api.get('/inventory/products', { params: { per_page: 500, product_type: 'raw_material' } }).then(r => r.data.data ?? []).catch(() => []),
      ]).then(arrs => arrs.flat()),
      api.get('/inventory/stock-items/flat').then(r => r.data.data ?? []).catch(() => []),
    ]).then(([products, stockItems]) => {
      setProducts(products)
      const merged: StockItem[] = []
      // Stock items first (raw inventory)
      for (const s of stockItems) merged.push(s)
      // Then product variants — emulate StockItem shape so the existing pickers work
      for (const p of products) {
        const variants = p.variants ?? []
        if (variants.length) {
          for (const v of variants) {
            merged.push({
              id: 1_000_000 + (v.id ?? 0),    // synthetic id space to avoid collision
              item_code: v.sku || p.sku,
              name: p.name,
              uom: p.uom || 'UNIT',
              current_stock: Number(v.stock ?? 0),
              unit_cost: Number(v.cost_price ?? p.cost_price ?? 0),
              color: v.color || null,
              size: v.size || null,
            } as StockItem)
          }
        } else {
          merged.push({
            id: 2_000_000 + (p.id ?? 0),
            item_code: p.sku,
            name: p.name,
            uom: p.uom || 'UNIT',
            current_stock: Number(p.stock ?? 0),
            unit_cost: Number(p.cost_price ?? 0),
            color: null,
            size: null,
          } as StockItem)
        }
      }
      setItems(merged)
    })
  }, [])

  function resetForm() {
    setOrderNo(''); setDateStr(today); setDueDate(''); setTailorId(''); setProductId('')
    setBomId(''); setBomDetail(null); setFromLoc(''); setToLoc(''); setOrderQty('1'); setReference(''); setNotes('')
    setLines([]); setReceipts([]); setSendMovementId(null); setBillPiId(null); setStatus('draft'); setReceivedQty(0)
    setRecDate(today); setRecQty(''); setRecRef(''); setRecNotes('')
    setActiveStep(1)
  }
  function openCreate() { setEditing(null); resetForm(); setMode('edit') }
  async function openEdit(o: TailorOrder) {
    try {
      const r = await api.get(`/inventory/tailor-orders/${o.id}`)
      const ord = r.data.data
      setEditing(ord)
      setOrderNo(ord.order_no)
      setDateStr((ord.date || '').split('T')[0])
      setDueDate(ord.due_date ? ord.due_date.split('T')[0] : '')
      setTailorId(String(ord.tailor_id))
      setProductId(String(ord.product_id))
      setBomId(ord.bom_id ? String(ord.bom_id) : '')
      setFromLoc(ord.from_location_id ? String(ord.from_location_id) : '')
      setToLoc(ord.to_location_id ? String(ord.to_location_id) : '')
      setOrderQty(String(ord.order_qty))
      setReference(ord.reference ?? '')
      setNotes(ord.notes ?? '')
      setStatus(ord.status)
      setSendMovementId(ord.send_movement_id ?? null)
      setBillPiId(ord.bill_pi_id ?? null)
      setReceivedQty(Number(ord.received_qty ?? 0))
      setLines((ord.lines ?? []).map((l: any) => ({
        id: l.id, kind: l.kind,
        stock_item_id: l.stock_item_id ?? '',
        account_id:    l.account_id    ?? '',
        item_code:     l.item_code     ?? '',
        description:   l.description   ?? '',
        service_name:  l.service_name  ?? '',
        color:         l.color         ?? '',
        size:          l.size          ?? '',
        roll_count:    l.roll_count != null ? String(l.roll_count) : '',
        qty:           String(l.qty),
        uom:           l.uom           ?? '',
        unit_cost:     String(l.unit_cost ?? 0),
        discount:      String(l.discount  ?? 0),
        notes:         l.notes         ?? '',
        avg_per_piece: l.avg_per_piece != null ? String(l.avg_per_piece) : '',
      })))
      setReceipts(ord.receipts ?? [])
      // load source BOM (read-only) if linked
      if (ord.bom_id) {
        try { const r = await api.get(`/inventory/boms/${ord.bom_id}`); setBomDetail(r.data.data) } catch {}
      } else { setBomDetail(null) }
      setMode('edit')
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed to load order') }
  }

  async function loadBomForProduct(pid: string) {
    setProductId(pid)
    if (!pid) { setBomId(''); setBomDetail(null); setLines([]); return }
    try {
      const r = await api.get('/inventory/boms', { params: { product_id: pid } })
      const list: any[] = r.data.data ?? []
      const active = list.find(b => b.is_active) ?? list[0]
      if (!active) { toast('No BOM for this product', { icon: 'ℹ️' }); setBomId(''); setBomDetail(null); setLines([]); return }
      setBomId(String(active.id))
      setBomDetail(active)
      const oqty = parseFloat(orderQty) || 1
      const mult = oqty / Math.max(Number(active.output_qty || 1), 0.001)
      setLines((active.lines ?? []).map((l: any) => ({
        kind: l.kind,
        stock_item_id: l.stock_item_id ?? '',
        account_id:    l.account_id    ?? '',
        item_code:     l.item_code     ?? l.stock_item?.item_code ?? '',
        description:   l.description   ?? '',
        service_name:  l.service_name  ?? '',
        color:         l.color         ?? l.stock_item?.color ?? '',
        size:          l.size          ?? l.stock_item?.size  ?? '',
        roll_count:    l.roll_count != null ? String(+(Number(l.roll_count) * mult).toFixed(3)) : '',
        qty:           String(+(Number(l.qty) * mult).toFixed(3)),
        uom:           l.uom ?? l.stock_item?.uom ?? '',
        unit_cost:     String(l.kind === 'material' ? (l.stock_item?.unit_cost ?? 0) : (l.unit_cost ?? 0)),
        discount:      String(+(Number(l.discount ?? 0) * mult).toFixed(2)),
        notes:         '',
        avg_per_piece: l.avg_per_piece != null ? String(l.avg_per_piece) : '',
      })))
      toast.success(`BOM ${active.bom_number} loaded — ${active.lines.length} lines`)
    } catch { toast.error('Failed to load BOM') }
  }

  // recompute lines when orderQty changes (only if BOM was the source — we approx by re-pulling)
  useEffect(() => {
    if (!bomId || !productId || mode !== 'edit' || editing) return
    // only auto-recalc on new orders (not when editing existing)
    loadBomForProduct(productId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderQty])

  // ── Auto-fill Cutting Sheet header + color rows from order details ────────
  useEffect(() => {
    if (mode !== 'edit') return
    const tailorName = tailorId ? (tailorMap[Number(tailorId)]?.name ?? '') : ''
    // Generate a tailor-aware order code: e.g. "Kamruddin Tailor" → "KAM-{order_no_tail}"
    const tailorPrefix = tailorName
      ? tailorName.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase()
      : ''
    const orderTail = (orderNo || '').replace(/^TO-?/i, '')
    // For saved orders use TO-XXXX tail; for new drafts fall back to YYYYMMDD so the field is never blank.
    const dateTail = (dateStr || '').replace(/-/g, '')
    const generatedOrderNo = tailorPrefix
      ? `${tailorPrefix}-${orderTail || dateTail}`
      : (orderNo || '')

    // Build cutting rows from current material lines (one row per line with color/qty)
    const materialLines = lines.filter(l => l.kind === 'material')
    const autoRows: CuttingRow[] = materialLines.length
      ? materialLines.map((l, idx) => {
          const itm = l.stock_item_id ? itemMap[l.stock_item_id as number] : null
          // ITEM column shows product name (so we know WHAT is being sent), not just SKU code
          const itemLabel = (itm?.name || l.description || l.item_code || '').trim()
          const colorLabel = (l.color || '').toUpperCase()
          // Look up in-stock counts per size for this product+color so the cutting sheet shows
          // what's already on hand vs what still needs to be made.
          const stockBySize: Partial<Record<SizeKey, number>> = {}
          for (const sk of SIZES) {
            const sizeLabel = SIZE_LABELS[sk]
            const matchVariant = items.find(v =>
              (v.name || '').trim().toLowerCase() === itemLabel.toLowerCase() &&
              ((v.color || '').toUpperCase() === colorLabel || (!v.color && !colorLabel)) &&
              (v.size || '').toUpperCase() === sizeLabel.toUpperCase()
            )
            if (matchVariant) stockBySize[sk] = Number(matchVariant.current_stock ?? 0)
          }
          return {
            ...emptyCuttingRow(),
            id: `auto-${idx}-${l.item_code || ''}`,
            kod: itemLabel,
            color_name: colorLabel,
            total_meter: Number(l.qty) || 0,
            avg_per_piece: Number(l.avg_per_piece) || 0,
            stock_by_size: stockBySize,
          }
        })
      : [emptyCuttingRow()]

    setCuttingSheet(prev => ({
      ...prev,
      header: {
        ...prev.header,
        order_no:    prev.header.order_no    || generatedOrderNo,
        tailor:      prev.header.tailor      || tailorName,
        date:        prev.header.date        || dateStr,
        prepared_by: prev.header.prepared_by || (loggedInUser?.name ?? ''),
      },
      // Always sync the rows from the latest order lines (overrides since user expects auto-fill)
      rows: autoRows,
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tailorId, orderNo, dateStr, lines, loggedInUser, mode])

  function setLine(i: number, patch: Partial<LineForm>) {
    setLines(rs => rs.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  }
  function setLineKind(i: number, kind: LineKind) {
    setLines(rs => rs.map((r, idx) => idx === i ? { ...r, kind, stock_item_id: kind === 'material' ? r.stock_item_id : '', service_name: kind === 'material' ? '' : r.service_name } : r))
  }
  function pickItem(i: number, id: string) {
    const sid = id ? Number(id) : '' ; const itm = sid ? itemMap[sid] : null
    const existing = lines[i]
    const defaultAccountId = existing?.account_id || (accounts.find(a => /inventory|stock|material/i.test(a.name))?.id ?? accounts[0]?.id ?? '')
    setLine(i, {
      stock_item_id: sid as any,
      item_code:     itm?.item_code ?? '',
      color:         itm?.color ?? '',
      size:          itm?.size ?? '',
      uom:           itm?.uom ?? '',
      unit_cost:     itm?.unit_cost ? String(itm.unit_cost) : '0',
      account_id:    defaultAccountId as any,
    })
  }

  // Strip a trailing color word from item.name to get a base/group name (e.g. "Cotton Plain Black" → "Cotton Plain").
  function itemBaseName(it: { name: string; color?: string|null }): string {
    if (it.color) {
      const re = new RegExp(`\\s*${it.color.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\s*$`, 'i')
      const stripped = it.name.replace(re, '').trim()
      if (stripped) return stripped
    }
    return it.name
  }

  // Group all stock items by base name and collect their available colors.
  const itemGroups = useMemo(() => {
    const map = new Map<string, { base: string; items: StockItem[]; colors: string[] }>()
    for (const it of items) {
      const base = itemBaseName(it)
      let g = map.get(base)
      if (!g) { g = { base, items: [], colors: [] }; map.set(base, g) }
      g.items.push(it)
      if (it.color && !g.colors.includes(it.color)) g.colors.push(it.color)
    }
    return Array.from(map.values())
  }, [items])

  function pickByBaseAndColor(i: number, base: string, color: string) {
    const grp = itemGroups.find(g => g.base === base)
    if (!grp) return
    const match = (color && grp.items.find(it => (it.color || '').toLowerCase() === color.toLowerCase())) || grp.items[0]
    if (match) pickItem(i, String(match.id))
  }
  function addLine(kind: LineKind = 'material') { setLines(rs => [...rs, newLine(kind)]) }
  function removeLine(i: number) { setLines(rs => rs.filter((_, idx) => idx !== i)) }
  function moveLine(i: number, d: -1|1) {
    setLines(rs => { const j=i+d; if (j<0||j>=rs.length) return rs; const c=[...rs]; [c[i],c[j]]=[c[j],c[i]]; return c })
  }

  // ─── breakdown ───
  const lineTotal = (l: LineForm) => {
    const gross = (parseFloat(l.qty) || 0) * (parseFloat(l.unit_cost) || 0)
    return Math.max(0, gross - (parseFloat(l.discount) || 0))
  }
  const breakdown = useMemo(() => {
    const tot = { material: 0, tailor_service: 0, overhead: 0 }
    for (const l of lines) {
      tot[l.kind] = (tot[l.kind] || 0) + lineTotal(l)
    }
    const grand = tot.material + tot.tailor_service + tot.overhead
    const oq = Math.max(parseFloat(orderQty) || 0, 0.001)
    return { ...tot, grand, perUnit: grand / oq }
  }, [lines, orderQty])

  // ─── save (create / update header + lines) ───
  async function handleSave() {
    if (!tailorId)  { toast.error('Tailor required'); return }
    if (Number(orderQty) <= 0) { toast.error('Order qty must be > 0'); return }
    setSaving(true)
    const payload: any = {
      date:     dateStr,
      due_date: dueDate || null,
      tailor_id:        Number(tailorId),
      product_id:       productId ? Number(productId) : null,
      bom_id:           bomId ? Number(bomId) : null,
      from_location_id: fromLoc ? Number(fromLoc) : null,
      to_location_id:   toLoc   ? Number(toLoc)   : null,
      order_qty:        parseFloat(orderQty),
      reference:        reference || null,
      notes:            notes || null,
      lines: [
        // Material lines (fabric) from Step 1
        ...lines.filter(l => Number(l.qty) > 0 && (l.stock_item_id || l.service_name)).map(l => ({
          kind: l.kind,
          // Synthetic IDs (>=1_000_000) come from Product variants, not real stock_items rows.
          // Backend validates stock_item_id against stock_items table — send null for synthetic IDs.
          // The variant is identified by item_code (variant SKU like FAB-0001-BLUE) instead,
          // which applyStockDelta uses to look up and decrement product_variant stock.
          stock_item_id: l.kind === 'material' && l.stock_item_id && Number(l.stock_item_id) < 1_000_000
            ? Number(l.stock_item_id) : null,
          account_id:    l.account_id ? Number(l.account_id) : null,
          item_code:     l.item_code   || null,
          description:   l.description || null,
          service_name:  l.kind === 'material' ? null : l.service_name,
          color:         l.color || null,
          size:          l.size  || null,
          roll_count:    l.roll_count ? parseFloat(l.roll_count) : null,
          qty:           parseFloat(l.qty),
          uom:           l.uom || null,
          unit_cost:     parseFloat(l.unit_cost) || 0,
          discount:      parseFloat(l.discount)  || 0,
          notes:         l.notes || null,
          avg_per_piece: l.avg_per_piece ? parseFloat(l.avg_per_piece) : null,
        })),
        // Step 3 BOM service entries (stitching, embroidery) → flow into Tailor Invoice
        ...bomEntries.filter(b => b.type === 'service' && b.service && parseFloat(b.cost) > 0).map(b => ({
          kind: 'tailor_service' as const,
          stock_item_id: null,
          account_id:    null,
          item_code:     null,
          description:   null,
          service_name:  b.service,
          color:         null,
          size:          null,
          roll_count:    null,
          qty:           parseFloat(orderQty) || 1,   // 1 service unit per order piece
          uom:           'PCS',
          unit_cost:     parseFloat(b.cost) || 0,
          discount:      0,
          notes:         null,
          avg_per_piece: null,
        })),
      ],
    }
    try {
      if (editing) {
        const r = await api.put(`/inventory/tailor-orders/${editing.id}`, payload)
        toast.success('Updated')
        const fresh = (await api.get(`/inventory/tailor-orders/${editing.id}`)).data.data
        await openEdit(fresh)
      } else {
        const r = await api.post('/inventory/tailor-orders', payload)
        toast.success(`Created ${r.data.data.order_no}`)
        await openEdit(r.data.data)
      }
      load()
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Save failed') }
    finally { setSaving(false) }
  }

  async function handleIssue() {
    if (!editing) { toast.error('Save the order first'); return }
    if (!confirm(`Issue fabric to ${tailorMap[Number(tailorId)]?.name}? Material lines will be deducted from stock.`)) return
    try {
      await api.post(`/inventory/tailor-orders/${editing.id}/issue`)
      toast.success('Fabric issued — stock deducted')
      const fresh = (await api.get(`/inventory/tailor-orders/${editing.id}`)).data.data
      await openEdit(fresh); load()
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Issue failed') }
  }

  async function handleAddReceipt() {
    if (!editing) { toast.error('Save the order first'); return }
    const q = parseFloat(recQty) || 0
    if (q <= 0) { toast.error('Receipt qty required'); return }
    try {
      await api.post(`/inventory/tailor-orders/${editing.id}/receive`, {
        date: recDate, qty: q, reference: recRef || null, notes: recNotes || null,
      })
      toast.success(`Receipt of ${q} pcs recorded`)
      setRecQty(''); setRecRef(''); setRecNotes('')
      const fresh = (await api.get(`/inventory/tailor-orders/${editing.id}`)).data.data
      await openEdit(fresh); load()
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Receipt failed') }
  }

  async function handleDeleteReceipt(receipt: Receipt) {
    if (!confirm(`Remove receipt of ${receipt.qty} pcs? Stock will be reversed.`)) return
    try {
      await api.delete(`/inventory/tailor-orders/${editing.id}/receipts/${receipt.id}`)
      toast.success('Receipt reversed')
      const fresh = (await api.get(`/inventory/tailor-orders/${editing.id}`)).data.data
      await openEdit(fresh); load()
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
  }

  async function handleGenerateBill() {
    if (!editing) return
    if (!confirm('Generate Tailor Bill (PI) for stitching/labor lines? This is irreversible from this screen.')) return
    try {
      await api.post(`/inventory/tailor-orders/${editing.id}/generate-bill`)
      toast.success('Tailor bill generated')
      const fresh = (await api.get(`/inventory/tailor-orders/${editing.id}`)).data.data
      await openEdit(fresh); load()
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Bill failed') }
  }

  async function handleDelete() {
    if (!editing) return
    if (!confirm(`Delete order ${editing.order_no}? All linked stock movements will be reversed.`)) return
    try {
      await api.delete(`/inventory/tailor-orders/${editing.id}`)
      toast.success('Order deleted (all stock reversed)')
      setMode('list'); load()
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
  }

  const totalReceived = receipts.reduce((s, r) => s + Number(r.qty), 0)
  const remaining = Math.max(parseFloat(orderQty) - totalReceived, 0)
  const lineCount = lines.length

  // ─── FORM VIEW ───
  if (mode === 'edit') {
    const isLocked = !!editing && (status === 'cancelled')
    const fabricIssued = !!sendMovementId
    const billed = !!billPiId

    return (
      <div className="fixed inset-0 z-40 flex flex-col bg-slate-100">
        <div className="bg-white border-b border-slate-200 px-5 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-fuchsia-50 rounded-lg flex items-center justify-center"><Send className="w-4 h-4 text-fuchsia-600"/></div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">{editing ? `Edit ${orderNo}` : 'New Tailor Order'}</h2>
              <p className="text-xs text-slate-400">Inventory → Send to Tailor → {editing ? orderNo : 'New Order'}</p>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${STATUS_BADGES[editing ? status : 'not_submitted']}`}>
              {STATUS_LABELS[editing ? status : 'not_submitted']}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => { setEditing(null); resetForm() }} disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-fuchsia-300 hover:bg-fuchsia-50 text-slate-700 text-xs font-medium rounded">
              <FilePlus className="w-3.5 h-3.5 text-slate-500"/> New
            </button>
            <button onClick={handleSave} disabled={saving || isLocked}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-fuchsia-600 text-white text-xs font-medium rounded hover:bg-fuchsia-700 disabled:opacity-60">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Save className="w-3.5 h-3.5"/>}
              {editing ? 'Update' : 'Save Order'}
            </button>
            {editing && !fabricIssued && !isLocked && (
              <button onClick={handleIssue}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white text-xs font-medium rounded hover:bg-amber-600">
                <ArrowRight className="w-3.5 h-3.5"/> Issue Fabric
              </button>
            )}
            {editing && fabricIssued && !billed && receivedQty > 0 && (
              <button onClick={handleGenerateBill}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded hover:bg-emerald-700">
                <Banknote className="w-3.5 h-3.5"/> Generate Bill
              </button>
            )}
            <button onClick={handleDelete} disabled={!editing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-700 text-xs font-medium rounded disabled:opacity-40">
              <Trash2 className="w-3.5 h-3.5 text-red-500"/> Delete
            </button>
            <button onClick={() => setMode('list')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded hover:bg-red-600">
              <X className="w-3.5 h-3.5"/> Close
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* ── Pill-style step tabs (Claude.ai look) ── */}
          <div className="flex justify-center">
            <div className="inline-flex items-center bg-slate-100 rounded-full p-1 gap-0.5 border border-slate-200">
              {STEPS.map(s => {
                const Icon = s.icon
                const active = activeStep === s.n
                const done = activeStep > s.n
                return (
                  <button key={s.n} type="button" onClick={() => setActiveStep(s.n)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-semibold transition-all whitespace-nowrap
                      ${active ? 'bg-white text-slate-900 shadow-sm border border-slate-200' :
                        'text-slate-500 hover:text-slate-700 border border-transparent'}`}>
                    {done ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Icon className={`w-4 h-4 ${active ? 'text-[var(--accent)]' : 'text-slate-400'}`} />
                    )}
                    <span>{s.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* SECTION 1: Order Header — only on Step 1 */}
          {activeStep === 1 && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-gradient-to-r from-fuchsia-50/60 to-white flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-fuchsia-100 text-fuchsia-700 flex items-center justify-center">
                <Send className="w-4 h-4"/>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">① Tailor + Order Details</h3>
                <p className="text-[11px] text-slate-400">Tailor pick, dates, locations and reference for this order.</p>
              </div>
            </div>
            <div className="px-5 py-5 grid grid-cols-12 gap-x-5 gap-y-4">
              <div className="col-span-3">
                <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Date <span className="text-red-500">*</span></label>
                <input type="date" value={dateStr} onChange={e=>setDateStr(e.target.value)} disabled={fabricIssued}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono disabled:bg-slate-50 focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"/>
              </div>
              <div className="col-span-5">
                <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Tailor <span className="text-red-500">*</span></label>
                <select value={tailorId} disabled={fabricIssued} onChange={e=>{
                  setTailorId(e.target.value)
                  const t = tailorMap[Number(e.target.value)]
                  if (t?.location_id) setToLoc(prev => prev || String(t.location_id))
                }} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white disabled:bg-slate-50 focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]">
                  <option value="">— Select tailor —</option>
                  {tailors.map(t => <option key={t.id} value={t.id}>{t.tailor_code} — {t.name}</option>)}
                </select>
              </div>
              <div className="col-span-4">
                <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Reference</label>
                <input value={reference} onChange={e=>setReference(e.target.value)}
                  placeholder={orderNo || 'TO-00001'}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] placeholder:text-slate-400"/>
                <p className="text-[10px] text-slate-400 mt-1">Auto-default: <span className="font-mono text-slate-600">{orderNo || 'TO-XXXXX'}</span></p>
              </div>

              <div className="col-span-6">
                <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">From Warehouse</label>
                <select value={fromLoc} disabled={fabricIssued} onChange={e=>setFromLoc(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white disabled:bg-slate-50 focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]">
                  <option value="">— None —</option>
                  {locations.filter(l=>l.type==='warehouse').map(l => <option key={l.id} value={l.id}>{l.code} — {l.name}</option>)}
                </select>
              </div>
              <div className="col-span-6">
                <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">To Tailor Location</label>
                <select value={toLoc} disabled={fabricIssued} onChange={e=>setToLoc(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white disabled:bg-slate-50 focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]">
                  <option value="">— None —</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.code} — {l.name}</option>)}
                </select>
              </div>

              <div className="col-span-12">
                <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Notes</label>
                <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Optional notes for this tailor order…"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] placeholder:text-slate-400"/>
              </div>
            </div>
          </div>
          )}

          {/* CONTENT CARD — steps 1-3 share this card */}
          {activeStep <= 3 && (
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">

            {activeStep === 1 && (
              <>
                {/* ─── Qty + Add button header ─── */}
                <div className="px-5 py-3 border-b border-slate-100 bg-gradient-to-r from-blue-50/60 to-white">
                  <div className="grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-3">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Order Qty <span className="text-red-500">*</span></label>
                      <input type="number" step="0.001" disabled={fabricIssued} value={orderQty} onChange={e=>setOrderQty(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg text-right font-mono disabled:bg-slate-50 focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"/>
                    </div>
                    <div className="col-span-9 flex items-center justify-between">
                      <h3 className="text-[12px] font-bold text-slate-600 uppercase tracking-wider">Fabric / Material Lines</h3>
                      <button onClick={()=>addLine('material')} disabled={fabricIssued}
                        className="flex items-center gap-1.5 px-3 py-2 bg-[var(--accent)] text-white text-xs font-semibold rounded-lg hover:bg-[#a3502f] disabled:opacity-40 transition-colors">
                        <Plus className="w-3.5 h-3.5"/> Add Item
                      </button>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="text-center w-8 px-2 py-1.5 text-[10px]">#</th>
                        <th className="text-left px-2 py-1.5 text-[11px] uppercase w-28">Code</th>
                        <th className="text-left px-2 py-1.5 text-[11px] uppercase w-44">Item</th>
                        <th className="text-left px-2 py-1.5 text-[11px] uppercase w-24">Color</th>
                        <th className="text-left px-2 py-1.5 text-[11px] uppercase w-20">Size</th>
                        <th className="text-right px-2 py-1.5 text-[11px] uppercase w-24">Available Qty</th>
                        <th className="text-right px-2 py-1.5 text-[11px] uppercase w-20">Send Qty</th>
                        <th className="text-right px-2 py-1.5 text-[11px] uppercase w-16">Roll</th>
                        <th className="text-left px-2 py-1.5 text-[11px] uppercase w-14">UOM</th>
                        <th className="text-right px-2 py-1.5 text-[11px] uppercase w-20" title="Average meters per single piece (e.g. 4m / suit)">Avg/Pc (m)</th>
                        <th className="text-right px-2 py-1.5 text-[11px] uppercase w-16 text-emerald-700" title="Estimated pieces = Send Qty ÷ Avg/Pc">Est Pcs</th>
                        <th className="text-center w-16"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.filter(l => l.kind === 'material').length === 0 ? (
                        <tr><td colSpan={12} className="py-6 text-center text-slate-400 italic text-[11px]">No fabric lines — pick Product (auto-loads BOM) or click "+ Add Material"</td></tr>
                      ) : lines.map((l, i) => {
                        if (l.kind !== 'material') return null
                        const total = lineTotal(l)
                        const itm = l.stock_item_id ? itemMap[l.stock_item_id as number] : null
                        const available = Number(itm?.current_stock ?? 0)
                        const sendQty = Number(l.qty || 0)
                        const overSend = sendQty > 0 && available > 0 && sendQty > available
                        return (
                          <tr key={i} className="border-t border-slate-100">
                            <td className="px-2 py-1 text-center text-slate-400">{i+1}</td>
                            <td className="px-2 py-1">
                              <span className="font-mono text-[11px] font-semibold text-slate-700">{itm?.item_code || l.item_code || '—'}</span>
                            </td>
                            <td className="px-1 py-1">
                              <select disabled={fabricIssued}
                                value={itm ? itemBaseName(itm) : ''}
                                onChange={e => pickByBaseAndColor(i, e.target.value, l.color)}
                                className="w-full px-1 py-1 text-[11px] border border-slate-200 rounded bg-white disabled:bg-slate-50">
                                <option value="">— Select item —</option>
                                {itemGroups.map(g => <option key={g.base} value={g.base}>{g.base}</option>)}
                              </select>
                            </td>
                            <td className="px-1 py-1">
                              {(() => {
                                const base = itm ? itemBaseName(itm) : ''
                                const grp = itemGroups.find(g => g.base === base)
                                const colors = grp?.colors ?? []
                                return colors.length > 0 ? (
                                  <select disabled={fabricIssued} value={l.color}
                                    onChange={e => pickByBaseAndColor(i, base, e.target.value)}
                                    className="w-full px-1 py-1 text-[11px] border border-slate-200 rounded bg-white disabled:bg-slate-50">
                                    <option value="">— Color —</option>
                                    {colors.map(c => <option key={c} value={c}>{c}</option>)}
                                  </select>
                                ) : (
                                  <input disabled={fabricIssued} value={l.color}
                                    onChange={e => setLine(i, { color: e.target.value })}
                                    placeholder={base ? 'No variants — type color' : ''}
                                    className="w-full px-1 py-1 text-[11px] border border-slate-200 rounded disabled:bg-slate-50"/>
                                )
                              })()}
                            </td>
                            <td className="px-1 py-1"><input disabled={fabricIssued} value={l.size} onChange={e=>setLine(i,{size:e.target.value})} className="w-full px-1 py-1 text-[11px] border border-slate-200 rounded disabled:bg-slate-50"/></td>
                            <td className="px-2 py-1 text-right font-mono text-[11px] text-slate-600">
                              {itm ? <>{available.toFixed(2)} <span className="text-slate-400 text-[9px]">{itm.uom}</span></> : '—'}
                            </td>
                            <td className="px-1 py-1">
                              <input type="number" step="0.001" disabled={fabricIssued} value={l.qty} onChange={e=>setLine(i,{qty:e.target.value})}
                                className={`w-full px-1 py-1 text-[11px] border rounded text-right font-mono disabled:bg-slate-50 ${overSend ? 'border-red-400 bg-red-50 text-red-700' : 'border-slate-200'}`}/>
                              {overSend && <div className="text-[9px] text-red-600 mt-0.5">⚠ exceeds stock</div>}
                            </td>
                            <td className="px-1 py-1"><input type="number" step="1" disabled={fabricIssued} value={l.roll_count} onChange={e=>setLine(i,{roll_count:e.target.value})} placeholder="0" className="w-full px-1 py-1 text-[11px] border border-slate-200 rounded text-right font-mono disabled:bg-slate-50"/></td>
                            <td className="px-1 py-1"><input disabled={fabricIssued} value={l.uom} onChange={e=>setLine(i,{uom:e.target.value.toUpperCase()})} className="w-full px-1 py-1 text-[11px] border border-slate-200 rounded font-mono uppercase disabled:bg-slate-50"/></td>
                            <td className="px-1 py-1">
                              <input type="number" step="0.01" disabled={fabricIssued} value={l.avg_per_piece}
                                onChange={e=>setLine(i,{avg_per_piece:e.target.value})}
                                placeholder="4"
                                className="w-full px-1 py-1 text-[11px] border border-slate-200 rounded text-right font-mono disabled:bg-slate-50"/>
                            </td>
                            <td className="px-2 py-1 text-right font-mono font-semibold text-emerald-700">
                              {(() => {
                                const q = Number(l.qty) || 0
                                const a = Number(l.avg_per_piece) || 0
                                return a > 0 ? Math.floor(q / a) : '—'
                              })()}
                            </td>
                            <td className="px-1 py-1 text-center">
                              <div className="flex justify-center gap-0.5">
                                <button disabled={fabricIssued} onClick={()=>moveLine(i,-1)} className="p-0.5 text-slate-400 hover:text-blue-600 disabled:opacity-30"><ChevronUp className="w-3 h-3"/></button>
                                <button disabled={fabricIssued} onClick={()=>moveLine(i, 1)} className="p-0.5 text-slate-400 hover:text-blue-600 disabled:opacity-30"><ChevronDown className="w-3 h-3"/></button>
                                <button disabled={fabricIssued} onClick={()=>removeLine(i)} className="p-0.5 text-slate-400 hover:text-red-600 disabled:opacity-30"><Trash2 className="w-3 h-3"/></button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="border-t border-slate-200 bg-white px-4 py-3 flex items-center justify-between">
                  <div className="text-[10px] text-slate-400 italic">
                    📌 Fabrics ko aap top fabric, lining wagaira ke liye <b>+ Add Material</b> button se multiple lines mein add kar sakte hain.
                  </div>
                  <button type="button" onClick={async () => { await handleSave(); setActiveStep(2) }} disabled={saving || isLocked}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[var(--accent)] text-white text-xs font-semibold rounded-lg hover:bg-[#a3502f] disabled:opacity-60 transition-colors">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Save className="w-3.5 h-3.5"/>}
                    Save &amp; Next →
                  </button>
                </div>
              </>
            )}

            {activeStep === 3 && (() => {
              // ── totals split: service flows to tailor invoice; accessory + overhead don't ──
              const sumByType = (t: BomType) => bomEntries.filter(b => b.type === t).reduce((s, b) => s + lineCostPerPiece(b), 0)
              const stitch_perPc    = sumByType('service')
              const accPiece_perPc  = sumByType('accessory_piece')
              const accLength_perPc = sumByType('accessory_length')
              const overhead_perPc  = sumByType('overhead')
              const grandPerPc      = stitch_perPc + accPiece_perPc + accLength_perPc + overhead_perPc

              const TYPE_META: Record<BomType, { label: string; emoji: string; pill: string }> = {
                service:          { label: 'Service',          emoji: '🔧', pill: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
                accessory_piece:  { label: 'Accessory · /pc',  emoji: '🏷️', pill: 'bg-blue-100 text-blue-700 border-blue-200' },
                accessory_length: { label: 'Accessory · /m',   emoji: '📏', pill: 'bg-violet-100 text-violet-700 border-violet-200' },
                overhead:         { label: 'Overhead',         emoji: '📦', pill: 'bg-amber-100 text-amber-700 border-amber-200' },
              }

              const setEntry = (i: number, patch: Partial<BomEntry>) =>
                setBomEntries(p => p.map((x, idx) => idx === i ? { ...x, ...patch } : x))

              return (
              <div className="px-4 py-4">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">③ Bill of Material</h3>
                    <p className="text-[11px] text-slate-500">
                      Service (stitching) flows to <b className="text-emerald-700">Tailor Invoice</b>. Accessories &amp; overhead are <b>per-piece material cost</b> only.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => setBomEntries(p => [...p, emptyBomEntry('service')])}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 text-white text-[11px] font-semibold rounded-lg hover:bg-emerald-700">
                      <Plus className="w-3 h-3"/> Service
                    </button>
                    <button type="button" onClick={() => setBomEntries(p => [...p, emptyBomEntry('accessory_piece')])}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white text-[11px] font-semibold rounded-lg hover:bg-blue-700">
                      <Plus className="w-3 h-3"/> Label / Pc
                    </button>
                    <button type="button" onClick={() => setBomEntries(p => [...p, emptyBomEntry('accessory_length')])}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-violet-600 text-white text-[11px] font-semibold rounded-lg hover:bg-violet-700">
                      <Plus className="w-3 h-3"/> Tali / Length
                    </button>
                    <button type="button" onClick={() => setBomEntries(p => [...p, emptyBomEntry('overhead')])}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-600 text-white text-[11px] font-semibold rounded-lg hover:bg-amber-700">
                      <Plus className="w-3 h-3"/> Overhead
                    </button>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="text-center w-8 px-1 py-2 text-[10px] uppercase text-slate-600">#</th>
                        <th className="text-left px-2 py-2 text-[10px] uppercase text-slate-600 w-36">Type</th>
                        <th className="text-left px-2 py-2 text-[10px] uppercase text-slate-600">Description</th>
                        <th className="text-right px-2 py-2 text-[10px] uppercase text-slate-600 w-20">Length /<br/>Qty</th>
                        <th className="text-left px-1 py-2 text-[10px] uppercase text-slate-600 w-20">Unit</th>
                        <th className="text-right px-2 py-2 text-[10px] uppercase text-slate-600 w-16">× Uses</th>
                        <th className="text-right px-2 py-2 text-[10px] uppercase text-slate-600 w-24">RM per<br/>unit / m</th>
                        <th className="text-right px-2 py-2 text-[10px] uppercase text-slate-600 w-24">RM /<br/>Piece</th>
                        <th className="w-10"/>
                      </tr>
                    </thead>
                    <tbody>
                      {bomEntries.map((b, i) => {
                        const meta = TYPE_META[b.type]
                        const linePc = lineCostPerPiece(b)
                        const isService  = b.type === 'service'
                        const isOverhead = b.type === 'overhead'
                        const isPiece    = b.type === 'accessory_piece'
                        const isLength   = b.type === 'accessory_length'
                        return (
                          <tr key={i} className="border-t border-slate-100">
                            <td className="px-1 py-1.5 text-center text-slate-400">{i + 1}</td>
                            <td className="px-2 py-1.5">
                              <select value={b.type} onChange={e => setEntry(i, { type: e.target.value as BomType })}
                                className={`w-full px-1.5 py-1 text-[11px] border rounded font-semibold ${meta.pill}`}>
                                <option value="service">🔧 Service</option>
                                <option value="accessory_piece">🏷️ Accessory · /pc</option>
                                <option value="accessory_length">📏 Accessory · /m</option>
                                <option value="overhead">📦 Overhead</option>
                              </select>
                            </td>
                            <td className="px-2 py-1.5">
                              <input value={b.service}
                                onChange={e => setEntry(i, { service: e.target.value.toUpperCase() })}
                                placeholder={isService ? 'STITCHING' : isPiece ? 'CARLANISA LABEL' : isLength ? 'HANGING TALI' : 'PACKAGING'}
                                className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:border-[var(--accent)] uppercase font-semibold"/>
                            </td>
                            {/* Length / Qty */}
                            <td className="px-2 py-1.5">
                              {isPiece && (
                                <input type="number" step="0.01" value={b.qty_per_piece}
                                  onChange={e => setEntry(i, { qty_per_piece: e.target.value })}
                                  placeholder="1"
                                  className="w-full px-1.5 py-1 text-xs border border-slate-200 rounded text-right font-mono"/>
                              )}
                              {isLength && (
                                <input type="number" step="0.01" value={b.length_per_use}
                                  onChange={e => setEntry(i, { length_per_use: e.target.value })}
                                  placeholder="4.5"
                                  className="w-full px-1.5 py-1 text-xs border border-slate-200 rounded text-right font-mono"/>
                              )}
                              {(isService || isOverhead) && <span className="block text-center text-slate-300">—</span>}
                            </td>
                            {/* Unit */}
                            <td className="px-1 py-1.5">
                              {isPiece && <span className="block text-center text-[11px] text-slate-500 font-mono">pcs</span>}
                              {isLength && (
                                <select value={b.length_unit} onChange={e => setEntry(i, { length_unit: e.target.value as any })}
                                  className="w-full px-1 py-1 text-[11px] border border-slate-200 rounded">
                                  <option value="inches">inches</option>
                                  <option value="cm">cm</option>
                                  <option value="meters">meters</option>
                                </select>
                              )}
                              {(isService || isOverhead) && <span className="block text-center text-slate-300">—</span>}
                            </td>
                            {/* × Uses (loops per piece) */}
                            <td className="px-2 py-1.5">
                              {isLength && (
                                <input type="number" step="1" value={b.uses_per_piece}
                                  onChange={e => setEntry(i, { uses_per_piece: e.target.value })}
                                  placeholder="2"
                                  className="w-full px-1.5 py-1 text-xs border border-slate-200 rounded text-right font-mono"/>
                              )}
                              {!isLength && <span className="block text-center text-slate-300">—</span>}
                            </td>
                            {/* RM per unit / per meter / per piece */}
                            <td className="px-2 py-1.5">
                              {isPiece && (
                                <input type="number" step="0.01" value={b.unit_cost}
                                  onChange={e => setEntry(i, { unit_cost: e.target.value })}
                                  placeholder="0.50"
                                  className="w-full px-1.5 py-1 text-xs border border-slate-200 rounded text-right font-mono"/>
                              )}
                              {isLength && (
                                <input type="number" step="0.01" value={b.cost_per_meter}
                                  onChange={e => setEntry(i, { cost_per_meter: e.target.value })}
                                  placeholder="2.00"
                                  className="w-full px-1.5 py-1 text-xs border border-slate-200 rounded text-right font-mono"/>
                              )}
                              {(isService || isOverhead) && (
                                <input type="number" step="0.01" value={b.cost}
                                  onChange={e => setEntry(i, { cost: e.target.value })}
                                  placeholder="0.00"
                                  className="w-full px-1.5 py-1 text-xs border border-slate-200 rounded text-right font-mono"/>
                              )}
                            </td>
                            {/* Computed cost per piece */}
                            <td className="px-2 py-1.5 text-right font-mono font-bold text-[var(--accent)]">
                              {linePc.toFixed(2)}
                              {isLength && (() => {
                                const totalM = toMeters((parseFloat(b.length_per_use) || 0) * (parseFloat(b.uses_per_piece) || 0), b.length_unit)
                                return <span className="block text-[9px] text-slate-400 font-normal">= {totalM.toFixed(3)}m / pc</span>
                              })()}
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              <button onClick={() => setBomEntries(p => p.filter((_, idx) => idx !== i))}
                                className="text-slate-400 hover:text-red-600 p-1">
                                <Trash2 className="w-3.5 h-3.5"/>
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                      {bomEntries.length === 0 && (
                        <tr><td colSpan={9} className="py-8 text-center text-slate-400 italic text-sm">No items yet — click a button above to add a row.</td></tr>
                      )}
                    </tbody>
                    {bomEntries.length > 0 && (
                      <tfoot className="bg-slate-50 border-t-2 border-slate-300">
                        <tr>
                          <td colSpan={7} className="px-3 py-2 text-right text-[10px] uppercase font-bold text-slate-600">
                            Stitching (→ Tailor Invoice): <span className="text-emerald-700 font-mono">RM {stitch_perPc.toFixed(2)}</span>
                            <span className="mx-2 text-slate-300">|</span>
                            Accessories: <span className="text-blue-700 font-mono">RM {(accPiece_perPc + accLength_perPc).toFixed(2)}</span>
                            <span className="mx-2 text-slate-300">|</span>
                            Overhead: <span className="text-amber-700 font-mono">RM {overhead_perPc.toFixed(2)}</span>
                          </td>
                          <td className="px-2 py-2 text-right font-mono font-bold text-[var(--accent)] text-base">RM {grandPerPc.toFixed(2)}</td>
                          <td/>
                        </tr>
                        <tr>
                          <td colSpan={7} className="px-3 py-1.5 text-right text-[10px] uppercase text-slate-500">Total per Finished Piece</td>
                          <td className="px-2 py-1.5 text-right text-[10px] uppercase font-bold text-slate-700">Cost / pc</td>
                          <td/>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* Quick reference */}
                <div className="mt-3 grid grid-cols-2 gap-3 text-[10px] text-slate-500">
                  <div className="bg-blue-50/60 border border-blue-100 rounded p-2">
                    <b className="text-blue-700">🏷️ Accessory · per piece</b> — fixed units per finished piece.<br/>
                    e.g. <span className="font-mono">1 × CARLANISA LABEL @ RM 0.50 = RM 0.50/pc</span>
                  </div>
                  <div className="bg-violet-50/60 border border-violet-100 rounded p-2">
                    <b className="text-violet-700">📏 Accessory · per length</b> — measured length × uses per piece, auto-converted to meters.<br/>
                    e.g. <span className="font-mono">4.5″ × 2 loops = 9″ → 0.229m @ RM 2.00 = RM 0.46/pc</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-end">
                  <button type="button"
                    onClick={async () => { await handleSave(); setActiveStep(4) }}
                    disabled={saving || isLocked}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[var(--accent)] text-white text-xs font-semibold rounded-lg hover:bg-[#a3502f] disabled:opacity-60">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Save className="w-3.5 h-3.5"/>}
                    Save &amp; Next →
                  </button>
                </div>
              </div>
              )
            })()}

            {activeStep === 2 && (
              <div className="px-4 py-4 bg-amber-50/30">
                <CuttingSheet value={cuttingSheet} onChange={setCuttingSheet} />
              </div>
            )}
          </div>
          )}

          {/* Step 4 — Per-variant Receive Tracker (from Cutting Sheet) */}
          {activeStep === 4 && (() => {
            // Build receivable items: each cutting row × each size where pcs > 0
            // Augment with matched product variant SKU (for barcode scanning)
            const selectedProd = finishedProducts.find(p => String(p.id) === receiveProductId)
            const matchVariant = (color: string, size: string) => {
              if (!selectedProd) return null
              return (selectedProd.variants ?? []).find((v: any) =>
                (v.color || '').toLowerCase() === color.toLowerCase() &&
                (v.size  || '').toUpperCase() === size.toUpperCase()
              ) || null
            }
            const receivable: { key: string; item: string; color: string; size: string; sent: number; avgPerPiece: number; variantSku: string|null; variantBarcode: string|null }[] = []
            for (const row of cuttingSheet.rows) {
              const item = (row.kod || '').trim()
              const color = (row.color_name || '').trim() || '—'
              const avg   = Number(row.avg_per_piece) || 0
              if (!item) continue
              SIZES.forEach(sk => {
                const q = Number(row.pcs[sk]) || 0
                if (q > 0) {
                  const sizeLabel = SIZE_LABELS[sk]
                  const v = matchVariant(color, sizeLabel)
                  receivable.push({
                    key: `${item}|${color}|${sizeLabel}`,
                    item, color, size: sizeLabel, sent: q, avgPerPiece: avg,
                    variantSku: v?.sku || null,
                    variantBarcode: v?.barcode || null,
                  })
                }
              })
            }
            // Barcode scan handler — match scan against variant SKU or barcode
            const handleScan = (raw: string) => {
              const code = (raw || '').trim()
              if (!code) return
              const hit = receivable.find(r => r.variantSku === code || r.variantBarcode === code)
              if (!hit) {
                setScanFeedback({ kind: 'err', msg: `No match for "${code}". Pick a Finished Product first or check variant SKU/barcode.` })
                return
              }
              const cur = receivedByVariant[hit.key] || 0
              const rej = rejectedByVariant[hit.key] || 0
              if (cur + rej >= hit.sent) {
                setScanFeedback({ kind: 'err', msg: `${hit.color} ${hit.size} already fully received (${cur}/${hit.sent}).` })
                return
              }
              setReceivedByVariant(p => ({ ...p, [hit.key]: cur + 1 }))
              setScanFeedback({ kind: 'ok', msg: `✓ ${hit.variantSku} → ${hit.color} ${hit.size}  (${cur + 1}/${hit.sent})` })
              setScanInput('')
            }
            // Tailor invoice — ONLY service rows (accessories & overhead are material cost, not tailor charges)
            const stitchPerPiece    = bomEntries.filter(b => b.type === 'service').reduce((s, b) => s + lineCostPerPiece(b), 0)
            const totalSentAll      = receivable.reduce((s, r) => s + r.sent, 0)
            const totalReceivedAll  = receivable.reduce((s, r) => s + (receivedByVariant[r.key] || 0), 0)
            const totalRejectedAll  = receivable.reduce((s, r) => s + (rejectedByVariant[r.key] || 0), 0)
            const totalPendingPcs   = totalSentAll - totalReceivedAll - totalRejectedAll
            const totalPendingMeter = receivable.reduce((s, r) => {
              const pending = Math.max(0, r.sent - (receivedByVariant[r.key] || 0) - (rejectedByVariant[r.key] || 0))
              return s + pending * r.avgPerPiece
            }, 0)
            const totalReturnedMeter = receivable.reduce((s, r) => s + (rejectedByVariant[r.key] || 0) * r.avgPerPiece, 0)
            const allSettled        = receivable.length > 0 && (totalReceivedAll + totalRejectedAll) >= totalSentAll
            const dedRm             = parseFloat(stitchDeduction) || 0
            const billGross         = stitchPerPiece * totalReceivedAll
            const billNet           = Math.max(0, billGross - dedRm)
            return (
              <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
                <div className="px-4 py-2 border-b border-slate-100 bg-teal-50/40 flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-xs font-bold text-teal-700 uppercase tracking-wide">④ Receive from Tailor — per Item / Color / Size</h3>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-slate-500">Sent: <b className="text-slate-800">{totalSentAll}</b></span>
                    <span className="text-emerald-600">· Received: <b>{totalReceivedAll}</b></span>
                    <span className="text-red-600">· Rejected: <b>{totalRejectedAll}</b></span>
                    <span className="text-amber-600">· @Tailor: <b>{totalPendingPcs}</b> pcs <span className="text-[10px] text-amber-500">({totalPendingMeter.toFixed(2)}m)</span></span>
                    {allSettled && <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-300">ALL SETTLED</span>}
                  </div>
                </div>
                <div className="px-4 py-3">
                  {/* ── Finished Product picker + barcode scan ── */}
                  <div className="mb-3 bg-blue-50/50 border border-blue-200 rounded-lg p-3 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-5">
                      <label className="block text-[10px] font-bold text-blue-700 uppercase tracking-wide mb-1">🎽 Finished Product (what tailor is making)</label>
                      <div className="flex items-center gap-1.5">
                        <select value={receiveProductId} onChange={e => setReceiveProductId(e.target.value)}
                          className="flex-1 px-2.5 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500">
                          <option value="">— Select finished product —</option>
                          {finishedProducts
                            .filter(p => (p.variants?.length ?? 0) > 0)
                            .map(p => <option key={p.id} value={p.id}>{p.sku} — {p.name} ({p.variants.length} variants)</option>)}
                        </select>
                        <a href="/inventory/products" target="_blank" rel="noopener" title="Create / edit products in new tab"
                          className="px-2 py-1.5 text-xs bg-white border border-blue-300 rounded hover:bg-blue-100 text-blue-700 font-bold">+</a>
                      </div>
                      {selectedProd && (
                        <div className="text-[10px] text-slate-500 mt-1">
                          Variants: <b className="text-slate-700">{(selectedProd.variants ?? []).length}</b>
                          {' '}· Matched in cutting sheet: <b className="text-emerald-700">{receivable.filter(r => r.variantSku).length}/{receivable.length}</b>
                        </div>
                      )}
                    </div>
                    <div className="md:col-span-7">
                      <label className="block text-[10px] font-bold text-blue-700 uppercase tracking-wide mb-1">📷 Barcode / SKU Scan</label>
                      <input
                        autoFocus
                        type="text"
                        value={scanInput}
                        onChange={e => setScanInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleScan(scanInput) } }}
                        placeholder={receiveProductId ? 'Scan variant barcode or type SKU + Enter (e.g. KBK-0001-BLUE-M)' : 'Select a Finished Product first to enable scan…'}
                        disabled={!receiveProductId}
                        className="w-full px-3 py-2 text-sm border-2 border-blue-400 rounded font-mono focus:outline-none focus:border-blue-600 disabled:bg-slate-100 disabled:cursor-not-allowed"/>
                      {scanFeedback && (
                        <div className={`text-[11px] mt-1 font-semibold ${scanFeedback.kind === 'ok' ? 'text-emerald-700' : 'text-red-600'}`}>
                          {scanFeedback.msg}
                        </div>
                      )}
                    </div>
                  </div>

                  {receivable.length === 0 ? (
                    <div className="text-center text-slate-400 italic text-sm py-6">
                      No items in cutting sheet yet — fill Step 2 (Cutting Table) sizes/qty first.
                    </div>
                  ) : (
                    <table className="w-full text-xs">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="text-center w-8 px-2 py-1.5 text-[10px] uppercase">#</th>
                          <th className="text-left px-3 py-1.5 text-[11px] uppercase">Item</th>
                          <th className="text-left px-3 py-1.5 text-[11px] uppercase w-32 text-blue-700">Variant SKU</th>
                          <th className="text-left px-3 py-1.5 text-[11px] uppercase w-28">Color</th>
                          <th className="text-center px-3 py-1.5 text-[11px] uppercase w-14">Size</th>
                          <th className="text-right px-3 py-1.5 text-[11px] uppercase w-14">Sent</th>
                          <th className="text-right px-3 py-1.5 text-[11px] uppercase w-20">Received</th>
                          <th className="text-right px-3 py-1.5 text-[11px] uppercase w-20 text-red-600">Rejected</th>
                          <th className="text-right px-3 py-1.5 text-[11px] uppercase w-24 text-amber-700">@ Tailor (pcs)</th>
                          <th className="text-right px-3 py-1.5 text-[11px] uppercase w-24 text-amber-700">Pending (m)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {receivable.map((r, i) => {
                          const recv = receivedByVariant[r.key] || 0
                          const rej  = rejectedByVariant[r.key] || 0
                          const pending = Math.max(0, r.sent - recv - rej)
                          const pendingM = pending * r.avgPerPiece
                          const isDone = pending === 0
                          return (
                            <tr key={r.key} className={`border-t border-slate-100 ${isDone ? 'bg-emerald-50/40' : ''}`}>
                              <td className="px-2 py-1.5 text-center text-slate-400">{i + 1}</td>
                              <td className="px-3 py-1.5 font-semibold uppercase">{r.item}</td>
                              <td className="px-3 py-1.5">
                                {r.variantSku
                                  ? <span className="font-mono text-blue-700 font-bold">{r.variantSku}</span>
                                  : <span className="text-slate-400 italic text-[10px]">{receiveProductId ? 'no variant match' : '— pick product —'}</span>}
                              </td>
                              <td className="px-3 py-1.5 uppercase text-slate-700">{r.color}</td>
                              <td className="px-3 py-1.5 text-center font-mono">{r.size}</td>
                              <td className="px-3 py-1.5 text-right font-mono font-semibold">{r.sent}</td>
                              <td className="px-2 py-1.5">
                                <input type="number" min="0" max={r.sent - rej} step="1" value={recv || ''}
                                  onChange={e => {
                                    const n = Math.min(r.sent - rej, Math.max(0, Number(e.target.value) || 0))
                                    setReceivedByVariant(p => ({ ...p, [r.key]: n }))
                                  }}
                                  placeholder="0"
                                  className="w-full px-2 py-1 text-xs border border-slate-200 rounded text-right font-mono focus:outline-none focus:border-emerald-500"/>
                              </td>
                              <td className="px-2 py-1.5">
                                <input type="number" min="0" max={r.sent - recv} step="1" value={rej || ''}
                                  onChange={e => {
                                    const n = Math.min(r.sent - recv, Math.max(0, Number(e.target.value) || 0))
                                    setRejectedByVariant(p => ({ ...p, [r.key]: n }))
                                  }}
                                  placeholder="0"
                                  className="w-full px-2 py-1 text-xs border border-slate-200 rounded text-right font-mono focus:outline-none focus:border-red-500"/>
                              </td>
                              <td className={`px-3 py-1.5 text-right font-mono font-bold ${pending > 0 ? 'text-amber-600' : 'text-slate-400'}`}>{pending}</td>
                              <td className={`px-3 py-1.5 text-right font-mono ${pending > 0 ? 'text-amber-600' : 'text-slate-400'}`}>{pendingM ? pendingM.toFixed(2) : '—'}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot className="bg-slate-50 border-t-2 border-slate-300">
                        <tr>
                          <td colSpan={5} className="px-3 py-2 text-right text-[11px] uppercase font-bold text-slate-600">Total</td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-slate-700">{totalSentAll}</td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">{totalReceivedAll}</td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-red-700">{totalRejectedAll}</td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-amber-700">{totalPendingPcs}</td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-amber-700">{totalPendingMeter.toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  )}

                  {/* ── Return Unused Fabric (when tailor doesn't finish all pieces) ── */}
                  {receivable.length > 0 && (
                    <div className="mt-4 bg-amber-50/60 border border-amber-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="text-[10px] text-amber-700 uppercase tracking-wide font-bold">🧵 Return Unused Fabric (tailor didn't finish)</div>
                          <div className="text-[11px] text-slate-600 mt-0.5">
                            Agar tailor ne sab pieces nahi banaii — bachi howi fabric warehouse may wapis aa jayegi (stock receipt).
                          </div>
                        </div>
                        <button type="button"
                          onClick={() => {
                            // Prefill from first material line
                            const matLines = lines.filter(l => l.kind === 'material')
                            const first = matLines[0]
                            setReturnedFabric(p => [...p, {
                              item_code: first?.item_code || '',
                              name:      first?.description || (items.find(it => String(it.id) === String(first?.stock_item_id))?.name) || '',
                              color:     first?.color || '',
                              size:      first?.size  || '',
                              qty:       '',
                              uom:       first?.uom || 'METER',
                            }])
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 bg-amber-600 text-white text-[11px] font-bold rounded hover:bg-amber-700">
                          <Plus className="w-3 h-3"/> Add Return Row
                        </button>
                      </div>
                      {returnedFabric.length > 0 ? (
                        <table className="w-full text-xs bg-white border border-amber-200 rounded">
                          <thead className="bg-amber-100">
                            <tr>
                              <th className="text-center w-8 px-2 py-1.5 text-[10px] uppercase text-amber-800">#</th>
                              <th className="text-left  px-2 py-1.5 text-[10px] uppercase text-amber-800 w-32">SKU / Code</th>
                              <th className="text-left  px-2 py-1.5 text-[10px] uppercase text-amber-800">Description</th>
                              <th className="text-left  px-2 py-1.5 text-[10px] uppercase text-amber-800 w-24">Color</th>
                              <th className="text-right px-2 py-1.5 text-[10px] uppercase text-amber-800 w-24">Qty</th>
                              <th className="text-left  px-2 py-1.5 text-[10px] uppercase text-amber-800 w-20">UoM</th>
                              <th className="w-10"/>
                            </tr>
                          </thead>
                          <tbody>
                            {returnedFabric.map((rf, i) => (
                              <tr key={i} className="border-t border-amber-100">
                                <td className="px-2 py-1 text-center text-slate-400">{i + 1}</td>
                                <td className="px-2 py-1">
                                  <input value={rf.item_code}
                                    onChange={e => setReturnedFabric(p => p.map((x, idx) => idx === i ? { ...x, item_code: e.target.value } : x))}
                                    placeholder="FAB-0001-BLUE"
                                    list={`fab-returns-${i}`}
                                    className="w-full px-1.5 py-1 text-xs border border-amber-200 rounded font-mono"/>
                                  <datalist id={`fab-returns-${i}`}>
                                    {lines.filter(l => l.kind === 'material' && l.item_code).map(l => (
                                      <option key={l.item_code} value={l.item_code}>{l.description || l.color}</option>
                                    ))}
                                  </datalist>
                                </td>
                                <td className="px-2 py-1">
                                  <input value={rf.name}
                                    onChange={e => setReturnedFabric(p => p.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))}
                                    placeholder="Cotton Plain"
                                    className="w-full px-1.5 py-1 text-xs border border-amber-200 rounded"/>
                                </td>
                                <td className="px-2 py-1">
                                  <input value={rf.color}
                                    onChange={e => setReturnedFabric(p => p.map((x, idx) => idx === i ? { ...x, color: e.target.value } : x))}
                                    placeholder="Blue Black"
                                    className="w-full px-1.5 py-1 text-xs border border-amber-200 rounded"/>
                                </td>
                                <td className="px-2 py-1">
                                  <input type="number" step="0.01" value={rf.qty}
                                    onChange={e => setReturnedFabric(p => p.map((x, idx) => idx === i ? { ...x, qty: e.target.value } : x))}
                                    placeholder="0.00"
                                    className="w-full px-1.5 py-1 text-xs border border-amber-200 rounded text-right font-mono"/>
                                </td>
                                <td className="px-2 py-1">
                                  <input value={rf.uom}
                                    onChange={e => setReturnedFabric(p => p.map((x, idx) => idx === i ? { ...x, uom: e.target.value } : x))}
                                    placeholder="METER"
                                    className="w-full px-1.5 py-1 text-xs border border-amber-200 rounded"/>
                                </td>
                                <td className="px-2 py-1 text-center">
                                  <button onClick={() => setReturnedFabric(p => p.filter((_, idx) => idx !== i))}
                                    className="text-slate-400 hover:text-red-600 p-1">
                                    <Trash2 className="w-3 h-3"/>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-amber-50 border-t-2 border-amber-300">
                            <tr>
                              <td colSpan={4} className="px-3 py-1.5 text-right text-[10px] uppercase font-bold text-amber-800">Total Return</td>
                              <td className="px-3 py-1.5 text-right font-mono font-bold text-amber-800">
                                {returnedFabric.reduce((s, x) => s + (parseFloat(x.qty) || 0), 0).toFixed(2)}
                              </td>
                              <td colSpan={2}/>
                            </tr>
                          </tfoot>
                        </table>
                      ) : (
                        <div className="text-[11px] text-slate-500 italic text-center py-2">No fabric to return — click "+ Add Return Row" if tailor returned unused material.</div>
                      )}
                      {returnedFabric.some(r => parseFloat(r.qty) > 0) && (
                        <div className="mt-2 flex items-center justify-end">
                          <button type="button"
                            onClick={async () => {
                              const rows = returnedFabric.filter(r => parseFloat(r.qty) > 0 && r.item_code)
                              if (rows.length === 0) { toast.error('No valid return rows'); return }
                              try {
                                await api.post('/inventory/stock-movements', {
                                  type:             'receipt',
                                  date:             dateStr,
                                  from_location_id: toLoc ? Number(toLoc) : null,
                                  to_location_id:   fromLoc ? Number(fromLoc) : null,
                                  reference:        `${orderNo || 'TO'}-RET-FABRIC`,
                                  notes:            `Fabric returned from tailor (unfinished work) — order ${orderNo || ''}`,
                                  lines: rows.map(r => ({
                                    stock_item_id: null,
                                    item_code:     r.item_code,
                                    description:   r.name || null,
                                    color:         r.color || null,
                                    size:          r.size  || null,
                                    qty:           parseFloat(r.qty),
                                    uom:           r.uom || 'METER',
                                    unit_cost:     0,
                                  })),
                                })
                                toast.success(`Returned ${rows.reduce((s, r) => s + parseFloat(r.qty), 0).toFixed(2)} ${rows[0].uom} fabric to warehouse`)
                                setReturnedFabric([])
                              } catch (e: any) {
                                toast.error(e?.response?.data?.message || 'Failed to post fabric return')
                              }
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700">
                            ← Post Fabric Return to Warehouse
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Returned fabric (from rejected pieces) — recoverable to inventory */}
                  {receivable.length > 0 && totalRejectedAll > 0 && (
                    <div className="mt-3 bg-rose-50 border border-rose-200 rounded-lg p-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] text-rose-700 uppercase tracking-wide font-bold">Rejected — Fabric Returned to Stock</div>
                        <div className="text-[11px] text-slate-700 mt-0.5">
                          {totalRejectedAll} pcs rejected · approx <b className="font-mono">{totalReturnedMeter.toFixed(2)}m</b> fabric returnable to stock (so it can be returned to supplier).
                        </div>
                      </div>
                      <button type="button"
                        onClick={() => toast.success(`Marked ${totalReturnedMeter.toFixed(2)}m fabric for return-to-stock (manual stock adjustment pending integration)`)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700">
                        Return to Stock
                      </button>
                    </div>
                  )}

                  {/* Auto-bill summary */}
                  {receivable.length > 0 && (
                    <div className="mt-4 border-t-2 border-dashed border-slate-200 pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                          <div className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">Tailor</div>
                          <div className="text-sm font-bold text-slate-800 mt-1">{tailorMap[Number(tailorId)]?.name ?? '—'}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{locations.find(l => String(l.id) === toLoc)?.name ?? '—'}</div>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                          <div className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">Bill / Order No</div>
                          <div className="text-sm font-bold text-slate-800 mt-1 font-mono">{orderNo || '(auto)'}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">Date: {dateStr}</div>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                          <div className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">Stitching Deduction (RM)</div>
                          <input type="number" min="0" step="0.01" value={stitchDeduction}
                            onChange={e => setStitchDeduction(e.target.value)}
                            placeholder="0.00"
                            className="w-full mt-1 px-2 py-1.5 text-sm border border-slate-200 rounded text-right font-mono focus:outline-none focus:border-red-500"/>
                          <div className="text-[10px] text-slate-500 mt-0.5">Manual — half-price for rejected stitch / penalties etc.</div>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                          <div className="text-[10px] text-emerald-700 uppercase tracking-wide font-semibold">Bill Net</div>
                          <div className="text-base font-extrabold text-emerald-800 mt-1 font-mono">RM {billNet.toFixed(2)}</div>
                          <div className="text-[10px] text-emerald-700 mt-0.5">
                            Gross: RM {billGross.toFixed(2)} ({totalReceivedAll}×{stitchPerPiece.toFixed(2)})
                            {dedRm > 0 && <> · −RM {dedRm.toFixed(2)}</>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        {allSettled ? (
                          <button onClick={handleGenerateBill} disabled={billed}
                            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-60">
                            <Banknote className="w-3.5 h-3.5"/>
                            {billed ? 'Bill Already Issued' : 'Auto-Issue Bill to Tailor'}
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Bill auto-issues when all items settled (received + rejected = sent). Pending {totalPendingPcs} pcs ({totalPendingMeter.toFixed(2)}m fabric) at tailor.
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })()}

          {/* SECTION 3: Receipts (installments) — Step 4 */}
          {activeStep === 4 && editing && (
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
              <div className="px-4 py-2 border-b border-slate-100 bg-teal-50/40 flex items-center justify-between">
                <h3 className="text-xs font-bold text-teal-700 uppercase tracking-wide">④ Receipts from Tailor — Order: {orderQty} · Received: {totalReceived} · Remaining: {remaining.toFixed(2)}</h3>
              </div>
              <div className="px-4 py-3">
                <table className="w-full text-xs mb-3">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="text-center w-8 px-2 py-1.5 text-[10px]">#</th>
                      <th className="text-left px-3 py-1.5 text-[11px] uppercase w-28">Date</th>
                      <th className="text-right px-3 py-1.5 text-[11px] uppercase w-24">Qty</th>
                      <th className="text-left px-3 py-1.5 text-[11px] uppercase w-32">Reference</th>
                      <th className="text-left px-3 py-1.5 text-[11px] uppercase">Notes</th>
                      <th className="text-left px-3 py-1.5 text-[11px] uppercase w-32">Movement</th>
                      <th className="text-center w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipts.length === 0 ? (
                      <tr><td colSpan={7} className="py-4 text-center text-slate-400 italic">No receipts yet — add the first one below ↓</td></tr>
                    ) : receipts.map((r, i) => (
                      <tr key={r.id} className="border-t border-slate-100">
                        <td className="px-2 py-1 text-center text-slate-400">{i+1}</td>
                        <td className="px-3 py-1 font-mono">{(r.date||'').toString().split('T')[0]}</td>
                        <td className="px-3 py-1 text-right font-mono font-semibold text-teal-700">{Number(r.qty).toFixed(2)}</td>
                        <td className="px-3 py-1 text-slate-600">{r.reference ?? '—'}</td>
                        <td className="px-3 py-1 text-slate-500 truncate max-w-[200px]">{r.notes ?? '—'}</td>
                        <td className="px-3 py-1 font-mono text-[10px] text-slate-500">{r.movement?.movement_no ?? '—'}</td>
                        <td className="px-2 py-1 text-center">
                          {!billed && <button onClick={()=>handleDeleteReceipt(r)} className="p-0.5 text-slate-400 hover:text-red-600"><Trash2 className="w-3 h-3"/></button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Add receipt form (only after fabric is issued) */}
                {fabricIssued && !billed && remaining > 0 && (
                  <div className="border-t border-slate-200 pt-3 mt-2 bg-teal-50/30 -mx-4 -mb-3 px-4 py-3">
                    <div className="text-[11px] font-bold text-teal-700 uppercase mb-2">+ Add Receipt</div>
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-2"><label className="block text-[10px] text-slate-500 mb-0.5">Date</label><input type="date" value={recDate} onChange={e=>setRecDate(e.target.value)} className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-mono"/></div>
                      <div className="col-span-2"><label className="block text-[10px] text-slate-500 mb-0.5">Qty (max {remaining.toFixed(2)})</label><input type="number" step="0.001" value={recQty} onChange={e=>setRecQty(e.target.value)} className="w-full px-2 py-1 text-xs border border-slate-300 rounded text-right font-mono"/></div>
                      <div className="col-span-2"><label className="block text-[10px] text-slate-500 mb-0.5">Reference</label><input value={recRef} onChange={e=>setRecRef(e.target.value)} className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-mono"/></div>
                      <div className="col-span-4"><label className="block text-[10px] text-slate-500 mb-0.5">Notes</label><input value={recNotes} onChange={e=>setRecNotes(e.target.value)} className="w-full px-2 py-1 text-xs border border-slate-300 rounded"/></div>
                      <div className="col-span-2 flex items-end">
                        <button onClick={handleAddReceipt} className="w-full flex items-center justify-center gap-1 px-3 py-1 bg-teal-600 text-white text-xs font-medium rounded hover:bg-teal-700">
                          <Plus className="w-3.5 h-3.5"/> Add Receipt
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {!fabricIssued && (
                  <div className="text-center py-3 text-xs text-slate-400 italic">⚠ Issue fabric first (button on top), then receipts can be recorded.</div>
                )}
              </div>
            </div>
          )}

          {/* Step 4 sub-card: Auto-push to Online Platforms */}
          {activeStep === 4 && (
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
              <div className="px-4 py-2 border-b border-slate-100 bg-indigo-50/40 flex items-center justify-between">
                <h3 className="text-xs font-bold text-indigo-700 uppercase tracking-wide">Auto-Push to Online Platforms</h3>
                <span className="text-[10px] text-slate-400 italic">setup later — currently records selection only</span>
              </div>
              <div className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  {ONLINE_PLATFORMS.map(p => {
                    const on = pushPlatforms.includes(p.id)
                    return (
                      <button key={p.id} type="button" onClick={() => togglePlatform(p.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-xs font-medium transition-all ${
                          on ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-slate-900 shadow-sm' :
                               'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                        }`}>
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                        {p.label}
                        {on && <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent)]" />}
                      </button>
                    )
                  })}
                </div>
                <div className="mt-3 text-[11px] text-slate-400 italic">
                  📌 Selected: <b>{pushPlatforms.length || 'none'}</b> · Jab tailor se goods received hote hain to selected platforms par auto-listing trigger hoga (API integration pending).
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: Bill — Step 5 */}
          {activeStep === 5 && editing && (
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
              <div className="px-4 py-2 border-b border-slate-100 bg-emerald-50/40 flex items-center justify-between">
                <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wide">⑤ Generate Tailor Invoice (Stitching only)</h3>
              </div>
              <div className="px-4 py-3">
                {billed ? (
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded p-3">
                    <div>
                      <div className="text-xs text-emerald-700 font-bold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5"/> Bill Generated</div>
                      <div className="text-[11px] text-slate-600 mt-0.5">PI #{billPiId} created for {tailorMap[Number(tailorId)]?.name} (tailor service portion only)</div>
                    </div>
                    <a href={`/suppliers/purchase`} className="text-xs px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700">Open Suppliers → PI</a>
                  </div>
                ) : receivedQty > 0 ? (
                  <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded p-3">
                    <div>
                      <div className="text-xs text-amber-700 font-bold">Ready to Bill</div>
                      <div className="text-[11px] text-slate-600 mt-0.5">Total tailor charges: <b>RM {(breakdown.tailor_service * (totalReceived / Math.max(parseFloat(orderQty),1))).toFixed(2)}</b> for {totalReceived} pcs received. Click "Generate Bill" on top to create the PI.</div>
                    </div>
                    <button onClick={handleGenerateBill} className="text-xs px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 flex items-center gap-1"><Banknote className="w-3.5 h-3.5"/> Generate Bill Now</button>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic text-center py-2">No receipts yet — bill is generated after at least one receipt.</div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    )
  }

  // ─── LIST VIEW ───
  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200">
            <ArrowLeft className="w-3.5 h-3.5"/> Back
          </button>
          <div className="w-9 h-9 bg-fuchsia-50 rounded-xl flex items-center justify-center"><Send className="w-5 h-5 text-fuchsia-600"/></div>
          <div>
            <h1 className="text-base font-bold text-slate-800">Tailor Orders / Send to Tailor</h1>
            <p className="text-xs text-slate-400">Production lifecycle: order → issue fabric → receive (×N) → generate bill</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-1.5 bg-fuchsia-600 text-white text-xs font-medium rounded-lg hover:bg-fuchsia-700">
            <Plus className="w-3.5 h-3.5"/> New Tailor Order
          </button>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-600 text-white text-xs font-medium rounded-lg hover:bg-slate-700">
            <RefreshCw className="w-3.5 h-3.5"/> Refresh
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 border-b border-slate-200">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by order# or reference..." className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded"/>
        </div>
        <div className="text-xs text-slate-500">{orders.length} order{orders.length!==1?'s':''}</div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-700 text-white">
              <th className="w-8 px-2 py-2 text-center font-medium">#</th>
              <th className="text-left px-3 py-2 font-semibold">Order No.</th>
              <th className="text-left px-3 py-2 font-semibold">Date</th>
              <th className="text-left px-3 py-2 font-semibold">Tailor</th>
              <th className="text-left px-3 py-2 font-semibold">Product</th>
              <th className="text-right px-3 py-2 font-semibold">Order Qty</th>
              <th className="text-right px-3 py-2 font-semibold">Received</th>
              <th className="text-right px-3 py-2 font-semibold">Remaining</th>
              <th className="text-right px-3 py-2 font-semibold">Expected Cost</th>
              <th className="text-center px-3 py-2 font-semibold">Status</th>
              <th className="text-center px-3 py-2 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={11} className="py-8 text-center text-slate-400">Loading…</td></tr>
            : orders.length === 0 ? (
              <tr><td colSpan={11} className="py-16 text-center text-slate-400">
                <Send className="w-10 h-10 mx-auto mb-2 opacity-30"/>
                <p className="text-sm">No tailor orders yet</p>
                <button onClick={openCreate} className="mt-2 px-3 py-1.5 bg-fuchsia-600 text-white text-xs rounded">Create First Tailor Order</button>
              </td></tr>
            ) : orders.map((o, idx) => {
              const remain = Math.max(Number(o.order_qty) - Number(o.received_qty ?? 0), 0)
              return (
                <tr key={o.id} onDoubleClick={()=>openEdit(o)} className={`border-b border-slate-100 cursor-pointer transition-colors ${idx%2===0 ? 'bg-white hover:bg-fuchsia-50' : 'bg-slate-50/60 hover:bg-fuchsia-50'}`}>
                  <td className="px-2 py-1.5 text-center text-slate-400">{idx+1}</td>
                  <td className="px-3 py-1.5 font-mono font-bold text-fuchsia-700">{o.order_no}</td>
                  <td className="px-3 py-1.5 font-mono text-slate-600">{(o.date||'').toString().split('T')[0]}</td>
                  <td className="px-3 py-1.5 text-slate-700">{o.tailor?.name ?? '—'}</td>
                  <td className="px-3 py-1.5 text-slate-700">{o.product?.sku} <span className="text-slate-400 text-[10px]">{o.product?.name}</span></td>
                  <td className="px-3 py-1.5 text-right font-mono">{Number(o.order_qty).toFixed(2)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-teal-700">{Number(o.received_qty ?? 0).toFixed(2)}</td>
                  <td className={`px-3 py-1.5 text-right font-mono ${remain > 0 ? 'text-amber-600' : 'text-slate-400'}`}>{remain.toFixed(2)}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{Number(o.expected_cost ?? 0).toFixed(2)}</td>
                  <td className="px-3 py-1.5 text-center"><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${STATUS_BADGES[o.status]}`}>{STATUS_LABELS[o.status]}</span></td>
                  <td className="px-3 py-1.5 text-center" onClick={e=>e.stopPropagation()}>
                    <button onClick={()=>openEdit(o)} className="p-1 rounded text-slate-400 hover:text-fuchsia-600 hover:bg-fuchsia-50" title="Open"><Pencil className="w-3 h-3"/></button>
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
