'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { ArrowLeft, Palette, Save, ExternalLink, Eye } from 'lucide-react'

type Settings = Record<string, any>

const PRESETS = [
  { code: 'carlanisa', name: 'Carlanisa Luxe', sample: ['#5d2a2a', '#b8860b', '#fdfaf5'] },
  { code: 'elegant',   name: 'Elegant Modestwear', sample: ['#7f1d1d', '#b8860b', '#faf7f2'] },
  { code: 'bold',      name: 'Bold & Festive', sample: ['#dc2626', '#fbbf24', '#fffaf0'] },
  { code: 'minimal',   name: 'Minimal Mono', sample: ['#18181b', '#525252', '#ffffff'] },
  { code: 'pastel',    name: 'Pastel Spring', sample: ['#86905c', '#f4a4a4', '#fdfaf6'] },
]
const FONT_OPTIONS = [
  'Playfair Display', 'Cormorant Garamond', 'Bebas Neue', 'Inter', 'Lato', 'Poppins', 'DM Sans', 'Montserrat',
]

export default function ThemePage() {
  const [s, setS] = useState<Settings>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/storefront/theme-settings')
      setS(data)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  function setField(k: string, v: any) { setS({ ...s, [k]: v }) }

  async function save() {
    setSaving(true)
    try {
      await api.put('/admin/storefront/theme-settings', s)
      toast.success('Theme saved')
    } catch { toast.error('Could not save') } finally { setSaving(false) }
  }

  async function applyPreset(code: string) {
    if (!confirm(`Apply "${code}" preset? This will replace your current colors + fonts.`)) return
    try {
      const { data } = await api.post('/admin/storefront/theme-settings/preset', { preset: code })
      setS(data); toast.success('Preset applied')
    } catch { toast.error('Could not apply preset') }
  }

  if (loading) return <div className="text-slate-400">Loading…</div>

  return (
    <div>
      <Link href="/storefront" className="inline-flex items-center gap-1 mb-3 text-sm text-slate-500 hover:text-indigo-600">
        <ArrowLeft className="h-3.5 w-3.5" /> Storefront
      </Link>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-rose-500" />
          <h1 className="text-2xl font-semibold text-slate-800">Theme Settings</h1>
        </div>
        <div className="flex items-center gap-2">
          <a href="/" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">
            <Eye className="h-4 w-4" /> Preview live store
            <ExternalLink className="h-3 w-3" />
          </a>
          <button onClick={save} disabled={saving}
            className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
            <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
      <p className="mb-6 text-sm text-slate-600">Colors, fonts, logo, contact info, and social links — everything that defines your brand.</p>

      {/* Presets */}
      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Color presets</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {PRESETS.map((p) => {
            const active = s.preset === p.code
            return (
              <button key={p.code} onClick={() => applyPreset(p.code)}
                className={`rounded-lg border p-3 text-left transition hover:shadow-sm ${active ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-slate-200'}`}>
                <div className="mb-2 flex gap-1.5">
                  {p.sample.map((c) => <span key={c} className="h-6 w-6 rounded-full" style={{ background: c }} />)}
                </div>
                <div className="text-sm font-semibold">{p.name}</div>
                {active && <div className="mt-0.5 text-xs text-indigo-600">Current</div>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Colors */}
      <Card title="Colors">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <ColorField label="Primary"    value={s.color_primary}  onChange={(v) => setField('color_primary', v)} />
          <ColorField label="Accent (gold)" value={s.color_accent} onChange={(v) => setField('color_accent', v)} />
          <ColorField label="Background" value={s.color_bg}       onChange={(v) => setField('color_bg', v)} />
          <ColorField label="Surface (cards)" value={s.color_surface} onChange={(v) => setField('color_surface', v)} />
          <ColorField label="Body text"  value={s.color_text}     onChange={(v) => setField('color_text', v)} />
          <ColorField label="Muted text" value={s.color_muted}    onChange={(v) => setField('color_muted', v)} />
          <ColorField label="Sale red"   value={s.color_sale}     onChange={(v) => setField('color_sale', v)} />
        </div>
      </Card>

      {/* Fonts */}
      <Card title="Typography">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FontField label="Heading font" value={s.font_heading} onChange={(v) => setField('font_heading', v)} />
          <FontField label="Body font"    value={s.font_body}    onChange={(v) => setField('font_body', v)} />
        </div>
      </Card>

      {/* Brand */}
      <Card title="Brand">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Brand name" value={s.brand_name} onChange={(v) => setField('brand_name', v)} />
          <Field label="Tagline" value={s.brand_tagline} onChange={(v) => setField('brand_tagline', v)} />
          <Field label="Logo image URL" value={s.logo_url} onChange={(v) => setField('logo_url', v)} placeholder="https://your-cdn.com/logo.png" wide />
          <Field label="Favicon URL" value={s.favicon_url} onChange={(v) => setField('favicon_url', v)} placeholder="https://your-cdn.com/favicon.ico" wide />
          <Field label="Currency display" value={s.currency_display} onChange={(v) => setField('currency_display', v)} placeholder="RM" />
        </div>
      </Card>

      {/* Contact */}
      <Card title="Contact info (footer)">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Phone" value={s.contact_phone} onChange={(v) => setField('contact_phone', v)} />
          <Field label="WhatsApp (with country code)" value={s.contact_whatsapp} onChange={(v) => setField('contact_whatsapp', v)} placeholder="+60123456789" />
          <Field label="Email" value={s.contact_email} onChange={(v) => setField('contact_email', v)} />
          <Field label="Address" value={s.contact_address} onChange={(v) => setField('contact_address', v)} />
        </div>
      </Card>

      {/* Social */}
      <Card title="Social links">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Instagram URL" value={s.social_instagram} onChange={(v) => setField('social_instagram', v)} placeholder="https://instagram.com/your-handle" />
          <Field label="Facebook URL" value={s.social_facebook}   onChange={(v) => setField('social_facebook', v)} />
          <Field label="TikTok URL"   value={s.social_tiktok}     onChange={(v) => setField('social_tiktok', v)} />
          <Field label="YouTube URL"  value={s.social_youtube}    onChange={(v) => setField('social_youtube', v)} />
        </div>
      </Card>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">{title}</h2>
      {children}
    </section>
  )
}

function Field({ label, value, onChange, placeholder, wide }: any) {
  return (
    <div className={wide ? 'md:col-span-2' : ''}>
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <input value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
    </div>
  )
}

function ColorField({ label, value, onChange }: any) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <div className="mt-1 flex items-center gap-2">
        <input type="color" value={value || '#000000'} onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded border border-slate-300" />
        <input value={value ?? ''} onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded-md border border-slate-300 px-2 py-2 font-mono text-xs" />
      </div>
    </div>
  )
}

function FontField({ label, value, onChange }: any) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        style={{ fontFamily: value }}>
        {FONT_OPTIONS.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
      </select>
    </div>
  )
}
