'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Construction } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type Props = {
  title: string
  description: string
  icon: LucideIcon
  iconBg: string
  iconColor: string
  related?: { label: string; href: string }[]
}

export default function SupplierPlaceholder({ title, description, icon: Icon, iconBg, iconColor, related }: Props) {
  const router = useRouter()

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/suppliers')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <div className={`w-9 h-9 ${iconBg} rounded-xl flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800">{title}</h1>
            <p className="text-xs text-slate-400">{description}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 mx-auto bg-amber-50 rounded-2xl flex items-center justify-center mb-4">
            <Construction className="w-10 h-10 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Module Under Construction</h2>
          <p className="text-sm text-slate-500 mb-6">
            <span className="font-semibold text-slate-700">{title}</span> is the next module in the build queue.
            The screen, backend tables &amp; full PV-style flow (lines, installments, preview/print) will be added next.
          </p>
          {related && related.length > 0 && (
            <>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">In the meantime, you can use:</div>
              <div className="flex flex-col gap-2 items-center">
                {related.map(r => (
                  <Link key={r.href} href={r.href}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 inline-flex items-center gap-2">
                    {r.label} →
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
