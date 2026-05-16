'use client'

import { useEffect, useRef, useState } from 'react'
import { MessageCircle, X, Send } from 'lucide-react'
import { storefrontApi, getCartToken, setCartToken } from '@/lib/storefront-api'
import { useRouter } from 'next/navigation'

type Msg = { role: 'assistant' | 'user'; text: string; quickReplies?: string[] }

export function StoreAiChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const router = useRouter()
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open && messages.length === 0) {
      storefrontApi.get('/ai/greeting').then(({ data }) => {
        setMessages([{ role: 'assistant', text: data.message, quickReplies: data.quick_replies }])
      }).catch(() => {
        setMessages([{
          role: 'assistant',
          text: "Hi! Welcome to our store. Can I help you find something today?",
          quickReplies: ['Baju Kurung', 'Hijab', 'New Arrivals'],
        }])
      })
    }
  }, [open, messages.length])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, sending])

  async function send(text: string) {
    if (!text.trim() || sending) return
    setSending(true)
    setMessages((m) => [...m, { role: 'user', text }])
    setInput('')
    try {
      const { data } = await storefrontApi.post('/ai/chat', {
        message: text,
        session_token: getCartToken() ?? undefined,
      })
      if (data.session_token) setCartToken(data.session_token)
      setMessages((m) => [
        ...m,
        { role: 'assistant', text: data.message, quickReplies: data.quick_replies },
      ])
      for (const action of (data.ui_actions ?? []) as any[]) {
        if (action.type === 'navigate' && action.url) router.push(action.url)
      }
    } catch {
      setMessages((m) => [
        ...m,
        { role: 'assistant', text: 'Sorry — something went wrong. Please try again.' },
      ])
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button
        aria-label="Open chat"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg transition hover:bg-rose-600"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex h-[520px] w-[360px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-neutral-200 bg-rose-500 px-4 py-3 text-white">
            <div>
              <div className="text-sm font-semibold">Shopping Assistant</div>
              <div className="text-xs opacity-80">We typically reply instantly</div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto bg-neutral-50 px-3 py-4">
            {messages.map((m, i) => (
              <div key={i} className={`mb-3 flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    m.role === 'user'
                      ? 'bg-rose-500 text-white'
                      : 'bg-white text-neutral-800 shadow-sm'
                  }`}
                >
                  {m.text}
                  {m.role === 'assistant' && m.quickReplies && m.quickReplies.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.quickReplies.map((q) => (
                        <button
                          key={q}
                          onClick={() => send(q)}
                          className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <div className="mb-3 flex justify-start">
                <div className="rounded-2xl bg-white px-3 py-2 text-sm text-neutral-500 shadow-sm">
                  Typing…
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); send(input) }}
            className="flex items-center gap-2 border-t border-neutral-200 bg-white px-3 py-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message…"
              className="flex-1 rounded-full border border-neutral-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-500 text-white disabled:opacity-50"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  )
}
