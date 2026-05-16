'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useCustomerAuthStore } from '@/stores/customer-auth-store'

export default function CustomerLoginPage() {
  const router = useRouter()
  const login = useCustomerAuthStore((s) => s.login)
  const loading = useCustomerAuthStore((s) => s.loading)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await login(email, password)
      toast.success('Welcome back!')
      router.push('/account')
    } catch (err: any) {
      toast.error(err?.response?.data?.errors?.email?.[0] || 'Invalid credentials.')
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-semibold">Sign in</h1>
      <p className="mt-1 text-sm text-neutral-600">Welcome back. Sign in to your account.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label className="text-xs font-medium text-neutral-700">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none" />
        </div>
        <div>
          <label className="text-xs font-medium text-neutral-700">Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none" />
        </div>
        <button type="submit" disabled={loading}
          className="w-full rounded-full bg-rose-500 px-6 py-3 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-60">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-neutral-600">
        New here? <Link href="/account/register" className="font-semibold text-rose-500 hover:underline">Create an account</Link>
      </p>
    </div>
  )
}
