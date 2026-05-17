'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { fetchTheme, themeCssVars, googleFontsHref, type ThemePayload, type ThemeSettings, type SectionPayload, type AnnouncementBarPayload } from '@/lib/storefront-theme'

type Ctx = { theme: ThemePayload | null; loading: boolean; refresh: () => Promise<void> }
const ThemeContext = createContext<Ctx>({ theme: null, loading: true, refresh: async () => {} })

export function useStoreTheme() { return useContext(ThemeContext) }

const FONT_LINK_ID = 'storefront-fonts'

function applyCssVars(s: ThemeSettings) {
  if (typeof document === 'undefined') return
  const vars = themeCssVars(s)
  Object.entries(vars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v))
  // refresh fonts link
  const existing = document.getElementById(FONT_LINK_ID) as HTMLLinkElement | null
  const href = googleFontsHref(s)
  if (existing && existing.href !== href) existing.href = href
  else if (!existing) {
    const link = document.createElement('link')
    link.id = FONT_LINK_ID
    link.rel = 'stylesheet'
    link.href = href
    document.head.appendChild(link)
  }
  document.documentElement.style.setProperty('font-family', 'var(--brand-font-body)')
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemePayload | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const t = await fetchTheme()
    setTheme(t)
    setLoading(false)
    if (t?.settings) applyCssVars(t.settings)
  }, [])

  useEffect(() => { load() }, [load])

  /**
   * Live preview: when the storefront is loaded inside the ERP Theme Editor's
   * iframe, the parent posts message {type:'STOREFRONT_PREVIEW', payload}
   * to update settings / sections / announcement bar without persisting.
   */
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const msg = e.data
      if (!msg || typeof msg !== 'object') return
      if (msg.type === 'STOREFRONT_PREVIEW' && msg.payload) {
        const p = msg.payload as Partial<ThemePayload>
        setTheme((cur) => {
          const base = cur ?? { settings: null as any, sections: [], announcement: null }
          const merged: ThemePayload = {
            settings:     (p.settings     ?? base.settings) as ThemeSettings,
            sections:     (p.sections     ?? base.sections) as SectionPayload[],
            announcement: (p.announcement ?? base.announcement) as AnnouncementBarPayload | null,
          }
          if (merged.settings) applyCssVars(merged.settings)
          return merged
        })
      } else if (msg.type === 'STOREFRONT_RELOAD') {
        load()
      }
    }
    window.addEventListener('message', onMessage)
    // Tell the parent we're ready to receive previews
    if (window.parent && window.parent !== window) {
      try { window.parent.postMessage({ type: 'STOREFRONT_READY' }, '*') } catch {}
    }
    return () => window.removeEventListener('message', onMessage)
  }, [load])

  return <ThemeContext.Provider value={{ theme, loading, refresh: load }}>{children}</ThemeContext.Provider>
}
