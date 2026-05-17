'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import {
  ArrowLeft, Loader2, ShoppingBag, CheckCircle2, AlertCircle, Play, Pause, RotateCcw,
} from 'lucide-react'

type Settings = {
  shop_domain: string | null
  has_token: boolean
  masked_token: string | null
  match_strategy: 'sku' | 'handle' | 'name'
  only_missing_images: boolean
  last_synced_at: string | null
  last_shopify_count: number
  last_imported_count: number
}

type ChunkResult = {
  processed: number
  matched: number
  updated: number
  downloaded: number
  skipped: number
  errors: string[]
  next_cursor: string | null
  examples: { shopify: string; matched: number | null; images: number; action: string }[]
}

export default function ShopifyImportPage() {
  const [s, setS] = useState<Settings | null>(null)
  const [domain, setDomain] = useState('')
  const [token, setToken] = useState('')
  const [strategy, setStrategy] = useState<Settings['match_strategy']>('sku')
  const [onlyMissing, setOnlyMissing] = useState(true)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message?: string; shop?: any; status?: number; hint?: string; url?: string; body?: string } | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scanTotal, setScanTotal] = useState<number | null>(null)
  const [running, setRunning] = useState(false)
  const stopRef = useRef(false)
  const [totals, setTotals] = useState({ processed: 0, matched: 0, updated: 0, downloaded: 0, skipped: 0, errors: 0 })
  const [log, setLog] = useState<ChunkResult['examples']>([])
  const [errorLog, setErrorLog] = useState<string[]>([])

  async function load() {
    const { data } = await api.get('/admin/storefront/shopify/settings')
    setS(data); setDomain(data.shop_domain ?? '')
    setStrategy(data.match_strategy ?? 'sku')
    setOnlyMissing(!!data.only_missing_images)
  }
  useEffect(() => { load() }, [])

  async function saveSettings() {
    try {
      const body: any = { shop_domain: domain.trim(), match_strategy: strategy, only_missing_images: onlyMissing }
      if (token.trim()) body.access_token = token.trim()
      await api.put('/admin/storefront/shopify/settings', body)
      toast.success('Settings saved')
      setToken('')
      load()
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Save failed') }
  }

  async function testConnection() {
    setTesting(true); setTestResult(null)
    try {
      const { data } = await api.post('/admin/storefront/shopify/test')
      setTestResult(data)
      if (data.ok) toast.success(`Connected to ${data.shop?.name ?? 'Shopify'}`)
      else toast.error(data.message ?? 'Connection failed')
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? 'Test failed'
      setTestResult({ ok: false, message: msg }); toast.error(msg)
    } finally { setTesting(false) }
  }

  async function scan() {
    setScanning(true)
    try {
      const { data } = await api.post('/admin/storefront/shopify/scan')
      setScanTotal(data.total)
      toast.success(`${data.total.toLocaleString()} products found in Shopify`)
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Scan failed') }
    finally { setScanning(false) }
  }

  async function runImport() {
    if (!confirm(`Import images from Shopify? This will download images for matched products and may take a long time depending on how many you have.`)) return
    setRunning(true)
    stopRef.current = false
    setTotals({ processed: 0, matched: 0, updated: 0, downloaded: 0, skipped: 0, errors: 0 })
    setLog([]); setErrorLog([])
    await api.post('/admin/storefront/shopify/reset-counter').catch(() => {})

    let cursor: string | null = null
    let safetyMax = 1000 // hard upper-bound on chunks (50 per chunk = 50,000 products)
    while (!stopRef.current && safetyMax-- > 0) {
      try {
        const { data } = await api.post(`/admin/storefront/shopify/import${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`)
        const r: ChunkResult = data
        setTotals((t) => ({
          processed: t.processed + r.processed,
          matched:   t.matched   + r.matched,
          updated:   t.updated   + r.updated,
          downloaded:t.downloaded+ r.downloaded,
          skipped:   t.skipped   + r.skipped,
          errors:    t.errors    + r.errors.length,
        }))
        if (r.examples?.length) setLog((l) => [...r.examples, ...l].slice(0, 100))
        if (r.errors?.length)   setErrorLog((l) => [...r.errors, ...l].slice(0, 100))
        cursor = r.next_cursor
        if (!cursor) break
      } catch (e: any) {
        const msg = e?.response?.data?.message ?? 'Import chunk failed'
        setErrorLog((l) => [msg, ...l].slice(0, 100))
        toast.error(msg)
        break
      }
    }
    setRunning(false)
    load()
    toast.success('Import finished')
  }

  function stopImport() { stopRef.current = true; toast('Stopping after current chunk…') }

  return (
    <div>
      <Link href="/storefront" className="inline-flex items-center gap-1 mb-3 text-sm text-slate-500 hover:text-indigo-600">
        <ArrowLeft className="h-3.5 w-3.5" /> Storefront
      </Link>
      <div className="mb-1 flex items-center gap-2">
        <ShoppingBag className="h-5 w-5 text-emerald-600" />
        <h1 className="text-2xl font-semibold text-slate-800">Shopify Image Import</h1>
      </div>
      <p className="mb-6 text-sm text-slate-500">
        Pull product images from your existing Shopify store into the ERP media library and attach them to matching products.
        Match strategy: SKU works best if your Shopify variants and ERP products share SKUs.
      </p>

      {/* Step 1 — settings */}
      <Section title="1. Shopify credentials">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Shop domain" placeholder="mystore.myshopify.com" v={domain} on={setDomain} />
          <Field label="Admin API access token" placeholder={s?.has_token ? `current: ${s.masked_token}` : 'shpat_…'} v={token} on={setToken} type="password" />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Create a Custom App in your Shopify admin → Apps & sales channels → Develop apps → Create app → Configure Admin API scopes → enable <code>read_products</code> → Install → copy the access token (starts with <code>shpat_</code>).
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button onClick={saveSettings}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Save credentials</button>
          <button onClick={testConnection} disabled={testing || !s?.has_token && !token.trim() || !domain.trim()}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50">
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Test connection
          </button>
          {testResult?.ok && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" /> Connected to {testResult.shop?.name ?? 'Shopify'}
              {testResult.shop?.plan && <span className="text-emerald-500">· {testResult.shop.plan}</span>}
            </span>
          )}
        </div>

        {/* Detailed error panel — only when test failed */}
        {testResult && !testResult.ok && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-none text-rose-600" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-rose-800">
                  {testResult.message}
                  {testResult.status ? <span className="ml-2 rounded bg-rose-200 px-1.5 py-0.5 text-[10px] font-mono text-rose-900">HTTP {testResult.status}</span> : null}
                </div>
                {testResult.hint && (
                  <div className="mt-2 whitespace-pre-line rounded bg-white/70 p-3 text-xs text-rose-900">
                    <strong>How to fix:</strong>{"\n"}{testResult.hint}
                  </div>
                )}
                {testResult.url && (
                  <div className="mt-2 truncate text-[11px] font-mono text-rose-700">URL tried: {testResult.url}</div>
                )}
                {testResult.body && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-[11px] text-rose-700">Show Shopify response body</summary>
                    <pre className="mt-1 overflow-x-auto rounded bg-rose-100 p-2 text-[10px] text-rose-900">{testResult.body}</pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Always-visible help: most common 403 causes */}
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-medium text-slate-600 hover:text-indigo-600">
            Got 403 / 401 / 404? Click for the most common fixes
          </summary>
          <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 space-y-2">
            <div>
              <b className="text-slate-900">403 — Access denied:</b> The app exists but the access token cannot read products. Fix in this exact order:
              <ol className="ml-5 mt-1 list-decimal space-y-1">
                <li>Shopify Admin → <b>Settings → Apps and sales channels → Develop apps</b></li>
                <li>Open your app → <b>Configuration tab</b></li>
                <li>Under <b>Admin API access scopes</b> tick <code className="rounded bg-slate-200 px-1">read_products</code> → <b>Save</b></li>
                <li>Top right → <b>Install app</b> (must do this AFTER saving scopes)</li>
                <li>Open the <b>API credentials tab</b> → <b>Reveal token once</b> → copy the new <code className="rounded bg-slate-200 px-1">shpat_…</code> token → paste it above → Save credentials → Test again</li>
              </ol>
            </div>
            <div>
              <b className="text-slate-900">404 — Shop not found:</b> Make sure the domain ends in <code className="rounded bg-slate-200 px-1">.myshopify.com</code>. The Admin API does <b>not</b> work on your custom domain (carlanisa.com). The .myshopify.com URL is shown at the top-left of your Shopify admin.
            </div>
            <div>
              <b className="text-slate-900">401 — Unauthorized:</b> Token was regenerated or you copied the API key instead of the access token. The token must start with <code className="rounded bg-slate-200 px-1">shpat_</code>.
            </div>
            <div className="border-t border-slate-200 pt-2">
              <b className="text-slate-900">Still stuck?</b> Click "Test connection" again — the error panel above shows the exact URL hit and the raw response body from Shopify, which is usually enough to pinpoint the cause.
            </div>
          </div>
        </details>
      </Section>

      {/* Step 2 — match options */}
      <Section title="2. Match strategy">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-slate-600">How to match Shopify products to ERP products</label>
            <select value={strategy} onChange={(e) => setStrategy(e.target.value as Settings['match_strategy'])}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="sku">By SKU (recommended — matches Shopify variant SKU to ERP SKU)</option>
              <option value="handle">By Shopify handle (matches to ERP seo_slug)</option>
              <option value="name">By exact name (case-insensitive)</option>
            </select>
          </div>
          <label className="flex items-end gap-2 text-sm">
            <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)}
              className="h-4 w-4 rounded" />
            Skip products that already have an image (recommended)
          </label>
        </div>
        <div className="mt-3">
          <button onClick={saveSettings} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-50">Save match options</button>
        </div>
      </Section>

      {/* Step 3 — scan + import */}
      <Section title="3. Scan & import">
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={scan} disabled={scanning || !s?.has_token}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50">
            {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Scan Shopify
          </button>
          {scanTotal !== null && (
            <span className="text-sm text-slate-700">
              <b>{scanTotal.toLocaleString()}</b> products in Shopify
            </span>
          )}
          {!running ? (
            <button onClick={runImport} disabled={!s?.has_token}
              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
              <Play className="h-4 w-4" /> Start image import
            </button>
          ) : (
            <button onClick={stopImport}
              className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700">
              <Pause className="h-4 w-4" /> Stop after current chunk
            </button>
          )}
        </div>

        {/* Progress totals */}
        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-6">
          <Stat label="Processed"  value={totals.processed} />
          <Stat label="Matched"    value={totals.matched} color="text-emerald-700" />
          <Stat label="Updated"    value={totals.updated} color="text-indigo-700" />
          <Stat label="Images saved" value={totals.downloaded} color="text-emerald-700" />
          <Stat label="Skipped"    value={totals.skipped} color="text-slate-500" />
          <Stat label="Errors"     value={totals.errors} color={totals.errors > 0 ? 'text-rose-600' : 'text-slate-500'} />
        </div>

        {/* Live log */}
        {log.length > 0 && (
          <div className="mt-4">
            <h3 className="mb-2 text-xs font-semibold text-slate-700">Latest actions</h3>
            <div className="rounded border border-slate-200 bg-white overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-500">
                  <tr><th className="px-2 py-1.5 text-left">Shopify product</th><th>Matched ERP id</th><th>Images</th><th>Action</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {log.map((e, i) => (
                    <tr key={i}>
                      <td className="px-2 py-1.5">{e.shopify}</td>
                      <td className="px-2 py-1.5 text-center text-slate-500">{e.matched ?? '—'}</td>
                      <td className="px-2 py-1.5 text-center">{e.images}</td>
                      <td className={`px-2 py-1.5 text-center text-[11px] font-medium ${
                        e.action === 'imported' ? 'text-emerald-700' :
                        e.action === 'no-match' ? 'text-rose-600' :
                        'text-slate-500'
                      }`}>{e.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {errorLog.length > 0 && (
          <div className="mt-4">
            <h3 className="mb-2 text-xs font-semibold text-rose-700">Errors ({errorLog.length})</h3>
            <div className="max-h-40 overflow-y-auto rounded border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              {errorLog.map((e, i) => <div key={i} className="mb-1 font-mono">{e}</div>)}
            </div>
          </div>
        )}
      </Section>

      {s?.last_synced_at && (
        <div className="mt-2 text-xs text-slate-500">
          Last synced: {new Date(s.last_synced_at).toLocaleString()} · Total images imported (all time): <b>{s.last_imported_count}</b>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">{title}</h2>
      {children}
    </section>
  )
}

function Field({ label, v, on, placeholder, type = 'text' }: any) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <input type={type} value={v ?? ''} onChange={(e) => on(e.target.value)} placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
    </div>
  )
}

function Stat({ label, value, color = 'text-slate-700' }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-1 text-xl font-bold tabular-nums ${color}`}>{value.toLocaleString()}</div>
    </div>
  )
}
