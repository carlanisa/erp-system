'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { fetchPage, type ThemePayload } from '@/lib/storefront-theme'
import { SectionRenderer } from '@/components/storefront/sections/SectionRenderer'
import { useStoreTheme } from '@/components/storefront/ThemeProvider'

export default function CustomPage() {
  const params = useParams<{ slug: string }>()
  const slug = params?.slug
  const { theme: layoutTheme, refresh: refreshLayout } = useStoreTheme()
  const [page, setPage] = useState<ThemePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug) return
    setLoading(true); setNotFound(false)
    fetchPage(slug).then((p) => {
      if (!p) setNotFound(true)
      setPage(p)
    }).finally(() => setLoading(false))
  }, [slug])

  // Listen for live-preview updates from the editor iframe parent
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.data?.type === 'STOREFRONT_PREVIEW' && e.data.payload) {
        const p = e.data.payload as Partial<ThemePayload>
        setPage((cur) => cur ? { ...cur, ...p } : (p as ThemePayload))
      } else if (e.data?.type === 'STOREFRONT_RELOAD' && slug) {
        fetchPage(slug).then(setPage)
        refreshLayout()
      }
    }
    window.addEventListener('message', onMessage)
    if (window.parent && window.parent !== window) {
      try { window.parent.postMessage({ type: 'STOREFRONT_READY' }, '*') } catch {}
    }
    return () => window.removeEventListener('message', onMessage)
  }, [slug, refreshLayout])

  if (loading) {
    return <div className="mx-auto max-w-7xl px-6 py-24 text-center text-neutral-400">Loading…</div>
  }
  if (notFound) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="mt-2 text-neutral-500">The page <code>/{slug}</code> doesn&apos;t exist or hasn&apos;t been published yet.</p>
        <Link href="/" className="mt-6 inline-block rounded-full bg-rose-500 px-6 py-3 text-sm font-semibold text-white hover:bg-rose-600">
          Back to home
        </Link>
      </div>
    )
  }
  if (!page || page.sections.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="text-2xl font-semibold">{page?.page?.title ?? 'Page'}</h1>
        <p className="mt-2 text-neutral-500">This page has no sections yet. Open the ERP Theme Editor and add some blocks.</p>
      </div>
    )
  }

  return (
    <div>
      {page.sections.map((s) => <SectionRenderer key={s.id} section={s} />)}
    </div>
  )
}
