'use client'

import { Undo2 } from 'lucide-react'
import SalesPlaceholder from '@/components/sales/SalesPlaceholder'

export default function SaleReturnsPage() {
  return (
    <SalesPlaceholder
      title="Sale Returns"
      description="Customer returns — credit note OR cash/bank refund, stock restored"
      icon={Undo2}
      iconBg="bg-emerald-50"
      iconColor="text-emerald-600"
      phase="Phase 2"
      related={[
        { label: 'Reference: Purchase Return', href: '/suppliers/purchase-return' },
      ]}
    />
  )
}
