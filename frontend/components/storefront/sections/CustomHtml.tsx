'use client'

export function CustomHtml({ config }: { config: { html?: string; bg?: 'page'|'surface'|'transparent'; max_width?: 'narrow'|'normal'|'wide'|'full' } }) {
  if (!config.html?.trim()) return null
  const bg = config.bg === 'surface' ? 'var(--brand-surface)'
    : config.bg === 'transparent' ? 'transparent'
    : 'var(--brand-bg)'
  const max = config.max_width === 'narrow' ? 'max-w-2xl'
    : config.max_width === 'wide' ? 'max-w-7xl'
    : config.max_width === 'full' ? ''
    : 'max-w-4xl'
  return (
    <section className="py-8" style={{ background: bg }}>
      <div className={`mx-auto px-6 ${max}`}>
        <div className="storefront-custom-html" dangerouslySetInnerHTML={{ __html: config.html }} />
      </div>
    </section>
  )
}
