'use client'

import Link from 'next/link'
import { UsersRound, Plus, ArrowLeft, Crown, Building2, ShoppingBag, Footprints } from 'lucide-react'

const SAMPLE_GROUPS = [
  { name: 'VIP',       color: 'text-yellow-700', bg: 'bg-yellow-50',  border: 'border-yellow-200', icon: Crown,       desc: 'High-value, top 10% spenders — extra discount + priority service' },
  { name: 'Wholesale', color: 'text-blue-700',   bg: 'bg-blue-50',    border: 'border-blue-200',   icon: Building2,   desc: 'B2B / bulk buyers — credit terms, tier pricing' },
  { name: 'Retail',    color: 'text-indigo-700', bg: 'bg-indigo-50',  border: 'border-indigo-200', icon: ShoppingBag, desc: 'Regular retail customers — standard pricing' },
  { name: 'Walk-in',   color: 'text-slate-700',  bg: 'bg-slate-50',   border: 'border-slate-200',  icon: Footprints,  desc: 'Cash counter / one-off buyers — no profile required' },
]

export default function CustomerGroupsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/crm" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><ArrowLeft className="w-4 h-4" /></Link>
          <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center">
            <UsersRound className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Customer Groups</h1>
            <p className="text-sm text-slate-500 mt-0.5">Segmentation for pricing, marketing &amp; loyalty rules</p>
          </div>
        </div>
        <button className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> New Group</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SAMPLE_GROUPS.map(g => {
          const Icon = g.icon
          return (
            <div key={g.name} className={`card border ${g.border} flex items-start gap-4`}>
              <div className={`w-12 h-12 ${g.bg} rounded-xl flex items-center justify-center shrink-0`}>
                <Icon className={`w-6 h-6 ${g.color}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className={`font-semibold ${g.color}`}>{g.name}</h3>
                  <span className="text-xs text-slate-400">0 customers</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{g.desc}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="card">
        <h3 className="font-semibold text-slate-800 mb-2">What this module will do</h3>
        <ul className="text-sm text-slate-600 space-y-1.5 list-disc pl-5">
          <li>Tag customers into groups (VIP, Wholesale, Retail, Walk-in or custom)</li>
          <li>Group-based price lists &amp; discount rules in POS / Sale Invoice</li>
          <li>Loyalty multipliers per group (e.g. VIP earns 2x points)</li>
          <li>Filter campaigns by group — &quot;send Eid offer to VIP only&quot;</li>
          <li>Credit limit defaults at group level</li>
        </ul>
        <p className="text-xs text-amber-600 mt-3">Phase — wire after core CRM is live</p>
      </div>
    </div>
  )
}
