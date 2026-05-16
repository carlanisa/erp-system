'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

type Conv = {
  id: number
  session_token: string
  last_intent: string | null
  message_count: number
  last_message_at: string | null
  customer?: { name: string; email: string | null } | null
  transcript_json: { role: string; content: string; at?: string }[] | null
}

export default function AiTranscriptsPage() {
  const [convs, setConvs] = useState<Conv[]>([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState<Conv | null>(null)

  useEffect(() => {
    api.get('/admin/storefront/ai-transcripts')
      .then(({ data }) => setConvs(data?.data ?? []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <Link href="/storefront" className="inline-flex items-center gap-1 mb-3 text-sm text-slate-500 hover:text-indigo-600">
        <ArrowLeft className="h-3.5 w-3.5" /> Storefront
      </Link>
      <h1 className="text-2xl font-semibold text-slate-800 mb-4">AI Chat Transcripts</h1>
      <div className="grid gap-4 md:grid-cols-[360px,1fr]">
        <div className="rounded-lg border border-slate-200 bg-white">
          {loading ? <div className="p-4 text-slate-400">Loading…</div> : convs.length === 0 ? (
            <div className="p-4 text-slate-400">No conversations yet.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {convs.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => setActive(c)}
                    className={`w-full px-4 py-3 text-left text-sm hover:bg-slate-50 ${active?.id === c.id ? 'bg-slate-50' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{c.customer?.name ?? 'Guest'}</span>
                      <span className="text-xs text-slate-400">{c.message_count} msgs</span>
                    </div>
                    <div className="text-xs text-slate-500">{c.last_intent ?? '—'}</div>
                    <div className="text-xs text-slate-400">{c.last_message_at ?? ''}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 min-h-[400px]">
          {active ? (
            <div>
              <div className="mb-3 text-sm text-slate-500">Session {active.session_token.slice(0, 12)}…</div>
              <div className="space-y-3">
                {(active.transcript_json ?? []).map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.role === 'user' ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-800'}`}>
                      {m.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400">Select a conversation to view it.</div>
          )}
        </div>
      </div>
    </div>
  )
}
