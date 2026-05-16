import { create } from 'zustand'
import { storefrontApi, setAuthToken, getAuthToken } from '@/lib/storefront-api'

export type Customer = {
  id: number
  name: string
  email: string
  phone: string | null
}

type AuthState = {
  customer: Customer | null
  loading: boolean
  hydrated: boolean
  hydrate: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (payload: { name: string; email: string; phone?: string; password: string }) => Promise<void>
  logout: () => Promise<void>
}

export const useCustomerAuthStore = create<AuthState>((set) => ({
  customer: null,
  loading: false,
  hydrated: false,

  hydrate: async () => {
    if (!getAuthToken()) { set({ hydrated: true }); return }
    try {
      const { data } = await storefrontApi.get('/me')
      set({ customer: data, hydrated: true })
    } catch {
      setAuthToken(null)
      set({ customer: null, hydrated: true })
    }
  },

  login: async (email, password) => {
    set({ loading: true })
    try {
      const { data } = await storefrontApi.post('/auth/login', { email, password })
      setAuthToken(data.token)
      set({ customer: data.customer })
    } finally {
      set({ loading: false })
    }
  },

  register: async (payload) => {
    set({ loading: true })
    try {
      const { data } = await storefrontApi.post('/auth/register', payload)
      setAuthToken(data.token)
      set({ customer: data.customer })
    } finally {
      set({ loading: false })
    }
  },

  logout: async () => {
    try { await storefrontApi.post('/auth/logout') } catch {}
    setAuthToken(null)
    set({ customer: null })
  },
}))
