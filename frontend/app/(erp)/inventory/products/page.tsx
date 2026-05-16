'use client'

import { useEffect, useState, useCallback, useMemo, useRef, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import {
  Package, Plus, RefreshCw, Pencil, Trash2, X, Loader2, Save,
  Search, ArrowLeft, FilePlus, ChevronUp, ChevronDown, Wand2,
  Tag, Barcode, Globe, Layers, Sparkles,
} from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import { formatCurrency } from '@/lib/utils'

type ProductType = 'apparel' | 'fabric' | 'accessory' | 'service' | 'raw_material'
type Variant = {
  id?:             number
  sku?:            string
  barcode?:        string | null
  color?:          string | null
  size?:           string | null
  variant_label?:  string | null
  cost_price:      number | string
  sale_price:      number | string
  original_price:  number | string
  wholesale_price?:number | string
  stock:           number | string
  reorder_level?:  number | string
  weight_kg?:      number | string | null
  is_active:       boolean
}
type Product = {
  id:               number
  sku:              string
  barcode:          string | null
  name:             string
  name_bm:          string | null
  description:      string | null
  description_short:string | null
  category:         string | null
  collection_id:    number | null
  product_type:     ProductType
  brand:            string | null
  tags:             string[] | null
  cost_price:       number
  sale_price:       number
  original_price:   number
  stock:            number
  low_stock_alert:  number
  costing_method:   string
  tax_rate:         number
  hs_code:          string | null
  country_of_origin:string | null
  weight_kg:        number | null
  seo_slug:         string | null
  seo_title:        string | null
  seo_description:  string | null
  channels:         string[] | null
  status:           'draft' | 'active' | 'archived'
  is_active:        boolean
  variants?:        Variant[]
}

const CHANNELS = [
  { key: 'pos',         label: 'POS (in-store)',     emoji: '🏪' },
  { key: 'shopify',     label: 'Shopify',            emoji: '🛒' },
  { key: 'shopee_my',   label: 'Shopee MY',          emoji: '🇲🇾' },
  { key: 'shopee_sg',   label: 'Shopee SG',          emoji: '🇸🇬' },
  { key: 'tiktok_my',   label: 'TikTok Shop MY',     emoji: '🎵' },
  { key: 'lazada_my',   label: 'Lazada MY',          emoji: '📦' },
  { key: 'website',     label: 'Own Website',        emoji: '🌐' },
]

const PRODUCT_TYPES: Array<{ key: ProductType; label: string; emoji: string }> = [
  { key: 'apparel',      label: 'Apparel (Finished Good)', emoji: '👗' },
  { key: 'fabric',       label: 'Fabric (per meter)',      emoji: '🧵' },
  { key: 'accessory',    label: 'Accessory',               emoji: '👜' },
  { key: 'service',      label: 'Service',                 emoji: '🛠️' },
  { key: 'raw_material', label: 'Raw Material',            emoji: '📦' },
]

const TYPE_BADGE: Record<ProductType, string> = {
  apparel: 'bg-violet-100 text-violet-700',
  fabric: 'bg-blue-100 text-blue-700',
  accessory: 'bg-rose-100 text-rose-700',
  service: 'bg-slate-100 text-slate-600',
  raw_material: 'bg-amber-100 text-amber-700',
}

const emptyForm = {
  sku: '',
  barcode: '',
  gtin: '',
  mpn: '',
  google_product_category: '',
  fb_product_category: '',
  name: '',
  name_bm: '',
  description: '',
  description_short: '',
  category: '',
  collection_id: '' as string,
  product_type: 'apparel' as ProductType,
  brand: '',
  tags: [] as string[],
  care_instructions: '',
  condition: 'new' as 'new'|'refurbished'|'used',
  gender: '' as ''|'female'|'male'|'unisex',
  age_group: '' as ''|'adult'|'kids'|'teen'|'toddler'|'newborn',
  material: '',
  fabrics_used: [] as { sku: string; name: string; qty_per_piece: string; uom: string; color: string }[],
  pattern: '',
  color: '',
  size_type: '' as ''|'regular'|'petite'|'plus'|'tall'|'maternity',
  featured_image_url: '',
  gallery_urls: [] as string[],
  og_image_url: '',
  video_url: '',
  cost_price: '0',
  sale_price: '0',
  original_price: '0',
  uom: 'PCS',
  low_stock_alert: '5',
  costing_method: 'average' as 'fifo'|'lifo'|'average',
  tax_rate: '6',
  hs_code: '',
  country_of_origin: 'Malaysia',
  weight_kg: '',
  seo_slug: '',
  seo_title: '',
  seo_description: '',
  focus_keyword: '',
  secondary_keywords: [] as string[],
  canonical_url: '',
  robots: 'index,follow' as string,
  twitter_card: 'summary_large_image' as string,
  is_featured: false,
  is_bestseller: false,
  is_new_arrival: false,
  sale_starts_at: '',
  sale_ends_at: '',
  launch_date: '',
  channels: ['pos'] as string[],
  status: 'active' as 'draft'|'active'|'archived',
  is_active: true,
}

// ── Google Product Categories (top apparel/textile branches) ──
const GOOGLE_CATEGORIES = [
  '166 — Apparel & Accessories',
  '1604 — Apparel & Accessories > Clothing',
  '1581 — Apparel & Accessories > Clothing > Dresses',
  '1604 — Apparel & Accessories > Clothing > Outerwear',
  '212 — Apparel & Accessories > Clothing > Shirts & Tops',
  '209 — Apparel & Accessories > Clothing > Skirts',
  '5188 — Apparel & Accessories > Clothing > Traditional & Ceremonial Clothing',
  '189 — Apparel & Accessories > Clothing Accessories',
  '4955 — Arts & Entertainment > Hobbies > Crafts > Craft Supplies > Sewing & Quilting',
  '128 — Arts & Entertainment > Hobbies > Crafts > Craft Supplies > Sewing & Quilting > Fabric',
]

const newVariant = (): Variant => ({
  color: '', size: '', cost_price: '', sale_price: '', original_price: '',
  stock: '0', reorder_level: '0', is_active: true,
})

// ── auto-fill suggestions ─────────────────────────────────
const TAG_SUGGESTIONS = [
  { group: 'Occasion', tags: ['Eid 2026', 'Hari Raya', 'Festive', 'Wedding', 'Birthday'] },
  { group: 'Status',   tags: ['Bestseller', 'New Arrival', 'Limited Edition', 'Restock'] },
  { group: 'Season',   tags: ['2026 Collection', 'Pre-Order', 'Sale', 'Clearance'] },
  { group: 'Style',    tags: ['Modest', 'Modern', 'Traditional', 'Plus Size'] },
]
const CARE_TEMPLATES = [
  { label: 'Hand wash',     text: 'Hand wash with cold water · Do not bleach · Iron at low temperature · Hang dry in shade' },
  { label: 'Machine wash',  text: 'Machine wash cold · Gentle cycle · Tumble dry low · Iron if needed' },
  { label: 'Dry clean',     text: 'Dry clean only · Do not wash at home · Iron at low temperature' },
  { label: 'Delicate',      text: 'Gentle hand wash · Cold water only · Do not wring · Lay flat to dry' },
]

// slugify helper
const slugify = (s: string) => s.toLowerCase().replace(/[|\s_]+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')

export default function ProductsPage() {
  const router = useRouter()
  const [records, setRecords] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
  const [categories, setCategories] = useState<{ id: number; name: string; is_active: boolean }[]>([])
  const [productTypes, setProductTypes] = useState<{ id: number; key: string; label: string; emoji: string|null; is_active: boolean }[]>([])
  const [collections, setCollections] = useState<{ id: number; name: string }[]>([])
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [stats, setStats] = useState<any>(null)

  // ── Per-column filters (client-side, applied to records) ──
  const [fSku,      setFSku]      = useState('')
  const [fName,     setFName]     = useState('')
  const [fBrand,    setFBrand]    = useState('')
  const [fVariants, setFVariants] = useState<'' | 'has' | 'none'>('')
  const [fSaleMin,  setFSaleMin]  = useState('')
  const [fSaleMax,  setFSaleMax]  = useState('')
  const [fStock,    setFStock]    = useState<'' | 'in' | 'low' | 'out'>('')
  const [fChannel,  setFChannel]  = useState('')
  const [fStatus,   setFStatus]   = useState('')

  function clearFilters() {
    setFSku(''); setFName(''); setFBrand(''); setFVariants('')
    setFSaleMin(''); setFSaleMax(''); setFStock(''); setFChannel(''); setFStatus('')
  }
  const hasFilters = !!(fSku || fName || fBrand || fVariants || fSaleMin || fSaleMax || fStock || fChannel || fStatus)

  const [mode, setMode] = useState<'list'|'create'|'edit'>('list')
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState<typeof emptyForm>(emptyForm)
  const [variants, setVariants] = useState<Variant[]>([])
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [aiFilling, setAiFilling] = useState(false)

  // generator state
  const [genColors, setGenColors] = useState('')
  const [genSizes, setGenSizes]   = useState('XS, S, M, L, XL, 2XL')

  // ── auto-fill SEO — track manual edits so we stop overwriting once user types in those fields ──
  const seoEdited = useRef({ slug: false, title: false, desc: false })
  useEffect(() => {
    if (!form.name) return
    setForm(p => {
      const next = { ...p }
      if (!seoEdited.current.slug)  next.seo_slug = slugify(p.name)
      if (!seoEdited.current.title) next.seo_title = `${p.name}${p.brand ? ' — ' + p.brand : ''}`
      if (!seoEdited.current.desc)  next.seo_description = p.description_short || (p.description?.slice(0, 160) ?? '')
      return next
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.name, form.brand, form.description_short, form.description])

  // reset auto-edit flags when switching to a new product or starting fresh
  useEffect(() => {
    seoEdited.current = { slug: false, title: false, desc: false }
  }, [editing?.id, mode])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pr, st] = await Promise.all([
        api.get('/inventory/products', { params: { search, product_type: typeFilter || undefined, per_page: 500 } }),
        api.get('/inventory/products/stats').catch(() => ({ data: { data: null } })),
      ])
      setRecords(pr.data.data ?? [])
      setStats(st.data.data ?? null)
    } catch {} finally { setLoading(false) }
  }, [search, typeFilter])

  useEffect(() => { load() }, [load])

  // Categories + Types + Collections masters — drive the Category, Product Type & Collection dropdowns
  useEffect(() => {
    api.get('/inventory/product-categories').then(r => setCategories(r.data.data ?? [])).catch(() => {})
    api.get('/inventory/product-types').then(r => setProductTypes(r.data.data ?? [])).catch(() => {})
    api.get('/inventory/product-collections/flat').then(r => setCollections(r.data.data ?? [])).catch(() => {})
  }, [mode])

  // ── Apply client-side column filters ──
  const filteredRecords = useMemo(() => {
    return records.filter(p => {
      if (fSku  && !(p.sku ?? '').toLowerCase().includes(fSku.toLowerCase()))   return false
      if (fName) {
        const hay = `${p.name ?? ''} ${p.name_bm ?? ''}`.toLowerCase()
        if (!hay.includes(fName.toLowerCase())) return false
      }
      if (fBrand && !(p.category ?? '').toLowerCase().includes(fBrand.toLowerCase())) return false
      const vCount = p.variants?.length ?? 0
      if (fVariants === 'has'  && vCount === 0) return false
      if (fVariants === 'none' && vCount  >  0) return false
      const sale = Number(p.sale_price ?? 0)
      if (fSaleMin && sale < parseFloat(fSaleMin)) return false
      if (fSaleMax && sale > parseFloat(fSaleMax)) return false
      const totalStock = vCount > 0 ? (p.variants ?? []).reduce((s,v)=>s+(parseFloat(String(v.stock))||0),0) : Number(p.stock ?? 0)
      if (fStock === 'in'  && !(totalStock > 5))  return false
      if (fStock === 'low' && !(totalStock > 0 && totalStock <= 5)) return false
      if (fStock === 'out' && !(totalStock === 0)) return false
      if (fChannel && !((p.channels ?? []).includes(fChannel))) return false
      if (fStatus && p.status !== fStatus) return false
      return true
    })
  }, [records, fSku, fName, fBrand, fVariants, fSaleMin, fSaleMax, fStock, fChannel, fStatus])

  const sf = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  function resetForm() {
    setForm(emptyForm); setVariants([]); setTagInput(''); setGenColors(''); setGenSizes('XS, S, M, L, XL, 2XL')
  }
  function openCreate() { setEditing(null); resetForm(); setMode('create') }
  function openEdit(p: Product) {
    setEditing(p)
    const a = p as any
    setForm({
      sku: p.sku ?? '',
      barcode: p.barcode ?? '',
      gtin: a.gtin ?? '',
      mpn: a.mpn ?? '',
      google_product_category: a.google_product_category ?? '',
      fb_product_category: a.fb_product_category ?? '',
      name: p.name,
      name_bm: p.name_bm ?? '',
      description: p.description ?? '',
      description_short: p.description_short ?? '',
      category: p.category ?? '',
      collection_id: p.collection_id ? String(p.collection_id) : '',
      product_type: p.product_type,
      brand: p.brand ?? '',
      tags: p.tags ?? [],
      care_instructions: a.care_instructions ?? '',
      condition: a.condition ?? 'new',
      gender:    a.gender ?? '',
      age_group: a.age_group ?? '',
      material:  a.material ?? '',
      fabrics_used: ((a as any).fabrics_used ?? []).map((f: any) => ({
        sku:           f.sku ?? '',
        name:          f.name ?? '',
        qty_per_piece: f.qty_per_piece != null ? String(f.qty_per_piece) : '',
        uom:           f.uom ?? 'METER',
        color:         f.color ?? '',
      })),
      pattern:   a.pattern ?? '',
      color:     a.color ?? '',
      size_type: a.size_type ?? '',
      featured_image_url: a.featured_image_url ?? '',
      gallery_urls: a.gallery_urls ?? [],
      og_image_url: a.og_image_url ?? '',
      video_url: a.video_url ?? '',
      cost_price:     String(p.cost_price ?? 0),
      sale_price:     String(p.sale_price ?? 0),
      original_price: String(p.original_price ?? 0),
      uom: a.uom ?? 'PCS',
      low_stock_alert: String(p.low_stock_alert ?? 0),
      costing_method: (p.costing_method as any) ?? 'average',
      tax_rate: String(p.tax_rate ?? 6),
      hs_code: p.hs_code ?? '',
      country_of_origin: p.country_of_origin ?? 'Malaysia',
      weight_kg: p.weight_kg != null ? String(p.weight_kg) : '',
      seo_slug: p.seo_slug ?? '',
      seo_title: p.seo_title ?? '',
      seo_description: p.seo_description ?? '',
      focus_keyword: a.focus_keyword ?? '',
      secondary_keywords: a.secondary_keywords ?? [],
      canonical_url: a.canonical_url ?? '',
      robots: a.robots ?? 'index,follow',
      twitter_card: a.twitter_card ?? 'summary_large_image',
      is_featured: !!a.is_featured,
      is_bestseller: !!a.is_bestseller,
      is_new_arrival: !!a.is_new_arrival,
      sale_starts_at: a.sale_starts_at ? String(a.sale_starts_at).slice(0,16) : '',
      sale_ends_at:   a.sale_ends_at   ? String(a.sale_ends_at).slice(0,16)   : '',
      launch_date:    a.launch_date    ? String(a.launch_date).slice(0,10)    : '',
      channels: p.channels ?? [],
      status: p.status,
      is_active: p.is_active,
    })
    setVariants((p.variants ?? []).map(v => ({
      ...v,
      cost_price:     String(v.cost_price),
      sale_price:     String(v.sale_price),
      original_price: String(v.original_price),
      wholesale_price:v.wholesale_price != null ? String(v.wholesale_price) : '',
      stock:          String(v.stock),
      reorder_level:  v.reorder_level != null ? String(v.reorder_level) : '',
      weight_kg:      v.weight_kg != null ? String(v.weight_kg) : '',
    })))
    setMode('edit')
  }

  function setVariant(i: number, patch: Partial<Variant>) {
    setVariants(rs => rs.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  }
  function addVariant() {
    setVariants(rs => [...rs, {
      ...newVariant(),
      cost_price:     form.cost_price,
      sale_price:     form.sale_price,
      original_price: form.original_price,
      reorder_level:  form.low_stock_alert,
    }])
  }
  function removeVariant(i: number) { setVariants(rs => rs.filter((_, idx) => idx !== i)) }
  function moveVariant(i: number, d: -1|1) {
    setVariants(rs => { const j=i+d; if (j<0||j>=rs.length) return rs; const c=[...rs]; [c[i],c[j]]=[c[j],c[i]]; return c })
  }

  function runGenerator() {
    const colors = genColors.split(',').map(s => s.trim()).filter(Boolean)
    const sizes  = genSizes.split(',').map(s => s.trim()).filter(Boolean)
    if (colors.length === 0) { toast.error('At least one color required'); return }
    const isFabric = form.product_type === 'fabric' || form.product_type === 'raw_material'
    const newRows: Variant[] = []
    for (const c of colors) {
      const sList = sizes.length && !isFabric ? sizes : [null]
      for (const s of sList) {
        const exists = variants.some(v => (v.color ?? '').trim() === c && (v.size ?? '').trim() === (s ?? ''))
        if (exists) continue
        newRows.push({
          ...newVariant(),
          color: c,
          size: s,
          cost_price:     form.cost_price,
          sale_price:     form.sale_price,
          original_price: form.original_price,
        })
      }
    }
    if (newRows.length === 0) { toast('All combinations already exist', { icon: 'ℹ️' }); return }
    setVariants(rs => [...rs, ...newRows])
    toast.success(`Generated ${newRows.length} variants`)
  }

  function addTag() {
    const t = tagInput.trim()
    if (!t) return
    if (form.tags.includes(t)) { setTagInput(''); return }
    sf('tags', [...form.tags, t])
    setTagInput('')
  }
  function removeTag(t: string) { sf('tags', form.tags.filter(x => x !== t)) }
  function toggleChannel(k: string) {
    sf('channels', form.channels.includes(k) ? form.channels.filter(c => c !== k) : [...form.channels, k])
  }

  async function handleAiFill() {
    if (!form.name.trim()) { toast.error('Enter Product Name first — AI fills from it'); return }
    setAiFilling(true)
    try {
      const r = await api.post('/inventory/products/ai-fill', {
        name: form.name,
        product_type: form.product_type,
        brand: form.brand,
        category: form.category,
        color: form.color,
        description: form.description,
      })
      const f = r.data.data.fields ?? {}
      const fallback = r.data.data.fallback
      setForm(p => ({
        ...p,
        gtin:                    f.gtin                    ?? p.gtin,
        google_product_category: f.google_product_category ?? p.google_product_category,
        fb_product_category:     f.fb_product_category     ?? p.fb_product_category,
        condition:               f.condition               ?? p.condition,
        gender:                  f.gender                  ?? p.gender,
        age_group:               f.age_group               ?? p.age_group,
        size_type:               f.size_type               ?? p.size_type,
        material:                f.material                ?? p.material,
        pattern:                 f.pattern                 ?? p.pattern,
        color:                   f.color                   ?? p.color,
        tags:                    Array.isArray(f.tags) && f.tags.length ? Array.from(new Set([...p.tags, ...f.tags])) : p.tags,
        care_instructions:       f.care_instructions       ?? p.care_instructions,
        description_short:       f.description_short || p.description_short,
        description:             f.description       || p.description,
        seo_title:               f.seo_title         || p.seo_title,
        seo_description:         f.seo_description   || p.seo_description,
        focus_keyword:           f.focus_keyword     ?? p.focus_keyword,
        secondary_keywords:      Array.isArray(f.secondary_keywords) ? f.secondary_keywords : p.secondary_keywords,
        country_of_origin:       f.country_of_origin || p.country_of_origin,
      }))
      // Mark SEO fields as auto-filled by AI so they keep updating with name changes UNTIL user edits
      seoEdited.current = { slug: false, title: false, desc: false }
      if (fallback) {
        toast(`Used heuristic fill — add ANTHROPIC_API_KEY to .env for full AI`, { icon: '⚠️', duration: 5000 })
      } else {
        toast.success('✨ AI auto-fill complete')
      }
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'AI fill failed') }
    finally { setAiFilling(false) }
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Name required'); return }
    setSaving(true)
    const payload = {
      ...form,
      sku: form.sku || null,
      collection_id: form.collection_id ? Number(form.collection_id) : null,
      cost_price:     parseFloat(form.cost_price) || 0,
      sale_price:     parseFloat(form.sale_price) || 0,
      original_price: parseFloat(form.original_price) || 0,
      low_stock_alert:parseFloat(form.low_stock_alert) || 0,
      tax_rate:       parseFloat(form.tax_rate) || 0,
      weight_kg:      form.weight_kg ? parseFloat(form.weight_kg) : null,
      sale_starts_at: form.sale_starts_at || null,
      sale_ends_at:   form.sale_ends_at   || null,
      launch_date:    form.launch_date    || null,
      fabrics_used: (form.fabrics_used || [])
        .filter(f => (f.sku || f.name) && parseFloat(f.qty_per_piece) > 0)
        .map(f => ({
          sku:           f.sku || null,
          name:          f.name || null,
          qty_per_piece: parseFloat(f.qty_per_piece) || 0,
          uom:           f.uom || 'METER',
          color:         f.color || null,
        })),
      variants: variants.map(v => ({
        id: v.id,
        sku: v.sku || undefined,
        barcode: v.barcode || null,
        color: v.color || null,
        size: v.size || null,
        variant_label: v.variant_label || null,
        cost_price:     parseFloat(String(v.cost_price))     || 0,
        sale_price:     parseFloat(String(v.sale_price))     || 0,
        original_price: parseFloat(String(v.original_price)) || 0,
        wholesale_price:parseFloat(String(v.wholesale_price ?? 0)) || 0,
        stock:          parseFloat(String(v.stock))          || 0,
        reorder_level:  parseFloat(String(v.reorder_level ?? 0)) || 0,
        weight_kg:      v.weight_kg ? parseFloat(String(v.weight_kg)) : null,
        is_active:      v.is_active,
      })),
    }
    try {
      if (editing) await api.put(`/inventory/products/${editing.id}`, payload)
      else         await api.post('/inventory/products', payload)
      toast.success(editing ? 'Product updated' : 'Product created')
      setMode('list'); load()
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Save failed') }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!editing) return
    if (!confirm(`Archive product ${editing.name}? It will be hidden but variants/history preserved.`)) return
    try { await api.delete(`/inventory/products/${editing.id}`); toast.success('Archived'); setMode('list'); load() }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
  }

  // ── FORM VIEW ─────────────────────────────────────────────
  if (mode === 'create' || mode === 'edit') {
    const totalStock = variants.reduce((s, v) => s + (parseFloat(String(v.stock)) || 0), 0)
    const margin = (parseFloat(form.cost_price) > 0)
      ? ((parseFloat(form.sale_price) - parseFloat(form.cost_price)) / parseFloat(form.cost_price) * 100).toFixed(0)
      : null
    const discount = (parseFloat(form.original_price) > 0 && parseFloat(form.original_price) > parseFloat(form.sale_price))
      ? ((1 - parseFloat(form.sale_price) / parseFloat(form.original_price)) * 100).toFixed(0)
      : null

    return (
      <div className="fixed inset-0 z-40 flex flex-col bg-slate-100">
        <div className="bg-white border-b border-slate-200 px-5 py-2.5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setMode('list')}
              title="Back to products list"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-300 hover:border-violet-400 hover:bg-violet-50 text-slate-700 text-xs font-medium rounded">
              <ArrowLeft className="w-3.5 h-3.5"/> Back
            </button>
            <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center"><Package className="w-4 h-4 text-violet-600"/></div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">{editing ? `Edit ${editing.sku}` : 'New Product'}</h2>
              <p className="text-xs text-slate-400">Inventory → Products</p>
            </div>
            {editing && <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${form.status==='active'?'bg-emerald-100 text-emerald-700':form.status==='draft'?'bg-amber-100 text-amber-700':'bg-slate-200 text-slate-600'}`}>{form.status.toUpperCase()}</span>}
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={handleAiFill} disabled={aiFilling || saving || !form.name.trim()}
              title="AI auto-fills GTIN, Google Category, Material, Pattern, Tags, SEO, Description from Product Name"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-xs font-bold rounded hover:from-violet-700 hover:to-fuchsia-700 disabled:opacity-50 shadow-sm">
              {aiFilling ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Sparkles className="w-3.5 h-3.5"/>}
              {aiFilling ? 'AI Filling…' : '✨ AI Auto-Fill'}
            </button>
            <button onClick={() => { setEditing(null); resetForm() }} disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-violet-300 hover:bg-violet-50 text-slate-700 text-xs font-medium rounded">
              <FilePlus className="w-3.5 h-3.5 text-slate-500"/> New
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-xs font-medium rounded hover:bg-violet-700 disabled:opacity-60">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Save className="w-3.5 h-3.5"/>}
              Save
            </button>
            <button onClick={handleDelete} disabled={!editing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-700 text-xs font-medium rounded disabled:opacity-40">
              <Trash2 className="w-3.5 h-3.5 text-red-500"/> Archive
            </button>
            <button onClick={() => setMode('list')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded hover:bg-red-600">
              <X className="w-3.5 h-3.5"/> Close
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* ① Master fields */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
            <div className="px-4 py-2 border-b border-slate-100 bg-violet-50/40 flex items-center gap-2">
              <Package className="w-3.5 h-3.5 text-violet-600"/>
              <h3 className="text-xs font-bold text-violet-700 uppercase tracking-wide">① Product Master</h3>
            </div>
            <div className="px-4 py-3 grid grid-cols-12 gap-3">
              <div className="col-span-3">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">Type *</label>
                <select value={form.product_type} onChange={e=>sf('product_type', e.target.value as any)}
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white">
                  {productTypes.length === 0
                    ? PRODUCT_TYPES.map(t => <option key={t.key} value={t.key}>{t.emoji} {t.label}</option>)
                    : productTypes.filter(t => t.is_active).map(t => <option key={t.id} value={t.key}>{t.emoji ? `${t.emoji} ` : ''}{t.label}</option>)
                  }
                </select>
                <p className="text-[10px] text-slate-400 mt-0.5">Manage at <a href="/inventory/departments" className="text-violet-600 underline">Master Data Setup</a></p>
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">SKU</label>
                <input value={form.sku} onChange={e=>sf('sku', e.target.value.toUpperCase())}
                  placeholder={form.product_type === 'apparel' ? '(Auto: APP-XXXX)' : form.product_type === 'fabric' ? '(Auto: FAB-XXXX)' : form.product_type === 'accessory' ? '(Auto: ACC-XXXX)' : '(Auto)'}
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded font-mono uppercase"/>
                {!editing && !form.sku && <p className="text-[10px] text-emerald-600 mt-0.5">✨ Will auto-generate</p>}
              </div>
              <div className="col-span-3">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">Barcode</label>
                <input value={form.barcode} onChange={e=>sf('barcode', e.target.value)} placeholder="EAN-13 / scan code" className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded font-mono"/>
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">UOM</label>
                <input value={form.uom} onChange={e=>sf('uom', e.target.value.toUpperCase())} className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded font-mono uppercase"/>
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">Status</label>
                <select value={form.status} onChange={e=>sf('status', e.target.value)} className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white">
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div className="col-span-6">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">Product Name *</label>
                <input value={form.name} onChange={e=>sf('name', e.target.value)} placeholder="e.g. Aryana Kurung Kedah | Black" className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded font-medium"/>
              </div>
              <div className="col-span-6">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">Bahasa Malaysia (optional)</label>
                <input value={form.name_bm} onChange={e=>sf('name_bm', e.target.value)} placeholder="e.g. Aryana Kurung Kedah | Hitam" className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded"/>
              </div>

              <div className="col-span-3">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">Category</label>
                <select value={form.category ?? ''} onChange={e=>sf('category', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white">
                  <option value="">— Select category —</option>
                  {categories.filter(c => c.is_active).map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                  {/* keep current value visible even if it's no longer in active list */}
                  {form.category && !categories.some(c => c.name === form.category) && (
                    <option value={form.category}>{form.category} (legacy)</option>
                  )}
                </select>
                <p className="text-[10px] text-slate-400 mt-0.5">Manage at <a href="/inventory/setup?tab=categories" className="text-indigo-600 underline">Master Setup → Categories</a></p>
              </div>
              <div className="col-span-3">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">Collection</label>
                <select value={form.collection_id ?? ''} onChange={e=>sf('collection_id', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white">
                  <option value="">— No collection —</option>
                  {collections.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-0.5">Manage at <a href="/inventory/setup?tab=collections" className="text-teal-600 underline">Master Setup → Collections</a></p>
              </div>
              <div className="col-span-6">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">Tags (collection / occasion)</label>
                <div className="flex flex-wrap items-center gap-1.5 px-2 py-1 border border-slate-300 rounded bg-white min-h-[34px]">
                  {form.tags.map(t => (
                    <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-100 text-violet-700 text-[11px] rounded">
                      {t} <button onClick={()=>removeTag(t)} className="hover:text-red-600"><X className="w-3 h-3"/></button>
                    </span>
                  ))}
                  <input value={tagInput} onChange={e=>setTagInput(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter'||e.key===','){ e.preventDefault(); addTag() } }} placeholder="Type & Enter..." className="flex-1 min-w-[100px] text-xs border-0 outline-none bg-transparent"/>
                </div>
                {/* Quick-add tag suggestions */}
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {TAG_SUGGESTIONS.flatMap(g => g.tags).filter(t => !form.tags.includes(t)).map(t => (
                    <button key={t} type="button" onClick={()=>sf('tags', [...form.tags, t])}
                      className="px-1.5 py-0.5 bg-slate-100 hover:bg-violet-100 hover:text-violet-700 text-[10px] rounded text-slate-600 transition-colors">
                      + {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="col-span-6">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">Short Description (1-line, for listings)</label>
                <input value={form.description_short} onChange={e=>sf('description_short', e.target.value)} placeholder="Traditional Malay attire — premium cotton, modest fit" className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded"/>
              </div>
              <div className="col-span-6">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">Care Instructions</label>
                <input value={form.care_instructions} onChange={e=>sf('care_instructions', e.target.value)} placeholder="Hand wash · Iron low" className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded"/>
                <div className="mt-1 flex flex-wrap gap-1">
                  {CARE_TEMPLATES.map(t => (
                    <button key={t.label} type="button" onClick={()=>sf('care_instructions', t.text)} title={t.text}
                      className="px-1.5 py-0.5 bg-slate-100 hover:bg-violet-100 hover:text-violet-700 text-[10px] rounded text-slate-600 transition-colors">
                      ↺ {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="col-span-12">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">Description (long, for product page)</label>
                <textarea value={form.description} onChange={e=>sf('description', e.target.value)} rows={2} className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded"/>
              </div>
            </div>
          </div>

          {/* ② Pricing */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
            <div className="px-4 py-2 border-b border-slate-100 bg-emerald-50/40 flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-emerald-600"/>
              <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wide">② Default Pricing (used when generating variants)</h3>
            </div>
            <div className="px-4 py-3 grid grid-cols-12 gap-3">
              <div className="col-span-2">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">Cost Price</label>
                <input type="number" step="0.01" value={form.cost_price} onChange={e=>sf('cost_price', e.target.value)} className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded text-right font-mono"/>
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">Sale Price</label>
                <input type="number" step="0.01" value={form.sale_price} onChange={e=>sf('sale_price', e.target.value)} className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded text-right font-mono"/>
                {margin && <p className="text-[10px] text-emerald-600 mt-0.5">+{margin}% margin</p>}
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">Original / MSRP</label>
                <input type="number" step="0.01" value={form.original_price} onChange={e=>sf('original_price', e.target.value)} placeholder="0" className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded text-right font-mono"/>
                {discount && <p className="text-[10px] text-rose-600 mt-0.5">-{discount}% off</p>}
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">Tax Rate %</label>
                <input type="number" step="0.01" value={form.tax_rate} onChange={e=>sf('tax_rate', e.target.value)} className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded text-right font-mono"/>
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">Low Stock Alert</label>
                <input type="number" step="1" value={form.low_stock_alert} onChange={e=>sf('low_stock_alert', e.target.value)} className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded text-right font-mono"/>
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">Costing</label>
                <select value={form.costing_method} onChange={e=>sf('costing_method', e.target.value)} className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white">
                  <option value="average">Avg</option>
                  <option value="fifo">FIFO</option>
                  <option value="lifo">LIFO</option>
                </select>
              </div>
            </div>
          </div>

          {/* ③ Variants */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
            <div className="px-4 py-2 border-b border-slate-100 bg-blue-50/40 flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-blue-600"/>
                <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wide">③ Variants ({variants.length}) · Total stock: {totalStock}</h3>
              </div>
              <button onClick={addVariant}
                title="Adds a new variant pre-filled with the default cost/sale/original price from section ②"
                className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-[11px] font-medium rounded hover:bg-blue-200">
                <Plus className="w-3 h-3"/> Add Variant <span className="text-[9px] opacity-70 ml-1">(auto-prices)</span>
              </button>
            </div>

            {/* Generator */}
            <div className="px-4 py-2 bg-gradient-to-br from-violet-50 to-blue-50 border-b border-slate-100">
              <div className="flex items-center gap-2 mb-1.5">
                <Wand2 className="w-3.5 h-3.5 text-violet-600"/>
                <span className="text-[11px] font-bold text-violet-700 uppercase">Bulk Generator — Colors × Sizes</span>
              </div>
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-5">
                  <label className="block text-[10px] text-slate-500 mb-0.5">Colors (comma-separated)</label>
                  <input value={genColors} onChange={e=>setGenColors(e.target.value)} placeholder="Black, Maroon, White" className="w-full px-2 py-1 text-xs border border-slate-300 rounded"/>
                </div>
                <div className="col-span-5">
                  <label className="block text-[10px] text-slate-500 mb-0.5">Sizes (leave empty for fabrics)</label>
                  <input value={genSizes} onChange={e=>setGenSizes(e.target.value)} placeholder="XS, S, M, L, XL, 2XL" className="w-full px-2 py-1 text-xs border border-slate-300 rounded"/>
                </div>
                <div className="col-span-2 flex items-end">
                  <button onClick={runGenerator} className="w-full flex items-center justify-center gap-1 px-2 py-1 bg-violet-600 text-white text-xs font-medium rounded hover:bg-violet-700">
                    <Sparkles className="w-3 h-3"/> Generate
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="text-center w-8 px-2 py-1.5 text-[10px]">#</th>
                    <th className="text-left px-2 py-1.5 text-[11px] uppercase w-24">Color</th>
                    <th className="text-left px-2 py-1.5 text-[11px] uppercase w-16">Size</th>
                    <th className="text-left px-2 py-1.5 text-[11px] uppercase w-32">SKU</th>
                    <th className="text-left px-2 py-1.5 text-[11px] uppercase w-28">Barcode</th>
                    <th className="text-right px-2 py-1.5 text-[11px] uppercase w-20">Cost</th>
                    <th className="text-right px-2 py-1.5 text-[11px] uppercase w-20">Sale</th>
                    <th className="text-right px-2 py-1.5 text-[11px] uppercase w-20">Original</th>
                    <th className="text-right px-2 py-1.5 text-[11px] uppercase w-16">Stock</th>
                    <th className="text-right px-2 py-1.5 text-[11px] uppercase w-16">Reorder</th>
                    <th className="text-center w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {variants.length === 0 ? (
                    <tr><td colSpan={11} className="py-8 text-center text-slate-400 italic text-[11px]">No variants — use the Bulk Generator above or click "+ Add Variant"</td></tr>
                  ) : variants.map((v, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-2 py-1 text-center text-slate-400">{i+1}</td>
                      <td className="px-1 py-1"><input value={v.color ?? ''} onChange={e=>setVariant(i,{color:e.target.value})} placeholder="Color" className="w-full px-1.5 py-1 text-xs border border-slate-200 rounded"/></td>
                      <td className="px-1 py-1"><input value={v.size ?? ''} onChange={e=>setVariant(i,{size:e.target.value})} placeholder="Size" className="w-full px-1.5 py-1 text-xs border border-slate-200 rounded font-mono uppercase"/></td>
                      <td className="px-1 py-1"><input value={v.sku ?? ''} onChange={e=>setVariant(i,{sku:e.target.value})} placeholder="(auto)" className="w-full px-1.5 py-1 text-xs border border-slate-200 rounded font-mono"/></td>
                      <td className="px-1 py-1"><input value={v.barcode ?? ''} onChange={e=>setVariant(i,{barcode:e.target.value})} className="w-full px-1.5 py-1 text-xs border border-slate-200 rounded font-mono"/></td>
                      <td className="px-1 py-1"><input type="number" step="0.01" value={String(v.cost_price)} onChange={e=>setVariant(i,{cost_price:e.target.value})} className="w-full px-1.5 py-1 text-xs border border-slate-200 rounded text-right font-mono"/></td>
                      <td className="px-1 py-1"><input type="number" step="0.01" value={String(v.sale_price)} onChange={e=>setVariant(i,{sale_price:e.target.value})} className="w-full px-1.5 py-1 text-xs border border-slate-200 rounded text-right font-mono"/></td>
                      <td className="px-1 py-1"><input type="number" step="0.01" value={String(v.original_price)} onChange={e=>setVariant(i,{original_price:e.target.value})} className="w-full px-1.5 py-1 text-xs border border-slate-200 rounded text-right font-mono"/></td>
                      <td className="px-1 py-1"><input type="number" step="0.01" value={String(v.stock)} onChange={e=>setVariant(i,{stock:e.target.value})} className="w-full px-1.5 py-1 text-xs border border-slate-200 rounded text-right font-mono"/></td>
                      <td className="px-1 py-1"><input type="number" step="0.01" value={String(v.reorder_level ?? 0)} onChange={e=>setVariant(i,{reorder_level:e.target.value})} className="w-full px-1.5 py-1 text-xs border border-slate-200 rounded text-right font-mono"/></td>
                      <td className="px-1 py-1 text-center">
                        <div className="flex justify-center gap-0.5">
                          <button onClick={()=>moveVariant(i,-1)} className="p-0.5 text-slate-400 hover:text-blue-600"><ChevronUp className="w-3 h-3"/></button>
                          <button onClick={()=>moveVariant(i, 1)} className="p-0.5 text-slate-400 hover:text-blue-600"><ChevronDown className="w-3 h-3"/></button>
                          <button onClick={()=>removeVariant(i)} className="p-0.5 text-slate-400 hover:text-red-600"><Trash2 className="w-3 h-3"/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ④ Channels */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
            <div className="px-4 py-2 border-b border-slate-100 bg-cyan-50/40 flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-cyan-600"/>
              <h3 className="text-xs font-bold text-cyan-700 uppercase tracking-wide">④ Sales Channels (where this product is listed)</h3>
            </div>
            <div className="px-4 py-3 grid grid-cols-4 gap-2">
              {CHANNELS.map(ch => (
                <label key={ch.key} className={`flex items-center gap-2 px-2 py-1.5 border rounded cursor-pointer transition-colors ${form.channels.includes(ch.key) ? 'bg-cyan-50 border-cyan-300' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                  <input type="checkbox" checked={form.channels.includes(ch.key)} onChange={()=>toggleChannel(ch.key)} className="w-3.5 h-3.5"/>
                  <span className="text-xs">{ch.emoji} {ch.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* ⑤ Marketing Identity (Google Merchant / Meta Catalog) */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
            <div className="px-4 py-2 border-b border-slate-100 bg-rose-50/40 flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-rose-600"/>
              <h3 className="text-xs font-bold text-rose-700 uppercase tracking-wide">⑤ Marketing Identity (Google Merchant / Meta Catalog)</h3>
            </div>
            <div className="px-4 py-3 grid grid-cols-12 gap-3">
              <div className="col-span-3">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">GTIN / EAN-13 / UPC</label>
                <input value={form.gtin} onChange={e=>sf('gtin', e.target.value)} placeholder="9555888001234" className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded font-mono"/>
                <p className="text-[10px] text-slate-400 mt-0.5">Required for Google Shopping</p>
              </div>
              <div className="col-span-3">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">MPN</label>
                <input value={form.mpn} onChange={e=>sf('mpn', e.target.value)} placeholder="Manufacturer Part #" className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded font-mono"/>
              </div>
              <div className="col-span-6">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">Google Product Category</label>
                <input list="goog-cat" value={form.google_product_category} onChange={e=>sf('google_product_category', e.target.value)}
                  placeholder="e.g. Apparel & Accessories > Clothing > Dresses" className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded"/>
                <datalist id="goog-cat">
                  {GOOGLE_CATEGORIES.map(c => <option key={c} value={c}/>)}
                </datalist>
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] text-slate-500 mb-1">Condition</label>
                <select value={form.condition} onChange={e=>sf('condition', e.target.value)} className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white">
                  <option value="new">New</option>
                  <option value="refurbished">Refurbished</option>
                  <option value="used">Used</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] text-slate-500 mb-1">Gender</label>
                <select value={form.gender} onChange={e=>sf('gender', e.target.value)} className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white">
                  <option value="">—</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="unisex">Unisex</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] text-slate-500 mb-1">Age Group</label>
                <select value={form.age_group} onChange={e=>sf('age_group', e.target.value)} className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white">
                  <option value="">—</option>
                  <option value="adult">Adult</option>
                  <option value="teen">Teen</option>
                  <option value="kids">Kids</option>
                  <option value="toddler">Toddler</option>
                  <option value="newborn">Newborn</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] text-slate-500 mb-1">Size Type</label>
                <select value={form.size_type} onChange={e=>sf('size_type', e.target.value)} className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white">
                  <option value="">—</option>
                  <option value="regular">Regular</option>
                  <option value="petite">Petite</option>
                  <option value="plus">Plus</option>
                  <option value="tall">Tall</option>
                  <option value="maternity">Maternity</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] text-slate-500 mb-1">Material (label)</label>
                <input value={form.material} onChange={e=>sf('material', e.target.value)} placeholder="Cotton" className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded"/>
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] text-slate-500 mb-1">Pattern</label>
                <input value={form.pattern} onChange={e=>sf('pattern', e.target.value)} placeholder="Plain / Floral" className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded"/>
              </div>

              {/* ── Fabrics Used (Bill of Material at product level) ── */}
              <div className="col-span-12">
                <div className="flex items-center justify-between mb-2 mt-2">
                  <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Fabrics / Materials Used (per Piece)</label>
                  <button type="button"
                    onClick={() => sf('fabrics_used', [...(form.fabrics_used || []), { sku: '', name: '', qty_per_piece: '', uom: 'METER', color: '' }])}
                    className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-[var(--accent)] hover:bg-[var(--accent-soft)] rounded">
                    + Add Material
                  </button>
                </div>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-center w-8 px-2 py-1.5 text-[10px] uppercase text-slate-500">#</th>
                        <th className="text-left px-2 py-1.5 text-[10px] uppercase text-slate-500 w-44">Fabric / Item</th>
                        <th className="text-left px-2 py-1.5 text-[10px] uppercase text-slate-500 w-28">Color (opt.)</th>
                        <th className="text-right px-2 py-1.5 text-[10px] uppercase text-slate-500 w-28">Qty per Piece</th>
                        <th className="text-left px-2 py-1.5 text-[10px] uppercase text-slate-500 w-20">UOM</th>
                        <th className="w-10"/>
                      </tr>
                    </thead>
                    <tbody>
                      {(form.fabrics_used || []).length === 0 ? (
                        <tr><td colSpan={6} className="py-4 text-center text-slate-400 italic text-[11px]">
                          No materials linked. Click <b>+ Add Material</b> to track which fabric this product consumes (e.g. 3m Cotton Plain + 0.5m Songket).
                        </td></tr>
                      ) : (form.fabrics_used || []).map((f, i) => {
                        const fabricOptions = records.filter(r =>
                          r.product_type === 'fabric' || r.product_type === 'raw_material' || r.product_type === 'accessory'
                        )
                        return (
                          <tr key={i} className="border-t border-slate-100">
                            <td className="px-2 py-1 text-center text-slate-400">{i + 1}</td>
                            <td className="px-1 py-1">
                              <select value={f.sku}
                                onChange={e => {
                                  const opt = fabricOptions.find(p => p.sku === e.target.value)
                                  sf('fabrics_used', form.fabrics_used.map((x, idx) => idx === i ? {
                                    ...x, sku: e.target.value, name: opt?.name || '', uom: (opt as any)?.uom || x.uom,
                                  } : x))
                                }}
                                className="w-full px-2 py-1 text-xs border border-slate-200 rounded bg-white">
                                <option value="">— Select fabric —</option>
                                {fabricOptions.map(p => (
                                  <option key={p.id} value={p.sku}>{p.sku} — {p.name}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-1 py-1">
                              <input value={f.color}
                                onChange={e => sf('fabrics_used', form.fabrics_used.map((x, idx) => idx === i ? { ...x, color: e.target.value } : x))}
                                placeholder="Black"
                                className="w-full px-2 py-1 text-xs border border-slate-200 rounded"/>
                            </td>
                            <td className="px-1 py-1">
                              <input type="number" step="0.01" value={f.qty_per_piece}
                                onChange={e => sf('fabrics_used', form.fabrics_used.map((x, idx) => idx === i ? { ...x, qty_per_piece: e.target.value } : x))}
                                placeholder="3.0"
                                className="w-full px-2 py-1 text-xs border border-slate-200 rounded text-right font-mono"/>
                            </td>
                            <td className="px-1 py-1">
                              <input value={f.uom}
                                onChange={e => sf('fabrics_used', form.fabrics_used.map((x, idx) => idx === i ? { ...x, uom: e.target.value.toUpperCase() } : x))}
                                placeholder="METER"
                                className="w-full px-2 py-1 text-xs border border-slate-200 rounded font-mono uppercase"/>
                            </td>
                            <td className="px-1 py-1 text-center">
                              <button type="button"
                                onClick={() => sf('fabrics_used', form.fabrics_used.filter((_, idx) => idx !== i))}
                                className="text-slate-400 hover:text-red-600 p-1">
                                <Trash2 className="w-3.5 h-3.5"/>
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  📌 Jab tailor se finished product receive ho ga, har piece ke hisab se in fabrics ki stock auto-deduct ho jayegi (e.g. 1 piece received → 3m Cotton + 0.5m Songket minus from stock).
                </p>
              </div>
            </div>
          </div>

          {/* ⑥ Featured Media (image-feeds for marketplaces) */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
            <div className="px-4 py-2 border-b border-slate-100 bg-pink-50/40 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-pink-600"/>
              <h3 className="text-xs font-bold text-pink-700 uppercase tracking-wide">⑥ Featured Media (Google / Facebook / Pinterest feeds)</h3>
            </div>
            <div className="px-4 py-3 grid grid-cols-12 gap-3">
              <div className="col-span-6">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">Featured Image URL <span className="text-rose-500">*</span></label>
                <input value={form.featured_image_url} onChange={e=>sf('featured_image_url', e.target.value)} placeholder="https://cdn.carlanisa.com/products/aryana-black.jpg" className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded font-mono"/>
                <p className="text-[10px] text-slate-400 mt-0.5">Primary image for product listing</p>
              </div>
              <div className="col-span-6">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">OG Image (Social Share — 1200×630)</label>
                <input value={form.og_image_url} onChange={e=>sf('og_image_url', e.target.value)} placeholder="https://cdn.carlanisa.com/og/aryana-black-1200x630.jpg" className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded font-mono"/>
                <p className="text-[10px] text-slate-400 mt-0.5">Used by Facebook, Twitter, LinkedIn previews</p>
              </div>
              <div className="col-span-12">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">Gallery Image URLs (additional images)</label>
                <textarea value={(form.gallery_urls).join('\n')} onChange={e=>sf('gallery_urls', e.target.value.split('\n').map(s=>s.trim()).filter(Boolean))}
                  rows={3} placeholder="https://cdn.../img1.jpg&#10;https://cdn.../img2.jpg&#10;https://cdn.../img3.jpg"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded font-mono"/>
                <p className="text-[10px] text-slate-400 mt-0.5">One URL per line. Auto-feeds to all marketplaces' "additional_image_link"</p>
              </div>
              <div className="col-span-12">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">Video URL (YouTube / Vimeo)</label>
                <input value={form.video_url} onChange={e=>sf('video_url', e.target.value)} placeholder="https://www.youtube.com/watch?v=..." className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded"/>
              </div>
            </div>
          </div>

          {/* ⑦ Promotion & Sale */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
            <div className="px-4 py-2 border-b border-slate-100 bg-orange-50/40 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-orange-600"/>
              <h3 className="text-xs font-bold text-orange-700 uppercase tracking-wide">⑦ Promotion &amp; Sale (Google Merchant sale_price_effective_date)</h3>
            </div>
            <div className="px-4 py-3 grid grid-cols-12 gap-3">
              <div className="col-span-3">
                <label className="flex items-center gap-2 cursor-pointer mt-5">
                  <input type="checkbox" checked={form.is_featured} onChange={e=>sf('is_featured', e.target.checked)} className="w-3.5 h-3.5"/>
                  <span className="text-xs font-medium">⭐ Featured</span>
                </label>
              </div>
              <div className="col-span-3">
                <label className="flex items-center gap-2 cursor-pointer mt-5">
                  <input type="checkbox" checked={form.is_bestseller} onChange={e=>sf('is_bestseller', e.target.checked)} className="w-3.5 h-3.5"/>
                  <span className="text-xs font-medium">🏆 Bestseller</span>
                </label>
              </div>
              <div className="col-span-3">
                <label className="flex items-center gap-2 cursor-pointer mt-5">
                  <input type="checkbox" checked={form.is_new_arrival} onChange={e=>sf('is_new_arrival', e.target.checked)} className="w-3.5 h-3.5"/>
                  <span className="text-xs font-medium">✨ New Arrival</span>
                </label>
              </div>
              <div className="col-span-3">
                <label className="block text-[11px] text-slate-500 mb-1">Launch Date</label>
                <input type="date" value={form.launch_date} onChange={e=>sf('launch_date', e.target.value)} className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded font-mono"/>
              </div>
              <div className="col-span-6">
                <label className="block text-[11px] text-slate-500 mb-1">Sale Starts</label>
                <input type="datetime-local" value={form.sale_starts_at} onChange={e=>sf('sale_starts_at', e.target.value)} className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded font-mono"/>
              </div>
              <div className="col-span-6">
                <label className="block text-[11px] text-slate-500 mb-1">Sale Ends</label>
                <input type="datetime-local" value={form.sale_ends_at} onChange={e=>sf('sale_ends_at', e.target.value)} className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded font-mono"/>
              </div>
            </div>
          </div>

          {/* ⑧ Shipping & SEO */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
              <div className="px-4 py-2 border-b border-slate-100 bg-amber-50/40">
                <h3 className="text-xs font-bold text-amber-700 uppercase tracking-wide">⑧ Shipping &amp; Customs</h3>
              </div>
              <div className="px-4 py-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Weight (kg)</label>
                  <input type="number" step="0.001" value={form.weight_kg} onChange={e=>sf('weight_kg', e.target.value)} className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded text-right font-mono"/>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Country of Origin</label>
                  <input value={form.country_of_origin} onChange={e=>sf('country_of_origin', e.target.value)} className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded"/>
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] text-slate-500 mb-1">HS Code (customs)</label>
                  <input value={form.hs_code} onChange={e=>sf('hs_code', e.target.value)} placeholder="e.g. 6204.41.00" className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded font-mono"/>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
              <div className="px-4 py-2 border-b border-slate-100 bg-emerald-50/40">
                <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wide">⑨ SEO &amp; Marketing</h3>
              </div>
              <div className="px-4 py-6 flex flex-col items-center justify-center gap-3 text-center">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Globe className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">SEO &amp; Marketing settings are managed at Store level</p>
                  <p className="text-xs text-slate-400 mt-1">Global SEO defaults, Google Merchant, Meta Catalog ID, promotion dates — all configured once in Master Setup.</p>
                </div>
                <a href="/inventory/setup?tab=marketing"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700">
                  Open SEO &amp; Marketing Setup →
                </a>
              </div>
            </div>
          </div>

        </div>
      </div>
    )
  }

  // ── LIST VIEW ─────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200">
            <ArrowLeft className="w-3.5 h-3.5"/> Back
          </button>
          <div className="w-9 h-9 bg-violet-50 rounded-xl flex items-center justify-center"><Package className="w-5 h-5 text-violet-600"/></div>
          <div>
            <h1 className="text-base font-bold text-slate-800">Products (with Variants)</h1>
            <p className="text-xs text-slate-400">Apparel · Fabric · Accessory · Multi-channel master</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700">
            <Plus className="w-3.5 h-3.5"/> New Product
          </button>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-600 text-white text-xs font-medium rounded-lg hover:bg-slate-700">
            <RefreshCw className="w-3.5 h-3.5"/> Refresh
          </button>
        </div>
      </div>

      {/* Stats strip */}
      {stats && (
        <div className="grid grid-cols-4 gap-2 px-4 py-2 bg-slate-50 border-b border-slate-200">
          <div className="text-xs"><span className="text-slate-500">Total:</span> <b className="text-violet-700">{stats.total}</b></div>
          <div className="text-xs"><span className="text-slate-500">Low Stock:</span> <b className={stats.low_stock>0?'text-amber-600':'text-emerald-700'}>{stats.low_stock}</b></div>
          <div className="text-xs"><span className="text-slate-500">Out of Stock:</span> <b className={stats.out_of_stock>0?'text-red-600':'text-emerald-700'}>{stats.out_of_stock}</b></div>
          <div className="text-xs text-right"><span className="text-slate-500">Stock Value:</span> <b className="text-emerald-700">{formatCurrency(stats.total_value)}</b></div>
        </div>
      )}

      <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 border-b border-slate-200">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Server search by name, SKU, barcode..." className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded"/>
        </div>
        <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} className="px-3 py-1.5 text-xs border border-slate-200 rounded bg-white">
          <option value="">All types</option>
          {PRODUCT_TYPES.map(t => <option key={t.key} value={t.key}>{t.emoji} {t.label}</option>)}
        </select>
        {hasFilters && (
          <button onClick={clearFilters} className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-50 border border-rose-200 rounded">
            <X className="w-3 h-3"/> Clear column filters
          </button>
        )}
        <div className="text-xs text-slate-500">
          {filteredRecords.length}
          {filteredRecords.length !== records.length && <span className="text-slate-400"> / {records.length}</span>}
          {' '}record{filteredRecords.length!==1?'s':''}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-700 text-white">
              <th className="w-8 px-2 py-2 text-center font-medium">#</th>
              <th className="text-left px-3 py-2 font-semibold">SKU</th>
              <th className="text-left px-3 py-2 font-semibold">Name</th>
              <th className="text-left px-3 py-2 font-semibold">Type</th>
              <th className="text-left px-3 py-2 font-semibold">Category</th>
              <th className="text-center px-3 py-2 font-semibold">Variants</th>
              <th className="text-right px-3 py-2 font-semibold">Sale Price</th>
              <th className="text-right px-3 py-2 font-semibold">Original</th>
              <th className="text-right px-3 py-2 font-semibold">Total Stock</th>
              <th className="text-left px-3 py-2 font-semibold">Channels</th>
              <th className="text-center px-3 py-2 font-semibold">Status</th>
              <th className="text-center px-3 py-2 font-semibold">Actions</th>
            </tr>
            {/* ── Per-column filter row ── */}
            <tr className="bg-slate-600 text-white">
              <th className="px-1 py-1"></th>
              <th className="px-1 py-1">
                <input value={fSku} onChange={e=>setFSku(e.target.value)} placeholder="SKU…"
                  className="w-full px-1.5 py-0.5 text-[11px] bg-slate-500 text-white placeholder-slate-300 border border-slate-400 rounded font-mono"/>
              </th>
              <th className="px-1 py-1">
                <input value={fName} onChange={e=>setFName(e.target.value)} placeholder="Name / BM…"
                  className="w-full px-1.5 py-0.5 text-[11px] bg-slate-500 text-white placeholder-slate-300 border border-slate-400 rounded"/>
              </th>
              <th className="px-1 py-1">
                <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}
                  className="w-full px-1 py-0.5 text-[11px] bg-slate-500 text-white border border-slate-400 rounded">
                  <option value="">All</option>
                  {PRODUCT_TYPES.map(t => <option key={t.key} value={t.key} className="text-slate-800 bg-white">{t.emoji} {t.label}</option>)}
                </select>
              </th>
              <th className="px-1 py-1">
                <input value={fBrand} onChange={e=>setFBrand(e.target.value)} placeholder="Category…"
                  className="w-full px-1.5 py-0.5 text-[11px] bg-slate-500 text-white placeholder-slate-300 border border-slate-400 rounded"/>
              </th>
              <th className="px-1 py-1">
                <select value={fVariants} onChange={e=>setFVariants(e.target.value as any)}
                  className="w-full px-1 py-0.5 text-[11px] bg-slate-500 text-white border border-slate-400 rounded">
                  <option value="">All</option>
                  <option value="has"  className="text-slate-800 bg-white">With variants</option>
                  <option value="none" className="text-slate-800 bg-white">No variants</option>
                </select>
              </th>
              <th className="px-1 py-1">
                <div className="flex gap-0.5">
                  <input value={fSaleMin} onChange={e=>setFSaleMin(e.target.value)} placeholder="min" type="number"
                    className="w-1/2 px-1 py-0.5 text-[11px] bg-slate-500 text-white placeholder-slate-300 border border-slate-400 rounded font-mono text-right"/>
                  <input value={fSaleMax} onChange={e=>setFSaleMax(e.target.value)} placeholder="max" type="number"
                    className="w-1/2 px-1 py-0.5 text-[11px] bg-slate-500 text-white placeholder-slate-300 border border-slate-400 rounded font-mono text-right"/>
                </div>
              </th>
              <th className="px-1 py-1"></th>
              <th className="px-1 py-1">
                <select value={fStock} onChange={e=>setFStock(e.target.value as any)}
                  className="w-full px-1 py-0.5 text-[11px] bg-slate-500 text-white border border-slate-400 rounded">
                  <option value="">All</option>
                  <option value="in"  className="text-slate-800 bg-white">In stock</option>
                  <option value="low" className="text-slate-800 bg-white">Low (1–5)</option>
                  <option value="out" className="text-slate-800 bg-white">Out</option>
                </select>
              </th>
              <th className="px-1 py-1">
                <select value={fChannel} onChange={e=>setFChannel(e.target.value)}
                  className="w-full px-1 py-0.5 text-[11px] bg-slate-500 text-white border border-slate-400 rounded">
                  <option value="">All</option>
                  {CHANNELS.map(c => <option key={c.key} value={c.key} className="text-slate-800 bg-white">{c.emoji} {c.label}</option>)}
                </select>
              </th>
              <th className="px-1 py-1">
                <select value={fStatus} onChange={e=>setFStatus(e.target.value)}
                  className="w-full px-1 py-0.5 text-[11px] bg-slate-500 text-white border border-slate-400 rounded">
                  <option value="">All</option>
                  <option value="active"   className="text-slate-800 bg-white">Active</option>
                  <option value="draft"    className="text-slate-800 bg-white">Draft</option>
                  <option value="archived" className="text-slate-800 bg-white">Archived</option>
                </select>
              </th>
              <th className="px-1 py-1 text-center">
                {hasFilters && (
                  <button onClick={clearFilters} title="Clear column filters"
                    className="p-1 rounded text-white hover:bg-slate-500"><X className="w-3 h-3"/></button>
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (Array.from({length:6}).map((_,i)=>(
              <tr key={i} className={i%2===0?'bg-white':'bg-slate-50'}>
                {Array.from({length:12}).map((_,j)=>(<td key={j} className="px-3 py-2"><div className="h-3 bg-slate-100 rounded animate-pulse"/></td>))}
              </tr>
            ))) : filteredRecords.length === 0 ? (
              <tr><td colSpan={12} className="py-16 text-center text-slate-400">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-30"/>
                {records.length === 0 ? (
                  <>
                    <p className="text-sm">No products yet</p>
                    <button onClick={openCreate} className="mt-2 px-3 py-1.5 bg-violet-600 text-white text-xs rounded">Create First Product</button>
                  </>
                ) : (
                  <>
                    <p className="text-sm">No products match your filters</p>
                    <button onClick={clearFilters} className="mt-2 px-3 py-1.5 bg-slate-600 text-white text-xs rounded">Clear filters</button>
                  </>
                )}
              </td></tr>
            ) : filteredRecords.map((p, idx) => {
              const variantCount = p.variants?.length ?? 0
              const totalStock = variantCount > 0 ? (p.variants ?? []).reduce((s,v)=>s+(parseFloat(String(v.stock))||0),0) : Number(p.stock ?? 0)
              const discount = p.original_price > p.sale_price ? Math.round((1 - p.sale_price/p.original_price)*100) : null
              const isExpanded = expandedIds.has(p.id)
              const toggle = () => setExpandedIds(prev => {
                const next = new Set(prev)
                if (next.has(p.id)) next.delete(p.id); else next.add(p.id)
                return next
              })
              return (
                <Fragment key={p.id}>
                <tr
                  onClick={() => variantCount > 0 && toggle()}
                  onDoubleClick={()=>openEdit(p)}
                  className={`border-b border-slate-100 transition-colors ${variantCount > 0 ? 'cursor-pointer' : ''} ${isExpanded ? 'bg-violet-50' : (idx%2===0 ? 'bg-white hover:bg-violet-50' : 'bg-slate-50/60 hover:bg-violet-50')}`}>
                  <td className="px-2 py-1.5 text-center text-slate-400">
                    {variantCount > 0 ? (
                      <ChevronDown className={`w-3.5 h-3.5 inline-block transition-transform text-slate-500 ${isExpanded ? 'rotate-180' : ''}`} />
                    ) : (idx+1)}
                  </td>
                  <td className="px-3 py-1.5 font-mono font-bold text-violet-700">{p.sku}</td>
                  <td className="px-3 py-1.5 font-medium text-slate-800">{p.name}{p.name_bm && <span className="text-slate-400 text-[10px] block">{p.name_bm}</span>}</td>
                  <td className="px-3 py-1.5"><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${TYPE_BADGE[p.product_type]}`}>{p.product_type.replace('_',' ')}</span></td>
                  <td className="px-3 py-1.5 text-slate-700">{p.category ?? '—'}</td>
                  <td className="px-3 py-1.5 text-center font-mono">
                    {variantCount > 0
                      ? <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer ${isExpanded ? 'bg-violet-200 text-violet-800' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`} onClick={(e) => { e.stopPropagation(); toggle() }}>
                          {variantCount} variants
                        </span>
                      : '—'}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono font-semibold text-slate-800">{formatCurrency(p.sale_price)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-slate-500">
                    {p.original_price > 0 ? <>
                      <span className="line-through">{formatCurrency(p.original_price)}</span>
                      {discount && <span className="block text-[10px] text-rose-600 font-bold">-{discount}%</span>}
                    </> : '—'}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono font-semibold">{totalStock}</td>
                  <td className="px-3 py-1.5">
                    <div className="flex flex-wrap gap-0.5">
                      {(p.channels ?? []).slice(0,4).map(c => {
                        const ch = CHANNELS.find(x => x.key === c)
                        return <span key={c} title={ch?.label} className="text-sm">{ch?.emoji ?? '?'}</span>
                      })}
                      {(p.channels ?? []).length > 4 && <span className="text-[10px] text-slate-400">+{(p.channels ?? []).length-4}</span>}
                    </div>
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${p.status==='active'?'bg-emerald-100 text-emerald-700':p.status==='draft'?'bg-amber-100 text-amber-700':'bg-slate-200 text-slate-600'}`}>{p.status.toUpperCase()}</span>
                  </td>
                  <td className="px-3 py-1.5 text-center" onClick={e=>e.stopPropagation()}>
                    <button onClick={()=>openEdit(p)} className="p-1 rounded text-slate-400 hover:text-violet-600 hover:bg-violet-50" title="Edit"><Pencil className="w-3 h-3"/></button>
                  </td>
                </tr>
                {isExpanded && variantCount > 0 && (
                  <tr className="bg-violet-50/40">
                    <td colSpan={12} className="px-6 pb-3 pt-0">
                      <div className="bg-white border border-violet-200 rounded-lg overflow-hidden shadow-sm">
                        <table className="w-full text-xs">
                          <thead className="bg-violet-100">
                            <tr>
                              <th className="text-left px-3 py-1.5 text-[10px] uppercase font-semibold text-violet-800 w-40">Variant SKU</th>
                              <th className="text-left px-3 py-1.5 text-[10px] uppercase font-semibold text-violet-800 w-32">Color</th>
                              <th className="text-left px-3 py-1.5 text-[10px] uppercase font-semibold text-violet-800 w-24">Size</th>
                              <th className="text-right px-3 py-1.5 text-[10px] uppercase font-semibold text-violet-800 w-24">Stock</th>
                              <th className="text-right px-3 py-1.5 text-[10px] uppercase font-semibold text-violet-800 w-28">Sale Price</th>
                              <th className="text-center px-3 py-1.5 text-[10px] uppercase font-semibold text-violet-800 w-20">Active</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(p.variants ?? []).map(v => {
                              const vstock = parseFloat(String(v.stock)) || 0
                              return (
                                <tr key={v.id} className="border-t border-violet-100 hover:bg-violet-50/40">
                                  <td className="px-3 py-1.5 font-mono text-violet-700 font-semibold">{v.sku}</td>
                                  <td className="px-3 py-1.5 uppercase">{v.color || '—'}</td>
                                  <td className="px-3 py-1.5 font-mono">{v.size || '—'}</td>
                                  <td className={`px-3 py-1.5 text-right font-mono font-bold ${vstock === 0 ? 'text-red-600' : vstock <= 2 ? 'text-amber-600' : 'text-slate-700'}`}>
                                    {vstock}
                                    {vstock === 0 && <span className="ml-1 text-[9px] uppercase font-semibold">out</span>}
                                    {vstock > 0 && vstock <= 2 && <span className="ml-1 text-[9px] uppercase font-semibold">low</span>}
                                  </td>
                                  <td className="px-3 py-1.5 text-right font-mono">{formatCurrency(parseFloat(String(v.sale_price)) || 0)}</td>
                                  <td className="px-3 py-1.5 text-center">
                                    {v.is_active === false
                                      ? <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-200 text-slate-600">OFF</span>
                                      : <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-700">ON</span>}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                          <tfoot className="bg-slate-50 border-t-2 border-violet-200">
                            <tr>
                              <td colSpan={3} className="px-3 py-1.5 text-right text-[10px] uppercase font-bold text-slate-600">Total</td>
                              <td className="px-3 py-1.5 text-right font-mono font-bold text-violet-700">{totalStock}</td>
                              <td colSpan={2} />
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
