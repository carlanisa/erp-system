'use client'

import { Truck, Gift, ShieldCheck, Phone, Sparkles, Star, Heart, Award } from 'lucide-react'

const ICONS: Record<string, any> = {
  truck: Truck, gift: Gift, shield: ShieldCheck, phone: Phone,
  sparkles: Sparkles, star: Star, heart: Heart, award: Award,
}

export function BannerStrip({ config }: { config: { items: { icon?: string; title: string; subtitle?: string }[] } }) {
  const items = config.items ?? []
  if (items.length === 0) return null
  return (
    <section className="border-y" style={{ borderColor: 'rgba(0,0,0,0.06)', background: 'var(--brand-surface)' }}>
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-6 py-8 md:grid-cols-4">
        {items.map((it, i) => {
          const Icon = ICONS[(it.icon ?? 'sparkles').toLowerCase()] ?? Sparkles
          return (
            <div key={i} className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-full" style={{ background: 'var(--brand-bg)', color: 'var(--brand-primary)' }}>
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--brand-text)' }}>{it.title}</div>
                {it.subtitle && <div className="text-xs" style={{ color: 'var(--brand-muted)' }}>{it.subtitle}</div>}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
