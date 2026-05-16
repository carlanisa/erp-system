'use client'

import Link from 'next/link'
import { ShoppingBag, User, Search, Menu } from 'lucide-react'
import { useCartStore } from '@/stores/cart-store'
import { useCustomerAuthStore } from '@/stores/customer-auth-store'
import { useEffect, useState } from 'react'

export function StoreHeader() {
  const cart = useCartStore((s) => s.cart)
  const refresh = useCartStore((s) => s.refresh)
  const customer = useCustomerAuthStore((s) => s.customer)
  const hydrate = useCustomerAuthStore((s) => s.hydrate)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => { refresh().catch(() => {}); hydrate().catch(() => {}) }, [refresh, hydrate])

  const count = cart.items.reduce((a, b) => a + b.qty, 0)

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <button className="lg:hidden" onClick={() => setMobileOpen((o) => !o)} aria-label="Menu">
          <Menu className="h-6 w-6" />
        </button>

        <Link href="/" className="text-xl font-semibold tracking-tight">
          Modestwear<span className="text-rose-500">.</span>
        </Link>

        <nav className="hidden gap-8 text-sm font-medium text-neutral-700 lg:flex">
          <Link href="/shop" className="hover:text-rose-500">Shop</Link>
          <Link href="/shop/baju-kurung" className="hover:text-rose-500">Baju Kurung</Link>
          <Link href="/shop/hijab" className="hover:text-rose-500">Hijab</Link>
          <Link href="/shop/new-arrivals" className="hover:text-rose-500">New Arrivals</Link>
        </nav>

        <div className="flex items-center gap-3">
          <button aria-label="Search" className="hidden sm:block text-neutral-700 hover:text-rose-500">
            <Search className="h-5 w-5" />
          </button>
          <Link
            href={customer ? '/account' : '/account/login'}
            className="text-neutral-700 hover:text-rose-500"
            aria-label="Account"
          >
            <User className="h-5 w-5" />
          </Link>
          <Link href="/cart" className="relative text-neutral-700 hover:text-rose-500" aria-label="Cart">
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-neutral-200 bg-white px-4 py-3 lg:hidden">
          <div className="flex flex-col gap-3 text-sm font-medium text-neutral-700">
            <Link href="/shop" onClick={() => setMobileOpen(false)}>Shop</Link>
            <Link href="/shop/baju-kurung" onClick={() => setMobileOpen(false)}>Baju Kurung</Link>
            <Link href="/shop/hijab" onClick={() => setMobileOpen(false)}>Hijab</Link>
            <Link href="/shop/new-arrivals" onClick={() => setMobileOpen(false)}>New Arrivals</Link>
          </div>
        </div>
      )}
    </header>
  )
}
