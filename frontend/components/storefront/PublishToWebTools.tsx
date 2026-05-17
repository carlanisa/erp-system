'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { Globe, Loader2, Eye, ExternalLink, AlertCircle } from 'lucide-react'

type Stats = {
  total: number
  published: number
  published_active: number
  published_with_image: number
  published_with_slug: number
}

export function PublishToWebTools({ filteredIds, onChanged }: { filteredIds: number[]; onChanged?: () => void }) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [busy, setBusy] = useState<'publish' | 'unpublish' | null>(null)

  async function loadStats() {
    try {
      const { data } = await api.get('/admin/storefront/products/publish-stats')
      setStats(data)
    } catch {}
  }
  useEffect(() => { loadStats() }, [])

  async function bulk(publish: boolean) {
    if (filteredIds.length === 0) {
      toast.error('No products in the current filter')
      return
    }
    const noun = publish ? 'Publish' : 'Unpublish'
    if (!confirm(`${noun} ${filteredIds.length} product${filteredIds.length === 1 ? '' : 's'} to the storefront?`)) return
    setBusy(publish ? 'publish' : 'unpublish')
    try {
      const { data } = await api.post('/admin/storefront/products/bulk-publish', {
        ids: filteredIds, publish_to_website: publish,
      })
      const extras: string[] = []
      if (publish && data.activated > 0)    extras.push(`${data.activated} auto-activated`)
      if (publish && data.auto_slugged > 0) extras.push(`${data.auto_slugged} got auto-generated slugs`)
      toast.success(`${data.changed} ${publish ? 'published' : 'unpublished'}${extras.length ? ' · ' + extras.join(', ') : ''}`)
      await loadStats(); onChanged?.()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Bulk action failed')
    } finally { setBusy(null) }
  }

  return (
    <div className="border-b border-slate-200 bg-rose-50/50 px-4 py-2.5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-rose-500" />
          <span className="text-xs font-semibold text-rose-900">Storefront</span>
        </div>
        {stats ? (
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="rounded bg-white px-2 py-0.5 text-slate-700">
              <b className={stats.published > 0 ? 'text-emerald-700' : 'text-rose-600'}>{stats.published.toLocaleString()}</b>
              {' '}of {stats.total.toLocaleString()} published
            </span>
            {stats.published > 0 && (
              <>
                <span className="text-slate-400">·</span>
                <span className="text-slate-600">
                  <b className={stats.published_with_image === stats.published ? 'text-emerald-700' : 'text-amber-600'}>
                    {stats.published_with_image}
                  </b>{' '}with images
                </span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-600">
                  <b className="text-emerald-700">{stats.published_with_slug}</b> with slugs
                </span>
              </>
            )}
            {stats.published > 0 && stats.published_with_image === 0 && (
              <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                <AlertCircle className="h-3 w-3" /> No product has an image yet — add a featured image per product
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-slate-400">Loading stats…</span>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button onClick={() => bulk(true)} disabled={busy !== null}
            className="inline-flex items-center gap-1 rounded bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-600 disabled:opacity-50">
            {busy === 'publish' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Globe className="h-3 w-3" />}
            Publish current filter ({filteredIds.length})
          </button>
          <button onClick={() => bulk(false)} disabled={busy !== null || filteredIds.length === 0}
            className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            Unpublish
          </button>
          <a href="/" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
            <Eye className="h-3 w-3" /> Live store <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </div>
      </div>
    </div>
  )
}
