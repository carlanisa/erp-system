'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Plus, RefreshCw, Search, BookOpen, TrendingUp, TrendingDown, Scale, DollarSign, ArrowLeft } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import AccountTreeRow from '@/components/accounting/AccountTreeRow'
import AccountModal from '@/components/accounting/AccountModal'
import { api } from '@/lib/api'
import type { Account } from '@/types/index'

const TYPE_GROUPS = [
  { type: 'asset',     label: 'Assets',      icon: TrendingUp,  color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-200' },
  { type: 'liability', label: 'Liabilities', icon: TrendingDown,color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-200' },
  { type: 'equity',    label: 'Equity',      icon: Scale,       color: 'text-purple-600',  bg: 'bg-purple-50',  border: 'border-purple-200' },
  { type: 'revenue',   label: 'Revenue',     icon: DollarSign,  color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { type: 'expense',   label: 'Expenses',    icon: BookOpen,    color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200' },
]

function flattenTree(accounts: Account[]): Account[] {
  const result: Account[] = []
  function walk(list: Account[]) {
    for (const a of list) {
      result.push(a)
      if (a.children) walk(a.children)
    }
  }
  walk(accounts)
  return result
}

function countLeaves(accounts: Account[]): number {
  let n = 0
  function walk(list: Account[]) {
    for (const a of list) {
      if (!a.children || a.children.length === 0) n++
      else walk(a.children)
    }
  }
  walk(accounts)
  return n
}

export default function ChartOfAccountsPage() {
  const router = useRouter()
  const [tree, setTree]           = useState<Account[]>([])
  const [flatList, setFlatList]   = useState<Account[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [activeType, setActive]   = useState<string | null>(null)
  const [modalOpen, setModal]     = useState(false)
  const [editing, setEditing]     = useState<Account | null>(null)
  const [preParent, setPreParent] = useState<Account | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [treeRes, flatRes] = await Promise.all([
        api.get('/accounting/accounts'),
        api.get('/accounting/accounts/flat'),
      ])
      setTree(treeRes.data.data)
      setFlatList(flatRes.data.data)
    } catch {
      toast.error('Failed to load accounts')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function openNew(parent?: Account) {
    setEditing(null)
    setPreParent(parent ?? null)
    setModal(true)
  }

  function openEdit(account: Account) {
    setEditing(account)
    setPreParent(null)
    setModal(true)
  }

  async function handleDelete(account: Account) {
    const hasKids = account.children && account.children.length > 0
    if (hasKids) { toast.error('Delete sub-accounts first'); return }
    if (!confirm(`Delete account "${account.code} — ${account.name}"?`)) return
    try {
      await api.delete(`/accounting/accounts/${account.id}`)
      toast.success('Account deleted')
      load()
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Delete failed')
    }
  }

  // Filter tree by search
  function filterTree(accounts: Account[], q: string): Account[] {
    if (!q) return accounts
    const lower = q.toLowerCase()
    return accounts.reduce<Account[]>((acc, node) => {
      const match = node.name.toLowerCase().includes(lower) || node.code.includes(q)
      const filteredChildren = filterTree(node.children ?? [], q)
      if (match || filteredChildren.length > 0) {
        acc.push({ ...node, children: filteredChildren })
      }
      return acc
    }, [])
  }

  const displayed = activeType
    ? filterTree(tree.filter(a => a.type === activeType), search)
    : filterTree(tree, search)

  const totalAccounts = countLeaves(tree)

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-slate-50 overflow-auto">
      {/* Back bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.push('/accounting/general-ledger')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
          title="Back to General Ledger">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to General Ledger
        </button>
      </div>

      <div className="p-6 space-y-4 flex-1">
      <PageHeader
        title="Chart of Accounts"
        description={`${totalAccounts} ledger accounts across 5 categories`}
        icon={BookOpen}
        action={
          <button onClick={() => openNew()} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Account
          </button>
        }
      />

      {/* Type summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {TYPE_GROUPS.map(g => {
          const Icon = g.icon
          const count = countLeaves(tree.filter(a => a.type === g.type))
          const isActive = activeType === g.type
          return (
            <button
              key={g.type}
              onClick={() => setActive(isActive ? null : g.type)}
              className={`card p-4 text-left hover:shadow-md transition-all ${
                isActive ? 'ring-2 ring-indigo-500 shadow-md' : ''
              }`}
            >
              <div className={`w-8 h-8 ${g.bg} rounded-lg flex items-center justify-center mb-2`}>
                <Icon className={`w-4 h-4 ${g.color}`} />
              </div>
              <p className="text-xs font-medium text-slate-500">{g.label}</p>
              <p className="text-xl font-bold text-slate-800">{count}</p>
            </button>
          )
        })}
      </div>

      {/* Search + actions */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or code..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        {activeType && (
          <button onClick={() => setActive(null)} className="btn-outline text-xs">
            Clear filter
          </button>
        )}
        <button onClick={load} className="btn-outline flex items-center gap-2 ml-auto">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Account Tree Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left text-xs text-slate-500 font-semibold px-4 py-3">Account Name</th>
              <th className="text-left text-xs text-slate-500 font-semibold px-4 py-3">Code</th>
              <th className="text-left text-xs text-slate-500 font-semibold px-4 py-3">Type</th>
              <th className="text-right text-xs text-slate-500 font-semibold px-4 py-3">Balance</th>
              <th className="text-right text-xs text-slate-500 font-semibold px-4 py-3 w-28">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-50">
                  <td className="px-4 py-3" colSpan={5}>
                    <div className="h-4 bg-slate-100 rounded animate-pulse" style={{ width: `${60 + (i % 3) * 15}%` }} />
                  </td>
                </tr>
              ))
            ) : displayed.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-slate-400 text-sm">
                  <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  No accounts found
                </td>
              </tr>
            ) : (
              displayed.map(account => (
                <AccountTreeRow
                  key={account.id}
                  account={account}
                  depth={0}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onAddChild={(parent) => openNew(parent)}
                  defaultOpen
                />
              ))
            )}
          </tbody>
        </table>

        {!loading && displayed.length > 0 && (
          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 text-xs text-slate-400">
            Hover any row to see actions &nbsp;·&nbsp; Click <strong>+</strong> to add a sub-account &nbsp;·&nbsp; Click arrow to expand/collapse
          </div>
        )}
      </div>

      {/* Modal */}
      <AccountModal
        open={modalOpen}
        onClose={() => { setModal(false); setPreParent(null) }}
        onSaved={load}
        editing={editing}
        allAccounts={flatList}
      />
      </div>
    </div>
  )
}
