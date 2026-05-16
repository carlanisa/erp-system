'use client'

import type { SectionPayload } from '@/lib/storefront-theme'
import { HeroSlider } from './HeroSlider'
import { CategoriesGrid } from './CategoriesGrid'
import { FeaturedProducts } from './FeaturedProducts'
import { BannerStrip } from './BannerStrip'
import { ImageText } from './ImageText'
import { Testimonials } from './Testimonials'
import { Newsletter } from './Newsletter'
import { InstagramFeed } from './InstagramFeed'

export function SectionRenderer({ section }: { section: SectionPayload }) {
  const c = section.config ?? {}
  switch (section.type) {
    case 'hero_slider':       return <HeroSlider config={c} />
    case 'categories_grid':   return <CategoriesGrid config={c} />
    case 'featured_products': return <FeaturedProducts config={c} />
    case 'banner_strip':      return <BannerStrip config={c} />
    case 'image_text':        return <ImageText config={c} />
    case 'testimonials':      return <Testimonials config={c} />
    case 'newsletter':        return <Newsletter config={c} />
    case 'instagram':         return <InstagramFeed config={c} />
    default:                  return null
  }
}
