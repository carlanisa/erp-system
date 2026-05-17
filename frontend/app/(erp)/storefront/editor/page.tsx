'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { Sortable } from '@/components/ui/Sortable'
import {
  ArrowLeft, Monitor, Tablet, Smartphone, RefreshCw, Save, RotateCcw,
  ChevronDown, ChevronUp, ArrowUp, ArrowDown, Eye, EyeOff, Plus, Trash2, X,
  Palette, Layers, Megaphone, Mail, Image as ImageIcon, LayoutGrid, ShoppingBag,
  FileText, Quote, Instagram, Sparkles, ExternalLink, Type, Video, Timer,
} from 'lucide-react'

type Settings = Record<string, any>
type Section  = { id: number; type: string; label: string | null; position: number; enabled: boolean; config_json: any }
type Bar      = { id: number; text: string; link_url: string | null; bg_color: string; text_color: string; active: boolean; sort_order: number }
type Device   = 'desktop' | 'tablet' | 'mobile'

const BLOCK_GROUPS = [
  { group: 'Layout', items: [
    { code: 'hero_slider',     name: 'Hero Slider',     icon: ImageIcon, desc: 'Full-width slides with headline + button' },
    { code: 'categories_grid', name: 'Categories Grid', icon: LayoutGrid, desc: 'Big image cards linking to categories' },
    { code: 'banner_strip',    name: 'Banner Strip',    icon: Megaphone, desc: '4 selling-point icons' },
    { code: 'image_text',      name: 'Image + Text',    icon: FileText,  desc: 'Side-by-side promo' },
  ]},
  { group: 'Content', items: [
    { code: 'rich_text',         name: 'Rich Text',         icon: Type,        desc: 'Title + body text block' },
    { code: 'video',             name: 'Video',             icon: Video,       desc: 'Embed YouTube or MP4' },
    { code: 'testimonials',      name: 'Testimonials',      icon: Quote,       desc: 'Customer reviews' },
    { code: 'featured_products', name: 'Featured Products', icon: ShoppingBag, desc: 'Hand-picked product grid' },
  ]},
  { group: 'Marketing', items: [
    { code: 'countdown',  name: 'Countdown Sale', icon: Timer,     desc: 'Live countdown + CTA' },
    { code: 'newsletter', name: 'Newsletter',     icon: Mail,      desc: 'Email signup CTA' },
    { code: 'instagram',  name: 'Instagram Feed', icon: Instagram, desc: '6-image grid' },
  ]},
]
const BLOCK_BY_CODE: Record<string, any> = Object.fromEntries(BLOCK_GROUPS.flatMap((g) => g.items).map((b) => [b.code, b]))

const PRESETS = [
  { code: 'carlanisa', name: 'Carlanisa', sample: ['#5d2a2a', '#b8860b', '#fdfaf5'] },
  { code: 'elegant',   name: 'Elegant',   sample: ['#7f1d1d', '#b8860b', '#faf7f2'] },
  { code: 'bold',      name: 'Bold',      sample: ['#dc2626', '#fbbf24', '#fffaf0'] },
  { code: 'minimal',   name: 'Minimal',   sample: ['#18181b', '#525252', '#ffffff'] },
  { code: 'pastel',    name: 'Pastel',    sample: ['#86905c', '#f4a4a4', '#fdfaf6'] },
]
const FONT_OPTIONS = ['Playfair Display','Cormorant Garamond','Bebas Neue','Inter','Lato','Poppins','DM Sans','Montserrat']
const DEVICE_WIDTHS:  Record<Device, string> = { desktop: '100%',  tablet: '820px',  mobile: '390px' }
const DEVICE_HEIGHTS: Record<Device, string> = { desktop: '100%',  tablet: '1180px', mobile: '844px' }

let _localId = 0
const nextLocalId = () => `_local_${++_localId}`
function ensureIds<T extends Record<string, any>>(arr: T[]): (T & { id: string })[] {
  return (arr ?? []).map((it) => it.id ? it : { ...it, id: nextLocalId() }) as any
}

export default function ThemeEditorPage() {
  const [settings, setSettings] = useState<Settings>({})
  const [sections, setSections] = useState<Section[]>([])
  const [bars, setBars] = useState<Bar[]>([])
  const [origSettings, setOrigSettings] = useState<Settings>({})
  const [origSections, setOrigSections] = useState<Section[]>([])
  const [origBars,     setOrigBars]     = useState<Bar[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [device, setDevice]   = useState<Device>('desktop')
  const [expandedSection, setExpandedSection] = useState<number | null>(null)
  const [openPanel, setOpenPanel] = useState<'theme'|'brand'|'contact'|'social'|'bar'|null>('theme')
  const [picker, setPicker] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  async function loadAll() {
    setLoading(true)
    try {
      const [s, sec, b] = await Promise.all([
        api.get('/admin/storefront/theme-settings'),
        api.get('/admin/storefront/sections'),
        api.get('/admin/storefront/announcement-bars'),
      ])
      const secVal: Section[] = Array.isArray(sec.data) ? sec.data : sec.data?.data ?? []
      const barVal: Bar[]     = Array.isArray(b.data)   ? b.data   : b.data?.data ?? []
      setSettings(s.data);  setOrigSettings(s.data)
      setSections(secVal);  setOrigSections(secVal)
      setBars(barVal);      setOrigBars(barVal)
    } finally { setLoading(false) }
  }
  useEffect(() => { loadAll() }, [])

  const liveAnnouncement = useMemo(() => bars.find((b) => b.active) ?? null, [bars])
  const livePayload = useMemo(() => ({
    settings,
    sections: sections.filter((s) => s.enabled).sort((a, b) => a.position - b.position)
      .map((s) => ({ id: s.id, type: s.type, label: s.label, config: s.config_json })),
    announcement: liveAnnouncement ? { id: liveAnnouncement.id, text: liveAnnouncement.text, link_url: liveAnnouncement.link_url, bg_color: liveAnnouncement.bg_color, text_color: liveAnnouncement.text_color } : null,
  }), [settings, sections, liveAnnouncement])
  const [iframeReady, setIframeReady] = useState(false)
  useEffect(() => {
    const onMsg = (e: MessageEvent) => { if (e.data?.type === 'STOREFRONT_READY') setIframeReady(true) }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [])
  useEffect(() => {
    if (!iframeReady) return
    iframeRef.current?.contentWindow?.postMessage({ type: 'STOREFRONT_PREVIEW', payload: livePayload }, '*')
  }, [iframeReady, livePayload])

  const dirty = useMemo(() => {
    return JSON.stringify(settings) !== JSON.stringify(origSettings)
      || JSON.stringify(sections) !== JSON.stringify(origSections)
      || JSON.stringify(bars) !== JSON.stringify(origBars)
  }, [settings, sections, bars, origSettings, origSections, origBars])

  async function save() {
    setSaving(true)
    try {
      if (JSON.stringify(settings) !== JSON.stringify(origSettings)) {
        await api.put('/admin/storefront/theme-settings', settings)
      }
      for (const s of sections) {
        const orig = origSections.find((o) => o.id === s.id)
        if (orig && JSON.stringify(orig) !== JSON.stringify(s)) {
          await api.put(`/admin/storefront/sections/${s.id}`, {
            label: s.label, enabled: s.enabled, config_json: s.config_json,
          })
        }
      }
      const newOrder = sections.map((s) => s.id)
      const origOrder = origSections.map((s) => s.id)
      if (JSON.stringify(newOrder) !== JSON.stringify(origOrder)) {
        await api.post('/admin/storefront/sections/reorder', { order: newOrder })
      }
      for (const b of bars) {
        const orig = origBars.find((o) => o.id === b.id)
        if (orig && JSON.stringify(orig) !== JSON.stringify(b)) {
          await api.put(`/admin/storefront/announcement-bars/${b.id}`, b)
        }
      }
      toast.success('Saved — customer site is now live.')
      await loadAll()
      iframeRef.current?.contentWindow?.postMessage({ type: 'STOREFRONT_RELOAD' }, '*')
    } catch (e: any) {
      toast.error('Save failed — ' + (e?.response?.data?.message ?? e.message))
    } finally { setSaving(false) }
  }

  function discard() {
    if (!confirm('Discard all unsaved changes?')) return
    setSettings(origSettings); setSections(origSections); setBars(origBars)
  }

  function updateSectionConfig(id: number, config: any) { setSections(sections.map((s) => s.id === id ? { ...s, config_json: config } : s)) }
  function updateSection(id: number, patch: Partial<Section>) { setSections(sections.map((s) => s.id === id ? { ...s, ...patch } : s)) }
  async function addSection(type: string) {
    const def = BLOCK_BY_CODE[type]
    const { data } = await api.post('/admin/storefront/sections', { type, label: def?.name, enabled: true, config_json: defaultConfig(type) })
    const next = [...sections, data]
    setSections(next); setOrigSections(next)
    setPicker(false); setExpandedSection(data.id)
  }
  async function deleteSection(id: number) {
    if (!confirm('Delete this section?')) return
    await api.delete(`/admin/storefront/sections/${id}`)
    setSections(sections.filter((s) => s.id !== id))
    setOrigSections(origSections.filter((s) => s.id !== id))
  }
  function moveSection(id: number, dir: -1 | 1) {
    const idx = sections.findIndex((s) => s.id === id)
    const j = idx + dir
    if (j < 0 || j >= sections.length) return
    const next = [...sections]
    const [it] = next.splice(idx, 1)
    next.splice(j, 0, it)
    setSections(next.map((s, i) => ({ ...s, position: i })))
  }
  async function addBar() {
    const { data } = await api.post('/admin/storefront/announcement-bars', {
      text: 'Free shipping over RM150!', bg_color: settings.color_primary ?? '#5d2a2a',
      text_color: '#ffffff', active: true, sort_order: bars.length + 1,
    })
    setBars([...bars, data]); setOrigBars([...bars, data])
  }
  async function delBar(id: number) {
    if (!confirm('Delete this announcement bar?')) return
    await api.delete(`/admin/storefront/announcement-bars/${id}`)
    setBars(bars.filter((b) => b.id !== id)); setOrigBars(origBars.filter((b) => b.id !== id))
  }
  function patchBar(id: number, p: Partial<Bar>) { setBars(bars.map((b) => b.id === id ? { ...b, ...p } : b)) }
  async function applyPreset(code: string) {
    if (!confirm(`Apply "${code}" preset? Replaces current colors + fonts.`)) return
    const { data } = await api.post('/admin/storefront/theme-settings/preset', { preset: code })
    setSettings(data); setOrigSettings(data)
  }

  if (loading) return <div className="text-slate-400 p-6">Loading editor…</div>

  return (
    <div className="fixed inset-y-0 left-60 right-0 top-0 flex flex-col bg-slate-100">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5">
        <div className="flex items-center gap-3">
          <Link href="/storefront" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600">
            <ArrowLeft className="h-4 w-4" /> Storefront
          </Link>
          <div className="h-5 w-px bg-slate-200" />
          <h1 className="text-sm font-semibold text-slate-800">Theme Editor</h1>
          {dirty && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Unsaved</span>}
        </div>
        <div className="flex items-center gap-1 rounded-full border border-slate-200 p-0.5">
          {(['desktop','tablet','mobile'] as Device[]).map((d) => {
            const Icon = d === 'desktop' ? Monitor : d === 'tablet' ? Tablet : Smartphone
            return (
              <button key={d} onClick={() => setDevice(d)}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs ${device === d ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>
                <Icon className="h-3.5 w-3.5" /> {d}
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-2">
          <a href="/" target="_blank" rel="noopener noreferrer"
             className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50">
            <ExternalLink className="h-3 w-3" /> Live site
          </a>
          <button onClick={() => iframeRef.current?.contentWindow?.location.reload()}
            className="rounded-md border border-slate-300 p-1.5 text-slate-500 hover:bg-slate-50" aria-label="Reload">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button onClick={discard} disabled={!dirty}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs disabled:opacity-50">
            <RotateCcw className="h-3 w-3" /> Discard
          </button>
          <button onClick={save} disabled={!dirty || saving}
            className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
            <Save className="h-3 w-3" /> {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-[380px] flex-none overflow-y-auto border-r border-slate-200 bg-white">
          <Panel title="Color & Fonts" icon={Palette} open={openPanel === 'theme'} onToggle={() => setOpenPanel(openPanel === 'theme' ? null : 'theme')}>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-600">Quick presets</label>
                <div className="mt-2 grid grid-cols-5 gap-1.5">
                  {PRESETS.map((p) => (
                    <button key={p.code} onClick={() => applyPreset(p.code)} title={p.name}
                      className={`rounded-md border p-2 ${settings.preset === p.code ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-slate-200 hover:border-slate-300'}`}>
                      <div className="flex gap-0.5">
                        {p.sample.map((c) => <span key={c} className="h-3 w-3 rounded-full" style={{ background: c }} />)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <ColorRow label="Primary"       k="color_primary" settings={settings} setSettings={setSettings} />
              <ColorRow label="Accent (gold)" k="color_accent"  settings={settings} setSettings={setSettings} />
              <ColorRow label="Background"    k="color_bg"      settings={settings} setSettings={setSettings} />
              <ColorRow label="Surface"       k="color_surface" settings={settings} setSettings={setSettings} />
              <ColorRow label="Text"          k="color_text"    settings={settings} setSettings={setSettings} />
              <ColorRow label="Muted text"    k="color_muted"   settings={settings} setSettings={setSettings} />
              <ColorRow label="Sale red"      k="color_sale"    settings={settings} setSettings={setSettings} />
              <FontRow  label="Heading font"  k="font_heading"  settings={settings} setSettings={setSettings} />
              <FontRow  label="Body font"     k="font_body"     settings={settings} setSettings={setSettings} />
            </div>
          </Panel>

          <Panel title="Brand" icon={Sparkles} open={openPanel === 'brand'} onToggle={() => setOpenPanel(openPanel === 'brand' ? null : 'brand')}>
            <div className="space-y-3">
              <Input label="Brand name" v={settings.brand_name} on={(v) => setSettings({ ...settings, brand_name: v })} />
              <Input label="Tagline" v={settings.brand_tagline} on={(v) => setSettings({ ...settings, brand_tagline: v })} />
              <Input label="Logo URL" v={settings.logo_url} on={(v) => setSettings({ ...settings, logo_url: v })} />
              <Input label="Favicon URL" v={settings.favicon_url} on={(v) => setSettings({ ...settings, favicon_url: v })} />
              <Input label="Currency display" v={settings.currency_display} on={(v) => setSettings({ ...settings, currency_display: v })} />
            </div>
          </Panel>

          <Panel title="Contact" icon={Mail} open={openPanel === 'contact'} onToggle={() => setOpenPanel(openPanel === 'contact' ? null : 'contact')}>
            <div className="space-y-3">
              <Input label="Phone" v={settings.contact_phone} on={(v) => setSettings({ ...settings, contact_phone: v })} />
              <Input label="WhatsApp" v={settings.contact_whatsapp} on={(v) => setSettings({ ...settings, contact_whatsapp: v })} />
              <Input label="Email" v={settings.contact_email} on={(v) => setSettings({ ...settings, contact_email: v })} />
              <Input label="Address" v={settings.contact_address} on={(v) => setSettings({ ...settings, contact_address: v })} />
            </div>
          </Panel>

          <Panel title="Social" icon={Instagram} open={openPanel === 'social'} onToggle={() => setOpenPanel(openPanel === 'social' ? null : 'social')}>
            <div className="space-y-3">
              <Input label="Instagram URL" v={settings.social_instagram} on={(v) => setSettings({ ...settings, social_instagram: v })} />
              <Input label="Facebook URL" v={settings.social_facebook} on={(v) => setSettings({ ...settings, social_facebook: v })} />
              <Input label="TikTok URL" v={settings.social_tiktok} on={(v) => setSettings({ ...settings, social_tiktok: v })} />
              <Input label="YouTube URL" v={settings.social_youtube} on={(v) => setSettings({ ...settings, social_youtube: v })} />
            </div>
          </Panel>

          <Panel title="Announcement bar" icon={Megaphone} open={openPanel === 'bar'} onToggle={() => setOpenPanel(openPanel === 'bar' ? null : 'bar')}>
            {bars.length === 0 && <p className="mb-2 text-xs text-slate-500">No announcement bar.</p>}
            {bars.map((b) => (
              <div key={b.id} className="mb-3 rounded-md border border-slate-200 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={b.active} onChange={(e) => patchBar(b.id, { active: e.target.checked })} /> Active
                  </label>
                  <button onClick={() => delBar(b.id)} className="text-rose-500"><Trash2 className="h-3 w-3" /></button>
                </div>
                <Input label="Text" v={b.text} on={(v) => patchBar(b.id, { text: v })} />
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <ColorInput label="Background" v={b.bg_color} on={(v) => patchBar(b.id, { bg_color: v })} />
                  <ColorInput label="Text color" v={b.text_color} on={(v) => patchBar(b.id, { text_color: v })} />
                </div>
                <Input label="Link URL" v={b.link_url ?? ''} on={(v) => patchBar(b.id, { link_url: v })} />
              </div>
            ))}
            <button onClick={addBar} className="inline-flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-slate-300 py-2 text-xs text-slate-600 hover:bg-slate-50">
              <Plus className="h-3 w-3" /> Add announcement
            </button>
          </Panel>

          <div>
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Layers className="h-4 w-4" /> Sections
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-500">{sections.length}</span>
              </h2>
              <button onClick={() => setPicker(true)} className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-700">
                <Plus className="h-3 w-3" /> Add block
              </button>
            </div>
            <div className="px-2 py-2">
              <Sortable items={sections}
                onChange={(next) => setSections(next.map((s, i) => ({ ...s, position: i })))}
                vertical
              >
                {(s) => {
                  const idx = sections.findIndex((x) => x.id === s.id)
                  return <SectionRow
                    s={s as Section}
                    isFirst={idx === 0}
                    isLast={idx === sections.length - 1}
                    expanded={expandedSection === s.id}
                    onToggleExpand={() => setExpandedSection(expandedSection === s.id ? null : s.id)}
                    onToggleEnabled={() => updateSection(s.id, { enabled: !s.enabled })}
                    onDelete={() => deleteSection(s.id)}
                    onMoveUp={() => moveSection(s.id, -1)}
                    onMoveDown={() => moveSection(s.id, 1)}
                    onLabel={(l) => updateSection(s.id, { label: l })}
                    onConfig={(c) => updateSectionConfig(s.id, c)}
                  />
                }}
              </Sortable>
            </div>
          </div>

          <div className="px-4 py-6 text-center text-xs text-slate-400">
            Drag the grip handle to reorder. Click <strong>Save</strong> to publish.
          </div>
        </aside>

        <main className="flex-1 overflow-auto p-4">
          <div className="mx-auto h-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
               style={{ width: DEVICE_WIDTHS[device], maxWidth: '100%', height: device === 'desktop' ? '100%' : DEVICE_HEIGHTS[device] }}>
            <iframe ref={iframeRef} src="/?preview=1" title="Storefront preview" className="h-full w-full" />
          </div>
        </main>
      </div>

      {picker && <PickerModal onClose={() => setPicker(false)} onPick={addSection} />}
    </div>
  )
}

function SectionRow({ s, isFirst, isLast, expanded, onToggleExpand, onToggleEnabled, onDelete, onMoveUp, onMoveDown, onLabel, onConfig }: any) {
  const def = BLOCK_BY_CODE[s.type]
  const Icon = def?.icon ?? FileText
  return (
    <div className={`mb-1 rounded-md border ${expanded ? 'border-indigo-300 bg-indigo-50/40' : 'border-slate-200 bg-white'} ${s.enabled ? '' : 'opacity-60'}`}>
      <div className="flex items-center gap-0.5 py-1 pr-1">
        <button type="button" onClick={onToggleExpand}
          className="flex flex-1 items-center gap-2 px-2 py-1.5 text-left">
          <Icon className="h-4 w-4 flex-none text-slate-500" />
          <span className="truncate text-sm font-medium">{s.label || def?.name || s.type}</span>
        </button>
        <button onClick={onMoveUp} disabled={isFirst}
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 disabled:opacity-30 disabled:hover:bg-transparent"
          aria-label="Move up" title="Move up">
          <ArrowUp className="h-4 w-4" />
        </button>
        <button onClick={onMoveDown} disabled={isLast}
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 disabled:opacity-30 disabled:hover:bg-transparent"
          aria-label="Move down" title="Move down">
          <ArrowDown className="h-4 w-4" />
        </button>
        <button onClick={onToggleEnabled} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Toggle visibility" title={s.enabled ? 'Hide' : 'Show'}>
          {s.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
        <button onClick={onDelete} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-500" aria-label="Delete" title="Delete">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {expanded && (
        <div className="border-t border-slate-200 bg-white px-3 py-3">
          <SectionEditor section={s} onChange={onConfig} onLabel={onLabel} />
        </div>
      )}
    </div>
  )
}

function PickerModal({ onClose, onPick }: { onClose: () => void; onPick: (type: string) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="font-semibold">Add a block</h2>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-6">
          {BLOCK_GROUPS.map((g) => (
            <section key={g.group}>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">{g.group}</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {g.items.map((t) => {
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
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}

function defaultConfig(type: string): any {
  switch (type) {
    case 'hero_slider':       return { slides: [{ id: nextLocalId(), image: '', headline: 'Headline', button_text: 'Shop Now', button_url: '/shop', overlay: 0.3 }], autoplay: true, interval: 5500 }
    case 'categories_grid':   return { title: 'Shop by Category', columns: 3, categories: [{ id: nextLocalId(), name: '', image: '', url: '' }] }
    case 'featured_products': return { title: 'Featured', limit: 8 }
    case 'banner_strip':      return { items: [{ id: nextLocalId(), icon: 'truck', title: 'Free Shipping', subtitle: 'Over RM150' }] }
    case 'image_text':        return { image: '', image_position: 'left', kicker: '', title: '', body: '', button_text: '', button_url: '' }
    case 'testimonials':      return { title: 'Loved by our customers', items: [{ id: nextLocalId(), name: '', rating: 5, text: '' }] }
    case 'newsletter':        return { title: 'Join the family', subtitle: '', button_text: 'Subscribe' }
    case 'instagram':         return { handle: '', images: [] }
    case 'rich_text':         return { kicker: '', title: 'About us', body: 'Tell your story here…', align: 'center', max_width: 'normal' }
    case 'video':             return { url: '', title: '', subtitle: '', aspect: '16:9' }
    case 'countdown':         return { title: 'Limited-time offer', subtitle: 'Ends soon', ends_at: new Date(Date.now() + 86400000).toISOString().slice(0, 16), button_text: 'Shop the sale', button_url: '/shop' }
    default: return {}
  }
}

function SectionEditor({ section, onChange, onLabel }: { section: Section; onChange: (cfg: any) => void; onLabel: (l: string) => void }) {
  const c = section.config_json ?? {}
  const set = (k: string, v: any) => onChange({ ...c, [k]: v })

  function updateArr(key: string, idx: number, patch: any) {
    const arr: any[] = ensureIds(c[key] ?? [])
    arr[idx] = { ...arr[idx], ...patch }
    set(key, arr)
  }
  function addArr(key: string, item: any) {
    const arr: any[] = ensureIds(c[key] ?? [])
    arr.push({ ...item, id: nextLocalId() })
    set(key, arr)
  }
  function delArr(key: string, idx: number) {
    set(key, (c[key] ?? []).filter((_: any, i: number) => i !== idx))
  }

  return (
    <div className="space-y-3">
      <Input label="Section label (internal)" v={section.label} on={onLabel} />

      {section.type === 'hero_slider' && (() => {
        const slides = ensureIds(c.slides ?? [])
        return (
          <>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!c.autoplay} onChange={(e) => set('autoplay', e.target.checked)} /> Autoplay</label>
            <Input label="Interval (ms)" v={c.interval ?? 5500} on={(v) => set('interval', Number(v))} />
            <BlockHeader title="Slides" onAdd={() => addArr('slides', { image: '', headline: '', button_text: 'Shop Now', button_url: '/shop', overlay: 0.3 })} addLabel="Add slide" />
            <Sortable items={slides} onChange={(next) => set('slides', next)}>
              {(sl: any) => {
                const i = slides.findIndex((x: any) => x.id === sl.id)
                return (
                  <SubBlock onDelete={() => delArr('slides', i)} previewLabel={sl.headline || `Slide ${i+1}`}>
                    <Input label="Image URL" v={sl.image} on={(v) => updateArr('slides', i, { image: v })} />
                    <Input label="Kicker" v={sl.kicker} on={(v) => updateArr('slides', i, { kicker: v })} />
                    <Input label="Headline" v={sl.headline} on={(v) => updateArr('slides', i, { headline: v })} />
                    <Textarea label="Subheading" v={sl.subheading} on={(v) => updateArr('slides', i, { subheading: v })} />
                    <div className="grid grid-cols-2 gap-2">
                      <Input label="Button text" v={sl.button_text} on={(v) => updateArr('slides', i, { button_text: v })} />
                      <Input label="Button URL" v={sl.button_url} on={(v) => updateArr('slides', i, { button_url: v })} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-medium text-slate-600">Align</label>
                        <select value={sl.align ?? 'left'} onChange={(e) => updateArr('slides', i, { align: e.target.value })}
                          className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-xs">
                          <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
                        </select>
                      </div>
                      <Input label="Overlay (0-1)" v={sl.overlay ?? 0.3} on={(v) => updateArr('slides', i, { overlay: Number(v) })} />
                    </div>
                  </SubBlock>
                )
              }}
            </Sortable>
          </>
        )
      })()}

      {section.type === 'categories_grid' && (() => {
        const cats = ensureIds(c.categories ?? [])
        return (
          <>
            <Input label="Title" v={c.title} on={(v) => set('title', v)} />
            <Input label="Subtitle" v={c.subtitle} on={(v) => set('subtitle', v)} />
            <div>
              <label className="text-xs font-medium text-slate-600">Columns</label>
              <select value={c.columns ?? 3} onChange={(e) => set('columns', Number(e.target.value))} className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm">
                <option value={2}>2</option><option value={3}>3</option><option value={4}>4</option>
              </select>
            </div>
            <BlockHeader title="Categories" onAdd={() => addArr('categories', { name: '', image: '', url: '' })} addLabel="Add category" />
            <Sortable items={cats} onChange={(next) => set('categories', next)}>
              {(cat: any) => {
                const i = cats.findIndex((x: any) => x.id === cat.id)
                return (
                  <SubBlock onDelete={() => delArr('categories', i)} previewLabel={cat.name || `Category ${i+1}`}>
                    <Input label="Name" v={cat.name} on={(v) => updateArr('categories', i, { name: v })} />
                    <Input label="Image URL" v={cat.image} on={(v) => updateArr('categories', i, { image: v })} />
                    <Input label="Link URL" v={cat.url} on={(v) => updateArr('categories', i, { url: v })} />
                  </SubBlock>
                )
              }}
            </Sortable>
          </>
        )
      })()}

      {section.type === 'featured_products' && (
        <>
          <Input label="Title" v={c.title} on={(v) => set('title', v)} />
          <Input label="Subtitle" v={c.subtitle} on={(v) => set('subtitle', v)} />
          <Input label="Number of products" v={c.limit ?? 8} on={(v) => set('limit', Number(v))} />
          <Input label="Specific product IDs (comma-separated)" v={(c.product_ids ?? []).join(', ')}
            on={(v) => set('product_ids', String(v).split(',').map((x) => Number(x.trim())).filter(Boolean))} />
        </>
      )}

      {section.type === 'banner_strip' && (() => {
        const items = ensureIds(c.items ?? [])
        return (
          <>
            <BlockHeader title="Selling points" onAdd={() => addArr('items', { icon: 'sparkles', title: '', subtitle: '' })} addLabel="Add point" />
            <Sortable items={items} onChange={(next) => set('items', next)}>
              {(it: any) => {
                const i = items.findIndex((x: any) => x.id === it.id)
                return (
                  <SubBlock onDelete={() => delArr('items', i)} previewLabel={it.title || `Point ${i+1}`}>
                    <div>
                      <label className="text-xs font-medium text-slate-600">Icon</label>
                      <select value={it.icon ?? 'truck'} onChange={(e) => updateArr('items', i, { icon: e.target.value })}
                        className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-xs">
                        {['truck','gift','shield','phone','sparkles','star','heart','award'].map((x) => <option key={x} value={x}>{x}</option>)}
                      </select>
                    </div>
                    <Input label="Title" v={it.title} on={(v) => updateArr('items', i, { title: v })} />
                    <Input label="Subtitle" v={it.subtitle} on={(v) => updateArr('items', i, { subtitle: v })} />
                  </SubBlock>
                )
              }}
            </Sortable>
          </>
        )
      })()}

      {section.type === 'image_text' && (
        <>
          <Input label="Image URL" v={c.image} on={(v) => set('image', v)} />
          <div>
            <label className="text-xs font-medium text-slate-600">Image position</label>
            <select value={c.image_position ?? 'left'} onChange={(e) => set('image_position', e.target.value)} className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm">
              <option value="left">Left</option><option value="right">Right</option>
            </select>
          </div>
          <Input label="Kicker" v={c.kicker} on={(v) => set('kicker', v)} />
          <Input label="Title" v={c.title} on={(v) => set('title', v)} />
          <Textarea label="Body" v={c.body} on={(v) => set('body', v)} rows={3} />
          <div className="grid grid-cols-2 gap-2">
            <Input label="Button text" v={c.button_text} on={(v) => set('button_text', v)} />
            <Input label="Button URL" v={c.button_url} on={(v) => set('button_url', v)} />
          </div>
        </>
      )}

      {section.type === 'testimonials' && (() => {
        const items = ensureIds(c.items ?? [])
        return (
          <>
            <Input label="Title" v={c.title} on={(v) => set('title', v)} />
            <BlockHeader title="Testimonials" onAdd={() => addArr('items', { name: '', rating: 5, text: '' })} addLabel="Add testimonial" />
            <Sortable items={items} onChange={(next) => set('items', next)}>
              {(t: any) => {
                const i = items.findIndex((x: any) => x.id === t.id)
                return (
                  <SubBlock onDelete={() => delArr('items', i)} previewLabel={t.name || `Testimonial ${i+1}`}>
                    <Input label="Name" v={t.name} on={(v) => updateArr('items', i, { name: v })} />
                    <Input label="Rating (1-5)" v={t.rating ?? 5} on={(v) => updateArr('items', i, { rating: Number(v) })} />
                    <Textarea label="Quote" v={t.text} on={(v) => updateArr('items', i, { text: v })} />
                  </SubBlock>
                )
              }}
            </Sortable>
          </>
        )
      })()}

      {section.type === 'newsletter' && (
        <>
          <Input label="Title" v={c.title} on={(v) => set('title', v)} />
          <Input label="Subtitle" v={c.subtitle} on={(v) => set('subtitle', v)} />
          <Input label="Button text" v={c.button_text} on={(v) => set('button_text', v)} />
        </>
      )}

      {section.type === 'instagram' && (() => {
        const imagesWithIds = ensureIds((c.images ?? []).map((src: any) => typeof src === 'string' ? { src } : src))
        return (
          <>
            <Input label="Handle (no @)" v={c.handle} on={(v) => set('handle', v)} />
            <BlockHeader title="Images" onAdd={() => set('images', [...(c.images ?? []), ''])} addLabel="Add image" />
            <Sortable items={imagesWithIds} onChange={(next) => set('images', (next as any[]).map((x) => x.src ?? ''))}>
              {(img: any) => {
                const i = imagesWithIds.findIndex((x: any) => x.id === img.id)
                return (
                  <SubBlock onDelete={() => delArr('images', i)} previewLabel={`Image ${i+1}`}>
                    <Input label="Image URL" v={img.src ?? ''}
                      on={(v) => {
                        const arr = imagesWithIds.map((x: any, j: number) => j === i ? { ...x, src: v } : x)
                        set('images', arr.map((x: any) => x.src ?? ''))
                      }} />
                  </SubBlock>
                )
              }}
            </Sortable>
          </>
        )
      })()}

      {section.type === 'rich_text' && (
        <>
          <Input label="Kicker (small label)" v={c.kicker} on={(v) => set('kicker', v)} />
          <Input label="Title" v={c.title} on={(v) => set('title', v)} />
          <Textarea label="Body" v={c.body} on={(v) => set('body', v)} rows={5} />
          <div>
            <label className="text-xs font-medium text-slate-600">Align</label>
            <select value={c.align ?? 'center'} onChange={(e) => set('align', e.target.value)} className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm">
              <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Max width</label>
            <select value={c.max_width ?? 'normal'} onChange={(e) => set('max_width', e.target.value)} className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm">
              <option value="narrow">Narrow</option><option value="normal">Normal</option><option value="wide">Wide</option>
            </select>
          </div>
        </>
      )}

      {section.type === 'video' && (
        <>
          <Input label="Video URL (YouTube or .mp4)" v={c.url} on={(v) => set('url', v)} />
          <Input label="Title (optional)" v={c.title} on={(v) => set('title', v)} />
          <Input label="Subtitle (optional)" v={c.subtitle} on={(v) => set('subtitle', v)} />
          <div>
            <label className="text-xs font-medium text-slate-600">Aspect ratio</label>
            <select value={c.aspect ?? '16:9'} onChange={(e) => set('aspect', e.target.value)} className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm">
              <option value="16:9">16:9 (widescreen)</option><option value="4:3">4:3</option><option value="1:1">1:1 (square)</option>
            </select>
          </div>
        </>
      )}

      {section.type === 'countdown' && (
        <>
          <Input label="Title" v={c.title} on={(v) => set('title', v)} />
          <Input label="Subtitle" v={c.subtitle} on={(v) => set('subtitle', v)} />
          <div>
            <label className="text-xs font-medium text-slate-600">Ends at</label>
            <input type="datetime-local" value={c.ends_at?.slice(0,16) ?? ''} onChange={(e) => set('ends_at', e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input label="Button text" v={c.button_text} on={(v) => set('button_text', v)} />
            <Input label="Button URL" v={c.button_url} on={(v) => set('button_url', v)} />
          </div>
        </>
      )}
    </div>
  )
}

function Panel({ title, icon: Icon, open, onToggle, children }: any) {
  return (
    <div className="border-b border-slate-200">
      <button onClick={onToggle} className="flex w-full items-center justify-between px-4 py-3 hover:bg-slate-50">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700"><Icon className="h-4 w-4" /> {title}</h2>
        {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

function BlockHeader({ title, onAdd, addLabel }: { title: string; onAdd: () => void; addLabel: string }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</div>
      <button onClick={onAdd} className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800">
        <Plus className="h-3 w-3" /> {addLabel}
      </button>
    </div>
  )
}

function SubBlock({ previewLabel, onDelete, children }: { previewLabel?: string; onDelete: () => void; children: React.ReactNode }) {
  return (
    <div className="mb-2 rounded border border-slate-200 bg-slate-50 p-2">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{previewLabel ?? 'Item'}</span>
        <button onClick={onDelete} className="text-rose-500 hover:text-rose-700" aria-label="Delete"><Trash2 className="h-3 w-3" /></button>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Input({ label, v, on }: any) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <input value={v ?? ''} onChange={(e) => on(e.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm" />
    </div>
  )
}

function Textarea({ label, v, on, rows = 2 }: any) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <textarea value={v ?? ''} onChange={(e) => on(e.target.value)} rows={rows}
        className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm" />
    </div>
  )
}

function ColorInput({ label, v, on }: any) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <div className="mt-1 flex items-center gap-2">
        <input type="color" value={v || '#000000'} onChange={(e) => on(e.target.value)}
          className="h-8 w-10 cursor-pointer rounded border border-slate-300" />
        <input value={v ?? ''} onChange={(e) => on(e.target.value)}
          className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 font-mono text-xs" />
      </div>
    </div>
  )
}

function ColorRow({ label, k, settings, setSettings }: any) {
  return <ColorInput label={label} v={settings[k]} on={(v: string) => setSettings({ ...settings, [k]: v })} />
}

function FontRow({ label, k, settings, setSettings }: any) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <select value={settings[k] ?? ''} onChange={(e) => setSettings({ ...settings, [k]: e.target.value })}
        className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
        style={{ fontFamily: settings[k] }}>
        {FONT_OPTIONS.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
      </select>
    </div>
  )
}
