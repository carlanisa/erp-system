'use client'

import { useEffect } from 'react'
import { useStoreTheme } from '@/components/storefront/ThemeProvider'
import { SectionRenderer } from '@/components/storefront/sections/SectionRenderer'
import { SeoHead } from '@/components/storefront/SeoHead'
import { trackPageView } from '@/lib/storefront-nav'

export default function HomePage() {
  const { theme, loading } = useStoreTheme()
  useEffect(() => { trackPageView({ page_slug: 'home', page_id: theme?.page?.id ?? null }) }, [theme?.page?.id])

  if (loading && !theme) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-24 text-center text-neutral-400">Loading…</div>
    )
  }

  if (!theme || theme.sections.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="text-2xl font-semibold">Your storefront is empty</h1>
        <p className="mt-2 text-neutral-500">
          Sign in to the ERP and open <strong>Storefront → Theme &amp; Sections</strong> to add a hero, featured products, and more.
        </p>
      </div>
    )
  }

  return (
    <div>
      <SeoHead page={theme.page} settings={theme.settings} />
      {theme.sections.map((s) => (
        <SectionRenderer key={s.id} section={s} />
      ))}
    </div>
  )
}
