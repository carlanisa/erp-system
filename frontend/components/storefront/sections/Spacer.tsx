'use client'

export function Spacer({ config }: { config: { height?: number; bg?: 'page'|'surface'|'primary'|'transparent' } }) {
  const h = Math.max(8, Math.min(400, config.height ?? 60))
  const bg = config.bg === 'surface' ? 'var(--brand-surface)'
    : config.bg === 'primary' ? 'var(--brand-primary)'
    : config.bg === 'transparent' ? 'transparent'
    : 'var(--brand-bg)'
  return <div style={{ height: `${h}px`, background: bg }} />
}
