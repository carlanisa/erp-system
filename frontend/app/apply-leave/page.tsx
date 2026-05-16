'use client'

import { useEffect, useState } from 'react'
import {
  Calendar, Send, Loader2, CheckCircle2, AlertTriangle,
  User, Mail, Phone, MapPin, Users as UsersIcon, Building2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'

type LeaveType = {
  id: number
  code: string
  name: string
  days_per_year: number
  is_paid: boolean
  color: string
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
  employee_code:        '',
  email:                '',
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

export default function ApplyLeavePage() {
  const [form, setForm]             = useState({ ...empty })
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess]       = useState<any>(null)

  useEffect(() => {
    api.get('/public/leave-types').then(r => setLeaveTypes(r.data.data ?? [])).catch(() => {})
  }, [])

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  const days = (() => {
    const a = new Date(form.from_date)
    const b = new Date(form.to_date)
    if (isNaN(a.getTime()) || isNaN(b.getTime()) || b < a) return 0
    return Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1
  })()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.employee_code.trim())  return toast.error('Please enter your Employee Code')
    if (!form.email.trim())          return toast.error('Please enter your work email')
    if (!form.leave_type_id)         return toast.error('Please choose a leave type')
    if (!form.reason.trim() || form.reason.trim().length < 5)
      return toast.error('Reason is required (min 5 characters)')

    setSubmitting(true)
    try {
      const r = await api.post('/public/leave-apply', {
        ...form,
        employee_code: form.employee_code.trim().toUpperCase(),
        email:         form.email.trim().toLowerCase(),
        leave_type_id: +form.leave_type_id,
        reason:        form.reason.trim(),
      })
      setSuccess(r.data.data)
      setForm({ ...empty })
      toast.success('Submitted! HR has been notified by email.')
    } catch (e: any) {
      const errs = e?.response?.data?.errors
      toast.error(errs ? Object.values(errs).flat().join(', ') : e?.response?.data?.message ?? 'Submission failed')
    } finally { setSubmitting(false) }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-9 h-9 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Request Submitted</h1>
          <p className="text-sm text-slate-500 mb-6">
            Thank you, <b>{success.employee?.name}</b>. Your leave request has been recorded
            and HR has been notified by email. You will receive an approval / rejection email shortly.
          </p>

          <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 text-left text-sm space-y-1.5 mb-6">
            <p><span className="text-slate-500">Employee:</span> <b>{success.employee?.code}</b></p>
            <p><span className="text-slate-500">Period:</span> <b>{success.from_date} → {success.to_date}</b> ({success.days} day{success.days !== 1 ? 's' : ''})</p>
            <p><span className="text-slate-500">Status:</span> <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">PENDING</span></p>
            <p><span className="text-slate-500">Submitted:</span> {success.submitted}</p>
          </div>

          <button onClick={() => setSuccess(null)}
            className="px-5 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700">
            Submit Another Request
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 bg-emerald-100 rounded-2xl items-center justify-center mb-3">
            <Calendar className="w-7 h-7 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800">Apply for Leave</h1>
          <p className="text-sm text-slate-500 mt-1">
            Carlanisa Sdn Bhd · Staff self-service portal
          </p>
        </div>

        <form onSubmit={submit} className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">

          {/* Identity verification */}
          <section className="bg-slate-50/60 border-b border-slate-100 px-6 py-5">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-700">Verify Your Identity</h2>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Enter your <b>Employee Code</b> and the <b>email on file</b>. We use these to confirm it's really you.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Employee Code *</label>
                <div className="relative">
                  <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                  <input required value={form.employee_code}
                    onChange={e => set('employee_code', e.target.value.toUpperCase())}
                    placeholder="EMP001"
                    className="w-full pl-8 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg font-mono uppercase focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Work Email *</label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                  <input required type="email" value={form.email}
                    onChange={e => set('email', e.target.value)}
                    placeholder="you@company.com"
                    className="w-full pl-8 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                </div>
              </div>
            </div>
          </section>

          <div className="px-6 py-5 space-y-5">

            {/* Leave Type */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Leave Type *</label>
              <select required value={form.leave_type_id} onChange={e => set('leave_type_id', e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300">
                <option value="">— Pick a leave type —</option>
                {leaveTypes.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {t.days_per_year} days/year ({t.is_paid ? 'paid' : 'unpaid'})
                  </option>
                ))}
              </select>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">From *</label>
                <input required type="date" value={form.from_date}
                  onChange={e => set('from_date', e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-300" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">To *</label>
                <input required type="date" value={form.to_date} min={form.from_date}
                  onChange={e => set('to_date', e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-300" />
              </div>
            </div>

            <div className="px-3 py-2.5 bg-emerald-50 rounded-lg text-sm text-emerald-700 font-medium flex items-center justify-between">
              <span>Total Duration</span>
              <span className="font-bold">{days} day{days !== 1 ? 's' : ''}</span>
            </div>

            {/* Category */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Reason Category</label>
              <select value={form.reason_category} onChange={e => set('reason_category', e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300">
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
                placeholder="Briefly explain why you need this leave so HR can review and approve quickly."
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none" />
              <p className="text-[10px] text-slate-400 mt-1">{form.reason.length} characters</p>
            </div>

            {/* Contact during leave */}
            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/40 space-y-3">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> Contact During Leave
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input value={form.contact_during_leave} onChange={e => set('contact_during_leave', e.target.value)}
                  placeholder="Phone (optional) — e.g. 012-345-6789"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg" />
                <input value={form.address_during_leave} onChange={e => set('address_during_leave', e.target.value)}
                  placeholder="Where you'll be (optional)"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg" />
              </div>
            </div>

            {/* Handover */}
            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/40 space-y-3">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                <UsersIcon className="w-3.5 h-3.5" /> Work Handover
              </p>
              <input value={form.handover_person} onChange={e => set('handover_person', e.target.value)}
                placeholder="Person covering your work (e.g. Sara Ahmed)"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg" />
              <textarea rows={2} value={form.handover_notes} onChange={e => set('handover_notes', e.target.value)}
                placeholder="Pending tasks, urgent contacts, file locations… (optional)"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg resize-none" />
            </div>

            {/* Emergency */}
            <label className="flex items-center gap-2 px-3 py-2.5 border border-amber-200 rounded-lg bg-amber-50/40 cursor-pointer">
              <input type="checkbox" checked={form.is_emergency} onChange={e => set('is_emergency', e.target.checked)} />
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-amber-800">Mark as Emergency</p>
                <p className="text-[10px] text-amber-700">HR will be flagged to review urgently.</p>
              </div>
            </label>
          </div>

          {/* Footer */}
          <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex items-center justify-between">
            <p className="text-[11px] text-slate-500">
              By submitting, HR &amp; your manager will be notified by email instantly.
            </p>
            <button type="submit" disabled={submitting}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-60 shadow-sm">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Submit Request
            </button>
          </div>
        </form>

        {/* Footer note */}
        <p className="text-center text-xs text-slate-400 mt-6">
          Need help? Contact HR at <a href="mailto:hr@carlanisa.com" className="text-emerald-600 underline">hr@carlanisa.com</a>
        </p>
      </div>
    </div>
  )
}
