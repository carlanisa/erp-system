'use client'

import { ArrowDownToLine } from 'lucide-react'
import StockMovementPage from '@/components/inventory/StockMovementPage'

export default function StockReceivedPage() {
  return (
    <StockMovementPage
      config={{
        type:           'receipt',
        title:          'Stock Received',
        breadcrumb:     'Stock Received',
        icon:           ArrowDownToLine,
        accent:         { color: 'text-emerald-600', bg: 'bg-emerald-50', bgHover: 'hover:bg-emerald-50', ring: 'ring-emerald-400', btn: 'bg-emerald-600', btnHover: 'hover:bg-emerald-700' },
        showFromLoc:    false,
        showToLoc:      true,
        showTailor:     false,
        showProductBom: false,
        itemKind:       'stock_item',
        numberPrefix:   'SR',
        saveLabel:      'Post Receipt',
      }}
    />
  )
}
