'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookMarked, Truck, CreditCard, MessageSquare, Globe } from 'lucide-react'

const TABS = [
  { label: 'Coupons',         href: '/storefront/coupons',         icon: BookMarked },
  { label: 'Shipping Zones',  href: '/storefront/shipping-zones',  icon: Truck },
  { label: 'Payment Methods', href: '/storefront/payment-methods', icon: CreditCard },
  { label: 'AI Transcripts',  href: '/storefront/ai-transcripts',  icon: MessageSquare },
]

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <Globe className="h-5 w-5 text-slate-500" />
        <h1 className="text-xl font-semibold text-slate-800">Storefront</h1>
      </div>

      <div className="mb-6 border-b border-slate-200">
        <nav className="flex flex-wrap gap-1 -mb-px">
          {TABS.map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(tab.href + '/')
            const Icon = tab.icon
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Link>
            )
          })}
        </nav>
      </div>

      <div>{children}</div>
    </div>
  )
}
