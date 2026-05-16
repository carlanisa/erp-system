'use client'

import { useEffect, useState } from 'react'
import { CalendarDays, CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight, Loader2, Plus } from 'lucide-react'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'
import LeaveRequestModal from '@/components/hrm/LeaveRequestModal'
import BackToHrm from '@/components/hrm/BackToHrm'

type Leave = {
  id: number
  employee: { id: number; name: string; employee_code: string; department: string; email?: string }
  leave_type?: { id: number; code: string; name: string; color: string } | null
  from_date: string
  to_date: string
  type: string
  reason_category: string | null
  reason: string
  contact_during_leave: string | null
  address_during_leave: string | null
  handover_person: string | null
  handover_notes: string | null
  is_emergency: boolean
  source: 'admin' | 'employee' | 'public'
  email_sent_at: string | null
  employee_replied_at: string | null
  response_notes: string | null
  status: 'pending' | 'approved' | 'rejected'
  admin_notes: string | null
  days: number
}

const STATUS_TABS = ['all', 'pending', 'approved', 'rejected'] as const
type StatusTab = typeof STATUS_TABS[number]

const TYPE_COLORS: Record<string, string> = {
  annual:  'badge-blue',
  sick:    'badge-yellow',
  casual:  'badge-green',
  unpaid:  'badge-red',
}

export default function LeavePage() {
  const [tab, setTab]         = useState<StatusTab>('all')
  const [leaves, setLeaves]   = useState<Leave[]>([])
  const [page, setPage]       = useState(1)
  const [meta, setMeta]       = useState({ last_page: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<number | null>(null)
  const [detailLeave, setDetailLeave] = useState<Leave | null>(null)
  const [rejectModal, setRejectModal] = useState<Leave | null>(null)
  const [adminNotes, setAdminNotes]   = useState('')
  const [sendEmail, setSendEmail]     = useState(true)
  const [createOpen, setCreateOpen]   = useState(false)

  useEffect(() => { setPage(1) }, [tab])
  useEffect(() => { load() }, [tab, page])

  async function load() {
    setLoading(true)
    try {
      const params: any = { page, per_page: 15 }
      if (tab !== 'all') params.status = tab
      const r = await api.get('/hrm/leaves', { params })
      setLeaves(r.data.data)
      setMeta(r.data.meta)
    } catch {}
    finally { setLoading(false) }
  }

  async function approve(leave: Leave) {
    setActionId(leave.id)
    try {
      await api.post(`/hrm/leaves/${leave.id}/approve`, { send_email: true })
      toast.success(
        leave.employee?.email
          ? `Approved — email sent to ${leave.employee.name}`
          : `Approved (no email on file for ${leave.employee.name})`
      )
      load()
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Failed')
    } finally { setActionId(null) }
  }

  async function markReplyToggle(leave: Leave, replied: boolean) {
    try {
      const notes = replied ? prompt('Optional reply notes (e.g. "Confirmed by WhatsApp"):', '') : ''
      await api.post(`/hrm/leaves/${leave.id}/mark-replied`, { replied, response_notes: notes })
      toast.success(replied ? 'Marked as replied' : 'Reply mark cleared')
      // Update modal view + list
      setDetailLeave(null)
      load()
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Failed')
    }
  }

  async function reject() {
    if (!rejectModal) return
    setActionId(rejectModal.id)
    try {
      await api.post(`/hrm/leaves/${rejectModal.id}/reject`, {
        admin_notes: adminNotes,
        send_email:  sendEmail,
      })
      toast.success(sendEmail && rejectModal.employee?.email ? 'Rejected — email sent' : 'Leave rejected')
      setRejectModal(null)
      setAdminNotes('')
      setSendEmail(true)
      load()
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Failed')
    } finally { setActionId(null) }
  }

  const pendingCount = leaves.filter(l => l.status === 'pending').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BackToHrm />
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Leave Requests</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage employee leave applications</p>
          </div>
        </div>
        <button onClick={() => setCreateOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Leave Request
        </button>
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="flex gap-1 mb-5 border-b border-slate-100 pb-0">
          {STATUS_TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors -mb-px ${
                tab === t
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}>
              {t}
              {t === 'pending' && pendingCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wide">Employee</th>
                <th className="text-left py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wide">Type</th>
                <th className="text-left py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wide">Duration</th>
                <th className="text-left py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wide">Reason</th>
                <th className="text-center py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
                <th className="py-3 px-2" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="py-3 px-2">
                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : leaves.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    No leave requests found
                  </td>
                </tr>
              ) : leaves.map(leave => (
                <tr key={leave.id}
                  className="border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => setDetailLeave(leave)}>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                        {leave.employee.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-slate-800">{leave.employee.name}</p>
                          {leave.is_emergency && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-100 text-amber-700">Emergency</span>
                          )}
                          {leave.source === 'public' && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-violet-100 text-violet-700">Public Form</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">{leave.employee.department}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <span className={`capitalize px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[leave.type] ?? 'badge-blue'}`}>
                      {leave.leave_type?.name ?? leave.type}
                    </span>
                    {leave.reason_category && (
                      <p className="text-[10px] text-slate-400 mt-0.5">{leave.reason_category}</p>
                    )}
                  </td>
                  <td className="py-3 px-2">
                    <p className="text-slate-700">{formatDate(leave.from_date)} → {formatDate(leave.to_date)}</p>
                    <p className="text-xs text-slate-400">{leave.days} day{leave.days !== 1 ? 's' : ''}</p>
                  </td>
                  <td className="py-3 px-2 text-slate-600 max-w-[180px] truncate" title={leave.reason}>{leave.reason}</td>
                  <td className="py-3 px-2 text-center">
                    {leave.status === 'pending'  && <span className="badge-yellow capitalize">Pending</span>}
                    {leave.status === 'approved' && <span className="badge-green capitalize">Approved</span>}
                    {leave.status === 'rejected' && <span className="badge-red capitalize">Rejected</span>}
                    {leave.email_sent_at && (
                      <p className={`text-[10px] mt-0.5 flex items-center justify-center gap-1 ${leave.employee_replied_at ? 'text-emerald-600' : 'text-slate-500'}`}
                        title={`Emailed ${new Date(leave.email_sent_at).toLocaleString('en-MY')}${leave.employee_replied_at ? '. Replied ' + new Date(leave.employee_replied_at).toLocaleString('en-MY') : ''}`}>
                        ✉ Sent
                        {leave.status !== 'pending' && (leave.employee_replied_at
                          ? <span className="text-emerald-700">· ✓ Replied</span>
                          : <span className="text-amber-600">· ⏳ Awaiting</span>)}
                      </p>
                    )}
                    {leave.admin_notes && (
                      <p className="text-xs text-slate-400 mt-0.5 italic truncate max-w-[120px] mx-auto" title={leave.admin_notes}>
                        {leave.admin_notes}
                      </p>
                    )}
                  </td>
                  <td className="py-3 px-2" onClick={e => e.stopPropagation()}>
                    {leave.status === 'pending' && (
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => approve(leave)}
                          disabled={actionId === leave.id}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50">
                          {actionId === leave.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                          Approve
                        </button>
                        <button onClick={() => { setRejectModal(leave); setAdminNotes(''); setSendEmail(true) }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100">
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta.last_page > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500">Showing {leaves.length} of {meta.total} requests</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 text-xs text-slate-600">{page} / {meta.last_page}</span>
              <button onClick={() => setPage(p => Math.min(meta.last_page, p + 1))} disabled={page === meta.last_page}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-40">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Leave Modal */}
      <LeaveRequestModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={() => { setCreateOpen(false); load() }}
      />

      {/* Detail Modal */}
      {detailLeave && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setDetailLeave(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h3 className="font-bold text-slate-800">Leave Request Details</h3>
                <p className="text-xs text-slate-400">{detailLeave.employee.employee_code} · {detailLeave.employee.name}</p>
              </div>
              <button onClick={() => setDetailLeave(null)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
            </div>
            <div className="px-6 py-5 space-y-4 text-sm">
              <div className="flex flex-wrap gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                  detailLeave.status === 'pending'  ? 'bg-amber-100 text-amber-700' :
                  detailLeave.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                                     'bg-rose-100 text-rose-700'
                }`}>{detailLeave.status}</span>
                {detailLeave.is_emergency && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-amber-100 text-amber-700">Emergency</span>
                )}
                <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-slate-100 text-slate-600">via {detailLeave.source}</span>
                {detailLeave.email_sent_at && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-emerald-50 text-emerald-700">✉ Emailed</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div><p className="text-slate-500">Department</p><p className="font-semibold text-slate-800">{detailLeave.employee.department}</p></div>
                <div><p className="text-slate-500">Email</p><p className="font-semibold text-slate-800">{detailLeave.employee.email ?? '—'}</p></div>
                <div><p className="text-slate-500">Leave Type</p><p className="font-semibold text-slate-800">{detailLeave.leave_type?.name ?? detailLeave.type}</p></div>
                <div><p className="text-slate-500">Category</p><p className="font-semibold text-slate-800">{detailLeave.reason_category ?? '—'}</p></div>
                <div><p className="text-slate-500">From</p><p className="font-semibold text-slate-800">{formatDate(detailLeave.from_date)}</p></div>
                <div><p className="text-slate-500">To</p><p className="font-semibold text-slate-800">{formatDate(detailLeave.to_date)} ({detailLeave.days} day{detailLeave.days !== 1 ? 's' : ''})</p></div>
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Detailed Reason</p>
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-slate-700 whitespace-pre-wrap">{detailLeave.reason || '—'}</div>
              </div>

              {(detailLeave.contact_during_leave || detailLeave.address_during_leave) && (
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Contact During Leave</p>
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-slate-700 space-y-1 text-xs">
                    {detailLeave.contact_during_leave && <p><span className="text-slate-500">Phone:</span> {detailLeave.contact_during_leave}</p>}
                    {detailLeave.address_during_leave && <p><span className="text-slate-500">Address:</span> {detailLeave.address_during_leave}</p>}
                  </div>
                </div>
              )}

              {(detailLeave.handover_person || detailLeave.handover_notes) && (
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Work Handover</p>
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-slate-700 space-y-1 text-xs">
                    {detailLeave.handover_person && <p><span className="text-slate-500">Person:</span> {detailLeave.handover_person}</p>}
                    {detailLeave.handover_notes && <p className="whitespace-pre-wrap"><span className="text-slate-500">Notes:</span> {detailLeave.handover_notes}</p>}
                  </div>
                </div>
              )}

              {detailLeave.admin_notes && (
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Admin Decision Notes</p>
                  <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-amber-800 text-xs whitespace-pre-wrap">{detailLeave.admin_notes}</div>
                </div>
              )}

              {/* Reply tracking */}
              {detailLeave.email_sent_at && detailLeave.status !== 'pending' && (
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Employee Email Reply Tracking</p>
                  <div className={`border rounded-lg p-3 text-xs ${detailLeave.employee_replied_at ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                    <p className="flex items-center gap-2">
                      ✉ <b>Sent:</b> {new Date(detailLeave.email_sent_at).toLocaleString('en-MY')}
                    </p>
                    {detailLeave.employee_replied_at ? (
                      <>
                        <p className="flex items-center gap-2 mt-1">
                          ✓ <b>Replied:</b> {new Date(detailLeave.employee_replied_at).toLocaleString('en-MY')}
                        </p>
                        {detailLeave.response_notes && (
                          <p className="mt-2 italic">"{detailLeave.response_notes}"</p>
                        )}
                      </>
                    ) : (
                      <p className="mt-1 text-amber-700">⏳ Awaiting employee reply</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 flex-wrap">
              {detailLeave.status === 'pending' && (
                <>
                  <button onClick={() => { const l = detailLeave; setDetailLeave(null); setRejectModal(l); setAdminNotes(''); setSendEmail(true) }}
                    className="px-4 py-2 bg-red-50 text-red-700 text-sm font-medium rounded-lg hover:bg-red-100">Reject</button>
                  <button onClick={() => { const l = detailLeave; setDetailLeave(null); approve(l) }}
                    className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700">Approve</button>
                </>
              )}
              {detailLeave.email_sent_at && detailLeave.status !== 'pending' && (
                detailLeave.employee_replied_at ? (
                  <button onClick={() => markReplyToggle(detailLeave, false)}
                    className="px-3 py-2 bg-slate-50 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-100">
                    Clear reply mark
                  </button>
                ) : (
                  <button onClick={() => markReplyToggle(detailLeave, true)}
                    className="px-3 py-2 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700">
                    ✓ Mark as Replied
                  </button>
                )
              )}
              <button onClick={() => setDetailLeave(null)} className="btn-outline">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Reject Leave Request</h3>
              <p className="text-sm text-slate-500 mt-0.5">
                {rejectModal.employee.name} — {rejectModal.days} day(s) {rejectModal.type} leave
              </p>
            </div>
            <div className="px-6 py-4 space-y-3">
              <label className="block text-xs font-medium text-slate-600 mb-1">Reason for rejection (optional)</label>
              <textarea rows={3} value={adminNotes} onChange={e => setAdminNotes(e.target.value)}
                placeholder="e.g. Too many leaves this month..."
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
              />
              <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg cursor-pointer">
                <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} />
                <span className="text-xs text-slate-700">
                  Email the employee
                  {rejectModal.employee?.email
                    ? <> at <b className="text-slate-800">{rejectModal.employee.email}</b></>
                    : <span className="text-amber-600"> (no email on file)</span>}
                </span>
              </label>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
              <button onClick={() => setRejectModal(null)} className="btn-outline">Cancel</button>
              <button onClick={reject} disabled={actionId !== null}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50">
                {actionId !== null && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
