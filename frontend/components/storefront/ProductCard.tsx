import Link from 'next/link'
import { formatMYR } from '@/lib/storefront-api'

export type StoreProduct = {
  id: number
  name: string
  seo_slug: string | null
  featured_image_url: string | null
  image_path: string | null
  gallery_urls: string[] | null
  color: string | null
  category: string | null
  sale_price: number
  original_price: number | null
  is_new_arrival?: boolean
  is_bestseller?: boolean
}

export function ProductCard({ product }: { product: StoreProduct }) {
  const img = product.featured_image_url || product.gallery_urls?.[0] || product.image_path
  const href = `/products/${product.seo_slug || product.id}`
  const onSale =
    product.original_price && product.original_price > product.sale_price ? true : false

  return (
    <Link href={href} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-neutral-100">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={product.name}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-neutral-400">
            No image
          </div>
        )}
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {product.is_new_arrival && (
            <span className="rounded bg-rose-500 px-2 py-0.5 text-[10px] font-semibold text-white">
              NEW
            </span>
          )}
          {onSale && (
            <span className="rounded bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white">
              SALE
            </span>
          )}
        </div>
      </div>
      <div className="mt-3">
        <div className="line-clamp-1 text-sm font-medium text-neutral-900">{product.name}</div>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-sm font-semibold">{formatMYR(product.sale_price)}</span>
          {onSale && (
            <span className="text-xs text-neutral-400 line-through">
              {formatMYR(product.original_price!)}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
