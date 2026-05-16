'use client'

import { Undo2 } from 'lucide-react'
import SupplierPlaceholder from '@/components/suppliers/SupplierPlaceholder'

export default function PurchaseReturnPage() {
  return (
    <SupplierPlaceholder
      title="Purchase Return"
      description="Suppliers → Purchase Return"
      icon={Undo2}
      iconBg="bg-emerald-50"
      iconColor="text-emerald-600"
      related={[
        { label: 'Open Supplier Debit Note (return-related debit)', href: '/suppliers/debit-note' },
      ]}
    />
  )
}
