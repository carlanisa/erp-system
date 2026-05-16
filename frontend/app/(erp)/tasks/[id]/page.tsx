'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { tasksApi } from '@/lib/erp-api'
import { CheckSquare, Square, Upload, Send, MessageSquare, ArrowRight } from 'lucide-react'

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [task, setTask] = useState<any>(null)
  const [newChecklist, setNewChecklist] = useState('')
  const [comment, setComment] = useState('')
  const [file, setFile] = useState<File | null>(null)

  const load = () => tasksApi.get(Number(id)).then((r) => setTask(r.data))
  useEffect(() => { load() }, [id])

  if (!task) return <div className="text-slate-400">Loading…</div>

  const toggleItem = async (itemId: number) => { await tasksApi.toggleChecklist(task.id, itemId); load() }
  const addItem = async () => { if (!newChecklist.trim()) return; await tasksApi.addChecklist(task.id, newChecklist); setNewChecklist(''); load() }
  const moveTo = async (status: string) => { await tasksApi.update(task.id, { status }); load() }
  const completeTask = async () => { await tasksApi.complete(task.id); load() }
  const approve = async () => { await tasksApi.approve(task.id); load() }
  const reject = async () => { const r = prompt('Reject reason?') ?? ''; await tasksApi.reject(task.id, r); load() }
  const sendComment = async () => { if (!comment.trim()) return; await tasksApi.comment(task.id, comment, task.assigned_to ?? undefined); setComment(''); load() }
  const upload = async () => { if (!file) return; await tasksApi.uploadAttachment(task.id, file, undefined, task.assigned_to ?? undefined); setFile(null); load() }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="card">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-slate-400">{task.project?.name ?? 'No project'}</p>
              <h1 className="text-xl font-bold">{task.title}</h1>
              <p className="text-slate-600 mt-2 whitespace-pre-line">{task.description}</p>
            </div>
            <span className={`px-2 py-1 text-xs rounded ${task.priority === 'high' ? 'bg-rose-100 text-rose-700' : task.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100'}`}>{task.priority}</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {task.status !== 'in_progress' && task.status !== 'completed' && (
              <button onClick={() => moveTo('in_progress')} className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded">Start working</button>
            )}
            {(task.status === 'pending' || task.status === 'in_progress') && (
              <button onClick={completeTask} className="text-xs px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded">Mark complete + request approval</button>
            )}
            {task.status === 'review' && (
              <>
                <button onClick={approve} className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded">Approve</button>
                <button onClick={reject} className="text-xs px-3 py-1.5 bg-rose-50 text-rose-700 rounded">Reject</button>
              </>
            )}
            <Link href={`/ai-chat?employee=${task.assigned_to}&task=${task.id}`}
              className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded inline-flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> Ask AI
            </Link>
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold mb-3">Checklist</h3>
          <div className="space-y-1">
            {(task.checklist || []).map((c: any) => (
              <button key={c.id} onClick={() => toggleItem(c.id)} className="flex items-center gap-2 w-full text-left text-sm hover:bg-slate-50 px-2 py-1 rounded">
                {c.is_done ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                <span className={c.is_done ? 'line-through text-slate-400' : ''}>{c.label}</span>
              </button>
            ))}
            <div className="flex gap-2 mt-2">
              <input className="flex-1 border rounded-lg px-3 py-1.5 text-sm" placeholder="New checklist item…"
                value={newChecklist} onChange={(e) => setNewChecklist(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addItem()} />
              <button onClick={addItem} className="text-xs px-3 py-1.5 bg-slate-100 rounded">Add</button>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold mb-3">Comments</h3>
          <div className="space-y-2 mb-3">
            {(task.comments || []).map((c: any) => (
              <div key={c.id} className="border-l-2 border-indigo-200 pl-3 py-1 text-sm">
                <p className="text-xs text-slate-400">{c.employee?.name ?? 'Staff'} · {new Date(c.created_at).toLocaleString()}</p>
                <p>{c.body}</p>
              </div>
            ))}
            {(!task.comments || task.comments.length === 0) && <p className="text-slate-400 text-sm">No comments yet.</p>}
          </div>
          <div className="flex gap-2">
            <input className="flex-1 border rounded-lg px-3 py-2 text-sm" placeholder="Write a comment…"
              value={comment} onChange={(e) => setComment(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendComment()} />
            <button onClick={sendComment} className="btn-primary"><Send className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="card">
          <h3 className="font-semibold mb-3">Details</h3>
          <dl className="text-sm space-y-2">
            <div><dt className="text-slate-400 text-xs">Status</dt><dd className="capitalize">{task.status?.replace('_', ' ')}</dd></div>
            <div><dt className="text-slate-400 text-xs">Assignee</dt><dd>{task.assignee?.name ?? '—'}</dd></div>
            <div><dt className="text-slate-400 text-xs">Assigner</dt><dd>{task.assigner?.name ?? '—'}</dd></div>
            <div><dt className="text-slate-400 text-xs">Due date</dt><dd>{task.due_date ?? '—'}</dd></div>
            <div><dt className="text-slate-400 text-xs">Recurrence</dt><dd className="capitalize">{task.recurrence}</dd></div>
            <div><dt className="text-slate-400 text-xs">Source</dt><dd className="capitalize">{task.source?.replace('_', ' ')}</dd></div>
          </dl>
        </div>

        <div className="card">
          <h3 className="font-semibold mb-3">Attachments (proof)</h3>
          <div className="space-y-2">
            {(task.attachments || []).map((a: any) => (
              <a key={a.id} href={a.file_url} target="_blank" className="block text-sm text-indigo-600 hover:underline truncate">
                📎 {a.caption ?? a.file_path.split('/').pop()}
              </a>
            ))}
            {(!task.attachments || task.attachments.length === 0) && <p className="text-slate-400 text-xs">No files yet.</p>}
          </div>
          <div className="mt-3 flex gap-2">
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-xs flex-1" />
            <button onClick={upload} disabled={!file} className="text-xs px-3 py-1.5 bg-slate-100 rounded disabled:opacity-40 inline-flex items-center gap-1">
              <Upload className="w-3 h-3" /> Upload
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
