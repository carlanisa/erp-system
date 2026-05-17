'use client'

export function Divider({ config }: { config: { style?: 'solid'|'dashed'|'dotted'|'ornament'; width?: 'narrow'|'normal'|'wide'; color?: string } }) {
  const width = config.width === 'narrow' ? 'max-w-xs' : config.width === 'wide' ? 'max-w-6xl' : 'max-w-3xl'
  if (config.style === 'ornament') {
    return (
      <section className="py-8" style={{ background: 'var(--brand-bg)' }}>
        <div className={`mx-auto flex items-center gap-3 px-6 ${width}`}>
          <span className="flex-1 border-t" style={{ borderColor: config.color ?? 'var(--brand-accent)', opacity: 0.5 }} />
          <span className="text-lg" style={{ color: config.color ?? 'var(--brand-accent)' }}>✦</span>
          <span className="flex-1 border-t" style={{ borderColor: config.color ?? 'var(--brand-accent)', opacity: 0.5 }} />
        </div>
      </section>
    )
  }
  const borderStyle = config.style === 'dashed' ? 'dashed' : config.style === 'dotted' ? 'dotted' : 'solid'
  return (
    <section className="py-6" style={{ background: 'var(--brand-bg)' }}>
      <hr className={`mx-auto ${width}`} style={{ borderTopStyle: borderStyle, borderColor: config.color ?? 'rgba(0,0,0,0.1)' }} />
    </section>
  )
}
