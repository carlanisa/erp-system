'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Building2, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import { api } from '@/lib/api'
import { twoFactorApi } from '@/lib/settings-api'

export default function LoginPage() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [form, setForm] = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const [challenge, setChallenge] = useState<string | null>(null)
  const [code, setCode] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await api.post('/auth/login', form)
      const data = res.data.data
      if (data?.requires_2fa) {
        setChallenge(data.challenge_token)
        toast.success('Enter your 6-digit authenticator code')
      } else {
        setAuth(data.user, data.token)
        toast.success('Login successful!')
        router.push('/dashboard')
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.errors?.email?.[0] ??
        err?.response?.data?.message ??
        err?.message ??
        'Login failed. Check email/password.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!challenge || code.length !== 6) return
    setLoading(true)
    try {
      const data = await twoFactorApi.verifyChallenge(challenge, code)
      setAuth(data.user, data.token)
      toast.success('Login successful!')
      router.push('/dashboard')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Invalid code')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-xl leading-none">ERP System</h1>
            <p className="text-indigo-300 text-xs mt-0.5">Cloud Business Management</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {!challenge ? (
            <>
              <h2 className="text-2xl font-bold text-slate-800 mb-1">Welcome back</h2>
              <p className="text-slate-500 text-sm mb-6">Sign in to your account to continue</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="you@company.com"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                    <input type="checkbox" className="rounded border-slate-300 text-indigo-600" />
                    Remember me
                  </label>
                  <a href="#" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">Forgot password?</a>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 mt-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <h2 className="text-2xl font-bold text-slate-800">Two-Factor Code</h2>
              </div>
              <p className="text-slate-500 text-sm mb-6">Open your authenticator app and enter the 6-digit code.</p>

              <form onSubmit={handleVerify} className="space-y-4">
                <input
                  autoFocus
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  inputMode="numeric"
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg text-center text-2xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Verify & Sign in
                </button>
                <button
                  type="button"
                  onClick={() => { setChallenge(null); setCode('') }}
                  className="w-full text-sm text-slate-500 hover:text-slate-700"
                >
                  ← Use a different account
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-slate-400 text-xs mt-6">
          © {new Date().getFullYear()} ERP System. All rights reserved.
        </p>
      </div>
    </div>
  )
}
