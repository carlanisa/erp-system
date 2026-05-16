'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { storefrontApi, formatMYR } from '@/lib/storefront-api'
import { useCustomerAuthStore } from '@/stores/customer-auth-store'
import { useCartStore } from '@/stores/cart-store'
import { Heart, Trash2 } from 'lucide-react'

type Item = {
  id: number
  product_id: number
  product: {
    id: number; name: string; sale_price: number; seo_slug: string | null
    featured_image_url: string | null; gallery_urls: string[] | null
  } | null
}

export default function WishlistPage() {
  const router = useRouter()
  const customer = useCustomerAuthStore((s) => s.customer)
  const hydrated = useCustomerAuthStore((s) => s.hydrated)
  const hydrate = useCustomerAuthStore((s) => s.hydrate)
  const addItem = useCartStore((s) => s.addItem)
  const [items, setItems] = useState<Item[]>([])

  useEffect(() => { hydrate().catch(() => {}) }, [hydrate])
  useEffect(() => { if (hydrated && !customer) router.push('/account/login') }, [hydrated, customer, router])

  async function load() {
    const { data } = await storefrontApi.get('/wishlist')
    setItems(data ?? [])
  }
  useEffect(() => { if (customer) load() }, [customer])

  async function remove(productId: number) {
    await storefrontApi.delete(`/wishlist/${productId}`); load()
  }

  async function moveToCart(item: Item) {
    if (!item.product) return
    await addItem(item.product.id, null, 1)
    await remove(item.product.id)
    toast.success('Added to cart')
  }

  if (!customer) return null

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-3xl font-semibold flex items-center gap-2">
        <Heart className="h-7 w-7 text-rose-500 fill-rose-500" /> My wishlist
      </h1>
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 p-12 text-center text-neutral-500">
          Your wishlist is empty. <Link href="/shop" className="text-rose-500 hover:underline">Continue shopping →</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {items.map((it) => it.product && (
            <div key={it.id} className="group relative rounded-xl border border-neutral-200 p-3">
              <Link href={`/product/${it.product.seo_slug || it.product.id}`}>
                <div className="aspect-[3/4] overflow-hidden rounded-md bg-neutral-100">
                  {it.product.featured_image_url || it.product.gallery_urls?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={it.product.featured_image_url || it.product.gallery_urls?.[0] || ''}
                      alt={it.product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
              </Link>
              <div className="mt-2 line-clamp-1 text-sm font-medium">{it.product.name}</div>
              <div className="text-sm font-semibold">{formatMYR(it.product.sale_price)}</div>
              <div className="mt-2 flex items-center gap-2">
                <button onClick={() => moveToCart(it)} className="flex-1 rounded-full bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-600">
                  Move to cart
                </button>
                <button onClick={() => remove(it.product!.id)} className="text-neutral-400 hover:text-rose-500" aria-label="Remove">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
