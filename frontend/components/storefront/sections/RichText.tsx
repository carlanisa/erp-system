'use client'

export function RichText({ config }: { config: { kicker?: string; title?: string; body?: string; align?: 'left'|'center'|'right'; max_width?: 'narrow'|'normal'|'wide' } }) {
  const align = config.align ?? 'center'
  const max = config.max_width === 'narrow' ? 'max-w-2xl' : config.max_width === 'wide' ? 'max-w-6xl' : 'max-w-4xl'
  const alignCls = align === 'left' ? 'text-left' : align === 'right' ? 'text-right' : 'text-center'
  return (
    <section className="py-14" style={{ background: 'var(--brand-bg)' }}>
      <div className={`mx-auto px-6 ${max} ${alignCls}`}>
        {config.kicker && <p className="text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: 'var(--brand-accent)' }}>{config.kicker}</p>}
        {config.title && <h2 className="mt-3 text-3xl font-semibold md:text-4xl" style={{ fontFamily: 'var(--brand-font-heading)', color: 'var(--brand-text)' }}>{config.title}</h2>}
        {config.body && <p className="mt-4 text-base leading-relaxed whitespace-pre-line" style={{ color: 'var(--brand-muted)' }}>{config.body}</p>}
      </div>
    </section>
  )
}
