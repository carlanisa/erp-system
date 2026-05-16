import { create } from 'zustand'
import { storefrontApi, setCartToken } from '@/lib/storefront-api'

export type CartItem = {
  id: number
  product_id: number
  variant_id: number | null
  name: string
  color: string | null
  size: string | null
  qty: number
  unit_price: number
  line_total: number
}

export type Cart = {
  id: number | null
  session_token: string | null
  currency: string
  subtotal: number
  discount_total: number
  shipping_total: number
  tax_total: number
  grand_total: number
  coupon_code: string | null
  items: CartItem[]
}

type CartState = {
  cart: Cart
  loading: boolean
  refresh: () => Promise<void>
  addItem: (productId: number, variantId: number | null, qty?: number) => Promise<void>
  updateQty: (itemId: number, qty: number) => Promise<void>
  removeItem: (itemId: number) => Promise<void>
}

const empty: Cart = {
  id: null, session_token: null, currency: 'MYR',
  subtotal: 0, discount_total: 0, shipping_total: 0, tax_total: 0, grand_total: 0,
  coupon_code: null, items: [],
}

export const useCartStore = create<CartState>((set, get) => ({
  cart: empty,
  loading: false,

  refresh: async () => {
    set({ loading: true })
    try {
      const { data } = await storefrontApi.get('/cart')
      if (data.session_token) setCartToken(data.session_token)
      set({ cart: data })
    } finally {
      set({ loading: false })
    }
  },

  addItem: async (productId, variantId, qty = 1) => {
    const before = get().cart.items.length
    const { data } = await storefrontApi.post('/cart/items', {
      product_id: productId, variant_id: variantId, qty,
    })
    if (data.session_token) setCartToken(data.session_token)
    set({ cart: data })
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('storefront:item-added', {
        detail: { firstInSession: before === 0, productId, qty },
      }))
      window.dispatchEvent(new CustomEvent('storefront:cart-subtotal', {
        detail: { subtotal: data.subtotal },
      }))
    }
  },

  updateQty: async (itemId, qty) => {
    const { data } = await storefrontApi.patch(`/cart/items/${itemId}`, { qty })
    set({ cart: data })
  },

  removeItem: async (itemId) => {
    const { data } = await storefrontApi.delete(`/cart/items/${itemId}`)
    set({ cart: data })
  },
}))
