'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import { Globe, Loader2 } from 'lucide-react'

type Props = {
  productId: number
  initial: {
    publish_to_website: boolean
    seo_slug: string | null
    seo_title: string | null
    seo_description: string | null
    size_chart_md: string | null
  }
  onUpdated?: () => void
}

export function PublishToWebsiteCard({ productId, initial, onUpdated }: Props) {
  const [publish, setPublish] = useState(!!initial.publish_to_website)
  const [slug, setSlug] = useState(initial.seo_slug ?? '')
  const [title, setTitle] = useState(initial.seo_title ?? '')
  const [desc, setDesc] = useState(initial.seo_description ?? '')
  const [chart, setChart] = useState(initial.size_chart_md ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setPublish(!!initial.publish_to_website)
    setSlug(initial.seo_slug ?? '')
    setTitle(initial.seo_title ?? '')
    setDesc(initial.seo_description ?? '')
    setChart(initial.size_chart_md ?? '')
  }, [initial.publish_to_website, initial.seo_slug, initial.seo_title, initial.seo_description, initial.size_chart_md])

  async function save() {
    setSaving(true)
    try {
      await api.patch(`/admin/storefront/products/${productId}/publish`, {
        publish_to_website: publish,
        seo_slug: slug || null,
        seo_title: title || null,
        seo_description: desc || null,
        size_chart_md: chart || null,
      })
      toast.success(publish ? 'Published to website' : 'Unpublished')
      onUpdated?.()
    } catch {
      toast.error('Could not save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card">
      <div className="mb-3 flex items-center gap-2">
        <Globe className="h-4 w-4 text-rose-500" />
        <h3 className="text-sm font-semibold text-slate-700">Publish to Website</h3>
      </div>

      <label className="flex items-center gap-2 mb-3 cursor-pointer">
        <input
          type="checkbox"
          checked={publish}
          onChange={(e) => setPublish(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-rose-500 focus:ring-rose-500"
        />
        <span className="text-sm">Show this product on the customer-facing website</span>
      </label>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="text-xs text-slate-500">URL slug</label>
          <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="baju-kurung-aisyah"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-slate-500">SEO title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-slate-500">SEO description</label>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-slate-500">Size chart (Markdown — shown on the product page)</label>
          <textarea value={chart} onChange={(e) => setChart(e.target.value)} rows={4}
            placeholder={'| Size | Bust | Length |\n|------|------|--------|\n| S    | 36   | 56     |'}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs" />
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button onClick={save} disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-60">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save
        </button>
      </div>
    </div>
  )
}
