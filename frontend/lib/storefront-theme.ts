import { storefrontApi } from './storefront-api'

export type ThemeSettings = {
  preset: string
  color_primary: string
  color_accent: string
  color_bg: string
  color_surface: string
  color_text: string
  color_muted: string
  color_sale: string
  font_heading: string
  font_body: string
  brand_name: string
  brand_tagline: string | null
  logo_url: string | null
  favicon_url: string | null
  contact_phone: string | null
  contact_whatsapp: string | null
  contact_email: string | null
  contact_address: string | null
  social_instagram: string | null
  social_facebook: string | null
  social_tiktok: string | null
  social_youtube: string | null
  newsletter_popup_enabled: boolean
  currency_display: string
}

export type SectionPayload = {
  id: number
  type:
    | 'hero_slider' | 'categories_grid' | 'featured_products' | 'banner_strip'
    | 'image_text' | 'testimonials' | 'newsletter' | 'instagram'
    | 'lookbook' | 'faq' | 'countdown' | 'rich_text'
    | 'columns' | 'logo_cloud' | 'stats' | 'cta_banner' | 'features_grid'
    | 'steps' | 'gallery' | 'map' | 'spacer' | 'divider' | 'video'
    | 'product_showcase' | 'html'
  label: string | null
  config: any
}

export type AnnouncementBarPayload = {
  id: number; text: string; link_url: string | null
  bg_color: string; text_color: string
}

export type StorePage = {
  id: number; slug: string; title: string
  meta_title: string | null; meta_description: string | null; is_home: boolean
}

export type ThemePayload = {
  page?: StorePage
  settings: ThemeSettings
  sections: SectionPayload[]
  announcement: AnnouncementBarPayload | null
}

export async function fetchTheme(): Promise<ThemePayload | null> {
  try {
    const { data } = await storefrontApi.get('/theme')
    return data as ThemePayload
  } catch {
    return null
  }
}

export async function fetchPage(slug: string): Promise<ThemePayload | null> {
  try {
    const { data } = await storefrontApi.get(`/pages/${encodeURIComponent(slug)}`)
    return data as ThemePayload
  } catch {
    return null
  }
}

/** Build CSS variable style object from settings — applied to layout root. */
export function themeCssVars(s: ThemeSettings): Record<string, string> {
  return {
    '--brand-primary':  s.color_primary,
    '--brand-accent':   s.color_accent,
    '--brand-bg':       s.color_bg,
    '--brand-surface':  s.color_surface,
    '--brand-text':     s.color_text,
    '--brand-muted':    s.color_muted,
    '--brand-sale':     s.color_sale,
    '--brand-font-heading': `"${s.font_heading}", serif`,
    '--brand-font-body':    `"${s.font_body}", system-ui, sans-serif`,
  }
}

/** Google Fonts URL for the heading + body font picked in admin. */
export function googleFontsHref(s: ThemeSettings): string {
  const fonts = [s.font_heading, s.font_body].filter(Boolean).map((f) =>
    `family=${encodeURIComponent(f)}:wght@400;500;600;700`,
  )
  return `https://fonts.googleapis.com/css2?${fonts.join('&')}&display=swap`
}
