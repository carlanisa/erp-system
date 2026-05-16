'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Users, UserCheck, Banknote, Calendar, Clock, UserX,
  Layers, BarChart2, TrendingUp, FileText, Wallet,
  ScrollText, AlertCircle, CalendarRange, Briefcase, Settings,
  Receipt, BadgeCheck,
} from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

type Stats = {
  total: number
  present_today: number
  on_leave: number
  absent: number
  departments: number
  pending_leaves: number
  total_payroll: number
}

const MODULES = [
  { title: 'Master Setup',    href: '/hrm/setup',       icon: Settings,   color: 'text-slate-700',   bg: 'bg-slate-50',     border: 'border-slate-200',     desc: 'Departments · Designations · Leave Types · Holidays · Shifts' },
  { title: 'Employees',       href: '/hrm/employees',   icon: Users,      color: 'text-indigo-600',  bg: 'bg-indigo-50',    border: 'border-indigo-100',    desc: 'Workforce profiles, contact, salary, status' },
  { title: 'Attendance',      href: '/hrm/attendance',  icon: Calendar,   color: 'text-blue-600',    bg: 'bg-blue-50',      border: 'border-blue-100',      desc: 'Daily sheet · check-in / check-out · half-day' },
  { title: 'Leave',           href: '/hrm/leave',       icon: UserCheck,  color: 'text-emerald-600', bg: 'bg-emerald-50',   border: 'border-emerald-100',   desc: 'Apply · approve · reject · balance tracking' },
  { title: 'Payroll',         href: '/hrm/payroll',     icon: Banknote,   color: 'text-amber-600',   bg: 'bg-amber-50',     border: 'border-amber-100',     desc: 'Generate monthly · pay slips · GL posting' },
  { title: 'Holidays',        href: '/hrm/setup?tab=holidays', icon: CalendarRange, color: 'text-rose-600',    bg: 'bg-rose-50',      border: 'border-rose-100',      desc: 'Public, religious & company holiday calendar' },
]

const REPORTS = [
  { label: 'Headcount by Department', href: '/hrm/reports?tab=headcount',   icon: Users      },
  { label: 'Attendance Summary',      href: '/hrm/reports?tab=attendance',  icon: Calendar   },
  { label: 'Leave Balance',           href: '/hrm/reports?tab=leave',       icon: UserCheck  },
  { label: 'Payroll Register',        href: '/hrm/reports?tab=payroll',     icon: Receipt    },
  { label: 'Salary Cost Trend',       href: '/hrm/reports?tab=salary-trend', icon: TrendingUp },
  { label: 'Late / Early Out',        href: '/hrm/reports?tab=late',        icon: Clock      },
  { label: 'New Hires & Exits',       href: '/hrm/reports?tab=hires',       icon: BadgeCheck },
  { label: 'EPF / SOCSO / EIS',       href: '/hrm/reports?tab=statutory',   icon: ScrollText },
  { label: 'PCB Tax Summary',         href: '/hrm/reports?tab=tax',         icon: FileText   },
]

export default function HrmPage() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    api.get('/hrm/employees/stats').then(r => setStats(r.data.data)).catch(() => {})
  }, [])

  return (
    <div className="flex gap-6 h-full">
      <div className="flex-1 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Human Resources</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Workforce, attendance, leave &amp; payroll — all in one place
            </p>
          </div>
        </div>

        {/* KPI Cards (row 1) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Employees', value: stats?.total         ?? '—', sub: 'Active headcount',         color: 'text-indigo-600',  bg: 'bg-indigo-50' },
            { label: 'Present Today',   value: stats?.present_today ?? '—', sub: 'Marked today',             color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'On Leave',        value: stats?.on_leave      ?? '—', sub: 'Approved leave today',     color: 'text-amber-600',   bg: 'bg-amber-50' },
            { label: 'Absent Today',    value: stats?.absent        ?? '—', sub: 'No check-in / unmarked',   color: 'text-rose-600',    bg: 'bg-rose-50' },
          ].map(s => (
            <div key={s.label} className="card">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value as any}</div>
              <div className="text-xs font-medium text-slate-600 mt-0.5">{s.label}</div>
              <div className="text-xs text-slate-400 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* KPI Cards (row 2) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Departments',    value: stats?.departments    ?? '—',                    sub: 'Active divisions',     icon: Layers,      color: 'text-slate-700',  bg: 'bg-slate-50' },
            { label: 'Pending Leaves', value: stats?.pending_leaves ?? '—',                    sub: 'Awaiting approval',    icon: AlertCircle, color: 'text-rose-600',   bg: 'bg-rose-50' },
            { label: 'Monthly Payroll',value: stats ? formatCurrency(stats.total_payroll) : '—', sub: 'Net salary this month', icon: Wallet,      color: 'text-amber-600',  bg: 'bg-amber-50' },
            { label: 'Working Days',   value: '—',                                              sub: 'Mon–Fri (default)',     icon: Clock,       color: 'text-blue-600',   bg: 'bg-blue-50' },
          ].map(s => {
            const Icon = s.icon
            return (
              <div key={s.label} className="card flex items-center gap-3">
                <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div className="min-w-0">
                  <div className={`text-base font-bold ${s.color} truncate`}>{s.value as any}</div>
                  <div className="text-xs font-medium text-slate-600 truncate">{s.label}</div>
                  <div className="text-[11px] text-slate-400 truncate">{s.sub}</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Module Tiles */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {MODULES.map(m => {
            const Icon = m.icon
            return (
              <Link key={m.href} href={m.href}
                className={`card border ${m.border} hover:shadow-lg transition-all group flex flex-col items-center text-center py-6 gap-3`}>
                <div className={`w-16 h-16 ${m.bg} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm`}>
                  <Icon className={`w-8 h-8 ${m.color}`} />
                </div>
                <div>
                  <p className={`font-semibold text-sm ${m.color}`}>{m.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{m.desc}</p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Right reports panel */}
      <div className="w-64 shrink-0">
        <div className="card sticky top-0">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
            <BarChart2 className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-sm">Reports</h3>
          </div>
          <div className="space-y-0.5">
            {REPORTS.map(r => {
              const Icon = r.icon
              return (
                <Link key={r.href} href={r.href}
                  className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors group">
                  <Icon className="w-3.5 h-3.5 shrink-0 text-slate-400 group-hover:text-indigo-500" />
                  <span className="text-xs font-medium">{r.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
