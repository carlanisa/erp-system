'use client'

import { Wrench } from 'lucide-react'
import StockMovementPage from '@/components/inventory/StockMovementPage'

export default function StockAdjustmentPage() {
  return (
    <StockMovementPage
      config={{
        type:           'adjust',
        title:          'Stock Adjustment',
        breadcrumb:     'Stock Adjustment',
        icon:           Wrench,
        accent:         { color: 'text-amber-600', bg: 'bg-amber-50', bgHover: 'hover:bg-amber-50', ring: 'ring-amber-400', btn: 'bg-amber-600', btnHover: 'hover:bg-amber-700' },
        showFromLoc:    true,
        showToLoc:      false,
        showTailor:     false,
        showProductBom: false,
        itemKind:       'either',
        numberPrefix:   'SA',
        saveLabel:      'Post Adjustment',
        qtySigned:      true,   // negative qty = reduce stock; positive = add
      }}
    />
  )
}
