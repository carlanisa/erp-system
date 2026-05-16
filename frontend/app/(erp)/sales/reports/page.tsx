'use client'

import { BarChart3 } from 'lucide-react'
import SalesPlaceholder from '@/components/sales/SalesPlaceholder'

export default function SalesReportsPage() {
  return (
    <SalesPlaceholder
      title="Sales Reports"
      description="Summary, by-customer, by-product, by-agent, returns, A/R aging, statements"
      icon={BarChart3}
      iconBg="bg-violet-50"
      iconColor="text-violet-600"
      phase="Phase 5"
      related={[
        { label: 'Back to Sales overview', href: '/sales' },
      ]}
    />
  )
}
