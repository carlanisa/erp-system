'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Timer } from 'lucide-react'

export function CountdownSale({ config }: { config: { title?: string; subtitle?: string; ends_at?: string; button_text?: string; button_url?: string; bg?: string } }) {
  const [remaining, setRemaining] = useState<{ d: number; h: number; m: number; s: number } | null>(null)

  useEffect(() => {
    if (!config.ends_at) return
    const end = new Date(config.ends_at).getTime()
    const tick = () => {
      const ms = end - Date.now()
      if (ms <= 0) { setRemaining({ d: 0, h: 0, m: 0, s: 0 }); return }
      const d = Math.floor(ms / 86_400_000)
      const h = Math.floor((ms % 86_400_000) / 3_600_000)
      const m = Math.floor((ms % 3_600_000) / 60_000)
      const s = Math.floor((ms % 60_000) / 1000)
      setRemaining({ d, h, m, s })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [config.ends_at])

  const bg = config.bg ?? 'var(--brand-primary)'

  return (
    <section className="py-14" style={{ background: bg, color: '#fff' }}>
      <div className="mx-auto max-w-3xl px-6 text-center">
        <Timer className="mx-auto mb-3 h-8 w-8 opacity-80" />
        {config.title && <h2 className="text-3xl font-semibold" style={{ fontFamily: 'var(--brand-font-heading)' }}>{config.title}</h2>}
        {config.subtitle && <p className="mt-2 text-sm opacity-90">{config.subtitle}</p>}

        {remaining && (
          <div className="mt-6 inline-flex gap-3 sm:gap-4">
            {[['Days', remaining.d], ['Hours', remaining.h], ['Min', remaining.m], ['Sec', remaining.s]].map(([label, n]) => (
              <div key={label as string} className="min-w-[60px] rounded-xl bg-white/10 px-3 py-2 backdrop-blur sm:min-w-[80px]">
                <div className="text-2xl font-bold tabular-nums sm:text-3xl">{String(n).padStart(2, '0')}</div>
                <div className="text-[10px] uppercase tracking-widest opacity-80">{label}</div>
              </div>
            ))}
          </div>
        )}

        {config.button_text && config.button_url && (
          <div className="mt-6">
            <Link href={config.button_url}
              className="inline-block rounded-full bg-white px-7 py-3 text-sm font-semibold uppercase tracking-wider"
              style={{ color: bg.startsWith('var(') ? 'var(--brand-primary)' : bg }}>
              {config.button_text}
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
