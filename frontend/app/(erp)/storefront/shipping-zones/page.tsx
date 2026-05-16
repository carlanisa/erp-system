'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

type Rate = { id?: number; name: string; flat_rate: number; free_over: number | null; enabled: boolean }
type Zone = { id: number; name: string; code: string; state_codes: string[] | null; enabled: boolean; rates: Rate[] }

export default function ShippingZonesPage() {
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/storefront/shipping-zones')
      .then(({ data }) => setZones(Array.isArray(data) ? data : data?.data ?? []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Shipping Zones</h1>
      <p className="mb-6 text-sm text-slate-600">Configure flat rates per Malaysian state zone. Free-shipping thresholds also live here.</p>
      {loading ? (
        <div className="text-slate-400">Loading…</div>
      ) : (
        <div className="space-y-4">
          {zones.map((z) => (
            <div key={z.id} className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-lg font-semibold">{z.name} <span className="text-xs text-slate-500">({z.code})</span></div>
                  <div className="mt-1 text-xs text-slate-500">{(z.state_codes ?? []).join(', ') || '—'}</div>
                </div>
                <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${z.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {z.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="mt-4 grid gap-2">
                {z.rates.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
                    <span className="font-medium">{r.name}</span>
                    <span className="text-slate-600">
                      RM{Number(r.flat_rate).toFixed(2)} flat
                      {r.free_over != null && <span className="ml-2 text-emerald-600">· Free over RM{Number(r.free_over).toFixed(2)}</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
