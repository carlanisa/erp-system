'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { ArrowLeft, Plus, Trash2, Pencil, Eye, EyeOff, FileText, ExternalLink, Home } from 'lucide-react'

type Page = {
  id: number; slug: string; title: string
  meta_title: string | null; meta_description: string | null
  is_home: boolean; is_published: boolean; sort_order: number; created_at: string
}

export default function PagesListPage() {
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Page | null>(null)

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
                    <Link href={`/storefront/editor`} title="Edit in theme editor"
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
    </div>
  )
}
