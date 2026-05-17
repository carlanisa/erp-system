'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { ArrowLeft, BarChart2, TrendingUp, ExternalLink } from 'lucide-react'

type Summary = {
  days: number
  total: number
  by_day: { day: string; count: number }[]
  by_page: { page_slug: string; count: number }[]
  by_referrer: { referrer: string; count: number }[]
  by_utm: { utm_source: string; count: number }[]
}

export default function AnalyticsPage() {
  const [days, setDays] = useState(30)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try { const { data } = await api.get('/admin/storefront/analytics/summary', { params: { days } }); setSummary(data) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() /* eslint-disable-line */ }, [days])

  const maxDay = useMemo(() => Math.max(1, ...(summary?.by_day ?? []).map((d) => d.count)), [summary])

  return (
    <div>
      <Link href="/storefront" className="inline-flex items-center gap-1 mb-3 text-sm text-slate-500 hover:text-indigo-600">
        <ArrowLeft className="h-3.5 w-3.5" /> Storefront
      </Link>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-5 w-5 text-indigo-600" />
          <h1 className="text-2xl font-semibold text-slate-800">Storefront Analytics</h1>
        </div>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm">
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {loading || !summary ? <div className="text-slate-400">Loading…</div> : (
        <>
          {/* KPI */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-6">
            <Card>
              <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Total page views</div>
              <div className="mt-2 text-3xl font-bold text-slate-800">{summary.total.toLocaleString()}</div>
              <div className="mt-1 text-xs text-slate-400">in last {summary.days} days</div>
            </Card>
            <Card>
              <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Avg per day</div>
              <div className="mt-2 text-3xl font-bold text-slate-800">{Math.round(summary.total / summary.days).toLocaleString()}</div>
            </Card>
            <Card>
              <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Pages tracked</div>
              <div className="mt-2 text-3xl font-bold text-slate-800">{summary.by_page.length}</div>
            </Card>
          </div>

          {/* Day chart */}
          <Card>
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <TrendingUp className="h-4 w-4" /> Views by day
            </div>
            {summary.by_day.length === 0 ? <p className="text-sm text-slate-400">No data yet.</p> : (
              <div className="flex h-40 items-end gap-1">
                {summary.by_day.map((d) => (
                  <div key={d.day} className="group relative flex-1 rounded-t bg-indigo-100 hover:bg-indigo-500 transition"
                       style={{ height: `${(d.count / maxDay) * 100}%`, minHeight: '4px' }}>
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-[10px] text-white opacity-0 group-hover:opacity-100">
                      {d.count} on {d.day}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* By page + referrer */}
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card>
              <h3 className="mb-4 text-sm font-semibold text-slate-700">Top pages</h3>
              {summary.by_page.length === 0 ? <p className="text-sm text-slate-400">No data.</p> : (
                <ul className="space-y-2">
                  {summary.by_page.map((p) => (
                    <li key={p.page_slug} className="flex items-center justify-between text-sm">
                      <a href={p.page_slug === 'home' ? '/' : `/p/${p.page_slug}`} target="_blank" rel="noopener noreferrer"
                         className="inline-flex items-center gap-1 text-slate-700 hover:text-indigo-600">
                        {p.page_slug === 'home' ? '🏠 home' : p.page_slug}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      <span className="font-mono text-xs text-slate-500">{p.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card>
              <h3 className="mb-4 text-sm font-semibold text-slate-700">Top referrers</h3>
              {summary.by_referrer.length === 0 ? <p className="text-sm text-slate-400">No referrer data yet.</p> : (
                <ul className="space-y-2">
                  {summary.by_referrer.map((r) => (
                    <li key={r.referrer} className="flex items-center justify-between text-sm">
                      <span className="truncate text-slate-700" title={r.referrer}>{shortReferrer(r.referrer)}</span>
                      <span className="font-mono text-xs text-slate-500">{r.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {summary.by_utm.length > 0 && (
            <div className="mt-6">
              <Card>
                <h3 className="mb-4 text-sm font-semibold text-slate-700">Top utm_source</h3>
                <ul className="space-y-2">
                  {summary.by_utm.map((u) => (
                    <li key={u.utm_source} className="flex items-center justify-between text-sm">
                      <span className="text-slate-700">{u.utm_source}</span>
                      <span className="font-mono text-xs text-slate-500">{u.count}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-5">{children}</div>
}
function shortReferrer(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}
