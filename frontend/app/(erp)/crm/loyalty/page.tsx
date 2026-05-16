'use client'

import Link from 'next/link'
import { Award, ArrowLeft, Gift, TrendingUp, Crown, Sparkles, Coins } from 'lucide-react'

const TIERS = [
  { name: 'Bronze',   color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',   threshold: 'RM 0+',     mult: '1×',  perks: 'Welcome bonus 50 pts' },
  { name: 'Silver',   color: 'text-slate-700',   bg: 'bg-slate-50',   border: 'border-slate-200',   threshold: 'RM 1,000+', mult: '1.25×', perks: 'Free alteration, birthday bonus 200 pts' },
  { name: 'Gold',     color: 'text-yellow-700',  bg: 'bg-yellow-50',  border: 'border-yellow-200',  threshold: 'RM 5,000+', mult: '1.5×',  perks: 'Priority service, free delivery, anniversary gift' },
  { name: 'Platinum', color: 'text-violet-700',  bg: 'bg-violet-50',  border: 'border-violet-200',  threshold: 'RM 15,000+',mult: '2×',    perks: 'Personal stylist, VIP launches, double-points weekends' },
]

export default function LoyaltyPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/crm" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><ArrowLeft className="w-4 h-4" /></Link>
        <div className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center">
          <Award className="w-5 h-5 text-yellow-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Loyalty &amp; Points</h1>
          <p className="text-sm text-slate-500 mt-0.5">Reward repeat customers — points, tiers, redemption</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Members',          value: 0, icon: Crown,      color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Points Issued',    value: 0, icon: Coins,      color: 'text-emerald-600',bg: 'bg-emerald-50' },
          { label: 'Points Redeemed',  value: 0, icon: Gift,       color: 'text-rose-600',   bg: 'bg-rose-50' },
          { label: 'Liability (RM)',   value: 0, icon: TrendingUp, color: 'text-blue-600',   bg: 'bg-blue-50' },
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
              </div>
            </div>
          )
        })}
      </div>

      <div>
        <h3 className="font-semibold text-slate-800 mb-3">Loyalty Tiers (sample)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {TIERS.map(t => (
            <div key={t.name} className={`card border ${t.border} ${t.bg}`}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className={`w-4 h-4 ${t.color}`} />
                <p className={`font-bold ${t.color}`}>{t.name}</p>
              </div>
              <p className="text-xs text-slate-600">Spend: <b>{t.threshold}</b></p>
              <p className="text-xs text-slate-600">Earn: <b>{t.mult}</b> points per RM 1</p>
              <p className="text-xs text-slate-500 mt-2">{t.perks}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-slate-800 mb-2">What this module will do</h3>
        <ul className="text-sm text-slate-600 space-y-1.5 list-disc pl-5">
          <li>Auto-credit points on Sale Invoice / POS payment (rule-based)</li>
          <li>Redeem points at POS as discount (1 pt = RM 0.01 default, configurable)</li>
          <li>Tier auto-upgrade based on rolling 12-month spend</li>
          <li>Bonus events: double points weekends, birthday boost, referral reward</li>
          <li>Points ledger per customer — credit, debit, expiry, balance</li>
          <li>Liability auto-posted to GL — outstanding points = unearned revenue</li>
          <li>Expiry rules: e.g. points expire after 24 months of inactivity</li>
        </ul>
        <p className="text-xs text-amber-600 mt-3">Phase — wire after POS &amp; Sale Invoice are live</p>
      </div>
    </div>
  )
}
