import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type User = {
  id: number
  name: string
  email: string
  role: string
  company?: string
}

type AuthState = {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (user: User, token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: (user, token) => {
        localStorage.setItem('erp_token', token)
        set({ user, token, isAuthenticated: true })
      },

      logout: () => {
        localStorage.removeItem('erp_token')
        localStorage.removeItem('erp_user')
        set({ user: null, token: null, isAuthenticated: false })
      },
    }),
    {
      name: 'erp_user',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
)
