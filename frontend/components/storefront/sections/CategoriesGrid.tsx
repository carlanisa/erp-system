'use client'

import Link from 'next/link'

export function CategoriesGrid({ config }: { config: { title?: string; subtitle?: string; columns?: number; categories: { name: string; image: string; url: string }[] } }) {
  const cats = config.categories ?? []
  if (cats.length === 0) return null
  const cols = config.columns ?? 3
  const colsCls = cols === 4 ? 'md:grid-cols-4' : cols === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'

  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      {(config.title || config.subtitle) && (
        <header className="mb-8 text-center">
          {config.title && (
            <h2 className="text-3xl font-semibold" style={{ fontFamily: 'var(--brand-font-heading)', color: 'var(--brand-text)' }}>{config.title}</h2>
          )}
          {config.subtitle && <p className="mt-2 text-sm" style={{ color: 'var(--brand-muted)' }}>{config.subtitle}</p>}
        </header>
      )}
      <div className={`grid grid-cols-2 gap-4 md:gap-6 ${colsCls}`}>
        {cats.map((c) => (
          <Link key={c.name} href={c.url}
            className="group relative aspect-[3/4] overflow-hidden rounded-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.image} alt={c.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
              <h3 className="text-xl font-semibold tracking-wide" style={{ fontFamily: 'var(--brand-font-heading)' }}>{c.name}</h3>
              <span className="mt-1 inline-block text-xs uppercase tracking-widest opacity-90 group-hover:underline">Shop now →</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
