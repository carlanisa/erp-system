'use client'

import { useState } from 'react'
import { ChevronRight, Pencil, Trash2, Plus } from 'lucide-react'
import { clsx } from 'clsx'
import type { Account } from '@/types/index'

type Props = {
  account: Account
  depth: number
  onEdit: (account: Account) => void
  onDelete: (account: Account) => void
  onAddChild: (parent: Account) => void
  defaultOpen?: boolean
}

const typeColors: Record<string, string> = {
  asset:     'bg-blue-50 text-blue-700',
  liability: 'bg-red-50 text-red-700',
  equity:    'bg-purple-50 text-purple-700',
  revenue:   'bg-emerald-50 text-emerald-700',
  expense:   'bg-amber-50 text-amber-700',
}

const typeRing: Record<string, string> = {
  asset:     'border-l-blue-400',
  liability: 'border-l-red-400',
  equity:    'border-l-purple-400',
  revenue:   'border-l-emerald-400',
  expense:   'border-l-amber-400',
}

export default function AccountTreeRow({ account, depth, onEdit, onDelete, onAddChild, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen || depth === 0)
  const hasChildren = account.children && account.children.length > 0
  const isLeaf = !hasChildren

  return (
    <>
      <tr
        className={clsx(
          'group hover:bg-slate-50 transition-colors border-b border-slate-50',
          depth === 0 && 'bg-slate-50/60'
        )}
      >
        {/* Name column */}
        <td className="px-4 py-2.5">
          <div className="flex items-center" style={{ paddingLeft: `${depth * 20}px` }}>
            {hasChildren ? (
              <button
                onClick={() => setOpen(!open)}
                className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-600 flex-shrink-0 mr-1"
              >
                <ChevronRight className={clsx('w-3.5 h-3.5 transition-transform', open && 'rotate-90')} />
              </button>
            ) : (
              <span className="w-5 mr-1 flex-shrink-0 flex items-center justify-center">
                <span className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
              </span>
            )}
            <span className={clsx(
              'font-medium',
              depth === 0 ? 'text-slate-800 text-sm' : 'text-slate-700 text-sm',
              isLeaf && 'font-normal'
            )}>
              {account.name}
            </span>
          </div>
        </td>

        {/* Code */}
        <td className="px-4 py-2.5">
          <span className="font-mono text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
            {account.code}
          </span>
        </td>

        {/* Type */}
        <td className="px-4 py-2.5">
          {depth === 0 && (
            <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full capitalize', typeColors[account.type])}>
              {account.type}
            </span>
          )}
        </td>

        {/* Balance */}
        <td className="px-4 py-2.5 text-right">
          {isLeaf && (
            <span className="text-sm text-slate-600 font-medium">
              RM 0.00
            </span>
          )}
        </td>

        {/* Actions */}
        <td className="px-4 py-2.5">
          <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onAddChild(account)}
              className="p-1.5 rounded hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors"
              title="Add sub-account"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onEdit(account)}
              className="p-1.5 rounded hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors"
              title="Edit"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(account)}
              className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
      </tr>

      {/* Children (recursive) */}
      {open && hasChildren && account.children!.map(child => (
        <AccountTreeRow
          key={child.id}
          account={child}
          depth={depth + 1}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddChild={onAddChild}
        />
      ))}
    </>
  )
}
