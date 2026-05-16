'use client'

import { Repeat } from 'lucide-react'
import StockMovementPage from '@/components/inventory/StockMovementPage'

export default function StockTransferPage() {
  return (
    <StockMovementPage
      config={{
        type:           'transfer',
        title:          'Stock Transfer',
        breadcrumb:     'Stock Transfer',
        icon:           Repeat,
        accent:         { color: 'text-blue-700', bg: 'bg-blue-50', bgHover: 'hover:bg-blue-50', ring: 'ring-blue-400', btn: 'bg-blue-700', btnHover: 'hover:bg-blue-800' },
        showFromLoc:    true,
        showToLoc:      true,
        showTailor:     false,
        showProductBom: false,
        itemKind:       'either',
        numberPrefix:   'ST',
        saveLabel:      'Post Transfer',
      }}
    />
  )
}
