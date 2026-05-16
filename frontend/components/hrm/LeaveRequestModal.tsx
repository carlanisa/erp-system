'use client'

import { useEffect, useState } from 'react'
import { X, Loader2, AlertTriangle, Send, User, Calendar, Phone, MapPin, Users as UsersIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import type { Employee } from '@/types/index'

type LeaveType = {
  id: number
  code: string
  name: string
  days_per_year: number
  is_paid: boolean
  color: string
}

type Props = {
  open: boolean
  onClose: () => void
  onSaved: () => void
  /** Pre-select employee (used on employee detail page) */
  employeeId?: number
}

const REASON_CATEGORIES = [
  'Vacation / Personal',
  'Family Emergency',
  'Medical Appointment',
  'Sick / Unwell',
  'Wedding / Family Event',
  'Bereavement',
  'Religious / Festival',
  'Maternity / Paternity',
  'Hajj / Umrah',
  'Other',
]

const today = () => new Date().toISOString().slice(0, 10)

const empty = {
  employee_id:          '' as string | number,
  leave_type_id:        '' as string | number,
  from_date:            today(),
  to_date:              today(),
  reason_category:      '',
  reason:               '',
  contact_during_leave: '',
  address_during_leave: '',
  handover_person:      '',
  handover_notes:       '',
  is_emergency:         false,
}

export default function LeaveRequestModal({ open, onClose, onSaved, employeeId }: Props) {
  const [form, setForm]               = useState({ ...empty })
  const [employees, setEmployees]     = useState<Employee[]>([])
  const [leaveTypes, setLeaveTypes]   = useState<LeaveType[]>([])
  const [saving, setSaving]           = useState(false)

  useEffect(() => {
    if (!open) return
    setForm({ ...empty, employee_id: employeeId ?? '' })

    Promise.all([
      employeeId ? null : api.get('/hrm/employees', { params: { per_page: 200, status: 'active' } }).catch(() => null),
      api.get('/hrm/leave-types').catch(() => null),
    ]).then(([emp, lt]) => {
      if (emp) setEmployees(emp.data?.data ?? [])
      setLeaveTypes((lt?.data?.data ?? []).filter((l: LeaveType & { is_active?: boolean }) => l.is_active !== false))
    })
  }, [open, employeeId])

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  const days = (() => {
    const a = new Date(form.from_date)
    const b = new Date(form.to_date)
    if (isNaN(a.getTime()) || isNaN(b.getTime()) || b < a) return 0
    return Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1
  })()

  const selectedType = leaveTypes.find(l => l.id === +form.leave_type_id)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.employee_id)         return toast.error('Please select an employee')
    if (!form.leave_type_id)       return toast.error('Please select a leave type')
    if (!form.reason.trim())       return toast.error('Please provide a reason')
    if (form.reason.trim().length < 5) return toast.error('Reason must be at least 5 characters')

    setSaving(true)
    try {
      await api.post('/hrm/leaves', {
        employee_id:          +form.employee_id,
        leave_type_id:        +form.leave_type_id,
        from_date:            form.from_date,
        to_date:              form.to_date,
        reason_category:      form.reason_category || null,
        reason:               form.reason.trim(),
        contact_during_leave: form.contact_during_leave || null,
        address_during_leave: form.address_during_leave || null,
        handover_person:      form.handover_person || null,
        handover_notes:       form.handover_notes || null,
        is_emergency:         form.is_emergency,
        source:               'admin',
      })
      toast.success('Leave request submitted — emails sent to HR and employee')
      onSaved()
      onClose()
    } catch (e: any) {
      const errs = e?.response?.data?.errors
      toast.error(errs ? Object.values(errs).flat().join(', ') : e?.response?.data?.message ?? 'Failed')
    } finally { setSaving(false) }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">New Leave Request</h3>
              <p className="text-xs text-slate-400">HR &amp; employee will be notified by email on submit</p>
            </div>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        <form onSubmit={submit} className="px-6 py-5 space-y-5">

          {/* Employee + Leave Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {!employeeId && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Employee *</label>
                <div className="relative">
                  <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                  <select required value={form.employee_id} onChange={e => set('employee_id', e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300">
                    <option value="">— Pick employee —</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} — {emp.employee_code}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            <div className={employeeId ? 'md:col-span-2' : ''}>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Leave Type *</label>
              <select required value={form.leave_type_id} onChange={e => set('leave_type_id', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300">
                <option value="">— Pick type —</option>
                {leaveTypes.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.days_per_year} days/yr {t.is_paid ? '· paid' : '· unpaid'})
                  </option>
                ))}
              </select>
              {selectedType && !selectedType.is_paid && (
                <p className="text-[11px] text-amber-600 mt-1">⚠ This leave type is unpaid</p>
              )}
            </div>
          </div>

          {/* Dates + days */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">From *</label>
              <input required type="date" value={form.from_date}
                onChange={e => set('from_date', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-300" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">To *</label>
              <input required type="date" value={form.to_date} min={form.from_date}
                onChange={e => set('to_date', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-300" />
            </div>
          </div>

          <div className="px-3 py-2 bg-emerald-50 rounded-lg text-xs text-emerald-700 font-medium flex items-center justify-between">
            <span>Total Duration</span>
            <span className="font-bold">{days} day{days !== 1 ? 's' : ''}</span>
          </div>

          {/* Reason category */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Reason Category</label>
            <select value={form.reason_category} onChange={e => set('reason_category', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300">
              <option value="">— Pick a category —</option>
              {REASON_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Detailed reason */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
              Detailed Reason * <span className="text-slate-400 font-normal normal-case tracking-normal">(min 5 chars — be specific so HR can approve quickly)</span>
            </label>
            <textarea required rows={4} value={form.reason} onChange={e => set('reason', e.target.value)}
              placeholder="e.g. My father has a scheduled medical procedure on 10 June at GHKL Hospital, and I need to be there to assist with admission and post-op care. He has no other family in KL."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none" />
            <p className="text-[10px] text-slate-400 mt-1">{form.reason.length} characters</p>
          </div>

          {/* Contact during leave */}
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/30 space-y-3">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> Contact During Leave
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Phone</label>
                <input value={form.contact_during_leave} onChange={e => set('contact_during_leave', e.target.value)}
                  placeholder="012-345-6789"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg" />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Address (where reachable)</label>
                <input value={form.address_during_leave} onChange={e => set('address_during_leave', e.target.value)}
                  placeholder="Kuala Lumpur — at parents' home"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg" />
              </div>
            </div>
          </div>

          {/* Handover */}
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/30 space-y-3">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
              <UsersIcon className="w-3.5 h-3.5" /> Work Handover
            </p>
            <div>
              <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Person Covering My Work</label>
              <input value={form.handover_person} onChange={e => set('handover_person', e.target.value)}
                placeholder="e.g. Sara Ahmed (HR Manager)"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg" />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Handover Notes</label>
              <textarea rows={2} value={form.handover_notes} onChange={e => set('handover_notes', e.target.value)}
                placeholder="Pending tasks, urgent contacts, where the project files are…"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg resize-none" />
            </div>
          </div>

          {/* Emergency */}
          <label className="flex items-center gap-2 px-3 py-2.5 border border-amber-200 rounded-lg bg-amber-50/40 cursor-pointer">
            <input type="checkbox" checked={form.is_emergency} onChange={e => set('is_emergency', e.target.checked)} />
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-amber-800">Mark as Emergency</p>
              <p className="text-[10px] text-amber-700">HR will be flagged to review this request urgently.</p>
            </div>
          </label>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Submit &amp; Send Email
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
