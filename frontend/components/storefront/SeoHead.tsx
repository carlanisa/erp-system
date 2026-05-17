'use client'

import { useEffect } from 'react'
import type { StorePage, ThemeSettings } from '@/lib/storefront-theme'
import { imageSrc } from '@/lib/storefront-api'

/** Injects/updates <title>, <meta name=description>, OG tags from a page payload. */
export function SeoHead({ page, settings }: { page?: StorePage; settings?: ThemeSettings }) {
  useEffect(() => {
    if (typeof document === 'undefined') return
    const brand = settings?.brand_name ?? 'Modestwear'
    const title = page?.meta_title || (page?.title ? `${page.title} · ${brand}` : brand)
    const desc  = page?.meta_description ?? settings?.brand_tagline ?? ''
    const ogImg = page?.og_image_url ? imageSrc(page.og_image_url) : ''

    document.title = title
    upsertMeta('description', desc)
    upsertMeta('og:title', title, true)
    upsertMeta('og:description', desc, true)
    upsertMeta('og:type', 'website', true)
    if (ogImg) upsertMeta('og:image', ogImg, true)
    if (page?.language) document.documentElement.setAttribute('lang', page.language)
  }, [page?.meta_title, page?.meta_description, page?.title, page?.og_image_url, page?.language, settings?.brand_name, settings?.brand_tagline])
  return null
}

function upsertMeta(name: string, content: string, isProperty = false) {
  if (!content) return
  const attr = isProperty ? 'property' : 'name'
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}
