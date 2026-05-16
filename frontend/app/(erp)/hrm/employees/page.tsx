'use client'

import { useEffect, useState } from 'react'
import { Users, UserCheck, UserX, Clock, Plus, Search, ChevronLeft, ChevronRight, Pencil, Eye, User as UserIcon } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import BackToHrm from '@/components/hrm/BackToHrm'
import type { Employee } from '@/types/index'

type Stats = {
  total: number
  present_today: number
  on_leave: number
  absent: number
  departments: number
  pending_leaves: number
  total_payroll: number
}

const DEPT_COLORS: Record<string, string> = {
  IT:         'badge-blue',
  HR:         'badge-green',
  Finance:    'badge-yellow',
  Sales:      'bg-purple-100 text-purple-700',
  Marketing:  'bg-pink-100 text-pink-700',
  Operations: 'bg-orange-100 text-orange-700',
}

export default function EmployeesPage() {
  const router                      = useRouter()
  const [stats, setStats]           = useState<Stats | null>(null)
  const [employees, setEmployees]   = useState<(Employee & { image_url?: string | null })[]>([])
  const [departments, setDepts]     = useState<string[]>([])
  const [search, setSearch]         = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [page, setPage]             = useState(1)
  const [meta, setMeta]             = useState({ last_page: 1, total: 0 })
  const [loading, setLoading]       = useState(true)

  useEffect(() => { loadStats(); loadDepts() }, [])
  useEffect(() => { loadEmployees() }, [search, deptFilter, page])

  async function loadStats() {
    try {
      const r = await api.get('/hrm/employees/stats')
      setStats(r.data.data)
    } catch {}
  }

  async function loadDepts() {
    try {
      const r = await api.get('/hrm/employees/departments')
      setDepts(r.data.data)
    } catch {}
  }

  async function loadEmployees() {
    setLoading(true)
    try {
      const r = await api.get('/hrm/employees', {
        params: { search, department: deptFilter, page, per_page: 15 },
      })
      setEmployees(r.data.data)
      setMeta(r.data.meta)
    } catch {}
    finally { setLoading(false) }
  }

  function openAdd()  { router.push('/hrm/employees/new') }
  function openEdit(emp: Employee) { router.push(`/hrm/employees/${emp.id}/edit`) }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BackToHrm />
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Employees</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage your workforce</p>
          </div>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Employee
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card flex items-center gap-4">
            <div className="p-3 bg-indigo-50 rounded-xl"><Users className="w-5 h-5 text-indigo-600" /></div>
            <div>
              <p className="text-xs text-slate-500">Total Employees</p>
              <p className="text-xl font-bold text-slate-800">{stats.total}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-xl"><UserCheck className="w-5 h-5 text-green-600" /></div>
            <div>
              <p className="text-xs text-slate-500">Present Today</p>
              <p className="text-xl font-bold text-slate-800">{stats.present_today}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="p-3 bg-amber-50 rounded-xl"><Clock className="w-5 h-5 text-amber-600" /></div>
            <div>
              <p className="text-xs text-slate-500">On Leave</p>
              <p className="text-xl font-bold text-slate-800">{stats.on_leave}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="p-3 bg-red-50 rounded-xl"><UserX className="w-5 h-5 text-red-600" /></div>
            <div>
              <p className="text-xs text-slate-500">Absent Today</p>
              <p className="text-xl font-bold text-slate-800">{stats.absent}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search by name, email, CNIC..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={deptFilter} onChange={e => { setDeptFilter(e.target.value); setPage(1) }}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wide">Employee</th>
                <th className="text-left py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wide">Department</th>
                <th className="text-left py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wide">Designation</th>
                <th className="text-left py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wide">Join Date</th>
                <th className="text-right py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wide">Salary</th>
                <th className="text-center py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
                <th className="py-3 px-2" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="py-3 px-2">
                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    No employees found
                  </td>
                </tr>
              ) : employees.map(emp => (
                <tr key={emp.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 ring-1 ring-indigo-200 overflow-hidden flex items-center justify-center text-xs font-bold text-indigo-600 shrink-0">
                        {emp.image_url
                          ? <img src={emp.image_url} alt="" className="w-full h-full object-cover" />
                          : emp.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{emp.name}</p>
                        <p className="text-xs text-slate-400">{emp.employee_code} · {emp.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${DEPT_COLORS[emp.department] ?? 'badge-blue'}`}>
                      {emp.department}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-slate-600">{emp.designation}</td>
                  <td className="py-3 px-2 text-slate-500">{formatDate(emp.join_date)}</td>
                  <td className="py-3 px-2 text-right font-medium text-slate-800">{formatCurrency(emp.basic_salary)}</td>
                  <td className="py-3 px-2 text-center">
                    <span className={emp.status === 'active' ? 'badge-green' : 'badge-red'}>
                      {emp.status}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/hrm/employees/${emp.id}`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button onClick={() => openEdit(emp)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta.last_page > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Showing {employees.length} of {meta.total} employees
            </p>
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

    </div>
  )
}
