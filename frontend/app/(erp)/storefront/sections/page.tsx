'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import {
  ArrowLeft, Plus, Trash2, Pencil, X, GripVertical, Eye, EyeOff, ExternalLink,
  Image as ImageIcon, LayoutGrid, ShoppingBag, Megaphone, Quote, Mail, Instagram, FileText,
} from 'lucide-react'

type Section = { id: number; type: string; label: string | null; position: number; enabled: boolean; config_json: any }

const SECTION_TYPES = [
  { code: 'hero_slider',       name: 'Hero Slider',       icon: ImageIcon,   desc: 'Full-width slides with headline + button' },
  { code: 'categories_grid',   name: 'Categories Grid',   icon: LayoutGrid,  desc: 'Big image cards linking to categories' },
  { code: 'featured_products', name: 'Featured Products', icon: ShoppingBag, desc: 'Hand-picked product grid' },
  { code: 'banner_strip',      name: 'Banner Strip',      icon: Megaphone,   desc: '4 selling-points icons (shipping, returns, …)' },
  { code: 'image_text',        name: 'Image + Text',      icon: FileText,    desc: 'Side-by-side promotional block' },
  { code: 'testimonials',      name: 'Testimonials',      icon: Quote,       desc: 'Customer reviews carousel' },
  { code: 'newsletter',        name: 'Newsletter',        icon: Mail,        desc: 'Email signup CTA' },
  { code: 'instagram',         name: 'Instagram Feed',    icon: Instagram,   desc: '6-image Instagram grid' },
]

export default function SectionsPage() {
  const [items, setItems] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Section | null>(null)
  const [picker, setPicker] = useState(false)
  const [dragId, setDragId] = useState<number | null>(null)

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/storefront/sections')
      setItems(Array.isArray(data) ? data : data?.data ?? [])
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function toggle(s: Section) {
    await api.put(`/admin/storefront/sections/${s.id}`, { enabled: !s.enabled })
    load()
  }
  async function del(s: Section) {
    if (!confirm(`Delete the "${s.label || s.type}" section?`)) return
    await api.delete(`/admin/storefront/sections/${s.id}`); load()
  }
  async function addSection(type: string) {
    const def = SECTION_TYPES.find((t) => t.code === type)
    await api.post('/admin/storefront/sections', {
      type, label: def?.name, enabled: true, config_json: defaultConfig(type),
    })
    setPicker(false); load()
  }

  function defaultConfig(type: string): any {
    switch (type) {
      case 'hero_slider':
        return { slides: [{ image: '', kicker: 'New', headline: 'Your headline', subheading: '', button_text: 'Shop Now', button_url: '/shop', overlay: 0.3 }], autoplay: true, interval: 5500 }
      case 'categories_grid':
        return { title: 'Shop by Category', subtitle: '', columns: 3, categories: [{ name: '', image: '', url: '' }] }
      case 'featured_products':
        return { title: 'Featured', subtitle: '', limit: 8 }
      case 'banner_strip':
        return { items: [{ icon: 'truck', title: 'Free Shipping', subtitle: 'Over RM150' }] }
      case 'image_text':
        return { image: '', image_position: 'left', kicker: '', title: '', body: '', button_text: '', button_url: '' }
      case 'testimonials':
        return { title: 'Loved by our customers', items: [{ name: '', rating: 5, text: '' }] }
      case 'newsletter':
        return { title: 'Join the family', subtitle: '', button_text: 'Subscribe' }
      case 'instagram':
        return { handle: '', images: [] }
      default: return {}
    }
  }

  async function onDrop(targetId: number) {
    if (!dragId || dragId === targetId) return
    const ids = items.map((i) => i.id)
    const from = ids.indexOf(dragId)
    const to = ids.indexOf(targetId)
    if (from < 0 || to < 0) return
    ids.splice(to, 0, ids.splice(from, 1)[0])
    setDragId(null)
    await api.post('/admin/storefront/sections/reorder', { order: ids })
    load()
  }

  return (
    <div>
      <Link href="/storefront" className="inline-flex items-center gap-1 mb-3 text-sm text-slate-500 hover:text-indigo-600">
        <ArrowLeft className="h-3.5 w-3.5" /> Storefront
      </Link>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-indigo-600" />
          <h1 className="text-2xl font-semibold text-slate-800">Homepage Sections</h1>
        </div>
        <div className="flex items-center gap-2">
          <a href="/" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">
            <Eye className="h-4 w-4" /> Preview <ExternalLink className="h-3 w-3" />
          </a>
          <button onClick={() => setPicker(true)}
            className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
            <Plus className="h-4 w-4" /> Add section
          </button>
        </div>
      </div>
      <p className="mb-6 text-sm text-slate-600">Drag to reorder. Click a section to edit its content. Toggle the eye to show/hide it on the live store.</p>

      <div className="space-y-2">
        {loading ? <div className="text-slate-400">Loading…</div> : items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center text-slate-400">
            No sections yet. Click <strong>Add section</strong> to start.
          </div>
        ) : items.map((s, idx) => {
          const def = SECTION_TYPES.find((t) => t.code === s.type)
          const Icon = def?.icon ?? FileText
          return (
            <div
              key={s.id}
              draggable
              onDragStart={() => setDragId(s.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(s.id)}
              className={`flex items-center gap-3 rounded-lg border bg-white p-4 transition ${dragId === s.id ? 'border-indigo-400 shadow-md' : 'border-slate-200'} ${s.enabled ? '' : 'opacity-60'}`}
            >
              <GripVertical className="h-4 w-4 cursor-grab text-slate-300" />
              <span className="text-xs font-mono text-slate-400">#{idx + 1}</span>
              <Icon className="h-5 w-5 text-slate-500" />
              <div className="flex-1">
                <div className="text-sm font-semibold">{s.label || def?.name || s.type}</div>
                <div className="text-xs text-slate-500">{def?.desc}</div>
              </div>
              <button onClick={() => toggle(s)} className="text-slate-500 hover:text-indigo-600" aria-label={s.enabled ? 'Hide' : 'Show'}>
                {s.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
              <button onClick={() => setEditing(s)} className="text-slate-500 hover:text-indigo-600">
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={() => del(s)} className="text-slate-500 hover:text-rose-500">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>

      {picker && <PickerModal onClose={() => setPicker(false)} onPick={addSection} />}
      {editing && <EditModal section={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
    </div>
  )
}

function PickerModal({ onClose, onPick }: { onClose: () => void; onPick: (type: string) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="font-semibold">Add a section</h2>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2">
          {SECTION_TYPES.map((t) => {
            const Icon = t.icon
            return (
              <button key={t.code} onClick={() => onPick(t.code)}
                className="group flex items-start gap-3 rounded-lg border border-slate-200 p-4 text-left transition hover:border-indigo-400 hover:shadow-sm">
                <span className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <div className="font-semibold text-slate-800">{t.name}</div>
                  <div className="text-xs text-slate-500">{t.desc}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function EditModal({ section, onClose, onSaved }: { section: Section; onClose: () => void; onSaved: () => void }) {
  const [label, setLabel] = useState(section.label ?? '')
  const [config, setConfig] = useState<any>(section.config_json ?? {})
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      await api.put(`/admin/storefront/sections/${section.id}`, { label, config_json: config })
      toast.success('Section saved')
      onSaved()
    } catch { toast.error('Could not save') } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="font-semibold">Edit: {section.label || section.type}</h2>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <label className="text-xs font-medium text-slate-600">Label (admin only)</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <SectionFields type={section.type} config={config} setConfig={setConfig} />
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm">Cancel</button>
          <button onClick={save} disabled={saving} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

function SectionFields({ type, config, setConfig }: { type: string; config: any; setConfig: (c: any) => void }) {
  // Generic JSON editor + type-specific helpers
  const set = (path: string, v: any) => setConfig({ ...config, [path]: v })
  const setArr = (key: string, idx: number, field: string, v: any) => {
    const arr = [...(config[key] ?? [])]; arr[idx] = { ...arr[idx], [field]: v }; set(key, arr)
  }
  const addArr = (key: string, item: any) => set(key, [...(config[key] ?? []), item])
  const delArr = (key: string, idx: number) => set(key, (config[key] ?? []).filter((_: any, i: number) => i !== idx))

  if (type === 'hero_slider') {
    return (
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!config.autoplay} onChange={(e) => set('autoplay', e.target.checked)} />
          Autoplay slides
        </label>
        <Sub label="Interval (ms)"><input type="number" value={config.interval ?? 5500} onChange={(e) => set('interval', Number(e.target.value))} className="w-32 rounded border border-slate-300 px-2 py-1 text-sm" /></Sub>
        <div>
          <h3 className="mb-2 text-sm font-semibold">Slides</h3>
          {(config.slides ?? []).map((sl: any, i: number) => (
            <div key={i} className="mb-2 rounded-lg border border-slate-200 p-3">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <F label="Image URL" v={sl.image} on={(v) => setArr('slides', i, 'image', v)} wide />
                <F label="Kicker (small text above)" v={sl.kicker} on={(v) => setArr('slides', i, 'kicker', v)} />
                <F label="Headline" v={sl.headline} on={(v) => setArr('slides', i, 'headline', v)} />
                <F label="Subheading" v={sl.subheading} on={(v) => setArr('slides', i, 'subheading', v)} wide />
                <F label="Button text" v={sl.button_text} on={(v) => setArr('slides', i, 'button_text', v)} />
                <F label="Button URL" v={sl.button_url} on={(v) => setArr('slides', i, 'button_url', v)} />
                <div>
                  <label className="text-xs font-medium text-slate-600">Text align</label>
                  <select value={sl.align ?? 'left'} onChange={(e) => setArr('slides', i, 'align', e.target.value)} className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm">
                    <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Overlay darkness (0-1)</label>
                  <input type="number" step="0.05" min="0" max="1" value={sl.overlay ?? 0.3} onChange={(e) => setArr('slides', i, 'overlay', Number(e.target.value))} className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm" />
                </div>
              </div>
              <button onClick={() => delArr('slides', i)} className="mt-2 text-xs text-rose-500">Remove slide</button>
            </div>
          ))}
          <button onClick={() => addArr('slides', { image: '', headline: '', button_text: 'Shop Now', button_url: '/shop', overlay: 0.3 })}
            className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-indigo-600"><Plus className="h-3 w-3" /> Add slide</button>
        </div>
      </div>
    )
  }

  if (type === 'categories_grid') {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <F label="Title" v={config.title} on={(v) => set('title', v)} />
          <F label="Subtitle" v={config.subtitle} on={(v) => set('subtitle', v)} />
          <div>
            <label className="text-xs font-medium text-slate-600">Columns</label>
            <select value={config.columns ?? 3} onChange={(e) => set('columns', Number(e.target.value))} className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm">
              <option value={2}>2</option><option value={3}>3</option><option value={4}>4</option>
            </select>
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold">Categories</h3>
          {(config.categories ?? []).map((c: any, i: number) => (
            <div key={i} className="mb-2 grid grid-cols-1 gap-2 rounded-lg border border-slate-200 p-3 md:grid-cols-3">
              <F label="Name" v={c.name} on={(v) => setArr('categories', i, 'name', v)} />
              <F label="Image URL" v={c.image} on={(v) => setArr('categories', i, 'image', v)} />
              <F label="Link URL" v={c.url} on={(v) => setArr('categories', i, 'url', v)} />
              <button onClick={() => delArr('categories', i)} className="text-xs text-rose-500">Remove</button>
            </div>
          ))}
          <button onClick={() => addArr('categories', { name: '', image: '', url: '' })} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-indigo-600"><Plus className="h-3 w-3" /> Add category</button>
        </div>
      </div>
    )
  }

  if (type === 'featured_products') {
    return (
      <div className="space-y-3">
        <F label="Title" v={config.title} on={(v) => set('title', v)} />
        <F label="Subtitle" v={config.subtitle} on={(v) => set('subtitle', v)} />
        <F label="Number of products to show" v={config.limit ?? 8} on={(v) => set('limit', Number(v))} type="number" />
        <F label="Specific product IDs (comma-separated, optional)" v={(config.product_ids ?? []).join(', ')} on={(v) => set('product_ids', String(v).split(',').map((s) => Number(s.trim())).filter(Boolean))} wide />
        <p className="text-xs text-slate-500">If you list product IDs, only those will be shown. Otherwise the latest featured + newest are shown.</p>
      </div>
    )
  }

  if (type === 'banner_strip') {
    return (
      <div>
        <h3 className="mb-2 text-sm font-semibold">Selling points (4 recommended)</h3>
        {(config.items ?? []).map((it: any, i: number) => (
          <div key={i} className="mb-2 grid grid-cols-1 gap-2 rounded-lg border border-slate-200 p-3 md:grid-cols-3">
            <div>
              <label className="text-xs font-medium text-slate-600">Icon</label>
              <select value={it.icon ?? 'truck'} onChange={(e) => setArr('items', i, 'icon', e.target.value)} className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm">
                {['truck','gift','shield','phone','sparkles','star','heart','award'].map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </div>
            <F label="Title" v={it.title} on={(v) => setArr('items', i, 'title', v)} />
            <F label="Subtitle" v={it.subtitle} on={(v) => setArr('items', i, 'subtitle', v)} />
            <button onClick={() => delArr('items', i)} className="text-xs text-rose-500">Remove</button>
          </div>
        ))}
        <button onClick={() => addArr('items', { icon: 'sparkles', title: '', subtitle: '' })} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-indigo-600"><Plus className="h-3 w-3" /> Add point</button>
      </div>
    )
  }

  if (type === 'image_text') {
    return (
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <F label="Image URL" v={config.image} on={(v) => set('image', v)} wide />
        <div>
          <label className="text-xs font-medium text-slate-600">Image position</label>
          <select value={config.image_position ?? 'left'} onChange={(e) => set('image_position', e.target.value)} className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm">
            <option value="left">Left</option><option value="right">Right</option>
          </select>
        </div>
        <F label="Kicker" v={config.kicker} on={(v) => set('kicker', v)} />
        <F label="Title" v={config.title} on={(v) => set('title', v)} />
        <F label="Body" v={config.body} on={(v) => set('body', v)} textarea wide />
        <F label="Button text" v={config.button_text} on={(v) => set('button_text', v)} />
        <F label="Button URL" v={config.button_url} on={(v) => set('button_url', v)} />
      </div>
    )
  }

  if (type === 'testimonials') {
    return (
      <div className="space-y-3">
        <F label="Title" v={config.title} on={(v) => set('title', v)} />
        {(config.items ?? []).map((t: any, i: number) => (
          <div key={i} className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 p-3 md:grid-cols-3">
            <F label="Name" v={t.name} on={(v) => setArr('items', i, 'name', v)} />
            <F label="Rating (1-5)" v={t.rating ?? 5} on={(v) => setArr('items', i, 'rating', Number(v))} type="number" />
            <F label="Quote" v={t.text} on={(v) => setArr('items', i, 'text', v)} textarea wide />
            <button onClick={() => delArr('items', i)} className="text-xs text-rose-500">Remove</button>
          </div>
        ))}
        <button onClick={() => addArr('items', { name: '', rating: 5, text: '' })} className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600"><Plus className="h-3 w-3" /> Add testimonial</button>
      </div>
    )
  }

  if (type === 'newsletter') {
    return (
      <div className="space-y-3">
        <F label="Title" v={config.title} on={(v) => set('title', v)} />
        <F label="Subtitle" v={config.subtitle} on={(v) => set('subtitle', v)} />
        <F label="Button text" v={config.button_text} on={(v) => set('button_text', v)} />
      </div>
    )
  }

  if (type === 'instagram') {
    return (
      <div className="space-y-3">
        <F label="Instagram handle (without @)" v={config.handle} on={(v) => set('handle', v)} />
        <div>
          <h3 className="mb-2 text-sm font-semibold">Image URLs (6 recommended)</h3>
          {(config.images ?? []).map((src: string, i: number) => (
            <div key={i} className="mb-2 flex items-center gap-2">
              <input value={src} onChange={(e) => { const a = [...(config.images ?? [])]; a[i] = e.target.value; set('images', a) }} className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm" />
              <button onClick={() => delArr('images', i)} className="text-xs text-rose-500">Remove</button>
            </div>
          ))}
          <button onClick={() => set('images', [...(config.images ?? []), ''])} className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600"><Plus className="h-3 w-3" /> Add image</button>
        </div>
      </div>
    )
  }

  return <div className="text-sm text-slate-500">No specific editor for this section type yet — JSON below:
    <textarea value={JSON.stringify(config, null, 2)} onChange={(e) => { try { setConfig(JSON.parse(e.target.value)) } catch {} }} rows={8} className="mt-2 w-full rounded border border-slate-300 p-2 font-mono text-xs" />
  </div>
}

function Sub({ label, children }: any) {
  return <div className="flex items-center gap-2 text-sm"><span className="text-slate-600">{label}</span>{children}</div>
}

function F({ label, v, on, wide, textarea, type = 'text' }: any) {
  return (
    <div className={wide ? 'md:col-span-2' : ''}>
      <label className="text-xs font-medium text-slate-600">{label}</label>
      {textarea ? (
        <textarea value={v ?? ''} onChange={(e) => on(e.target.value)} rows={3} className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm" />
      ) : (
        <input type={type} value={v ?? ''} onChange={(e) => on(e.target.value)} className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm" />
      )}
    </div>
  )
}
