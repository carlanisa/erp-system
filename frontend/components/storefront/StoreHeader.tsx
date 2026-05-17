'use client'

import Link from 'next/link'
import { ShoppingBag, User, Search, Menu, Globe } from 'lucide-react'
import { useCartStore } from '@/stores/cart-store'
import { useCustomerAuthStore } from '@/stores/customer-auth-store'
import { useStoreTheme } from '@/components/storefront/ThemeProvider'
import { fetchMenus, type MenuItem } from '@/lib/storefront-nav'
import { useEffect, useState } from 'react'

export function StoreHeader() {
  const cart = useCartStore((s) => s.cart)
  const refresh = useCartStore((s) => s.refresh)
  const customer = useCustomerAuthStore((s) => s.customer)
  const hydrate = useCustomerAuthStore((s) => s.hydrate)
  const { theme } = useStoreTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menu, setMenu] = useState<MenuItem[]>([])

  useEffect(() => { refresh().catch(() => {}); hydrate().catch(() => {}) }, [refresh, hydrate])
  useEffect(() => { fetchMenus().then((m) => setMenu(m.header ?? [])) }, [])

  const count = cart.items.reduce((a, b) => a + b.qty, 0)
  const brandName = theme?.settings?.brand_name ?? 'Modestwear'
  const enabledLangs: string[] = (theme?.settings as any)?.enabled_languages ?? []
  const showLang = Array.isArray(enabledLangs) && enabledLangs.length >= 2

  // Fallback to defaults if menu admin hasn't added any items
  const items: MenuItem[] = menu.length > 0 ? menu : [
    { id: -1, label: 'Shop',         href: '/shop',                open_new: false, sort_order: 1 },
    { id: -2, label: 'Baju Kurung',  href: '/shop/baju-kurung',    open_new: false, sort_order: 2 },
    { id: -3, label: 'Hijab',        href: '/shop/hijab',          open_new: false, sort_order: 3 },
    { id: -4, label: 'New Arrivals', href: '/shop/new-arrivals',   open_new: false, sort_order: 4 },
  ]

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <button className="lg:hidden" onClick={() => setMobileOpen((o) => !o)} aria-label="Menu">
          <Menu className="h-6 w-6" />
        </button>

        <Link href="/" className="text-xl font-semibold tracking-tight">
          {brandName}<span style={{ color: 'var(--brand-primary)' }}>.</span>
        </Link>

        <nav className="hidden gap-7 text-sm font-medium lg:flex" style={{ color: 'var(--brand-text)' }}>
          {items.map((it) => (
            <Link key={it.id} href={it.href} target={it.open_new ? '_blank' : undefined}
              className="hover:opacity-70 transition">
              {it.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {showLang && (
            <button aria-label="Language" className="text-neutral-700 hover:opacity-70">
              <Globe className="h-5 w-5" />
            </button>
          )}
          <button aria-label="Search" className="hidden sm:block text-neutral-700 hover:opacity-70">
            <Search className="h-5 w-5" />
          </button>
          <Link href={customer ? '/account' : '/account/login'} className="text-neutral-700 hover:opacity-70" aria-label="Account">
            <User className="h-5 w-5" />
          </Link>
          <Link href="/cart" className="relative text-neutral-700 hover:opacity-70" aria-label="Cart">
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white"
                    style={{ background: 'var(--brand-primary)' }}>
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-neutral-200 bg-white px-4 py-3 lg:hidden">
          <div className="flex flex-col gap-3 text-sm font-medium text-neutral-700">
            {items.map((it) => (
              <Link key={it.id} href={it.href} target={it.open_new ? '_blank' : undefined}
                onClick={() => setMobileOpen(false)}>
                {it.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}
