'use client'

import Link from 'next/link'
import { Phone, ArrowLeft, AlertCircle, Clock, CheckCircle2, Bell, Package, CreditCard, Heart } from 'lucide-react'

const RULES = [
  { title: 'Pending Pickup',     icon: Package,    color: 'text-amber-600',   bg: 'bg-amber-50',   desc: 'Auto-reminder 1 day after order ready — &quot;Your order is waiting&quot;' },
  { title: 'Payment Due',        icon: CreditCard, color: 'text-rose-600',    bg: 'bg-rose-50',    desc: 'A/R overdue — escalation 7 / 15 / 30 days' },
  { title: 'Quotation Reminder', icon: Bell,       color: 'text-blue-600',    bg: 'bg-blue-50',    desc: 'Nudge customer before quote expires' },
  { title: 'Re-engagement',      icon: Heart,      color: 'text-pink-600',    bg: 'bg-pink-50',    desc: 'Inactive 60 / 90 / 180 days — bring back offer' },
  { title: 'Birthday / Anniversary', icon: Bell,   color: 'text-violet-600',  bg: 'bg-violet-50',  desc: 'Auto-greeting + special discount on birthday' },
  { title: 'Post-purchase Check-in', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', desc: '7 days after delivery — satisfaction check' },
]

export default function FollowUpsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/crm" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><ArrowLeft className="w-4 h-4" /></Link>
        <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center">
          <Phone className="w-5 h-5 text-rose-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Follow-ups</h1>
          <p className="text-sm text-slate-500 mt-0.5">Automated reminders &amp; manual call-back queue</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Overdue',    value: 0, color: 'text-rose-600',  bg: 'bg-rose-50',  icon: AlertCircle },
          { label: 'Due Today',  value: 0, color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock       },
          { label: 'Completed',  value: 0, color: 'text-emerald-600',bg:'bg-emerald-50',icon: CheckCircle2 },
        ].map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className="card flex items-center gap-4">
              <div className={`w-12 h-12 ${s.bg} rounded-xl flex items-center justify-center`}>
                <Icon className={`w-6 h-6 ${s.color}`} />
              </div>
              <div>
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-slate-600">{s.label}</div>
              </div>
            </div>
          )
        })}
      </div>

      <div>
        <h3 className="font-semibold text-slate-800 mb-3">Auto-rule Templates</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {RULES.map(r => {
            const Icon = r.icon
            return (
              <div key={r.title} className="card flex items-start gap-3">
                <div className={`w-10 h-10 ${r.bg} rounded-xl flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${r.color}`} />
                </div>
                <div>
                  <p className={`font-semibold text-sm ${r.color}`}>{r.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5" dangerouslySetInnerHTML={{ __html: r.desc }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-slate-800 mb-2">What this module will do</h3>
        <ul className="text-sm text-slate-600 space-y-1.5 list-disc pl-5">
          <li>Pre-built rules trigger reminders automatically (pickup, dues, birthday)</li>
          <li>Custom rules — &quot;if customer hasn&apos;t bought in 60 days then create call-back task&quot;</li>
          <li>Daily call-back queue per sales rep — sorted by priority</li>
          <li>Channel choice: WhatsApp blast, SMS, email, or manual call task</li>
          <li>Snooze, complete, or escalate from a single click</li>
          <li>Tied to <Link href="/crm/activities" className="text-indigo-600 hover:underline">Activities</Link> — every follow-up creates an activity log</li>
        </ul>
        <p className="text-xs text-amber-600 mt-3">Phase — wire after core CRM is live</p>
      </div>
    </div>
  )
}
