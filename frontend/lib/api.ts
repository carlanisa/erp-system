import axios from 'axios'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001'

export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
  withCredentials: false,
})

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('erp_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('erp_token')
      localStorage.removeItem('erp_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)
