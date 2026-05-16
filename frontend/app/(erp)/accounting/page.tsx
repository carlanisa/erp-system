import PageHeader from '@/components/ui/PageHeader'
import StatCard from '@/components/ui/StatCard'
import { BookOpen, FileText, CreditCard, Banknote, TrendingUp } from 'lucide-react'
import Link from 'next/link'

const modules = [
  { title: 'Chart of Accounts', href: '/accounting/chart-of-accounts', icon: BookOpen,   desc: 'Manage your ledger accounts',          color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { title: 'Journal Entries',   href: '/accounting/journal-entries',   icon: FileText,   desc: 'Record double-entry transactions',      color: 'text-blue-600',   bg: 'bg-blue-50' },
  { title: 'Invoices',          href: '/accounting/invoices',          icon: TrendingUp, desc: 'Create and manage customer invoices',   color: 'text-emerald-600',bg: 'bg-emerald-50' },
  { title: 'Bills',             href: '/accounting/bills',             icon: CreditCard, desc: 'Track vendor bills and payments',       color: 'text-amber-600',  bg: 'bg-amber-50' },
  { title: 'Bank Reconciliation',href: '/accounting/bank-reconciliation',icon: Banknote, desc: 'Reconcile bank statements',            color: 'text-purple-600', bg: 'bg-purple-50' },
]

export default function AccountingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounting"
        description="Complete double-entry accounting system"
        icon={BookOpen}
        action={<button className="btn-primary">+ New Journal Entry</button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total Receivable" value="RM 91,500"  trend="up"   change="+8% this month" icon={TrendingUp} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
        <StatCard title="Total Payable"    value="RM 54,200"  trend="down" change="-3% this month" icon={CreditCard}  iconBg="bg-red-50"    iconColor="text-red-500" />
        <StatCard title="Bank Balance"     value="RM 248,000" trend="up"  change="+15% this month" icon={Banknote}   iconBg="bg-blue-50"   iconColor="text-blue-600" />
        <StatCard title="Net Profit (MTD)" value="RM 37,300"  trend="up"  change="+22% vs last month" icon={BookOpen} iconBg="bg-indigo-50" iconColor="text-indigo-600" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((m) => {
          const Icon = m.icon
          return (
            <Link key={m.href} href={m.href} className="card hover:shadow-md transition-shadow group">
              <div className={`w-10 h-10 ${m.bg} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <Icon className={`w-5 h-5 ${m.color}`} />
              </div>
              <h3 className="font-semibold text-slate-800 text-sm">{m.title}</h3>
              <p className="text-slate-500 text-xs mt-1">{m.desc}</p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
