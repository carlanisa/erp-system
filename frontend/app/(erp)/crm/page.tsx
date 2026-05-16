'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Target, Users, UsersRound, TrendingUp, FileSignature,
  CheckSquare, Phone, Megaphone, Award, Star,
  BarChart2, DollarSign, FileText,
  AlertCircle, Cake, Activity, MessageSquare,
  ScrollText, Filter, Hourglass, UserPlus, Heart,
  Layers,
} from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

type Stats = {
  total_customers: number
  active_leads: number
  pipeline_value: number
  won_this_month: number
  open_quotations: number
  follow_ups_due: number
  loyalty_members: number
  campaigns_running: number
}

const MODULES = [
  {
    title: 'Master Setup',
    href:  '/crm/setup',
    icon:  Layers,
    color: 'text-slate-700',
    bg:    'bg-slate-50',
    border:'border-slate-200',
    desc:  'Sources · Stages · Groups · Tiers · Activity Types · Templates',
  },
  {
    title: 'Customers',
    href:  '/crm/customers',
    icon:  Users,
    color: 'text-indigo-600',
    bg:    'bg-indigo-50',
    border:'border-indigo-100',
    desc:  '360° master — contact, history, dues, measurements',
  },
  {
    title: 'Customer Groups',
    href:  '/crm/groups',
    icon:  UsersRound,
    color: 'text-violet-600',
    bg:    'bg-violet-50',
    border:'border-violet-100',
    desc:  'VIP · Wholesale · Retail · Walk-in segmentation',
  },
  {
    title: 'Leads',
    href:  '/crm/leads',
    icon:  Target,
    color: 'text-blue-600',
    bg:    'bg-blue-50',
    border:'border-blue-100',
    desc:  'Capture inquiries — walk-in, web, social, referral',
  },
  {
    title: 'Pipeline (Kanban)',
    href:  '/crm/pipeline',
    icon:  TrendingUp,
    color: 'text-emerald-600',
    bg:    'bg-emerald-50',
    border:'border-emerald-100',
    desc:  'Drag deals through New → Qualified → Won / Lost',
  },
  {
    title: 'Quotations',
    href:  '/crm/quotations',
    icon:  FileSignature,
    color: 'text-amber-600',
    bg:    'bg-amber-50',
    border:'border-amber-100',
    desc:  'Estimates & proposals — convert to Sales Order',
  },
  {
    title: 'Customer Invoice',
    href:  '/crm/invoices',
    icon:  FileText,
    color: 'text-blue-700',
    bg:    'bg-blue-50',
    border:'border-blue-100',
    desc:  'Issue invoice with products + embedded payment installments',
  },
  {
    title: 'Activities & Tasks',
    href:  '/crm/activities',
    icon:  CheckSquare,
    color: 'text-cyan-600',
    bg:    'bg-cyan-50',
    border:'border-cyan-100',
    desc:  'Calls · meetings · notes · reminders calendar',
  },
  {
    title: 'Follow-ups',
    href:  '/crm/follow-ups',
    icon:  Phone,
    color: 'text-rose-600',
    bg:    'bg-rose-50',
    border:'border-rose-100',
    desc:  'Auto-schedule — pending pickup, due payments, retention',
  },
  {
    title: 'Marketing Campaigns',
    href:  '/crm/campaigns',
    icon:  Megaphone,
    color: 'text-orange-600',
    bg:    'bg-orange-50',
    border:'border-orange-100',
    desc:  'WhatsApp · SMS · Email blast with segmentation',
  },
  {
    title: 'Loyalty & Points',
    href:  '/crm/loyalty',
    icon:  Award,
    color: 'text-yellow-600',
    bg:    'bg-yellow-50',
    border:'border-yellow-100',
    desc:  'Points engine, tier rules, reward redemption',
  },
  {
    title: 'Reviews & Feedback',
    href:  '/crm/feedback',
    icon:  Star,
    color: 'text-pink-600',
    bg:    'bg-pink-50',
    border:'border-pink-100',
    desc:  'NPS, Google / Facebook reviews, complaint log',
  },
]

const REPORTS = [
  { label: 'Customer 360° View',         href: '/crm/reports?tab=360',       icon: Users        },
  { label: 'Top Customers (RFM)',        href: '/crm/reports?tab=top',       icon: TrendingUp   },
  { label: 'Customer Lifetime Value',    href: '/crm/reports?tab=ltv',       icon: DollarSign   },
  { label: 'Lead Conversion Funnel',     href: '/crm/reports?tab=funnel',    icon: Filter       },
  { label: 'Pipeline Forecast',          href: '/crm/reports?tab=forecast',  icon: Hourglass    },
  { label: 'Activity Summary',           href: '/crm/reports?tab=activity',  icon: Activity     },
  { label: 'Campaign ROI',               href: '/crm/reports?tab=campaign',  icon: Megaphone    },
  { label: 'Loyalty Points Ledger',      href: '/crm/reports?tab=points',    icon: Award        },
  { label: 'Customer Aging (A/R)',       href: '/crm/reports?tab=aging',     icon: AlertCircle  },
  { label: 'Inactive Customers',         href: '/crm/reports?tab=inactive',  icon: ScrollText   },
  { label: 'Lead Source Analysis',       href: '/crm/reports?tab=source',    icon: UserPlus     },
  { label: 'Birthday & Anniversaries',   href: '/crm/reports?tab=birthdays', icon: Cake         },
  { label: 'Reviews & NPS',              href: '/crm/reports?tab=nps',       icon: MessageSquare},
  { label: 'Retention & Churn',          href: '/crm/reports?tab=churn',     icon: Heart        },
]

export default function CrmPage() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    api.get('/crm/customers', { params: { per_page: 1 } })
      .then(r => {
        setStats({
          total_customers:  r.data.meta?.total ?? 0,
          active_leads:     0,
          pipeline_value:   0,
          won_this_month:   0,
          open_quotations:  0,
          follow_ups_due:   0,
          loyalty_members:  0,
          campaigns_running:0,
        })
      })
      .catch(() => {})
  }, [])

  return (
    <div className="flex gap-6 h-full">
      {/* ── Main content ── */}
      <div className="flex-1 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
            <Target className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">CRM</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Customer relationships, leads, pipeline, marketing &amp; loyalty — one cockpit
            </p>
          </div>
        </div>

        {/* KPI Row 1 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Customers',  value: stats?.total_customers ?? '—', sub: 'Master records',          color: 'text-indigo-600',  bg: 'bg-indigo-50'  },
            { label: 'Active Leads',     value: stats?.active_leads    ?? '—', sub: 'Open inquiries',          color: 'text-blue-600',    bg: 'bg-blue-50'    },
            { label: 'Pipeline Value',   value: stats ? formatCurrency(stats.pipeline_value) : '—', sub: 'Open deals total',        color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Won This Month',   value: stats ? formatCurrency(stats.won_this_month) : '—', sub: 'Closed-won revenue',      color: 'text-amber-600',   bg: 'bg-amber-50'   },
          ].map(s => (
            <div key={s.label} className="card">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value as any}</div>
              <div className="text-xs font-medium text-slate-600 mt-0.5">{s.label}</div>
              <div className="text-xs text-slate-400 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* KPI Row 2 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Open Quotations',   value: stats?.open_quotations  ?? '—', sub: 'Awaiting customer reply', icon: FileSignature, color: 'text-amber-600',  bg: 'bg-amber-50'  },
            { label: 'Follow-ups Due',    value: stats?.follow_ups_due   ?? '—', sub: 'Today + overdue',         icon: Phone,         color: 'text-rose-600',   bg: 'bg-rose-50'   },
            { label: 'Loyalty Members',   value: stats?.loyalty_members  ?? '—', sub: 'Enrolled customers',      icon: Award,         color: 'text-yellow-600', bg: 'bg-yellow-50' },
            { label: 'Campaigns Running', value: stats?.campaigns_running?? '—', sub: 'Active broadcasts',       icon: Megaphone,     color: 'text-orange-600', bg: 'bg-orange-50' },
          ].map(s => {
            const Icon = s.icon
            return (
              <div key={s.label} className="card flex items-center gap-3">
                <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div className="min-w-0">
                  <div className={`text-base font-bold ${s.color} truncate`}>{s.value as any}</div>
                  <div className="text-xs font-medium text-slate-600 truncate">{s.label}</div>
                  <div className="text-[11px] text-slate-400 truncate">{s.sub}</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Module Tiles */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {MODULES.map(m => {
            const Icon = m.icon
            return (
              <Link key={m.href} href={m.href}
                className={`card border ${m.border} hover:shadow-lg transition-all group flex flex-col items-center text-center py-6 gap-3`}>
                <div className={`w-16 h-16 ${m.bg} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm`}>
                  <Icon className={`w-8 h-8 ${m.color}`} />
                </div>
                <div>
                  <p className={`font-semibold text-sm ${m.color}`}>{m.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{m.desc}</p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* ── Reports Panel (right side, like HRM / Suppliers) ── */}
      <div className="w-64 shrink-0">
        <div className="card sticky top-0">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
            <BarChart2 className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-sm">Reports</h3>
          </div>
          <div className="space-y-0.5">
            {REPORTS.map(r => {
              const Icon = r.icon
              return (
                <Link key={r.href} href={r.href}
                  className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors group">
                  <Icon className="w-3.5 h-3.5 shrink-0 text-slate-400 group-hover:text-indigo-500" />
                  <span className="text-xs font-medium">{r.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
