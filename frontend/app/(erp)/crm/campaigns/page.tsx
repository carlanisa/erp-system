'use client'

import Link from 'next/link'
import { Megaphone, Plus, ArrowLeft, MessageSquare, Mail, Smartphone, Send, Filter } from 'lucide-react'

const CHANNELS = [
  { label: 'WhatsApp', icon: MessageSquare, color: 'text-emerald-700', bg: 'bg-emerald-50', desc: 'Bulk WhatsApp via official Business API or 3rd-party' },
  { label: 'SMS',      icon: Smartphone,    color: 'text-blue-600',    bg: 'bg-blue-50',    desc: 'SMS gateway integration (Malaysia local providers)' },
  { label: 'Email',    icon: Mail,          color: 'text-violet-600',  bg: 'bg-violet-50',  desc: 'HTML newsletter with merge tags &amp; tracking' },
]

export default function CampaignsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/crm" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><ArrowLeft className="w-4 h-4" /></Link>
          <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Marketing Campaigns</h1>
            <p className="text-sm text-slate-500 mt-0.5">Bulk WhatsApp · SMS · Email blasts with audience segmentation</p>
          </div>
        </div>
        <button className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> New Campaign</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {CHANNELS.map(c => {
          const Icon = c.icon
          return (
            <div key={c.label} className="card flex items-start gap-3">
              <div className={`w-12 h-12 ${c.bg} rounded-xl flex items-center justify-center shrink-0`}>
                <Icon className={`w-6 h-6 ${c.color}`} />
              </div>
              <div>
                <p className={`font-semibold ${c.color}`}>{c.label}</p>
                <p className="text-xs text-slate-500 mt-1" dangerouslySetInnerHTML={{ __html: c.desc }} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800">Recent Campaigns</h3>
          <button className="btn-outline flex items-center gap-2 text-xs"><Filter className="w-3.5 h-3.5" /> Filter</button>
        </div>
        <div className="text-center py-12 text-slate-400">
          <Send className="w-10 h-10 mx-auto mb-2 opacity-30" />
          No campaigns sent yet
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-slate-800 mb-2">What this module will do</h3>
        <ul className="text-sm text-slate-600 space-y-1.5 list-disc pl-5">
          <li><b>Audience builder</b> — filter by group, location, last purchase, total spent, tag</li>
          <li>Message composer with merge tags (<code className="text-xs bg-slate-100 px-1 rounded">{`{{name}}`}</code>, <code className="text-xs bg-slate-100 px-1 rounded">{`{{points}}`}</code>)</li>
          <li>Schedule for later or send now</li>
          <li>Per-recipient delivery status: sent · delivered · read · failed · clicked</li>
          <li>Templates library: Eid offer, sale, restock alert, birthday wish</li>
          <li>Opt-out / unsubscribe handling automatically</li>
          <li>Campaign ROI: revenue from recipients ÷ cost — in <Link href="/crm/reports" className="text-indigo-600 hover:underline">Reports</Link></li>
        </ul>
        <p className="text-xs text-amber-600 mt-3">Phase — wire after core CRM &amp; messaging gateways are connected</p>
      </div>
    </div>
  )
}
