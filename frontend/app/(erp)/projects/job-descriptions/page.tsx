'use client'

import { useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { jdApi, designationsApi } from '@/lib/erp-api'
import EmployeePicker from '@/components/projects/EmployeePicker'
import { FileText, Sparkles, Plus, X } from 'lucide-react'

export default function JobDescriptionsPage() {
  const [jds, setJds] = useState<any[]>([])
  const [designations, setDesignations] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<any>({ title: '', description: '', designation_id: null, responsibilities: [], kpis: [] })
  const [generating, setGenerating] = useState<number | null>(null)
  const [aiTasks, setAiTasks] = useState<any[] | null>(null)
  const [aiJdId, setAiJdId] = useState<number | null>(null)
  const [assignEmployeeId, setAssignEmployeeId] = useState<number | null>(null)
  const [assignManagerId, setAssignManagerId] = useState<number | null>(null)

  const load = () => jdApi.list().then((r) => setJds(r.data || []))
  useEffect(() => {
    load()
    designationsApi.list().then((r) => setDesignations(r.data || []))
  }, [])

  const save = async () => {
    if (!form.title || !form.description) return
    await jdApi.create({
      ...form,
      responsibilities: form.responsibilities.filter((x: string) => x.trim()),
      kpis: form.kpis.filter((x: string) => x.trim()),
    })
    setShowModal(false)
    setForm({ title: '', description: '', designation_id: null, responsibilities: [], kpis: [] })
    load()
  }

  const generate = async (jd: any) => {
    setGenerating(jd.id)
    const r = await jdApi.generateTasks(jd.id)
    setAiTasks(r.data.tasks)
    setAiJdId(jd.id)
    setGenerating(null)
  }

  const assign = async () => {
    if (!aiJdId || !assignEmployeeId || !aiTasks) return
    await jdApi.assign(aiJdId, { employee_id: assignEmployeeId, manager_id: assignManagerId, tasks: aiTasks })
    setAiTasks(null); setAiJdId(null); setAssignEmployeeId(null); setAssignManagerId(null)
    alert('Tasks assigned successfully!')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Job Descriptions"
        description="JD templates + AI task generator + assign to employee"
        icon={FileText}
        action={
          <button onClick={() => setShowModal(true)} className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Job Description
          </button>
        }
      />

      <div className="card overflow-hidden p-0">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-3">Title</th>
              <th className="text-left px-4 py-3">Designation</th>
              <th className="text-left px-4 py-3">Responsibilities</th>
              <th className="text-left px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {jds.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No job descriptions yet.</td></tr>}
            {jds.map((j) => (
              <tr key={j.id} className="border-t">
                <td className="px-4 py-3 font-medium">{j.title}</td>
                <td className="px-4 py-3 text-slate-500">{j.designation?.title ?? '—'}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{(j.responsibilities ?? []).length} items</td>
                <td className="px-4 py-3">
                  <button onClick={() => generate(j)} disabled={generating === j.id}
                    className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded inline-flex items-center gap-1 disabled:opacity-40">
                    <Sparkles className="w-3 h-3" /> {generating === j.id ? 'Generating…' : 'Generate tasks with AI'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl p-6 space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-lg">New Job Description</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="JD title (e.g. Sales Executive — Boutique)"
              value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.designation_id ?? ''}
              onChange={(e) => setForm({ ...form, designation_id: e.target.value ? Number(e.target.value) : null })}>
              <option value="">Designation (optional)…</option>
              {designations.map((d: any) => <option key={d.id} value={d.id}>{d.title}</option>)}
            </select>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={4}
              placeholder="Role description / summary — what does this person do?"
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div>
              <p className="text-xs font-medium text-slate-600 mb-1">Responsibilities (one per line)</p>
              <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3}
                value={form.responsibilities.join('\n')}
                onChange={(e) => setForm({ ...form, responsibilities: e.target.value.split('\n') })} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-600 mb-1">KPIs (one per line)</p>
              <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3}
                value={form.kpis.join('\n')}
                onChange={(e) => setForm({ ...form, kpis: e.target.value.split('\n') })} />
            </div>
            <div className="flex justify-end gap-2">
              <button className="px-4 py-2 text-sm" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={save}>Create</button>
            </div>
          </div>
        </div>
      )}

      {aiTasks && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-lg">AI Generated Tasks — Review & Assign</h3>
              <button onClick={() => setAiTasks(null)}><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-slate-500">Edit titles/descriptions if needed, then pick an employee to assign.</p>
            <div className="space-y-2">
              {aiTasks.map((t, idx) => (
                <div key={idx} className="border rounded-lg p-3 space-y-1">
                  <input className="w-full font-medium text-sm border-b focus:outline-none pb-1"
                    value={t.title} onChange={(e) => { const c = [...aiTasks]; c[idx] = { ...c[idx], title: e.target.value }; setAiTasks(c) }} />
                  <textarea className="w-full text-xs text-slate-600 focus:outline-none" rows={2}
                    value={t.description} onChange={(e) => { const c = [...aiTasks]; c[idx] = { ...c[idx], description: e.target.value }; setAiTasks(c) }} />
                  <div className="flex gap-2 text-xs">
                    <select value={t.priority} onChange={(e) => { const c = [...aiTasks]; c[idx] = { ...c[idx], priority: e.target.value }; setAiTasks(c) }} className="border rounded px-2 py-1">
                      <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
                    </select>
                    <select value={t.recurrence} onChange={(e) => { const c = [...aiTasks]; c[idx] = { ...c[idx], recurrence: e.target.value }; setAiTasks(c) }} className="border rounded px-2 py-1">
                      <option value="none">One-time</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
                    </select>
                    <span className="text-slate-400">Day +{t.due_offset_days ?? 0}</span>
                    <button className="ml-auto text-rose-600" onClick={() => setAiTasks(aiTasks.filter((_, i) => i !== idx))}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2 border-t">
              <EmployeePicker value={assignEmployeeId} onChange={setAssignEmployeeId} placeholder="Assign to employee…" className="w-full" />
              <EmployeePicker value={assignManagerId} onChange={setAssignManagerId} placeholder="Manager (approver)…" className="w-full" />
            </div>
            <div className="flex justify-end gap-2">
              <button className="px-4 py-2 text-sm" onClick={() => setAiTasks(null)}>Cancel</button>
              <button className="btn-primary disabled:opacity-40" disabled={!assignEmployeeId} onClick={assign}>
                Assign {aiTasks.length} tasks
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
