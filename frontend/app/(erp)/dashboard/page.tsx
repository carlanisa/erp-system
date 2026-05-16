'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, FileText, Users, Package, UserCheck, Loader2 } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import StatCard from '@/components/ui/StatCard'

type DashStats = {
  revenue: number
  outstanding: number
  customers: number
  products: number
  employees: number
  invoices: number
}

type RecentInvoice = {
  id: number
  number: string
  customer: { name: string }
  total: number
  status: string
  issue_date: string
}

const statusBadge: Record<string, string> = {
  paid:      'badge-green',
  sent:      'badge-blue',
  draft:     'bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-medium',
  overdue:   'badge-red',
  cancelled: 'badge-red',
}

// Static monthly chart data (representative — can be made dynamic later)
const revenueData = [
  { month: 'Dec', revenue: 42000, expenses: 28000 },
  { month: 'Jan', revenue: 48000, expenses: 31000 },
  { month: 'Feb', revenue: 55000, expenses: 33000 },
  { month: 'Mar', revenue: 51000, expenses: 30000 },
  { month: 'Apr', revenue: 61000, expenses: 35000 },
  { month: 'May', revenue: 58000, expenses: 32000 },
]

const cashFlowData = [
  { month: 'Dec', cash: 14000 },
  { month: 'Jan', cash: 17000 },
  { month: 'Feb', cash: 22000 },
  { month: 'Mar', cash: 21000 },
  { month: 'Apr', cash: 26000 },
  { month: 'May', cash: 26000 },
]

export default function DashboardPage() {
  const [stats, setStats]     = useState<DashStats | null>(null)
  const [invoices, setInvoices] = useState<RecentInvoice[]>([])
  const [hrmStats, setHrm]    = useState<{ present_today: number; pending_leaves: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/stats'),
      api.get('/accounting/invoices', { params: { per_page: 5, sort: 'desc' } }),
      api.get('/hrm/employees/stats'),
    ]).then(([dashRes, invRes, hrmRes]) => {
      setStats(dashRes.data.data)
      setInvoices(invRes.data.data)
      setHrm(hrmRes.data.data)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
    </div>
  )

  return (
    <div className="space-y-6">

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={stats ? formatCurrency(stats.revenue) : '—'}
          change="Paid invoices total"
          trend="up"
          icon={DollarSign}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <StatCard
          title="Outstanding"
          value={stats ? formatCurrency(stats.outstanding) : '—'}
          change="Sent + overdue invoices"
          trend="down"
          icon={AlertCircle}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          title="Customers"
          value={stats ? String(stats.customers) : '—'}
          change="Total in CRM"
          trend="up"
          icon={Users}
          iconBg="bg-indigo-50"
          iconColor="text-indigo-600"
        />
        <StatCard
          title="Total Invoices"
          value={stats ? String(stats.invoices) : '—'}
          change="All time"
          trend="up"
          icon={FileText}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="card xl:col-span-2">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Revenue vs Expenses (6 months)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenueData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="revenue"  fill="#6366f1" radius={[4,4,0,0]} name="Revenue"  />
              <Bar dataKey="expenses" fill="#fca5a5" radius={[4,4,0,0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Net Cash Flow</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={cashFlowData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Line type="monotone" dataKey="cash" stroke="#10b981" strokeWidth={2} dot={false} name="Net Cash" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Summary + Recent Invoices */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Quick Summary */}
        <div className="card space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">Quick Summary</h3>
          {[
            { label: 'Total Customers',   value: stats?.customers       ?? 0,  icon: Users,      color: 'text-indigo-600',  bg: 'bg-indigo-50',  href: '/crm/customers' },
            { label: 'Total Products',    value: stats?.products        ?? 0,  icon: Package,    color: 'text-amber-600',   bg: 'bg-amber-50',   href: '/inventory/products' },
            { label: 'Total Employees',   value: stats?.employees       ?? 0,  icon: Users,      color: 'text-blue-600',    bg: 'bg-blue-50',    href: '/hrm/employees' },
            { label: 'Present Today',     value: hrmStats?.present_today ?? 0, icon: UserCheck,  color: 'text-green-600',   bg: 'bg-green-50',   href: '/hrm/attendance' },
            { label: 'Pending Leaves',    value: hrmStats?.pending_leaves ?? 0,icon: TrendingDown,color: 'text-red-500',    bg: 'bg-red-50',     href: '/hrm/leave' },
          ].map((item) => {
            const Icon = item.icon
            return (
              <Link key={item.label} href={item.href}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 ${item.bg} rounded-lg flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                  <span className="text-sm text-slate-600">{item.label}</span>
                </div>
                <span className="text-sm font-bold text-slate-800">{item.value}</span>
              </Link>
            )
          })}
        </div>

        {/* Recent Invoices */}
        <div className="card xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700">Recent Invoices</h3>
            <Link href="/accounting/invoices" className="text-xs text-indigo-600 hover:underline font-medium">
              View all
            </Link>
          </div>
          {invoices.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No invoices yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left text-xs text-slate-400 font-medium pb-2">Invoice</th>
                    <th className="text-left text-xs text-slate-400 font-medium pb-2">Customer</th>
                    <th className="text-right text-xs text-slate-400 font-medium pb-2">Amount</th>
                    <th className="text-center text-xs text-slate-400 font-medium pb-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5">
                        <Link href={`/accounting/invoices/${inv.id}`}
                          className="font-medium text-indigo-600 hover:underline">
                          {inv.number}
                        </Link>
                      </td>
                      <td className="py-2.5 text-slate-600">{inv.customer?.name}</td>
                      <td className="py-2.5 text-right font-medium text-slate-800">
                        {formatCurrency(inv.total)}
                      </td>
                      <td className="py-2.5 text-center">
                        <span className={statusBadge[inv.status] ?? 'badge-blue'}>{inv.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
