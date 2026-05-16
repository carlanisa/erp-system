import axios from 'axios'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001'

export const storefrontApi = axios.create({
  baseURL: `${BASE_URL}/api/storefront`,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
})

const CART_TOKEN_KEY = 'sf_cart_token'
const AUTH_TOKEN_KEY = 'sf_auth_token'

export function getCartToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(CART_TOKEN_KEY)
}

export function setCartToken(token: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(CART_TOKEN_KEY, token)
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

export function setAuthToken(token: string | null) {
  if (typeof window === 'undefined') return
  if (token) localStorage.setItem(AUTH_TOKEN_KEY, token)
  else localStorage.removeItem(AUTH_TOKEN_KEY)
}

storefrontApi.interceptors.request.use((config) => {
  const cartToken = getCartToken()
  if (cartToken) config.headers['X-Cart-Token'] = cartToken
  const authToken = getAuthToken()
  if (authToken) config.headers.Authorization = `Bearer ${authToken}`
  return config
})

storefrontApi.interceptors.response.use(
  (res) => {
    // Capture cart token from cart responses
    const data: any = res.data
    if (data?.session_token && !getCartToken()) {
      setCartToken(data.session_token)
    }
    return res
  },
  (err) => Promise.reject(err),
)

export const formatMYR = (n: number) =>
  `RM${(n ?? 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
