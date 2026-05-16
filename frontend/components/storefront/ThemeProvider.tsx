'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { fetchTheme, themeCssVars, googleFontsHref, type ThemePayload } from '@/lib/storefront-theme'

type Ctx = { theme: ThemePayload | null; loading: boolean; refresh: () => Promise<void> }
const ThemeContext = createContext<Ctx>({ theme: null, loading: true, refresh: async () => {} })

export function useStoreTheme() { return useContext(ThemeContext) }

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemePayload | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const t = await fetchTheme()
    setTheme(t)
    setLoading(false)
    if (t?.settings && typeof document !== 'undefined') {
      const vars = themeCssVars(t.settings)
      Object.entries(vars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v))
      // inject Google Fonts link once
      const id = 'storefront-fonts'
      if (!document.getElementById(id)) {
        const link = document.createElement('link')
        link.id = id
        link.rel = 'stylesheet'
        link.href = googleFontsHref(t.settings)
        document.head.appendChild(link)
      }
      document.documentElement.style.setProperty('font-family', `var(--brand-font-body)`)
    }
  }

  useEffect(() => { load() }, [])

  return <ThemeContext.Provider value={{ theme, loading, refresh: load }}>{children}</ThemeContext.Provider>
}
