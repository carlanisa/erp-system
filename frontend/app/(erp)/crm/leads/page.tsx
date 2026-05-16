'use client'

import Link from 'next/link'
import { Target, Plus, ArrowLeft, Search, Filter, Globe, Phone, Users, Megaphone, MapPin } from 'lucide-react'

const SOURCES = [
  { label: 'Walk-in',    icon: MapPin,    color: 'text-slate-700',  bg: 'bg-slate-50'  },
  { label: 'Website',    icon: Globe,     color: 'text-blue-600',   bg: 'bg-blue-50'   },
  { label: 'Phone Call', icon: Phone,     color: 'text-emerald-600',bg: 'bg-emerald-50'},
  { label: 'Referral',   icon: Users,     color: 'text-violet-600', bg: 'bg-violet-50' },
  { label: 'Facebook',   icon: Megaphone, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { label: 'Instagram',  icon: Megaphone, color: 'text-pink-600',   bg: 'bg-pink-50'   },
  { label: 'TikTok',     icon: Megaphone, color: 'text-rose-600',   bg: 'bg-rose-50'   },
  { label: 'Shopee',     icon: Megaphone, color: 'text-orange-600', bg: 'bg-orange-50' },
]

const STATUSES = ['New', 'Contacted', 'Qualified', 'Proposal Sent', 'Won', 'Lost']

export default function LeadsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/crm" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><ArrowLeft className="w-4 h-4" /></Link>
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <Target className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Leads</h1>
            <p className="text-sm text-slate-500 mt-0.5">Capture inquiries before they become customers</p>
          </div>
        </div>
        <button className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> New Lead</button>
      </div>

      {/* Status pipeline strip */}
      <div className="card">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {STATUSES.map((s, i) => (
            <div key={s} className="flex items-center gap-2 shrink-0">
              <div className={`px-3 py-1.5 rounded-lg text-xs font-medium ${i === 0 ? 'bg-blue-100 text-blue-700' : i === STATUSES.length - 2 ? 'bg-emerald-100 text-emerald-700' : i === STATUSES.length - 1 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                {s} <span className="ml-1 opacity-60">0</span>
              </div>
              {i < STATUSES.length - 1 && <span className="text-slate-300">→</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input placeholder="Search leads by name, phone, source..." className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <button className="btn-outline flex items-center gap-2"><Filter className="w-4 h-4" /> Filter</button>
        </div>

        <div className="text-center py-16 text-slate-400">
          <Target className="w-10 h-10 mx-auto mb-2 opacity-30" />
          No leads yet — click <span className="font-semibold text-indigo-600">New Lead</span> to start capturing
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-slate-800 mb-3">Lead Sources (default)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {SOURCES.map(s => {
            const Icon = s.icon
            return (
              <div key={s.label} className={`flex items-center gap-2 px-3 py-2 ${s.bg} rounded-lg`}>
                <Icon className={`w-4 h-4 ${s.color}`} />
                <span className={`text-xs font-medium ${s.color}`}>{s.label}</span>
              </div>
            )
          })}
        </div>
        <p className="text-xs text-slate-400 mt-3">Sources are configurable in <Link href="/crm/settings" className="text-indigo-600 hover:underline">CRM Settings</Link></p>
      </div>

      <div className="card">
        <h3 className="font-semibold text-slate-800 mb-2">What this module will do</h3>
        <ul className="text-sm text-slate-600 space-y-1.5 list-disc pl-5">
          <li>Capture name, phone, source, interest, expected value, owner</li>
          <li>Convert lead → Customer (creates customer record + first activity)</li>
          <li>Convert lead → Quotation in one click</li>
          <li>Auto-assign to sales rep by territory / source rule</li>
          <li>Status flow: New → Contacted → Qualified → Proposal → Won / Lost</li>
          <li>Source-wise conversion analytics in CRM Reports</li>
        </ul>
        <p className="text-xs text-amber-600 mt-3">Phase — wire after core CRM is live</p>
      </div>
    </div>
  )
}
