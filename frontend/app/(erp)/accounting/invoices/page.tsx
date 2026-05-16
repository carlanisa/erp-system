'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Plus, Search, Eye, Trash2, Send, RefreshCw, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import { FileText } from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Invoice } from '@/types/index'

const STATUSES = ['all', 'draft', 'sent', 'paid', 'overdue', 'cancelled'] as const

const statusStyles: Record<string, string> = {
  draft:     'badge-blue',
  sent:      'badge-yellow',
  paid:      'badge-green',
  overdue:   'badge-red',
  cancelled: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500',
}

export default function InvoicesPage() {
  const router = useRouter()
  const [invoices, setInvoices]     = useState<Invoice[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatus]   = useState<string>('all')
  const [page, setPage]             = useState(1)
  const [meta, setMeta]             = useState({ total: 0, last_page: 1 })
  const [deleting, setDeleting]     = useState<number | null>(null)
  const [sending, setSending]       = useState<number | null>(null)

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = { page: String(page) }
      if (search) params.search = search
      if (statusFilter !== 'all') params.status = statusFilter

      const { data } = await api.get('/accounting/invoices', { params })
      setInvoices(data.data)
      setMeta({ total: data.meta.total, last_page: data.meta.last_page })
    } catch {
      toast.error('Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

  useEffect(() => { fetchInvoices() }, [fetchInvoices])

  async function handleDelete(invoice: Invoice) {
    if (!confirm(`Delete ${invoice.number}? This cannot be undone.`)) return
    setDeleting(invoice.id)
    try {
      await api.delete(`/accounting/invoices/${invoice.id}`)
      toast.success('Invoice deleted')
      fetchInvoices()
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Delete failed')
    } finally {
      setDeleting(null)
    }
  }

  async function handleSend(invoice: Invoice) {
    setSending(invoice.id)
    try {
      await api.post(`/accounting/invoices/${invoice.id}/send`)
      toast.success(`${invoice.number} marked as sent`)
      fetchInvoices()
    } catch {
      toast.error('Failed to send invoice')
    } finally {
      setSending(null)
    }
  }

  const counts = {
    all:       meta.total,
    draft:     invoices.filter(i => i.status === 'draft').length,
    sent:      invoices.filter(i => i.status === 'sent').length,
    paid:      invoices.filter(i => i.status === 'paid').length,
    overdue:   invoices.filter(i => i.status === 'overdue').length,
    cancelled: invoices.filter(i => i.status === 'cancelled').length,
  }

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
        title="Invoices"
        description={`${meta.total} total invoices`}
        icon={FileText}
        action={
          <Link href="/accounting/invoices/new" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Invoice
          </Link>
        }
      />

      {/* Status tabs */}
      <div className="flex gap-1 border-b border-slate-200 pb-0">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => { setStatus(s); setPage(1) }}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors -mb-px ${
              statusFilter === s
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Search + refresh */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search by invoice # or customer..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button onClick={fetchInvoices} className="btn-outline flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left text-xs text-slate-500 font-semibold px-4 py-3">Invoice #</th>
                <th className="text-left text-xs text-slate-500 font-semibold px-4 py-3">Customer</th>
                <th className="text-left text-xs text-slate-500 font-semibold px-4 py-3">Issue Date</th>
                <th className="text-left text-xs text-slate-500 font-semibold px-4 py-3">Due Date</th>
                <th className="text-right text-xs text-slate-500 font-semibold px-4 py-3">Amount</th>
                <th className="text-left text-xs text-slate-500 font-semibold px-4 py-3">Status</th>
                <th className="text-center text-xs text-slate-500 font-semibold px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    No invoices found
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/accounting/invoices/${inv.id}`} className="font-semibold text-indigo-600 hover:underline">
                        {inv.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium">
                      {inv.customer?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(inv.date)}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(inv.due_date)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">
                      {formatCurrency(inv.total)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={statusStyles[inv.status] ?? 'badge-blue'}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <Link
                          href={`/accounting/invoices/${inv.id}`}
                          className="p-1.5 rounded hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {inv.status === 'draft' && (
                          <button
                            onClick={() => handleSend(inv)}
                            disabled={sending === inv.id}
                            className="p-1.5 rounded hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors"
                            title="Mark as Sent"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                        {inv.status !== 'paid' && (
                          <button
                            onClick={() => handleDelete(inv)}
                            disabled={deleting === inv.id}
                            className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta.last_page > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-sm text-slate-500">
              Page {page} of {meta.last_page} — {meta.total} invoices
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-outline px-2.5 py-1.5 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(meta.last_page, p + 1))}
                disabled={page === meta.last_page}
                className="btn-outline px-2.5 py-1.5 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
