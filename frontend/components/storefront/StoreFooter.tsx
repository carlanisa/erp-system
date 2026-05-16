import Link from 'next/link'

export function StoreFooter() {
  return (
    <footer className="border-t border-neutral-200 bg-neutral-50">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div>
          <div className="text-lg font-semibold">Modestwear.</div>
          <p className="mt-2 text-sm text-neutral-600">
            Curated modestwear for the modern Malaysian woman. Baju Kurung, Hijab, and more.
          </p>
        </div>
        <div>
          <div className="mb-3 text-sm font-semibold">Shop</div>
          <ul className="space-y-2 text-sm text-neutral-600">
            <li><Link href="/shop/baju-kurung">Baju Kurung</Link></li>
            <li><Link href="/shop/hijab">Hijab</Link></li>
            <li><Link href="/shop/new-arrivals">New Arrivals</Link></li>
            <li><Link href="/shop">All Products</Link></li>
          </ul>
        </div>
        <div>
          <div className="mb-3 text-sm font-semibold">Help</div>
          <ul className="space-y-2 text-sm text-neutral-600">
            <li>Shipping: RM8 West / RM18 East</li>
            <li>Free shipping over RM150</li>
            <li>COD &amp; Bank Transfer accepted</li>
          </ul>
        </div>
        <div>
          <div className="mb-3 text-sm font-semibold">Account</div>
          <ul className="space-y-2 text-sm text-neutral-600">
            <li><Link href="/account/login">Sign in</Link></li>
            <li><Link href="/account/register">Create account</Link></li>
            <li><Link href="/account/orders">My Orders</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-neutral-200 py-4 text-center text-xs text-neutral-500">
        © {new Date().getFullYear()} Modestwear. All rights reserved.
      </div>
    </footer>
  )
}
