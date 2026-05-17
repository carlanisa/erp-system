import { storefrontApi } from './storefront-api'

export type MenuItem = { id: number; label: string; href: string; open_new: boolean; sort_order: number }
export type MenuMap = Partial<Record<'header' | 'footer_shop' | 'footer_help' | 'footer_company', MenuItem[]>>

export async function fetchMenus(): Promise<MenuMap> {
  try {
    const { data } = await storefrontApi.get('/nav')
    return data as MenuMap
  } catch { return {} }
}

export async function trackPageView(payload: { page_slug: string; page_id?: number | null }) {
  try {
    const utm = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams()
    await storefrontApi.post('/track/page-view', {
      page_slug: payload.page_slug,
      page_id:   payload.page_id ?? null,
      referrer:  typeof document !== 'undefined' ? document.referrer || null : null,
      utm_source: utm.get('utm_source'),
      utm_medium: utm.get('utm_medium'),
      utm_campaign: utm.get('utm_campaign'),
    })
  } catch {}
}
