'use client'

function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/)
  return m ? m[1] : null
}

export function VideoBlock({ config }: { config: { url: string; title?: string; subtitle?: string; aspect?: '16:9' | '4:3' | '1:1' } }) {
  if (!config.url) return null
  const yt = youtubeId(config.url)
  const aspect = config.aspect ?? '16:9'
  const padPercent = aspect === '4:3' ? '75%' : aspect === '1:1' ? '100%' : '56.25%'
  return (
    <section className="py-14" style={{ background: 'var(--brand-surface)' }}>
      <div className="mx-auto max-w-5xl px-6">
        {(config.title || config.subtitle) && (
          <header className="mb-6 text-center">
            {config.title && <h2 className="text-3xl font-semibold" style={{ fontFamily: 'var(--brand-font-heading)', color: 'var(--brand-text)' }}>{config.title}</h2>}
            {config.subtitle && <p className="mt-2 text-sm" style={{ color: 'var(--brand-muted)' }}>{config.subtitle}</p>}
          </header>
        )}
        <div className="relative overflow-hidden rounded-2xl bg-black shadow-lg" style={{ paddingBottom: padPercent }}>
          {yt ? (
            <iframe
              className="absolute inset-0 h-full w-full"
              src={`https://www.youtube.com/embed/${yt}`}
              title={config.title ?? 'Video'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video src={config.url} controls className="absolute inset-0 h-full w-full" />
          )}
        </div>
      </div>
    </section>
  )
}
