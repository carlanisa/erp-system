'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  FolderKanban, ListChecks, Briefcase, FileText, Sparkles,
  Bell, MessageSquare, BarChart2, AlertCircle, CheckCircle2, Clock,
  Users, TrendingUp, ScrollText, Calendar,
} from 'lucide-react'
import { api } from '@/lib/api'

type Stats = {
  total_projects: number
  active_projects: number
  total_tasks: number
  pending_tasks: number
  in_progress_tasks: number
  review_tasks: number
  completed_tasks: number
  overdue_tasks: number
  job_descriptions: number
}

const MODULES = [
  { title: 'All Projects',      href: '/projects/list',             icon: FolderKanban, color: 'text-indigo-600',  bg: 'bg-indigo-50',  border: 'border-indigo-100',  desc: 'Project list · Kanban board · owners · status' },
  { title: 'My Tasks',          href: '/projects/my-tasks',         icon: ListChecks,   color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', desc: 'Personal task queue · pending · in-progress · due' },
  { title: 'All Tasks',         href: '/projects/all-tasks',        icon: Briefcase,    color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-100',    desc: 'Global task list · filter by status · priority · due' },
  { title: 'Job Descriptions',  href: '/projects/job-descriptions', icon: FileText,     color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-100',   desc: 'JDs · AI task generator · assign to employee' },
  { title: 'AI Helper',         href: '/ai-chat',                   icon: MessageSquare, color: 'text-rose-600',   bg: 'bg-rose-50',    border: 'border-rose-100',    desc: 'Multilingual AI assistant for staff · chat reports' },
  { title: 'Notifications',     href: '/notifications',             icon: Bell,         color: 'text-slate-700',   bg: 'bg-slate-50',   border: 'border-slate-200',   desc: 'Task assigned · review · approved · overdue alerts' },
]

const REPORTS = [
  { label: 'Tasks by Status',         href: '/projects/all-tasks',                    icon: BarChart2 },
  { label: 'Overdue Tasks',           href: '/projects/all-tasks?due=overdue',        icon: AlertCircle },
  { label: 'Due Today',               href: '/projects/all-tasks?due=today',          icon: Clock },
  { label: 'Completed This Month',    href: '/projects/all-tasks?status=completed',   icon: CheckCircle2 },
  { label: 'High-Priority Backlog',   href: '/projects/all-tasks?priority=high',      icon: TrendingUp },
  { label: 'Active Projects',         href: '/projects/list',                         icon: FolderKanban },
  { label: 'Employees with Tasks',    href: '/projects/my-tasks',                     icon: Users },
  { label: 'AI Chat Reports',         href: '/ai-chat',                               icon: ScrollText },
]

export default function ProjectsHubPage() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const [projects, tasks, jds, pending, inprog, review, completed, overdue] = await Promise.all([
          api.get('/projects',                       { params: { per_page: 1 } }),
          api.get('/tasks',                          { params: { per_page: 1 } }),
          api.get('/hrm/job-descriptions',           { params: { per_page: 1 } }),
          api.get('/tasks',                          { params: { per_page: 1, status: 'pending' } }),
          api.get('/tasks',                          { params: { per_page: 1, status: 'in_progress' } }),
          api.get('/tasks',                          { params: { per_page: 1, status: 'review' } }),
          api.get('/tasks',                          { params: { per_page: 1, status: 'completed' } }),
          api.get('/tasks',                          { params: { per_page: 1, due: 'overdue' } }),
        ])
        const projectActive = await api.get('/projects', { params: { per_page: 1, status: 'active' } })
        setStats({
          total_projects:    projects.data.meta?.total ?? 0,
          active_projects:   projectActive.data.meta?.total ?? 0,
          total_tasks:       tasks.data.meta?.total ?? 0,
          pending_tasks:     pending.data.meta?.total ?? 0,
          in_progress_tasks: inprog.data.meta?.total ?? 0,
          review_tasks:      review.data.meta?.total ?? 0,
          completed_tasks:   completed.data.meta?.total ?? 0,
          overdue_tasks:     overdue.data.meta?.total ?? 0,
          job_descriptions:  jds.data.meta?.total ?? 0,
        })
      } catch {
        setStats(null)
      }
    })()
  }, [])

  return (
    <div className="flex gap-6 h-full">
      <div className="flex-1 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
            <FolderKanban className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Projects &amp; Tasks</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Projects, tasks, AI-generated work plans &amp; multilingual staff helper — all in one place
            </p>
          </div>
        </div>

        {/* KPI Cards (row 1) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Active Projects', value: stats?.active_projects ?? '—', sub: 'In progress',           color: 'text-indigo-600',  bg: 'bg-indigo-50' },
            { label: 'Total Tasks',     value: stats?.total_tasks     ?? '—', sub: 'All statuses',          color: 'text-blue-600',    bg: 'bg-blue-50' },
            { label: 'Pending',         value: stats?.pending_tasks   ?? '—', sub: 'Not yet started',       color: 'text-amber-600',   bg: 'bg-amber-50' },
            { label: 'Overdue',         value: stats?.overdue_tasks   ?? '—', sub: 'Past due date',         color: 'text-rose-600',    bg: 'bg-rose-50' },
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
            { label: 'In Progress',     value: stats?.in_progress_tasks ?? '—', sub: 'Currently being worked', icon: Clock,        color: 'text-blue-600',    bg: 'bg-blue-50' },
            { label: 'In Review',       value: stats?.review_tasks      ?? '—', sub: 'Awaiting manager OK',    icon: AlertCircle,  color: 'text-amber-600',   bg: 'bg-amber-50' },
            { label: 'Completed',       value: stats?.completed_tasks   ?? '—', sub: 'Closed & approved',      icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Job Descriptions', value: stats?.job_descriptions ?? '—', sub: 'Templates for AI gen',   icon: FileText,     color: 'text-slate-700',   bg: 'bg-slate-50' },
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
                <Link key={r.label} href={r.href}
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
