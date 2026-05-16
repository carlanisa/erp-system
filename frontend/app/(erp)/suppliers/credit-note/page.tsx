'use client'

import { FileMinus } from 'lucide-react'
import SupplierPlaceholder from '@/components/suppliers/SupplierPlaceholder'

export default function SupplierCreditNotePage() {
  return (
    <SupplierPlaceholder
      title="Supplier Credit Note"
      description="Suppliers → Supplier Credit Note"
      icon={FileMinus}
      iconBg="bg-rose-50"
      iconColor="text-rose-600"
    />
  )
}
