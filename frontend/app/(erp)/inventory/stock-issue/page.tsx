'use client'

import { ArrowUpFromLine } from 'lucide-react'
import StockMovementPage from '@/components/inventory/StockMovementPage'

export default function StockIssuePage() {
  return (
    <StockMovementPage
      config={{
        type:           'issue',
        title:          'Stock Issue',
        breadcrumb:     'Stock Issue',
        icon:           ArrowUpFromLine,
        accent:         { color: 'text-orange-600', bg: 'bg-orange-50', bgHover: 'hover:bg-orange-50', ring: 'ring-orange-400', btn: 'bg-orange-600', btnHover: 'hover:bg-orange-700' },
        showFromLoc:    true,
        showToLoc:      false,
        showTailor:     false,
        showProductBom: false,
        itemKind:       'stock_item',
        numberPrefix:   'SI',
        saveLabel:      'Post Issue',
      }}
    />
  )
}
