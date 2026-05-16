import type { LucideIcon } from 'lucide-react'

type Props = {
  title: string
  description?: string
  icon?: LucideIcon
  action?: React.ReactNode
}

export default function PageHeader({ title, description, icon: Icon, action }: Props) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center">
            <Icon className="w-5 h-5 text-indigo-600" />
          </div>
        )}
        <div>
          <h1 className="text-lg font-bold text-slate-800">{title}</h1>
          {description && <p className="text-sm text-slate-500">{description}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
