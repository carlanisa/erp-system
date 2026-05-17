'use client'

import Link from 'next/link'
import { ShoppingBag, User, Search, Menu, Globe, ChevronDown } from 'lucide-react'
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
    { id: -1, parent_id: null, label: 'Shop',         href: '/shop',                open_new: false, sort_order: 1 },
    { id: -2, parent_id: null, label: 'Baju Kurung',  href: '/collections/baju-kurung',    open_new: false, sort_order: 2 },
    { id: -3, parent_id: null, label: 'Hijab',        href: '/collections/hijab',          open_new: false, sort_order: 3 },
    { id: -4, parent_id: null, label: 'New Arrivals', href: '/collections/new-arrivals',   open_new: false, sort_order: 4 },
  ]
  const rootItems = items.filter((i) => i.parent_id == null).sort((a, b) => a.sort_order - b.sort_order)
  const childrenOf = (parentId: number) => items.filter((i) => i.parent_id === parentId).sort((a, b) => a.sort_order - b.sort_order)

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
          {rootItems.map((it) => {
            const kids = childrenOf(it.id)
            if (kids.length === 0) {
              return (
                <Link key={it.id} href={it.href} target={it.open_new ? '_blank' : undefined}
                  className="hover:opacity-70 transition">
                  {it.label}
                </Link>
              )
            }
            return (
              <div key={it.id} className="group relative">
                <Link href={it.href} target={it.open_new ? '_blank' : undefined}
                  className="inline-flex items-center gap-0.5 hover:opacity-70 transition">
                  {it.label} <ChevronDown className="h-3 w-3" />
                </Link>
                <div className="invisible absolute left-0 top-full z-50 mt-2 min-w-[200px] rounded-lg border border-neutral-200 bg-white p-1 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100">
                  {kids.map((c) => (
                    <Link key={c.id} href={c.href} target={c.open_new ? '_blank' : undefined}
                      className="block rounded px-3 py-2 text-sm hover:bg-neutral-50">
                      {c.label}
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
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
            {rootItems.map((it) => {
              const kids = childrenOf(it.id)
              return (
                <div key={it.id}>
                  <Link href={it.href} target={it.open_new ? '_blank' : undefined}
                    onClick={() => setMobileOpen(false)} className="block font-medium">
                    {it.label}
                  </Link>
                  {kids.length > 0 && (
                    <div className="mt-1 ml-3 flex flex-col gap-1 border-l border-neutral-200 pl-3">
                      {kids.map((c) => (
                        <Link key={c.id} href={c.href} target={c.open_new ? '_blank' : undefined}
                          onClick={() => setMobileOpen(false)} className="block text-neutral-600">
                          {c.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </header>
  )
}
