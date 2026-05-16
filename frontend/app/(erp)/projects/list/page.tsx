'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import PageHeader from '@/components/ui/PageHeader'
import { FolderKanban, Plus, X } from 'lucide-react'
import { projectsApi, type Project } from '@/lib/erp-api'
import EmployeePicker from '@/components/projects/EmployeePicker'

export default function AllProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<any>({ name: '', description: '', priority: 'medium', status: 'active', owner_employee_id: null })

  const load = () => {
    setLoading(true)
    projectsApi.list().then((r) => setProjects(r.data || [])).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const submit = async () => {
    if (!form.name) return
    await projectsApi.create(form)
    setShowModal(false)
    setForm({ name: '', description: '', priority: 'medium', status: 'active', owner_employee_id: null })
    load()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="All Projects"
        description="Project list with owners, priority, and task progress"
        icon={FolderKanban}
        action={
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Project
          </button>
        }
      />

      <div className="card overflow-hidden p-0">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-3">Code</th>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Owner</th>
              <th className="text-left px-4 py-3">Priority</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Tasks</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>}
            {!loading && projects.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No projects yet. Create your first project.</td></tr>
            )}
            {projects.map((p) => (
              <tr key={p.id} className="border-t hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs">{p.code}</td>
                <td className="px-4 py-3"><Link href={`/projects/${p.id}`} className="text-indigo-600 hover:underline">{p.name}</Link></td>
                <td className="px-4 py-3">{p.owner?.name ?? '—'}</td>
                <td className="px-4 py-3 capitalize">{p.priority}</td>
                <td className="px-4 py-3 capitalize">{p.status}</td>
                <td className="px-4 py-3">{(p.completed_tasks_count ?? 0)} / {(p.tasks_count ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-lg">New Project</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Project name"
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Description" rows={3}
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <EmployeePicker value={form.owner_employee_id} onChange={(id) => setForm({ ...form, owner_employee_id: id })} placeholder="Project owner…" className="w-full" />
            <div className="grid grid-cols-2 gap-3">
              <select className="border rounded-lg px-3 py-2 text-sm" value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
              </select>
              <select className="border rounded-lg px-3 py-2 text-sm" value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button className="px-4 py-2 text-sm" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={submit}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
