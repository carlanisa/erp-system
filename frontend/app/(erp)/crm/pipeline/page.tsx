'use client'

import Link from 'next/link'
import { TrendingUp, Plus, ArrowLeft, MoreVertical, DollarSign } from 'lucide-react'

type Stage = {
  key: string
  title: string
  color: string
  bg: string
  border: string
  count: number
  value: number
}

const STAGES: Stage[] = [
  { key: 'new',        title: 'New',           color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200',    count: 0, value: 0 },
  { key: 'contacted',  title: 'Contacted',     color: 'text-cyan-700',    bg: 'bg-cyan-50',    border: 'border-cyan-200',    count: 0, value: 0 },
  { key: 'qualified',  title: 'Qualified',     color: 'text-violet-700',  bg: 'bg-violet-50',  border: 'border-violet-200',  count: 0, value: 0 },
  { key: 'proposal',   title: 'Proposal Sent', color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',   count: 0, value: 0 },
  { key: 'negotiation',title: 'Negotiation',   color: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-200',  count: 0, value: 0 },
  { key: 'won',        title: 'Won',           color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', count: 0, value: 0 },
  { key: 'lost',       title: 'Lost',          color: 'text-rose-700',    bg: 'bg-rose-50',    border: 'border-rose-200',    count: 0, value: 0 },
]

export default function PipelinePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/crm" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><ArrowLeft className="w-4 h-4" /></Link>
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Sales Pipeline</h1>
            <p className="text-sm text-slate-500 mt-0.5">Drag &amp; drop deal stages — Kanban view</p>
          </div>
        </div>
        <button className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> New Deal</button>
      </div>

      {/* Kanban board */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-3 min-w-max">
          {STAGES.map(s => (
            <div key={s.key} className={`w-64 shrink-0 rounded-xl border ${s.border} ${s.bg} p-3`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className={`font-semibold text-sm ${s.color}`}>{s.title}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{s.count} deals · RM {s.value.toLocaleString()}</p>
                </div>
                <button className="p-1 rounded hover:bg-white/50 text-slate-400"><MoreVertical className="w-4 h-4" /></button>
              </div>
              <div className="space-y-2 min-h-[200px]">
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center text-xs text-slate-400 bg-white/50">
                  Drop deals here
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-slate-800 mb-2">What this module will do</h3>
        <ul className="text-sm text-slate-600 space-y-1.5 list-disc pl-5">
          <li>Drag-and-drop deals across stages — auto-update status &amp; stamp date</li>
          <li>Each deal card: customer, expected value, close date, owner, last activity</li>
          <li>Stage-level totals &amp; win-probability weighting for forecast</li>
          <li>Click a card → open full deal with timeline, files, related quote &amp; invoice</li>
          <li>Filter by owner / source / value / close-date range</li>
          <li>Custom stages configurable in <Link href="/crm/settings" className="text-indigo-600 hover:underline">CRM Settings</Link></li>
        </ul>
        <p className="text-xs text-amber-600 mt-3">Phase — wire after core CRM is live</p>
      </div>
    </div>
  )
}
