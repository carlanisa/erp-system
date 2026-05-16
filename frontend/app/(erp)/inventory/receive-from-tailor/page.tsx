'use client'

import { Scissors } from 'lucide-react'
import StockMovementPage from '@/components/inventory/StockMovementPage'

export default function ReceiveFromTailorPage() {
  return (
    <StockMovementPage
      config={{
        type:           'receive_tailor',
        title:          'Receive from Tailor',
        breadcrumb:     'Receive from Tailor',
        icon:           Scissors,
        accent:         { color: 'text-teal-600', bg: 'bg-teal-50', bgHover: 'hover:bg-teal-50', ring: 'ring-teal-400', btn: 'bg-teal-600', btnHover: 'hover:bg-teal-700' },
        showFromLoc:    true,    // tailor's location (auto-set on tailor select)
        showToLoc:      true,    // warehouse to receive into
        showTailor:     true,
        showProductBom: true,    // pick product → BOM auto-loads
        itemKind:       'product',
        numberPrefix:   'STR',
        saveLabel:      'Post Receipt',
      }}
    />
  )
}
