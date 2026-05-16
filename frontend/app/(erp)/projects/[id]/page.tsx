'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { projectsApi, tasksApi, type Project, type Task, type TaskStatus } from '@/lib/erp-api'
import EmployeePicker from '@/components/projects/EmployeePicker'
import { Plus, X, MessageSquare } from 'lucide-react'

const COLS: { label: string; status: TaskStatus; color: string }[] = [
  { label: 'Pending',     status: 'pending',     color: 'bg-slate-100' },
  { label: 'In Progress', status: 'in_progress', color: 'bg-blue-50' },
  { label: 'Review',      status: 'review',      color: 'bg-amber-50' },
  { label: 'Completed',   status: 'completed',   color: 'bg-emerald-50' },
]

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState<any>({ title: '', description: '', priority: 'medium', assigned_to: null, due_date: '' })

  const load = () => {
    projectsApi.get(Number(id)).then((r) => setProject(r.data))
    tasksApi.list({ project_id: id, per_page: 100 }).then((r) => setTasks(r.data || []))
  }
  useEffect(() => { load() }, [id])

  const createTask = async () => {
    if (!form.title) return
    await tasksApi.create({ ...form, project_id: Number(id) })
    setShowAdd(false)
    setForm({ title: '', description: '', priority: 'medium', assigned_to: null, due_date: '' })
    load()
  }

  const moveTask = async (task: Task, status: TaskStatus) => {
    await tasksApi.update(task.id, { status })
    load()
  }

  if (!project) return <div className="text-slate-400">Loading…</div>

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-mono text-slate-400">{project.code}</p>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="text-slate-500 text-sm mt-1">{project.description}</p>
          <p className="text-xs text-slate-500 mt-2">Owner: {project.owner?.name ?? '—'} · Priority: {project.priority} · Status: {project.status}</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Task
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {COLS.map((c) => (
          <div key={c.status} className={`rounded-xl p-3 ${c.color} min-h-[300px]`}>
            <p className="font-semibold text-sm mb-3 text-slate-700">{c.label} ({tasks.filter(t => t.status === c.status).length})</p>
            <div className="space-y-2">
              {tasks.filter(t => t.status === c.status).map(t => (
                <div key={t.id} className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="flex justify-between items-start">
                    <Link href={`/tasks/${t.id}`} className="text-sm font-medium hover:text-indigo-600 flex-1">{t.title}</Link>
                    <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded ml-2 ${t.priority === 'high' ? 'bg-rose-100 text-rose-700' : t.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{t.priority}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{t.assignee?.name ?? 'Unassigned'} {t.due_date ? '· ' + t.due_date : ''}</p>
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {COLS.filter(o => o.status !== t.status).map(o => (
                      <button key={o.status} onClick={() => moveTask(t, o.status)}
                        className="text-[10px] text-slate-500 border rounded px-1.5 py-0.5 hover:bg-slate-100">→ {o.label}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-lg">Add Task</h3>
              <button onClick={() => setShowAdd(false)}><X className="w-5 h-5" /></button>
            </div>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Task title"
              value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Description" rows={3}
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <EmployeePicker value={form.assigned_to} onChange={(id) => setForm({ ...form, assigned_to: id })} placeholder="Assign to…" className="w-full" />
            <div className="grid grid-cols-2 gap-3">
              <input type="date" className="border rounded-lg px-3 py-2 text-sm" value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              <select className="border rounded-lg px-3 py-2 text-sm" value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button className="px-4 py-2 text-sm" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn-primary" onClick={createTask}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
