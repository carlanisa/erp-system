'use client'

import Link from 'next/link'
import { Star, ArrowLeft, ThumbsUp, ThumbsDown, MessageSquare, AlertOctagon, TrendingUp } from 'lucide-react'

export default function FeedbackPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/crm" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><ArrowLeft className="w-4 h-4" /></Link>
        <div className="w-10 h-10 bg-pink-50 rounded-xl flex items-center justify-center">
          <Star className="w-5 h-5 text-pink-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reviews &amp; Feedback</h1>
          <p className="text-sm text-slate-500 mt-0.5">NPS, ratings, complaints — close the loop with every customer</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Avg Rating',  value: '—', sub: 'out of 5',           icon: Star,         color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'NPS Score',   value: '—', sub: 'promoters – detractors', icon: TrendingUp,   color: 'text-emerald-600',bg: 'bg-emerald-50' },
          { label: 'Promoters',   value: 0,   sub: 'Score 9-10',         icon: ThumbsUp,     color: 'text-blue-600',   bg: 'bg-blue-50' },
          { label: 'Open Complaints', value: 0, sub: 'Awaiting response',icon: AlertOctagon, color: 'text-rose-600',   bg: 'bg-rose-50' },
        ].map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className="card flex items-center gap-3">
              <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-slate-600">{s.label}</div>
                <div className="text-[11px] text-slate-400">{s.sub}</div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-pink-600" /> Recent Reviews
          </h3>
          <div className="text-center py-12 text-slate-400 text-sm">
            <Star className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No reviews yet
          </div>
        </div>
        <div className="card">
          <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <ThumbsDown className="w-4 h-4 text-rose-600" /> Open Complaints
          </h3>
          <div className="text-center py-12 text-slate-400 text-sm">
            <AlertOctagon className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No open complaints
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-slate-800 mb-2">What this module will do</h3>
        <ul className="text-sm text-slate-600 space-y-1.5 list-disc pl-5">
          <li>Auto-send NPS / rating link via WhatsApp 7 days after delivery</li>
          <li>Capture star rating (1–5) + free-text comment + photo</li>
          <li>Internal tagging: product issue, service issue, delivery, pricing</li>
          <li>Complaint ticket workflow — open → in progress → resolved → closed</li>
          <li>Auto-pull Google / Facebook reviews into one inbox (planned)</li>
          <li>Sentiment trend chart in <Link href="/crm/reports" className="text-indigo-600 hover:underline">Reports</Link></li>
          <li>Promoter follow-up: ask for a public review on Google / FB / TikTok</li>
        </ul>
        <p className="text-xs text-amber-600 mt-3">Phase — wire after core CRM is live</p>
      </div>
    </div>
  )
}
