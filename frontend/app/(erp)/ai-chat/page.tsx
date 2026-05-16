'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { aiChatApi } from '@/lib/erp-api'
import EmployeePicker from '@/components/projects/EmployeePicker'
import { MessageSquare, Send, Plus } from 'lucide-react'

function AiChatInner() {
  const sp = useSearchParams()
  const initialEmployee = sp.get('employee') ? Number(sp.get('employee')) : null
  const initialTask = sp.get('task') ? Number(sp.get('task')) : null

  const [employeeId, setEmployeeId] = useState<number | null>(initialEmployee)
  const [conversations, setConversations] = useState<any[]>([])
  const [active, setActive] = useState<any>(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const loadConvs = () => {
    if (!employeeId) return
    aiChatApi.listConversations(employeeId).then((r) => setConversations(r.data || []))
  }

  useEffect(() => { loadConvs() }, [employeeId])

  useEffect(() => {
    // auto-start when arriving from task link
    if (initialEmployee && initialTask && !active) {
      aiChatApi.startConversation(initialEmployee, initialTask).then((r) => {
        setActive(r.data); loadConvs()
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEmployee, initialTask])

  const openConv = (c: any) => aiChatApi.show(c.id).then((r) => setActive(r.data))

  const newConv = async () => {
    if (!employeeId) return
    const r = await aiChatApi.startConversation(employeeId)
    setActive(r.data); loadConvs()
  }

  const send = async () => {
    if (!active || !input.trim()) return
    setSending(true)
    const text = input
    setInput('')
    // optimistically push user msg
    setActive((a: any) => ({ ...a, messages: [...(a?.messages ?? []), { id: Date.now(), role: 'user', content: text }] }))
    try {
      await aiChatApi.send(active.id, text)
      const r = await aiChatApi.show(active.id)
      setActive(r.data)
    } finally { setSending(false) }
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [active?.messages?.length])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-6 h-6 text-indigo-600" />
          <h1 className="text-xl font-bold">AI Helper</h1>
        </div>
        <EmployeePicker value={employeeId} onChange={(id) => { setEmployeeId(id); setActive(null) }} placeholder="Pick employee…" />
      </div>

      {!employeeId && <p className="text-slate-400 text-sm">Please select an employee first.</p>}

      {employeeId && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[70vh]">
          <div className="card overflow-y-auto p-2">
            <button onClick={newConv} className="w-full mb-2 text-xs px-3 py-2 bg-indigo-50 text-indigo-700 rounded inline-flex items-center justify-center gap-1">
              <Plus className="w-3 h-3" /> New chat
            </button>
            {conversations.length === 0 && <p className="text-slate-400 text-xs p-2">No chats yet.</p>}
            {conversations.map((c) => (
              <button key={c.id} onClick={() => openConv(c)}
                className={`w-full text-left p-2 rounded text-sm hover:bg-slate-50 ${active?.id === c.id ? 'bg-indigo-50' : ''}`}>
                <p className="truncate font-medium">{c.title ?? 'New conversation'}</p>
                <p className="text-[10px] text-slate-400">{c.language ?? 'Language not set'}</p>
              </button>
            ))}
          </div>

          <div className="lg:col-span-3 card flex flex-col">
            {!active && <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Select a conversation or start a new one.</div>}
            {active && (
              <>
                <div className="border-b pb-2 mb-3">
                  <p className="text-xs text-slate-400">Conversation #{active.id} {active.task_id ? `· Task #${active.task_id}` : ''}</p>
                  <p className="font-medium text-sm">{active.title ?? '—'} {active.language ? `(${active.language})` : ''}</p>
                </div>
                <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-2">
                  {(active.messages || []).map((m: any) => (
                    <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm whitespace-pre-line ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                        {m.content}
                      </div>
                    </div>
                  ))}
                  {sending && <div className="text-slate-400 text-xs">AI is thinking…</div>}
                </div>
                <div className="flex gap-2 mt-3">
                  <input className="flex-1 border rounded-lg px-3 py-2 text-sm" placeholder="Type a message…"
                    value={input} onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !sending && send()} />
                  <button onClick={send} disabled={sending || !input.trim()} className="btn-primary disabled:opacity-40">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AiChatPage() {
  return (
    <Suspense fallback={<div className="text-slate-400">Loading…</div>}>
      <AiChatInner />
    </Suspense>
  )
}
