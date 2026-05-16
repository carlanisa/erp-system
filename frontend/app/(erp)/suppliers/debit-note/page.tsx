'use client'

import { FilePlus } from 'lucide-react'
import SupplierPlaceholder from '@/components/suppliers/SupplierPlaceholder'

export default function SupplierDebitNotePage() {
  return (
    <SupplierPlaceholder
      title="Supplier Debit Note"
      description="Suppliers → Supplier Debit Note"
      icon={FilePlus}
      iconBg="bg-violet-50"
      iconColor="text-violet-600"
    />
  )
}
