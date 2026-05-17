'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { ArrowLeft, Plus, Trash2, Pencil, Eye, EyeOff, FileText, ExternalLink, Home, X, Search } from 'lucide-react'
import { MediaPicker } from '@/components/ui/MediaPicker'

type Page = {
  id: number; slug: string; title: string
  meta_title: string | null; meta_description: string | null
  og_image_url?: string | null; language?: string | null
  is_home: boolean; is_published: boolean; sort_order: number; created_at: string
}

const LANGS = [
  { code: 'en', name: 'English' },
  { code: 'ms', name: 'Bahasa Melayu' },
  { code: 'zh', name: '中文' },
  { code: 'ta', name: 'தமிழ்' },
  { code: 'ar', name: 'العربية' },
  { code: 'id', name: 'Bahasa Indonesia' },
]

export default function PagesListPage() {
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Page | null>(null)
  const [seoEditing, setSeoEditing] = useState<Page | null>(null)

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/storefront/pages')
      setPages(data ?? [])
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function createPage() {
    const title = prompt('Page name (e.g. About us, Shipping Policy):')
    if (!title?.trim()) return
    try {
      await api.post('/admin/storefront/pages', { title: title.trim() })
      toast.success('Page created'); load()
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Create failed') }
  }
  async function togglePublished(p: Page) {
    if (p.is_home) return
    await api.put(`/admin/storefront/pages/${p.id}`, { is_published: !p.is_published }); load()
  }
  async function del(p: Page) {
    if (p.is_home) return
    if (!confirm(`Delete page "${p.title}"? Its sections will also be deleted.`)) return
    try { await api.delete(`/admin/storefront/pages/${p.id}`); toast.success('Deleted'); load() }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Delete failed') }
  }

  return (
    <div>
      <Link href="/storefront" className="inline-flex items-center gap-1 mb-3 text-sm text-slate-500 hover:text-indigo-600">
        <ArrowLeft className="h-3.5 w-3.5" /> Storefront
      </Link>
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-indigo-600" />
          <h1 className="text-2xl font-semibold text-slate-800">Custom Pages</h1>
        </div>
        <button onClick={createPage}
          className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
          <Plus className="h-4 w-4" /> New page
        </button>
      </div>
      <p className="mb-6 text-sm text-slate-500">Create About us, Shipping Policy, FAQ, etc. Each page gets its own URL <code className="rounded bg-slate-100 px-1.5 py-0.5">/p/&lt;slug&gt;</code> and its own sections, edited in the Theme Editor.</p>

      {loading ? (
        <div className="text-slate-400">Loading…</div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Page</th>
                <th className="px-4 py-3 text-left">URL</th>
                <th className="px-4 py-3 text-left">Lang</th>
                <th className="px-4 py-3 text-left">Published</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pages.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {p.is_home && <Home className="h-4 w-4 text-amber-500" />}
                      <span className="font-medium">{p.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">
                    {p.is_home ? '/' : `/p/${p.slug}`}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-600">{(p.language ?? 'en').toUpperCase()}</span>
                  </td>
                  <td className="px-4 py-3">
                    {p.is_home ? (
                      <span className="text-xs text-slate-400">Always</span>
                    ) : (
                      <button onClick={() => togglePublished(p)}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${p.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {p.is_published ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                        {p.is_published ? 'Published' : 'Draft'}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setSeoEditing(p)} title="Edit SEO + language"
                      className="mr-2 text-slate-500 hover:text-indigo-600 inline-block"><Search className="h-4 w-4" /></button>
                    <Link href={`/storefront/editor`} title="Edit sections in theme editor"
                      className="mr-2 text-slate-500 hover:text-indigo-600 inline-block"><Pencil className="h-4 w-4" /></Link>
                    <a href={p.is_home ? '/' : `/p/${p.slug}`} target="_blank" rel="noopener noreferrer" title="Open in new tab"
                      className="mr-2 text-slate-500 hover:text-indigo-600 inline-block"><ExternalLink className="h-4 w-4" /></a>
                    {!p.is_home && (
                      <button onClick={() => del(p)} className="text-slate-500 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {seoEditing && (
        <SeoModal page={seoEditing} onClose={() => setSeoEditing(null)} onSaved={() => { setSeoEditing(null); load() }} />
      )}
    </div>
  )
}

function SeoModal({ page, onClose, onSaved }: { page: Page; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(page.title)
  const [metaTitle, setMetaTitle] = useState(page.meta_title ?? '')
  const [metaDesc, setMetaDesc] = useState(page.meta_description ?? '')
  const [ogImage, setOgImage] = useState(page.og_image_url ?? '')
  const [lang, setLang] = useState(page.language ?? 'en')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      await api.put(`/admin/storefront/pages/${page.id}`, {
        title, meta_title: metaTitle || null, meta_description: metaDesc || null,
        og_image_url: ogImage || null, language: lang,
      })
      toast.success('Saved')
      onSaved()
    } catch { toast.error('Save failed') } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-xl rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="font-semibold">SEO + Language — {page.title}</h2>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </header>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-600">Page title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Meta title (Google tab + search result heading — leave blank to use page title)</label>
            <input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} maxLength={60}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <div className="mt-1 text-[10px] text-slate-400">{metaTitle.length}/60 — keep under 60 chars</div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Meta description (Google search snippet)</label>
            <textarea value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} maxLength={160} rows={3}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <div className="mt-1 text-[10px] text-slate-400">{metaDesc.length}/160 — keep under 160 chars</div>
          </div>
          <MediaPicker label="Social share image (WhatsApp / FB / Twitter preview)" value={ogImage} folder="og"
            onChange={(url) => setOgImage(url)} />
          <div>
            <label className="text-xs font-medium text-slate-600">Page language</label>
            <select value={lang} onChange={(e) => setLang(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              {LANGS.map((l) => <option key={l.code} value={l.code}>{l.name} ({l.code})</option>)}
            </select>
            <p className="mt-1 text-[10px] text-slate-500">Sets the &lt;html lang&gt; attribute. Useful for SEO + screen readers.</p>
          </div>

          {/* Live Google preview */}
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="text-[11px] uppercase tracking-wider text-slate-400">Google preview</div>
            <div className="mt-2">
              <div className="text-xs text-emerald-700">https://carlanisa.com{page.is_home ? '' : `/p/${page.slug}`}</div>
              <div className="text-base text-blue-700">{metaTitle || page.title}</div>
              <div className="text-sm text-slate-600 line-clamp-2">{metaDesc || '(no description set)'}</div>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm">Cancel</button>
          <button onClick={save} disabled={saving}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
