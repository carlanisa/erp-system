'use client'

import Link from 'next/link'
import { FileSignature, Plus, ArrowLeft, Search, FileText, CheckCircle2, XCircle, Clock } from 'lucide-react'

const STATUSES = [
  { label: 'Draft',     icon: FileText,    color: 'text-slate-600',   bg: 'bg-slate-50' },
  { label: 'Sent',      icon: Clock,       color: 'text-blue-600',    bg: 'bg-blue-50' },
  { label: 'Accepted',  icon: CheckCircle2,color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { label: 'Rejected',  icon: XCircle,     color: 'text-rose-600',    bg: 'bg-rose-50' },
  { label: 'Expired',   icon: Clock,       color: 'text-amber-600',   bg: 'bg-amber-50' },
]

export default function QuotationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/crm" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><ArrowLeft className="w-4 h-4" /></Link>
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
            <FileSignature className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Quotations</h1>
            <p className="text-sm text-slate-500 mt-0.5">Estimates &amp; proposals — convert to Sale Order in one click</p>
          </div>
        </div>
        <button className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> New Quotation</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {STATUSES.map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className="card flex items-center gap-3">
              <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <div className={`text-lg font-bold ${s.color}`}>0</div>
                <div className="text-[11px] font-medium text-slate-600">{s.label}</div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="card">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input placeholder="Search by quote no, customer, status..." className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>

        <div className="text-center py-16 text-slate-400">
          <FileSignature className="w-10 h-10 mx-auto mb-2 opacity-30" />
          No quotations yet — click <span className="font-semibold text-indigo-600">New Quotation</span> to start
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-slate-800 mb-2">What this module will do</h3>
        <ul className="text-sm text-slate-600 space-y-1.5 list-disc pl-5">
          <li>Quote layout: customer, line items, tax, discount, validity, terms</li>
          <li>Auto-generated quote number — format configurable in Settings</li>
          <li>Email / WhatsApp / PDF download with one click</li>
          <li><b>Convert → Sale Order</b> or <b>Convert → Sale Invoice</b> (carries lines &amp; pricing)</li>
          <li>Auto-expire after validity date, send reminder before expiry</li>
          <li>Revision history — &quot;Quote v2, v3&quot; with reason</li>
          <li>Approval flow for high-value quotes (over RM threshold)</li>
        </ul>
        <p className="text-xs text-amber-600 mt-3">Phase — wire after core CRM is live</p>
      </div>
    </div>
  )
}
