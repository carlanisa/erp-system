import { StoreHeader } from '@/components/storefront/StoreHeader'
import { StoreFooter } from '@/components/storefront/StoreFooter'
import { StoreAiChat } from '@/components/storefront/StoreAiChat'

export const metadata = {
  title: 'Modestwear — Baju Kurung, Hijab & More',
  description: 'Modern modestwear for the Malaysian woman.',
}

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white text-neutral-900">
      <StoreHeader />
      <main className="flex-1">{children}</main>
      <StoreFooter />
      <StoreAiChat />
    </div>
  )
}
