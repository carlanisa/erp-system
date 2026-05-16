import { clsx } from 'clsx'
import { TrendingUp, TrendingDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type Props = {
  title: string
  value: string
  change?: string
  trend?: 'up' | 'down' | 'neutral'
  icon: LucideIcon
  iconColor?: string
  iconBg?: string
}

export default function StatCard({ title, value, change, trend = 'neutral', icon: Icon, iconColor = 'text-indigo-600', iconBg = 'bg-indigo-50' }: Props) {
  return (
    <div className="card flex items-start justify-between">
      <div>
        <p className="text-sm text-slate-500 font-medium">{title}</p>
        <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
        {change && (
          <div className={clsx('flex items-center gap-1 mt-1 text-xs font-medium', {
            'text-emerald-600': trend === 'up',
            'text-red-500':     trend === 'down',
            'text-slate-500':   trend === 'neutral',
          })}>
            {trend === 'up'   && <TrendingUp  className="w-3 h-3" />}
            {trend === 'down' && <TrendingDown className="w-3 h-3" />}
            {change}
          </div>
        )}
      </div>
      <div className={clsx('w-11 h-11 rounded-xl flex items-center justify-center', iconBg)}>
        <Icon className={clsx('w-5 h-5', iconColor)} />
      </div>
    </div>
  )
}
