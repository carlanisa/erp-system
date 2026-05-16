'use client'

import { useStoreTheme } from './ThemeProvider'
import Link from 'next/link'

export function AnnouncementBar() {
  const { theme } = useStoreTheme()
  const bar = theme?.announcement
  if (!bar) return null

  const content = (
    <div className="mx-auto max-w-7xl px-6 py-2 text-center text-xs font-medium uppercase tracking-wider">
      {bar.text}
    </div>
  )
  return (
    <div style={{ background: bar.bg_color, color: bar.text_color }}>
      {bar.link_url ? <Link href={bar.link_url}>{content}</Link> : content}
    </div>
  )
}
