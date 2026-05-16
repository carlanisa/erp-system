'use client'

import { Bell, Search, ChevronRight, RefreshCw, Loader2 } from 'lucide-react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'

function getBreadcrumb(pathname: string): string[] {
  const segments = pathname.split('/').filter(Boolean)
  return segments.map((s) => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' '))
}

/**
 * Clear ALL caches — backend (Laravel config/route/view/app) + frontend
 * (localStorage cache keys, sessionStorage, browser Cache API, service-worker
 * caches, and finally a hard reload that bypasses the disk cache).
 *
 * Auth token + user are preserved so the user stays logged in after reload.
 */
async function purgeEverything() {
  // 1. Backend cache clear
  let backendOk = false
  let backendMsg = ''
  try {
    const r = await api.post('/system/clear-cache')
    backendOk = !!r.data?.success
    backendMsg = r.data?.message || 'Backend cache cleared'
  } catch (e: any) {
    backendMsg = e?.response?.data?.message || e?.message || 'Backend cache clear failed'
  }

  // 2. Frontend storage — preserve auth token + user
  try {
    const keepKeys = ['erp_token', 'erp_user']
    const preserved: Record<string, string> = {}
    keepKeys.forEach((k) => {
      const v = localStorage.getItem(k)
      if (v !== null) preserved[k] = v
    })
    localStorage.clear()
    Object.entries(preserved).forEach(([k, v]) => localStorage.setItem(k, v))
    sessionStorage.clear()
  } catch {}

  // 3. Browser Cache API (fetch cache, PWA caches)
  try {
    if ('caches' in window) {
      const names = await caches.keys()
      await Promise.all(names.map((n) => caches.delete(n)))
    }
  } catch {}

  // 4. Unregister service workers (if any)
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.unregister()))
    }
  } catch {}

  return { backendOk, backendMsg }
}

export default function Header() {
  const pathname = usePathname()
  const crumbs = getBreadcrumb(pathname)
  const [clearing, setClearing] = useState(false)

  async function handleClearCache() {
    if (clearing) return
    if (!confirm('Clear all caches (backend + frontend) and reload? You will stay logged in.')) return
    setClearing(true)
    const t = toast.loading('Clearing caches…')
    try {
      const { backendOk, backendMsg } = await purgeEverything()
      toast.dismiss(t)
      if (backendOk) toast.success('Cache cleared — reloading…')
      else toast.error(`Frontend cleared. ${backendMsg}`)
      // Hard reload (cache-busting query param so the HTML/JS chunks refresh)
      setTimeout(() => {
        const sep = location.href.includes('?') ? '&' : '?'
        window.location.href = location.href.split('?')[0] + sep + '_t=' + Date.now()
      }, 600)
    } catch (e: any) {
      toast.dismiss(t)
      toast.error('Cache clear failed: ' + (e?.message || 'unknown'))
      setClearing(false)
    }
  }

  return (
    <header className="h-14 bg-white border-b border-slate-100 flex items-center justify-between px-6 sticky top-0 z-20">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm">
        {crumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-300" />}
            <span className={i === crumbs.length - 1 ? 'text-slate-800 font-semibold' : 'text-slate-400'}>
              {crumb}
            </span>
          </span>
        ))}
      </nav>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search..."
            className="pl-9 pr-4 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-52"
          />
        </div>
        <button
          onClick={handleClearCache}
          disabled={clearing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          title="Clear backend + frontend caches and reload"
        >
          {clearing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 text-slate-500" />}
          {clearing ? 'Clearing…' : 'Clear Cache'}
        </button>
        <Link href="/notifications" className="relative p-2 rounded-lg hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-colors" title="Notifications">
          <Bell className="w-4.5 h-4.5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </Link>
      </div>
    </header>
  )
}
