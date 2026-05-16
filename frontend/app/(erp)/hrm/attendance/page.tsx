'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Clock, AlertCircle, ChevronLeft, ChevronRight, Save, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import BackToHrm from '@/components/hrm/BackToHrm'

type AttendanceStatus = 'present' | 'absent' | 'half_day' | 'on_leave'

type EmpRow = {
  id: number
  name: string
  employee_code: string
  department: string
  status: AttendanceStatus | null
  check_in: string | null
  check_out: string | null
}

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; color: string }[] = [
  { value: 'present',   label: 'Present',  color: 'text-green-600  bg-green-50  border-green-200' },
  { value: 'absent',    label: 'Absent',   color: 'text-red-600    bg-red-50    border-red-200'   },
  { value: 'half_day',  label: 'Half Day', color: 'text-amber-600  bg-amber-50  border-amber-200' },
  { value: 'on_leave',  label: 'On Leave', color: 'text-blue-600   bg-blue-50   border-blue-200'  },
]

function statusIcon(s: AttendanceStatus | null) {
  if (s === 'present')  return <CheckCircle  className="w-4 h-4 text-green-500" />
  if (s === 'absent')   return <XCircle      className="w-4 h-4 text-red-500"   />
  if (s === 'half_day') return <Clock        className="w-4 h-4 text-amber-500" />
  if (s === 'on_leave') return <AlertCircle  className="w-4 h-4 text-blue-500"  />
  return null
}

export default function AttendancePage() {
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate]       = useState(today)
  const [rows, setRows]       = useState<EmpRow[]>([])
  const [changes, setChanges] = useState<Record<number, AttendanceStatus>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)

  useEffect(() => { load() }, [date])

  async function load() {
    setLoading(true)
    setChanges({})
    try {
      const r = await api.get('/hrm/attendance', { params: { date } })
      setRows(r.data.data)
    } catch {}
    finally { setLoading(false) }
  }

  function changeStatus(empId: number, status: AttendanceStatus) {
    setChanges(c => ({ ...c, [empId]: status }))
    setRows(r => r.map(row => row.id === empId ? { ...row, status } : row))
  }

  function markAll(status: AttendanceStatus) {
    const bulk: Record<number, AttendanceStatus> = {}
    rows.forEach(r => { bulk[r.id] = status })
    setChanges(bulk)
    setRows(r => r.map(row => ({ ...row, status })))
  }

  async function saveChanges() {
    if (Object.keys(changes).length === 0) return toast('No changes to save')
    setSaving(true)
    try {
      const records = Object.entries(changes).map(([emp_id, status]) => ({
        employee_id: +emp_id, date, status,
      }))
      await api.post('/hrm/attendance/bulk', { records })
      toast.success('Attendance saved')
      setChanges({})
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Failed to save')
    } finally { setSaving(false) }
  }

  function shiftDate(days: number) {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    setDate(d.toISOString().slice(0, 10))
  }

  const presentCount  = rows.filter(r => r.status === 'present').length
  const absentCount   = rows.filter(r => r.status === 'absent').length
  const halfCount     = rows.filter(r => r.status === 'half_day').length
  const leaveCount    = rows.filter(r => r.status === 'on_leave').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BackToHrm />
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Attendance</h1>
            <p className="text-sm text-slate-500 mt-0.5">Daily attendance sheet</p>
          </div>
        </div>
        <button onClick={saveChanges} disabled={saving || Object.keys(changes).length === 0}
          className="btn-primary flex items-center gap-2 disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Attendance
          {Object.keys(changes).length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded-full text-xs">
              {Object.keys(changes).length}
            </span>
          )}
        </button>
      </div>

      {/* Date navigator */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button onClick={() => shiftDate(-1)}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <input type="date" value={date} max={today}
              onChange={e => setDate(e.target.value)}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button onClick={() => shiftDate(1)} disabled={date >= today}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-40">
              <ChevronRight className="w-5 h-5" />
            </button>
            {date !== today && (
              <button onClick={() => setDate(today)}
                className="text-xs text-indigo-600 hover:underline ml-1">Today</button>
            )}
          </div>

          {/* Quick mark all */}
          <div className="flex gap-2 text-xs">
            <span className="text-slate-400 text-sm">Mark all:</span>
            {STATUS_OPTIONS.map(s => (
              <button key={s.value} onClick={() => markAll(s.value)}
                className={`px-2 py-1 rounded border font-medium ${s.color}`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Summary pills */}
        <div className="flex gap-3 mb-4">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 rounded-lg text-xs font-medium text-green-700">
            <CheckCircle className="w-3.5 h-3.5" /> Present: {presentCount}
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 rounded-lg text-xs font-medium text-red-700">
            <XCircle className="w-3.5 h-3.5" /> Absent: {absentCount}
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-lg text-xs font-medium text-amber-700">
            <Clock className="w-3.5 h-3.5" /> Half Day: {halfCount}
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-lg text-xs font-medium text-blue-700">
            <AlertCircle className="w-3.5 h-3.5" /> On Leave: {leaveCount}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wide">Employee</th>
                <th className="text-left py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wide">Department</th>
                <th className="text-left py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-left py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wide">Check In</th>
                <th className="text-left py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wide">Check Out</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="py-3 px-2">
                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.map(row => {
                const changed = changes[row.id] !== undefined
                return (
                  <tr key={row.id}
                    className={`border-b border-slate-50 transition-colors ${changed ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                          {row.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{row.name}</p>
                          <p className="text-xs text-slate-400">{row.employee_code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-slate-500">{row.department}</td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-1.5">
                        {statusIcon(row.status)}
                        <select
                          value={row.status ?? ''}
                          onChange={e => changeStatus(row.id, e.target.value as AttendanceStatus)}
                          className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">-- Mark --</option>
                          {STATUS_OPTIONS.map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-slate-500 font-mono text-xs">{row.check_in ?? '—'}</td>
                    <td className="py-3 px-2 text-slate-500 font-mono text-xs">{row.check_out ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
