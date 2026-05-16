import { StoreHeader } from '@/components/storefront/StoreHeader'
import { StoreFooter } from '@/components/storefront/StoreFooter'
import { StoreAiChat } from '@/components/storefront/StoreAiChat'
import { BehaviorWatcher } from '@/components/storefront/BehaviorWatcher'
import { AnnouncementBar } from '@/components/storefront/AnnouncementBar'
import { ThemeProvider } from '@/components/storefront/ThemeProvider'

export const metadata = {
  title: 'Modestwear — Baju Kurung, Hijab & More',
  description: 'Modern modestwear for the Malaysian woman.',
}

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <div className="flex min-h-screen flex-col" style={{ background: 'var(--brand-bg)', color: 'var(--brand-text)' }}>
        <AnnouncementBar />
        <StoreHeader />
        <main className="flex-1">{children}</main>
        <StoreFooter />
        <StoreAiChat />
        <BehaviorWatcher />
      </div>
    </ThemeProvider>
  )
}
