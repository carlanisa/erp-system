'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useCustomerAuthStore } from '@/stores/customer-auth-store'

export default function CustomerRegisterPage() {
  const router = useRouter()
  const register = useCustomerAuthStore((s) => s.register)
  const loading = useCustomerAuthStore((s) => s.loading)
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await register(form)
      toast.success('Account created!')
      router.push('/account')
    } catch (err: any) {
      const msg = err?.response?.data?.errors
      toast.error(msg ? Object.values(msg)[0] as string : 'Could not register.')
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-semibold">Create account</h1>
      <form onSubmit={submit} className="mt-6 space-y-4">
        {(['name', 'email', 'phone', 'password'] as const).map((k) => (
          <div key={k}>
            <label className="text-xs font-medium capitalize text-neutral-700">{k}</label>
            <input
              type={k === 'password' ? 'password' : k === 'email' ? 'email' : 'text'}
              value={form[k]}
              onChange={(e) => setForm({ ...form, [k]: e.target.value })}
              required={k !== 'phone'}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none"
            />
          </div>
        ))}
        <button type="submit" disabled={loading}
          className="w-full rounded-full bg-rose-500 px-6 py-3 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-60">
          {loading ? 'Creating…' : 'Create account'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-neutral-600">
        Have an account? <Link href="/account/login" className="font-semibold text-rose-500 hover:underline">Sign in</Link>
      </p>
    </div>
  )
}
