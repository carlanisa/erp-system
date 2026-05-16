'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import PageHeader from '@/components/ui/PageHeader'
import { tasksApi, type Task } from '@/lib/erp-api'
import { Briefcase } from 'lucide-react'

function AllTasksInner() {
  const sp = useSearchParams()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState(sp.get('status') ?? '')
  const [priority, setPriority] = useState(sp.get('priority') ?? '')
  const [due, setDue] = useState(sp.get('due') ?? '')

  const load = () => {
    setLoading(true)
    const params: any = {}
    if (status) params.status = status
    if (priority) params.priority = priority
    if (due) params.due = due
    tasksApi.list(params).then((r) => setTasks(r.data || [])).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [status, priority, due])

  return (
    <div className="space-y-6">
      <PageHeader
        title="All Tasks"
        description="Global task list across all projects with filters"
        icon={Briefcase}
        action={
          <div className="flex gap-2">
            <select className="border rounded-lg px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Status (any)</option>
              <option value="pending">Pending</option><option value="in_progress">In Progress</option>
              <option value="review">Review</option><option value="completed">Completed</option>
            </select>
            <select className="border rounded-lg px-3 py-2 text-sm" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="">Priority (any)</option>
              <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
            </select>
            <select className="border rounded-lg px-3 py-2 text-sm" value={due} onChange={(e) => setDue(e.target.value)}>
              <option value="">Due (any)</option>
              <option value="today">Due today</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        }
      />

      <div className="card overflow-hidden p-0">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-3">Title</th>
              <th className="text-left px-4 py-3">Assignee</th>
              <th className="text-left px-4 py-3">Project</th>
              <th className="text-left px-4 py-3">Priority</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Due</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>}
            {!loading && tasks.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No tasks.</td></tr>}
            {tasks.map((t) => (
              <tr key={t.id} className="border-t hover:bg-slate-50">
                <td className="px-4 py-3"><Link href={`/tasks/${t.id}`} className="text-indigo-600 hover:underline">{t.title}</Link></td>
                <td className="px-4 py-3">{t.assignee?.name ?? '—'}</td>
                <td className="px-4 py-3 text-slate-500">{t.project?.name ?? '—'}</td>
                <td className="px-4 py-3 capitalize">{t.priority}</td>
                <td className="px-4 py-3 capitalize">{t.status.replace('_', ' ')}</td>
                <td className="px-4 py-3 text-slate-500">{t.due_date ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function AllTasksPage() {
  return (
    <Suspense fallback={<div className="text-slate-400">Loading…</div>}>
      <AllTasksInner />
    </Suspense>
  )
}
