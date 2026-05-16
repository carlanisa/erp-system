'use client'

import Link from 'next/link'
import { ArrowLeft, Home } from 'lucide-react'

type Props = {
  /** Override label (default "Back to HRM") */
  label?: string
  /** Override href (default "/hrm") */
  href?: string
}

export default function BackToHrm({ label = 'Back to HRM', href = '/hrm' }: Props) {
  return (
    <Link href={href}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg border border-slate-200 transition-colors">
      <ArrowLeft className="w-3.5 h-3.5" />
      <Home className="w-3.5 h-3.5" />
      {label}
    </Link>
  )
}
