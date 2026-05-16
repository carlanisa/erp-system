'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { ArrowLeft, Plug, RefreshCw, CheckCircle2, Loader2 } from 'lucide-react'

type Channel = {
  id: number; code: string; name: string; region?: string; color?: string
  is_active: boolean; is_connected: boolean; last_synced_at?: string
}

export default function ChannelSettingsPage() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [busy, setBusy] = useState<string | null>(null)

  async function load() {
    const r = await api.get('/sales/order-management/channels')
    setChannels(r.data.data || [])
  }
  useEffect(() => { load() }, [])

  async function connect(code: string) {
    setBusy(code)
    try {
      const r = await api.get(`/sales/order-management/channels/${code}/oauth`)
      const url = r.data?.data?.redirect_url
      if (url) {
        window.open(url, '_blank')
      } else {
        alert('OAuth URL not available — configure partner credentials in backend config/services.php.')
      }
    } catch (e: any) {
      alert(e?.response?.data?.message || 'OAuth not configured')
    } finally { setBusy(null) }
  }

  async function syncNow(code: string) {
    setBusy(code)
    try {
      await api.post(`/sales/order-management/channels/${code}/sync`)
      await load()
    } finally { setBusy(null) }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/sales/order-management" className="text-slate-500 hover:text-slate-800">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
          <Plug className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Channel Connections</h1>
          <p className="text-sm text-slate-500 mt-0.5">Connect Shopee, TikTok, and the built-in website storefront.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {channels.map(c => (
          <div key={c.code} className="card">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold"
                     style={{ backgroundColor: c.color || '#64748b' }}>
                  {c.code.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-slate-800">{c.name}</div>
                  <div className="text-xs text-slate-500">{c.region}</div>
                </div>
              </div>
              {c.is_connected ? (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                </span>
              ) : (
                <span className="text-xs text-slate-400">Not connected</span>
              )}
            </div>
            <div className="text-xs text-slate-500 mt-2">
              Last sync: {c.last_synced_at ? new Date(c.last_synced_at).toLocaleString() : 'never'}
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => connect(c.code)} disabled={busy === c.code} className="btn btn-secondary text-xs">
                {busy === c.code ? <Loader2 className="w-3 h-3 animate-spin" /> : (c.is_connected ? 'Reconnect' : 'Connect')}
              </button>
              <button onClick={() => syncNow(c.code)} disabled={busy === c.code} className="btn btn-secondary text-xs inline-flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Sync now
              </button>
            </div>
            <div className="mt-3 text-[11px] text-slate-400">
              Webhook URL: <code className="font-mono">/api/marketplace/webhook/{c.code.startsWith('shopee') ? 'shopee' : c.code.startsWith('tiktok') ? 'tiktok' : 'website'}</code>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
