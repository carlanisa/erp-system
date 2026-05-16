'use client'

import Link from 'next/link'
import { CheckSquare, Plus, ArrowLeft, Phone, Mail, Calendar, MessageSquare, StickyNote, Video } from 'lucide-react'

const TYPES = [
  { label: 'Call',     icon: Phone,         color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { label: 'Email',    icon: Mail,          color: 'text-blue-600',    bg: 'bg-blue-50'    },
  { label: 'Meeting',  icon: Video,         color: 'text-violet-600',  bg: 'bg-violet-50'  },
  { label: 'WhatsApp', icon: MessageSquare, color: 'text-emerald-700', bg: 'bg-emerald-50' },
  { label: 'Visit',    icon: Calendar,      color: 'text-amber-600',   bg: 'bg-amber-50'   },
  { label: 'Note',     icon: StickyNote,    color: 'text-slate-600',   bg: 'bg-slate-50'   },
]

export default function ActivitiesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/crm" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><ArrowLeft className="w-4 h-4" /></Link>
          <div className="w-10 h-10 bg-cyan-50 rounded-xl flex items-center justify-center">
            <CheckSquare className="w-5 h-5 text-cyan-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Activities &amp; Tasks</h1>
            <p className="text-sm text-slate-500 mt-0.5">Calls, meetings, notes &amp; reminders — every customer touchpoint logged</p>
          </div>
        </div>
        <button className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Log Activity</button>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {TYPES.map(t => {
          const Icon = t.icon
          return (
            <div key={t.label} className="card flex flex-col items-center gap-2 py-4">
              <div className={`w-10 h-10 ${t.bg} rounded-xl flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${t.color}`} />
              </div>
              <span className={`text-xs font-medium ${t.color}`}>{t.label}</span>
              <span className="text-[11px] text-slate-400">0</span>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-slate-800 mb-3">Today&apos;s Tasks</h3>
          <div className="text-center py-12 text-slate-400 text-sm">
            <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No tasks scheduled today
          </div>
        </div>
        <div className="card">
          <h3 className="font-semibold text-slate-800 mb-3">Upcoming (7 days)</h3>
          <div className="text-center py-12 text-slate-400 text-sm">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
            Nothing upcoming
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-slate-800 mb-2">What this module will do</h3>
        <ul className="text-sm text-slate-600 space-y-1.5 list-disc pl-5">
          <li>Log every interaction (call, email, meeting, WhatsApp, visit, note)</li>
          <li>Each activity tied to a Customer / Lead / Deal</li>
          <li>Today + Upcoming + Overdue dashboards per sales rep</li>
          <li>Calendar view with day / week / month toggle</li>
          <li>Auto-reminder push: 15 min before, 1 day before, on the day</li>
          <li>Outcome capture: completed, rescheduled, no-show, cancelled</li>
          <li>Activity timeline on every customer profile (full history)</li>
        </ul>
        <p className="text-xs text-amber-600 mt-3">Phase — wire after core CRM is live</p>
      </div>
    </div>
  )
}
