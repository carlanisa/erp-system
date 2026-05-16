'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { Mail } from 'lucide-react'

export function Newsletter({ config }: { config: { title?: string; subtitle?: string; button_text?: string } }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.match(/^[^@]+@[^@]+\.[^@]+$/)) { toast.error('Please enter a valid email'); return }
    setLoading(true)
    // TODO: wire to /newsletter/subscribe endpoint
    setTimeout(() => {
      toast.success('Subscribed! Check your inbox for the discount code.')
      setEmail(''); setLoading(false)
    }, 600)
  }

  return (
    <section className="py-16" style={{ background: 'var(--brand-primary)', color: '#fff' }}>
      <div className="mx-auto max-w-2xl px-6 text-center">
        <Mail className="mx-auto mb-3 h-8 w-8 opacity-80" />
        <h2 className="text-3xl font-semibold" style={{ fontFamily: 'var(--brand-font-heading)' }}>{config.title ?? 'Join the family'}</h2>
        {config.subtitle && <p className="mt-2 text-sm opacity-90">{config.subtitle}</p>}
        <form onSubmit={submit} className="mt-6 flex flex-col gap-2 sm:flex-row">
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Your email address"
            className="flex-1 rounded-full bg-white/95 px-5 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-white" />
          <button type="submit" disabled={loading}
            className="rounded-full bg-white px-7 py-3 text-sm font-semibold uppercase tracking-wider disabled:opacity-60"
            style={{ color: 'var(--brand-primary)' }}>
            {loading ? 'Saving…' : (config.button_text ?? 'Subscribe')}
          </button>
        </form>
      </div>
    </section>
  )
}
