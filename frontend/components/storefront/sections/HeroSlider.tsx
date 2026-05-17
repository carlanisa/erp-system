'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { imageSrc } from '@/lib/storefront-api'

type Slide = {
  image: string
  kicker?: string
  headline: string
  subheading?: string
  button_text?: string
  button_url?: string
  overlay?: number
  align?: 'left' | 'center' | 'right'
}

export function HeroSlider({ config }: { config: { slides: Slide[]; autoplay?: boolean; interval?: number } }) {
  const slides = config.slides ?? []
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (!config.autoplay || slides.length <= 1) return
    const t = setInterval(() => setActive((i) => (i + 1) % slides.length), config.interval ?? 5500)
    return () => clearInterval(t)
  }, [config.autoplay, config.interval, slides.length])

  if (slides.length === 0) return null
  const s = slides[active]
  const align = s.align ?? 'left'
  const alignCls = align === 'center' ? 'items-center text-center' : align === 'right' ? 'items-end text-right' : 'items-start text-left'

  return (
    <section className="relative h-[78vh] min-h-[420px] w-full overflow-hidden">
      {slides.map((sl, i) => (
        <div
          key={i}
          className={`absolute inset-0 transition-opacity duration-700 ${i === active ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageSrc(sl.image)} alt={sl.headline} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${sl.overlay ?? 0.35})` }} />
        </div>
      ))}
      <div className={`relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-center px-6 ${alignCls}`}>
        {s.kicker && <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/90">{s.kicker}</p>}
        <h1 className="mt-3 max-w-2xl text-4xl font-semibold text-white sm:text-5xl md:text-6xl" style={{ fontFamily: 'var(--brand-font-heading)' }}>
          {s.headline}
        </h1>
        {s.subheading && <p className="mt-4 max-w-xl text-base text-white/90 md:text-lg">{s.subheading}</p>}
        {s.button_text && s.button_url && (
          <Link href={s.button_url}
            className="mt-7 inline-block rounded-full bg-white px-8 py-3 text-sm font-semibold uppercase tracking-wider text-neutral-900 transition hover:bg-neutral-100"
            style={{ color: 'var(--brand-primary)' }}>
            {s.button_text}
          </Link>
        )}
      </div>
      {slides.length > 1 && (
        <>
          <button onClick={() => setActive((i) => (i - 1 + slides.length) % slides.length)}
            className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/20 p-2 backdrop-blur hover:bg-white/30">
            <ChevronLeft className="h-5 w-5 text-white" />
          </button>
          <button onClick={() => setActive((i) => (i + 1) % slides.length)}
            className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/20 p-2 backdrop-blur hover:bg-white/30">
            <ChevronRight className="h-5 w-5 text-white" />
          </button>
          <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2">
            {slides.map((_, i) => (
              <button key={i} onClick={() => setActive(i)}
                className={`h-1.5 rounded-full transition-all ${i === active ? 'w-8 bg-white' : 'w-2 bg-white/50'}`} />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
