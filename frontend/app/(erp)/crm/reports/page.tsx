'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import {
  PieChart, ArrowLeft, Users, TrendingUp, DollarSign, Filter,
  Hourglass, Activity, Megaphone, Award, AlertCircle, ScrollText,
  UserPlus, Cake, MessageSquare, Heart, BarChart2,
} from 'lucide-react'

const TABS = [
  { key: '360',       label: 'Customer 360°',         icon: Users        },
  { key: 'top',       label: 'Top Customers (RFM)',   icon: TrendingUp   },
  { key: 'ltv',       label: 'Lifetime Value',        icon: DollarSign   },
  { key: 'funnel',    label: 'Lead Conversion',       icon: Filter       },
  { key: 'forecast',  label: 'Pipeline Forecast',     icon: Hourglass    },
  { key: 'activity',  label: 'Activity Summary',      icon: Activity     },
  { key: 'campaign',  label: 'Campaign ROI',          icon: Megaphone    },
  { key: 'points',    label: 'Loyalty Points Ledger', icon: Award        },
  { key: 'aging',     label: 'Customer Aging',        icon: AlertCircle  },
  { key: 'inactive',  label: 'Inactive Customers',    icon: ScrollText   },
  { key: 'source',    label: 'Lead Source Analysis',  icon: UserPlus     },
  { key: 'birthdays', label: 'Birthdays / Anniv.',    icon: Cake         },
  { key: 'nps',       label: 'Reviews &amp; NPS',     icon: MessageSquare},
  { key: 'churn',     label: 'Retention &amp; Churn', icon: Heart        },
]

function ReportsInner() {
  const params = useSearchParams()
  const active = params.get('tab') ?? '360'
  const current = TABS.find(t => t.key === active) ?? TABS[0]
  const ActiveIcon = current.icon

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/crm" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><ArrowLeft className="w-4 h-4" /></Link>
        <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center">
          <PieChart className="w-5 h-5 text-teal-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">CRM Reports</h1>
          <p className="text-sm text-slate-500 mt-0.5">Conversion · LTV · RFM · Forecast · Campaign ROI</p>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="w-64 shrink-0">
          <div className="card sticky top-0">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100">
              <BarChart2 className="w-4 h-4 text-teal-600" />
              <h3 className="font-bold text-slate-800 text-sm">All Reports</h3>
            </div>
            <div className="space-y-0.5">
              {TABS.map(t => {
                const Icon = t.icon
                const isActive = t.key === active
                return (
                  <Link key={t.key} href={`/crm/reports?tab=${t.key}`}
                    className={`flex items-center gap-2.5 px-2 py-2 rounded-lg text-xs font-medium transition-colors ${isActive ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span dangerouslySetInnerHTML={{ __html: t.label }} />
                  </Link>
                )
              })}
            </div>
          </div>
        </div>

        <div className="flex-1">
          <div className="card">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center">
                <ActiveIcon className="w-5 h-5 text-teal-600" />
              </div>
              <h2 className="font-bold text-slate-800" dangerouslySetInnerHTML={{ __html: current.label }} />
            </div>

            <div className="text-center py-20 text-slate-400">
              <PieChart className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Report data will appear here once CRM transactions begin flowing.</p>
              <p className="text-xs mt-2 text-amber-600">Phase — wire after core CRM is live</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CrmReportsPage() {
  return (
    <Suspense fallback={null}>
      <ReportsInner />
    </Suspense>
  )
}
