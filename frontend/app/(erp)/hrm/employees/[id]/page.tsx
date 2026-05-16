'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Mail, Phone, MapPin, CreditCard, Calendar, Briefcase,
  CheckCircle, XCircle, Clock, AlertCircle, Loader2, Pencil, CalendarPlus,
} from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import LeaveRequestModal from '@/components/hrm/LeaveRequestModal'
import type { Employee } from '@/types/index'

type AttendanceSummary = {
  month: number
  year: number
  present: number
  absent: number
  half_day: number
  on_leave: number
  total_working_days: number
}

type Leave = {
  id: number
  from_date: string
  to_date: string
  type: string
  reason: string
  status: string
  days: number
}

function InfoItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="p-2 bg-slate-50 rounded-lg shrink-0">
        <Icon className="w-4 h-4 text-slate-500" />
      </div>
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-700">{value || '—'}</p>
      </div>
    </div>
  )
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function EmployeeDetailPage() {
  const { id }    = useParams()
  const router    = useRouter()
  const [emp, setEmp]           = useState<Employee | null>(null)
  const [attendance, setAtt]    = useState<AttendanceSummary[]>([])
  const [leaves, setLeaves]     = useState<Leave[]>([])
  const [loading, setLoading]   = useState(true)
  const [leaveOpen, setLeaveOpen] = useState(false)

  useEffect(() => { loadAll() }, [id])

  async function loadAll() {
    setLoading(true)
    try {
      const [empRes, attRes, leaveRes] = await Promise.all([
        api.get(`/hrm/employees/${id}`),
        api.get(`/hrm/attendance/${id}/history`),
        api.get('/hrm/leaves', { params: { employee_id: id, per_page: 50 } }),
      ])
      setEmp(empRes.data.data)
      setAtt(attRes.data.data)
      setLeaves(leaveRes.data.data)
    } catch {}
    finally { setLoading(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
    </div>
  )

  if (!emp) return (
    <div className="text-center py-20 text-slate-400">Employee not found.</div>
  )

  const latestAtt = attendance[0]

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()}
          className="p-2 rounded-lg text-slate-400 hover:bg-slate-100">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800">{emp.name}</h1>
          <p className="text-sm text-slate-500">{emp.employee_code} · {emp.designation}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setLeaveOpen(true)}
            className="btn-outline flex items-center gap-2">
            <CalendarPlus className="w-4 h-4" /> Apply Leave
          </button>
          <button onClick={() => router.push(`/hrm/employees/${emp.id}/edit`)}
            className="btn-outline flex items-center gap-2">
            <Pencil className="w-4 h-4" /> Edit
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="space-y-5">
          {/* Avatar + status */}
          <div className="card text-center">
            <div className="w-24 h-24 rounded-full bg-indigo-100 ring-4 ring-indigo-50 mx-auto mb-3 overflow-hidden flex items-center justify-center text-3xl font-bold text-indigo-600">
              {(emp as any).image_url
                ? <img src={(emp as any).image_url} alt={emp.name} className="w-full h-full object-cover" />
                : emp.name.charAt(0)}
            </div>
            <p className="font-bold text-slate-800 text-lg">{emp.name}</p>
            <p className="text-sm text-slate-500 mt-0.5">{emp.department} · {emp.designation}</p>
            <div className="mt-3">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${emp.status === 'active' ? 'badge-green' : 'badge-red'}`}>
                {emp.status}
              </span>
            </div>
          </div>

          {/* Contact info */}
          <div className="card space-y-4">
            <h3 className="font-semibold text-slate-700 text-sm mb-2">Contact Information</h3>
            <InfoItem icon={Mail}     label="Email"    value={emp.email ?? ''} />
            <InfoItem icon={Phone}    label="Phone"    value={emp.phone ?? ''} />
            <InfoItem icon={CreditCard} label="CNIC"  value={emp.cnic ?? ''} />
            <InfoItem icon={MapPin}   label="Address"  value={emp.address ?? ''} />
          </div>

          {/* Employment info */}
          <div className="card space-y-4">
            <h3 className="font-semibold text-slate-700 text-sm mb-2">Employment Details</h3>
            <InfoItem icon={Calendar}  label="Join Date"     value={formatDate(emp.join_date)} />
            <InfoItem icon={Briefcase} label="Department"    value={emp.department} />
            <InfoItem icon={Briefcase} label="Designation"   value={emp.designation} />
            <div className="flex items-start gap-3">
              <div className="p-2 bg-slate-50 rounded-lg shrink-0">
                <CreditCard className="w-4 h-4 text-slate-500" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Basic Salary</p>
                <p className="text-sm font-bold text-indigo-600">{formatCurrency(emp.basic_salary)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-5">
          {/* This month attendance */}
          {latestAtt && (
            <div className="card">
              <h3 className="font-semibold text-slate-700 mb-4">
                Attendance — {MONTH_NAMES[latestAtt.month - 1]} {latestAtt.year}
              </h3>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Present',   value: latestAtt.present,  icon: CheckCircle,  color: 'text-green-600 bg-green-50'  },
                  { label: 'Absent',    value: latestAtt.absent,   icon: XCircle,      color: 'text-red-600   bg-red-50'    },
                  { label: 'Half Day',  value: latestAtt.half_day, icon: Clock,        color: 'text-amber-600 bg-amber-50'  },
                  { label: 'On Leave',  value: latestAtt.on_leave, icon: AlertCircle,  color: 'text-blue-600  bg-blue-50'   },
                ].map(item => (
                  <div key={item.label} className={`flex flex-col items-center py-4 rounded-xl ${item.color.split(' ')[1]}`}>
                    <item.icon className={`w-5 h-5 mb-1 ${item.color.split(' ')[0]}`} />
                    <p className={`text-2xl font-bold ${item.color.split(' ')[0]}`}>{item.value}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>
              {/* Progress bar */}
              {latestAtt.total_working_days > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Attendance Rate</span>
                    <span>{Math.round((latestAtt.present / latestAtt.total_working_days) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${(latestAtt.present / latestAtt.total_working_days) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Attendance history (last 6 months) */}
          {attendance.length > 1 && (
            <div className="card">
              <h3 className="font-semibold text-slate-700 mb-4">Attendance History</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-2 px-2 text-xs font-medium text-slate-500">Month</th>
                      <th className="text-center py-2 px-2 text-xs font-medium text-green-600">Present</th>
                      <th className="text-center py-2 px-2 text-xs font-medium text-red-500">Absent</th>
                      <th className="text-center py-2 px-2 text-xs font-medium text-amber-500">Half Day</th>
                      <th className="text-center py-2 px-2 text-xs font-medium text-blue-500">Leave</th>
                      <th className="text-center py-2 px-2 text-xs font-medium text-slate-500">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map(a => (
                      <tr key={`${a.year}-${a.month}`} className="border-b border-slate-50">
                        <td className="py-2 px-2 font-medium text-slate-700">
                          {MONTH_NAMES[a.month - 1]} {a.year}
                        </td>
                        <td className="py-2 px-2 text-center text-green-600 font-medium">{a.present}</td>
                        <td className="py-2 px-2 text-center text-red-500 font-medium">{a.absent}</td>
                        <td className="py-2 px-2 text-center text-amber-500 font-medium">{a.half_day}</td>
                        <td className="py-2 px-2 text-center text-blue-500 font-medium">{a.on_leave}</td>
                        <td className="py-2 px-2 text-center">
                          <span className="text-xs font-medium text-slate-600">
                            {a.total_working_days > 0
                              ? `${Math.round((a.present / a.total_working_days) * 100)}%`
                              : '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Leave requests */}
          <div className="card">
            <h3 className="font-semibold text-slate-700 mb-4">Leave History</h3>
            {leaves.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No leave requests yet</p>
            ) : (
              <div className="space-y-3">
                {leaves.map(leave => (
                  <div key={leave.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-slate-700 capitalize">{leave.type} Leave</span>
                        <span className="text-xs text-slate-400">· {leave.days} day{leave.days !== 1 ? 's' : ''}</span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {formatDate(leave.from_date)} → {formatDate(leave.to_date)}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 italic">{leave.reason}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      leave.status === 'approved' ? 'badge-green' :
                      leave.status === 'rejected' ? 'badge-red' : 'badge-yellow'
                    }`}>
                      {leave.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <LeaveRequestModal
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        onSaved={() => { setLeaveOpen(false); loadAll() }}
        employeeId={emp.id}
      />
    </div>
  )
}
