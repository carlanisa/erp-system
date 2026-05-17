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
import { RichText } from './RichText'
import { VideoBlock } from './VideoBlock'
import { CountdownSale } from './CountdownSale'
import { Columns } from './Columns'
import { LogoCloud } from './LogoCloud'
import { Stats } from './Stats'
import { CTABanner } from './CTABanner'
import { FeaturesGrid } from './FeaturesGrid'
import { Steps } from './Steps'
import { Gallery } from './Gallery'
import { FAQAccordion } from './FAQAccordion'
import { MapEmbed } from './MapEmbed'
import { Spacer } from './Spacer'
import { Divider } from './Divider'
import { ProductShowcase } from './ProductShowcase'
import { CustomHtml } from './CustomHtml'

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
    case 'rich_text':         return <RichText config={c} />
    case 'video':             return <VideoBlock config={c} />
    case 'countdown':         return <CountdownSale config={c} />
    // ── new advanced blocks ───────────────────────────
    case 'columns':           return <Columns config={c} />
    case 'logo_cloud':        return <LogoCloud config={c} />
    case 'stats':             return <Stats config={c} />
    case 'cta_banner':        return <CTABanner config={c} />
    case 'features_grid':     return <FeaturesGrid config={c} />
    case 'steps':             return <Steps config={c} />
    case 'gallery':           return <Gallery config={c} />
    case 'faq':               return <FAQAccordion config={c} />
    case 'map':               return <MapEmbed config={c} />
    case 'spacer':            return <Spacer config={c} />
    case 'divider':           return <Divider config={c} />
    case 'product_showcase':  return <ProductShowcase config={c} />
    case 'html':              return <CustomHtml config={c} />
    default:                  return null
  }
}
