'use client'

import {
  Truck, Gift, ShieldCheck, Phone, Sparkles, Star, Heart, Award,
  Package, Leaf, Globe, Zap, Lock, Clock, MessageCircle, Camera,
} from 'lucide-react'

const ICONS: Record<string, any> = {
  truck: Truck, gift: Gift, shield: ShieldCheck, phone: Phone, sparkles: Sparkles,
  star: Star, heart: Heart, award: Award, package: Package, leaf: Leaf,
  globe: Globe, zap: Zap, lock: Lock, clock: Clock, message: MessageCircle, camera: Camera,
}
export const FEATURE_ICONS = Object.keys(ICONS)

export function FeaturesGrid({ config }: { config: { kicker?: string; title?: string; subtitle?: string; cols?: 2|3|4; items: { icon: string; title: string; body?: string }[] } }) {
  const items = config.items ?? []
  if (items.length === 0) return null
  const cols = (config.cols ?? 3)
  const gridCls = cols === 4 ? 'md:grid-cols-4' : cols === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'
  return (
    <section className="py-14" style={{ background: 'var(--brand-bg)' }}>
      <div className="mx-auto max-w-7xl px-6">
        {(config.kicker || config.title || config.subtitle) && (
          <header className="mb-10 text-center">
            {config.kicker && <p className="text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: 'var(--brand-accent)' }}>{config.kicker}</p>}
            {config.title && <h2 className="mt-2 text-3xl font-semibold md:text-4xl" style={{ fontFamily: 'var(--brand-font-heading)', color: 'var(--brand-text)' }}>{config.title}</h2>}
            {config.subtitle && <p className="mt-3 text-sm md:text-base" style={{ color: 'var(--brand-muted)' }}>{config.subtitle}</p>}
          </header>
        )}
        <div className={`grid grid-cols-1 gap-6 ${gridCls}`}>
          {items.map((it, i) => {
            const Icon = ICONS[(it.icon ?? 'sparkles').toLowerCase()] ?? Sparkles
            return (
              <div key={i} className="rounded-2xl p-6 text-center" style={{ background: 'var(--brand-surface)' }}>
                <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full"
                      style={{ background: 'var(--brand-bg)', color: 'var(--brand-primary)' }}>
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-base font-semibold" style={{ color: 'var(--brand-text)' }}>{it.title}</h3>
                {it.body && <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--brand-muted)' }}>{it.body}</p>}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
