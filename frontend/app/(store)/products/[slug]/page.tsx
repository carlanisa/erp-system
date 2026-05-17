'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { storefrontApi, formatMYR } from '@/lib/storefront-api'
import { useCartStore } from '@/stores/cart-store'
import { useCustomerAuthStore } from '@/stores/customer-auth-store'
import { Heart } from 'lucide-react'
import toast from 'react-hot-toast'
import { BundleCard } from '@/components/storefront/BundleCard'

type Variant = { id: number; sku?: string; color?: string; size?: string; price?: number; sale_price?: number; stock?: number }
type Product = {
  id: number
  name: string
  description?: string
  description_short?: string
  featured_image_url?: string
  image_path?: string
  gallery_urls?: string[]
  color?: string
  sale_price: number
  original_price?: number
  size_chart_md?: string
}

export default function ProductPage({ params }: { params: { slug: string } }) {
  const [product, setProduct] = useState<Product | null>(null)
  const [variants, setVariants] = useState<Variant[]>([])
  const [sizeChart, setSizeChart] = useState<string | null>(null)
  const [activeImg, setActiveImg] = useState<string | null>(null)
  const [color, setColor] = useState<string | null>(null)
  const [size, setSize] = useState<string | null>(null)
  const [showChart, setShowChart] = useState(false)
  const addItem = useCartStore((s) => s.addItem)
  const customer = useCustomerAuthStore((s) => s.customer)
  const router = useRouter()
  const [wishlisted, setWishlisted] = useState(false)

  async function toggleWishlist() {
    if (!customer) { router.push('/account/login'); return }
    if (!product) return
    try {
      if (wishlisted) {
        await storefrontApi.delete(`/wishlist/${product.id}`)
        setWishlisted(false); toast.success('Removed from wishlist')
      } else {
        await storefrontApi.post('/wishlist', { product_id: product.id })
        setWishlisted(true); toast.success('Added to wishlist')
      }
    } catch { toast.error('Could not update wishlist') }
  }

  useEffect(() => {
    storefrontApi.get(`/products/${params.slug}`)
      .then(({ data }) => {
        setProduct(data.product)
        setVariants(data.variants ?? [])
        setSizeChart(data.size_chart_md ?? null)
        const imgs = data.product.gallery_urls ?? []
        setActiveImg(data.product.featured_image_url || imgs[0] || data.product.image_path || null)
        const firstColor = (data.variants ?? []).find((v: Variant) => v.color)?.color
        if (firstColor) setColor(firstColor)
      })
      .catch(() => setProduct(null))
  }, [params.slug])

  const colors = useMemo(() => Array.from(new Set(variants.map((v) => v.color).filter(Boolean))) as string[], [variants])
  const sizes = useMemo(() => {
    const filtered = variants.filter((v) => (color ? v.color === color : true))
    return Array.from(new Set(filtered.map((v) => v.size).filter(Boolean))) as string[]
  }, [variants, color])
  const selectedVariant = variants.find((v) => (!color || v.color === color) && (!size || v.size === size))

  const images: string[] = useMemo(() => {
    if (!product) return []
    const arr: string[] = []
    if (product.featured_image_url) arr.push(product.featured_image_url)
    for (const u of product.gallery_urls ?? []) if (!arr.includes(u)) arr.push(u)
    if (product.image_path && !arr.includes(product.image_path)) arr.push(product.image_path)
    return arr
  }, [product])

  async function onAddToCart() {
    if (!product) return
    if (variants.length > 0 && !selectedVariant) {
      toast.error('Please select a size and color.')
      return
    }
    try {
      await addItem(product.id, selectedVariant?.id ?? null, 1)
      toast.success('Added to cart')
    } catch {
      toast.error('Could not add to cart')
    }
  }

  if (!product) {
    return <div className="mx-auto max-w-7xl px-4 py-16 text-center text-neutral-500">Loading…</div>
  }

  const price = selectedVariant?.sale_price ?? selectedVariant?.price ?? product.sale_price

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="grid gap-10 md:grid-cols-2">
        {/* Gallery */}
        <div>
          <div className="aspect-[3/4] overflow-hidden rounded-2xl bg-neutral-100">
            {activeImg ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={activeImg} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-neutral-400">No image</div>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {images.map((u) => (
                <button
                  key={u}
                  onClick={() => setActiveImg(u)}
                  className={`aspect-square overflow-hidden rounded-md border-2 ${activeImg === u ? 'border-rose-500' : 'border-transparent'}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <h1 className="text-3xl font-semibold">{product.name}</h1>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-2xl font-semibold">{formatMYR(price)}</span>
            {product.original_price && product.original_price > price && (
              <span className="text-base text-neutral-400 line-through">{formatMYR(product.original_price)}</span>
            )}
          </div>
          {product.description_short && (
            <p className="mt-4 text-neutral-600">{product.description_short}</p>
          )}

          {colors.length > 0 && (
            <div className="mt-6">
              <div className="mb-2 text-sm font-medium">Color: <span className="text-neutral-500">{color}</span></div>
              <div className="flex flex-wrap gap-2">
                {colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`rounded-full border px-4 py-1.5 text-sm ${color === c ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-neutral-300 text-neutral-700 hover:border-neutral-400'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {sizes.length > 0 && (
            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium">Size: <span className="text-neutral-500">{size ?? '—'}</span></span>
                {sizeChart && (
                  <button onClick={() => setShowChart(true)} className="text-rose-500 hover:underline">
                    Size chart
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={`rounded-md border px-4 py-1.5 text-sm ${size === s ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-neutral-300 text-neutral-700 hover:border-neutral-400'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex gap-3">
            <button
              onClick={onAddToCart}
              className="flex-1 rounded-full bg-rose-500 px-6 py-3 text-sm font-semibold text-white hover:bg-rose-600"
            >
              Add to cart
            </button>
            <button
              onClick={async () => { await onAddToCart(); router.push('/checkout') }}
              className="rounded-full border border-neutral-300 px-6 py-3 text-sm font-semibold text-neutral-800 hover:bg-neutral-100"
            >
              Buy now
            </button>
            <button
              onClick={toggleWishlist}
              aria-label="Wishlist"
              className={`rounded-full border px-4 py-3 hover:bg-neutral-100 ${wishlisted ? 'border-rose-500 text-rose-500' : 'border-neutral-300 text-neutral-700'}`}
            >
              <Heart className={`h-5 w-5 ${wishlisted ? 'fill-rose-500' : ''}`} />
            </button>
          </div>

          {product.description && (
            <div className="mt-10 border-t pt-6 text-sm text-neutral-700">
              <h2 className="mb-2 font-semibold">Description</h2>
              <p className="whitespace-pre-line">{product.description}</p>
            </div>
          )}

          <BundleCard productId={product.id} />
        </div>
      </div>

      {showChart && sizeChart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowChart(false)}>
          <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Size chart</h3>
              <button onClick={() => setShowChart(false)} className="text-neutral-500 hover:text-neutral-900">✕</button>
            </div>
            <pre className="whitespace-pre-wrap font-sans text-sm text-neutral-700">{sizeChart}</pre>
          </div>
        </div>
      )}
    </div>
  )
}
