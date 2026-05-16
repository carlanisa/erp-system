'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Search, Pencil, Trash2, X, Save, Loader2, FileText,
  Ban, RotateCw, ChevronLeft, ChevronRight, ArrowLeft,
  Printer, Eye, Mail,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { openPdf, openPdfAndPrint } from '@/lib/pdf'
import { formatCurrency, formatDate } from '@/lib/utils'

// ─────────────────── Types ───────────────────
type Customer = { id: number; name: string; email?: string | null; phone?: string | null }

type Line = {
  item_code: string
  description: string
  color: string
  size: string
  qty: string
  uom: string
  unit_price: string
  discount: string
  tax_rate: string
}

type SaleInvoice = {
  id: number
  si_number: string
  customer_invoice_no?: string | null
  branch_code: string
  source: string
  date: string
  due_date?: string | null
  customer_id?: number | null
  customer?: Customer | null
  walk_in_name?: string | null
  amount: number
  paid_amount: number
  discount_total: number
  tax_total: number
  payment_method: string
  reference?: string | null
  description?: string | null
  status: string
  is_cancelled: boolean
  payment_status: 'unpaid' | 'partial' | 'paid'
  lines?: any[]
  payments?: any[]
}

type Form = {
  date: string
  due_date: string
  branch_code: string
  customer_id: string
  customer_invoice_no: string
  payment_method: 'cash' | 'cheque' | 'bank_transfer' | 'card'
  reference: string
  description: string
  lines: Line[]
}

const EMPTY_LINE: Line = {
  item_code: '', description: '', color: '', size: '',
  qty: '1', uom: 'UNIT', unit_price: '0', discount: '0', tax_rate: '0',
}

const EMPTY_FORM = (): Form => ({
  date: new Date().toISOString().slice(0, 10),
  due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  branch_code: 'HQ',
  customer_id: '',
  customer_invoice_no: '',
  payment_method: 'bank_transfer',
  reference: '',
  description: '',
  lines: [{ ...EMPTY_LINE }],
})

// ─────────────────── Page ───────────────────
export default function SaleInvoicesPage() {
  const router = useRouter()

  const [items, setItems]         = useState<SaleInvoice[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [sourceFilter, setSource] = useState<'' | 'erp' | 'pos'>('')
  const [statusFilter, setStatus] = useState<'' | 'paid' | 'partial' | 'unpaid' | 'cancelled'>('')
  const [page, setPage]           = useState(1)
  const [meta, setMeta]           = useState<{ total: number; last_page: number; grand_total: number }>({
    total: 0, last_page: 1, grand_total: 0,
  })

  const [customers, setCustomers] = useState<Customer[]>([])

  const [showForm, setShowForm]   = useState(false)
  const [editing, setEditing]     = useState<SaleInvoice | null>(null)
  const [form, setForm]           = useState<Form>(EMPTY_FORM())
  const [saving, setSaving]       = useState(false)
  const [previewing, setPreviewing] = useState<SaleInvoice | null>(null)
  const [autoPrint, setAutoPrint] = useState(false)

  // Auto-trigger window.print() once preview is mounted (used by Print button)
  useEffect(() => {
    if (previewing && autoPrint) {
      const t = setTimeout(() => { window.print(); setAutoPrint(false) }, 350)
      return () => clearTimeout(t)
    }
  }, [previewing, autoPrint])

  function openPreview(inv: SaleInvoice) {
    // Fetch full invoice with lines + payments
    api.get(`/sales/invoices/${inv.id}`)
      .then(r => setPreviewing(r.data.data ?? inv))
      .catch(() => setPreviewing(inv))
  }
  function openPreviewAndPrint(inv: SaleInvoice) {
    openPreview(inv)
    setAutoPrint(true)
  }

  // ── Data loaders ──
  const reload = useCallback(() => {
    setLoading(true)
    const params: any = { page, per_page: 20 }
    if (search) params.search = search
    if (sourceFilter) params.source = sourceFilter
    if (statusFilter === 'cancelled') params.cancelled = 'true'
    else if (statusFilter) params.cancelled = 'false'
    api.get('/sales/invoices', { params }).then(r => {
      setItems(r.data.data ?? [])
      setMeta({
        total:       r.data.meta?.total ?? 0,
        last_page:   r.data.meta?.last_page ?? 1,
        grand_total: r.data.meta?.grand_total ?? 0,
      })
      setLoading(false)
    }).catch(e => {
      toast.error(e.response?.data?.message ?? 'Failed to load')
      setLoading(false)
    })
  }, [page, search, sourceFilter, statusFilter])

  useEffect(reload, [reload])

  useEffect(() => {
    api.get('/crm/customers', { params: { per_page: 200 } })
      .then(r => setCustomers(r.data.data ?? []))
      .catch(() => {})
  }, [])

  // Filter rows by payment_status client-side (since meta filter only handles cancelled)
  const visibleItems = useMemo(() => {
    if (!statusFilter || statusFilter === 'cancelled') return items
    return items.filter(it => it.payment_status === statusFilter && !it.is_cancelled)
  }, [items, statusFilter])

  // ── Form helpers ──
  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM())
    setShowForm(true)
  }

  async function openEdit(inv: SaleInvoice) {
    if (inv.is_cancelled) {
      toast.error('Cancelled invoice cannot be edited.')
      return
    }
    try {
      const r = await api.get(`/sales/invoices/${inv.id}`)
      const full = r.data.data
      setEditing(full)
      setForm({
        date: full.date?.slice(0, 10) ?? '',
        due_date: full.due_date?.slice(0, 10) ?? '',
        branch_code: full.branch_code ?? 'HQ',
        customer_id: String(full.customer_id ?? ''),
        customer_invoice_no: full.customer_invoice_no ?? '',
        payment_method: full.payment_method ?? 'bank_transfer',
        reference: full.reference ?? '',
        description: full.description ?? '',
        lines: (full.lines ?? []).map((l: any) => ({
          item_code:   l.item_code   ?? '',
          description: l.description ?? '',
          color:       l.color       ?? '',
          size:        l.size        ?? '',
          qty:         String(l.qty),
          uom:         l.uom         ?? 'UNIT',
          unit_price:  String(l.unit_price),
          discount:    String(l.discount),
          tax_rate:    String(l.tax_rate),
        })),
      })
      setShowForm(true)
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Failed to load invoice')
    }
  }

  // ── Computed totals ──
  const totals = useMemo(() => {
    let subtotal = 0, taxTotal = 0, discountTotal = 0
    form.lines.forEach(l => {
      const qty = +l.qty || 0
      const up  = +l.unit_price || 0
      const dc  = +l.discount || 0
      const tr  = +l.tax_rate || 0
      const net = qty * up - dc
      subtotal += net
      discountTotal += dc
      taxTotal += net * (tr / 100)
    })
    return {
      subtotal,
      tax_total: taxTotal,
      discount_total: discountTotal,
      grand: subtotal + taxTotal,
    }
  }, [form.lines])

  // ── Save ──
  async function save() {
    if (!form.customer_id) { toast.error('Please pick a customer'); return }
    if (form.lines.length === 0 || form.lines.every(l => !l.description && !l.item_code)) {
      toast.error('Add at least one line'); return
    }
    setSaving(true)
    const payload = {
      date: form.date,
      due_date: form.due_date,
      branch_code: form.branch_code,
      customer_id: Number(form.customer_id),
      customer_invoice_no: form.customer_invoice_no || null,
      reference: form.reference || null,
      description: form.description || null,
      payment_method: form.payment_method,
      amount: Number(totals.grand.toFixed(2)),
      discount_total: Number(totals.discount_total.toFixed(2)),
      tax_total: Number(totals.tax_total.toFixed(2)),
      lines: form.lines
        .filter(l => l.description || l.item_code)
        .map(l => {
          const qty = +l.qty || 0
          const up  = +l.unit_price || 0
          const dc  = +l.discount || 0
          const tr  = +l.tax_rate || 0
          const net = qty * up - dc
          const tax = net * (tr / 100)
          return {
            item_code: l.item_code || null,
            description: l.description,
            color: l.color || null,
            size: l.size || null,
            qty,
            uom: l.uom || 'UNIT',
            unit_price: up,
            discount: dc,
            tax_rate: tr,
            tax_amount: Number(tax.toFixed(2)),
            amount: Number((net + tax).toFixed(2)),
          }
        }),
      payments: [],   // payments are recorded separately via Official Receipt
    }
    try {
      if (editing) await api.put(`/sales/invoices/${editing.id}`, payload)
      else        await api.post('/sales/invoices', payload)
      toast.success(editing ? 'Sale invoice updated' : 'Sale invoice created')
      setShowForm(false); setEditing(null)
      reload()
    } catch (e: any) {
      const msg = e.response?.data?.message ?? 'Save failed'
      const errs = e.response?.data?.errors
      toast.error(errs ? `${msg}: ${Object.values(errs).flat().join(', ')}` : msg)
    } finally {
      setSaving(false)
    }
  }

  async function cancelToggle(inv: SaleInvoice) {
    const verb = inv.is_cancelled ? 'restore' : 'cancel'
    if (!confirm(`Are you sure you want to ${verb} ${inv.si_number}?`)) return
    try {
      await api.post(`/sales/invoices/${inv.id}/cancel`)
      toast.success(`Invoice ${verb}d`)
      reload()
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? `${verb} failed`)
    }
  }

  function viewPdf(inv: SaleInvoice) {
    openPdf(`/sales/invoices/${inv.id}/pdf`, `${inv.si_number}.pdf`)
      .catch((e: any) => toast.error(e.response?.data?.message ?? 'Failed to open PDF'))
  }

  function printPdf(inv: SaleInvoice) {
    openPdfAndPrint(`/sales/invoices/${inv.id}/pdf`, `${inv.si_number}.pdf`)
      .catch((e: any) => toast.error(e.response?.data?.message ?? 'Failed to open PDF'))
  }

  async function destroy(inv: SaleInvoice) {
    if (!confirm(`Delete ${inv.si_number}? Stock will be restored. This cannot be undone.`)) return
    try {
      await api.delete(`/sales/invoices/${inv.id}`)
      toast.success('Invoice deleted')
      reload()
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Delete failed')
    }
  }

  // ─────────────────── Preview Render (PV-style HTML invoice) ───────────────────
  if (previewing) {
    return (
      <SaleInvoicePreview
        inv={previewing}
        onBack={() => { setPreviewing(null); setAutoPrint(false) }}
        onPrint={() => window.print()}
      />
    )
  }

  // ─────────────────── Render ───────────────────
  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/sales')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200">
            <ArrowLeft className="w-3.5 h-3.5" /> Sales
          </button>
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Sale Invoices</h1>
            <p className="text-xs text-slate-500">
              {meta.total} invoices &middot; total {formatCurrency(meta.grand_total)}
            </p>
          </div>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg">
          <Plus className="w-4 h-4" /> New Invoice
        </button>
      </div>

      {/* ── Filter bar ── */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search by SI#, customer, reference…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        </div>
        <select value={sourceFilter} onChange={e => { setSource(e.target.value as any); setPage(1) }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg">
          <option value="">All sources</option>
          <option value="erp">ERP</option>
          <option value="pos">POS</option>
        </select>
        <select value={statusFilter} onChange={e => { setStatus(e.target.value as any); setPage(1) }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg">
          <option value="">All status</option>
          <option value="paid">Paid</option>
          <option value="partial">Partial</option>
          <option value="unpaid">Unpaid</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* ── Table ── */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-2.5">SI #</th>
                <th className="text-left px-4 py-2.5">Date</th>
                <th className="text-left px-4 py-2.5">Customer</th>
                <th className="text-left px-4 py-2.5">Source</th>
                <th className="text-right px-4 py-2.5">Amount</th>
                <th className="text-right px-4 py-2.5">Paid</th>
                <th className="text-center px-4 py-2.5">Status</th>
                <th className="text-right px-4 py-2.5 w-44">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin inline-block" /> Loading…
                </td></tr>
              ) : visibleItems.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-slate-400 text-sm">
                  No invoices yet. Click <span className="font-semibold">New Invoice</span> to create one.
                </td></tr>
              ) : visibleItems.map(inv => (
                <tr key={inv.id} className={`hover:bg-slate-50 ${inv.is_cancelled ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-2.5 font-mono text-xs font-semibold text-indigo-700">{inv.si_number}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-600">{formatDate(inv.date)}</td>
                  <td className="px-4 py-2.5">
                    <div className="text-xs font-medium text-slate-700">{inv.customer?.name ?? inv.walk_in_name ?? '—'}</div>
                    {inv.reference && <div className="text-[10px] text-slate-400">{inv.reference}</div>}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      inv.source === 'pos' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'
                    }`}>{inv.source.toUpperCase()}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs font-semibold text-slate-800">{formatCurrency(inv.amount)}</td>
                  <td className="px-4 py-2.5 text-right text-xs text-slate-600">{formatCurrency(inv.paid_amount)}</td>
                  <td className="px-4 py-2.5 text-center">
                    {inv.is_cancelled ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">CANCELLED</span>
                    ) : (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        inv.payment_status === 'paid'    ? 'bg-emerald-100 text-emerald-800' :
                        inv.payment_status === 'partial' ? 'bg-amber-100   text-amber-800'   :
                                                           'bg-rose-100    text-rose-800'
                      }`}>{inv.payment_status.toUpperCase()}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openPreview(inv)}
                        title="Preview"
                        className="p-1.5 text-slate-500 hover:bg-slate-100 rounded">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => openPreviewAndPrint(inv)}
                        title="Print"
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded">
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => openEdit(inv)} disabled={inv.is_cancelled}
                        title={inv.is_cancelled ? 'Cancelled invoice cannot be edited' : 'Edit'}
                        className="p-1.5 text-slate-500 hover:bg-slate-100 rounded disabled:opacity-30 disabled:cursor-not-allowed">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => cancelToggle(inv)}
                        title={inv.is_cancelled ? 'Restore' : 'Cancel'}
                        className="p-1.5 text-slate-500 hover:bg-slate-100 rounded">
                        {inv.is_cancelled ? <RotateCw className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => destroy(inv)}
                        title="Delete"
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta.last_page > 1 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 bg-slate-50">
            <span className="text-xs text-slate-500">Page {page} of {meta.last_page}</span>
            <div className="flex items-center gap-1">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="p-1.5 hover:bg-slate-100 rounded disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
              <button disabled={page >= meta.last_page} onClick={() => setPage(p => p + 1)}
                className="p-1.5 hover:bg-slate-100 rounded disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* ── Slide-over form ── */}
      {showForm && (
        <SaleInvoiceForm
          form={form} setForm={setForm}
          customers={customers}
          editing={editing}
          totals={totals}
          saving={saving}
          onSave={save}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  )
}

// ─────────────────── Form (slide-over) ───────────────────
function SaleInvoiceForm({
  form, setForm, customers, editing, totals, saving, onSave, onClose,
}: {
  form: Form
  setForm: (f: Form) => void
  customers: Customer[]
  editing: SaleInvoice | null
  totals: { subtotal: number; tax_total: number; discount_total: number; grand: number }
  saving: boolean
  onSave: () => void
  onClose: () => void
}) {
  function updateLine(i: number, patch: Partial<Line>) {
    const next = [...form.lines]
    next[i] = { ...next[i], ...patch }
    setForm({ ...form, lines: next })
  }
  function addLine() { setForm({ ...form, lines: [...form.lines, { ...EMPTY_LINE }] }) }
  function removeLine(i: number) {
    setForm({ ...form, lines: form.lines.filter((_, idx) => idx !== i) })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex justify-end" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="w-full max-w-3xl bg-white shadow-2xl flex flex-col h-full overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-white">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              {editing ? `Edit ${editing.si_number}` : 'New Sale Invoice'}
            </h2>
            <p className="text-xs text-slate-500">
              {editing ? 'Update header, lines, or payment schedule' : 'Customer billing — decrements stock on save'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Header fields */}
          <section className="grid grid-cols-2 gap-3">
            <Field label="Date">
              <input type="date" value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })} className="input" />
            </Field>
            <Field label="Due Date">
              <input type="date" value={form.due_date}
                onChange={e => setForm({ ...form, due_date: e.target.value })} className="input" />
            </Field>
            <Field label="Customer">
              <select value={form.customer_id}
                onChange={e => setForm({ ...form, customer_id: e.target.value })} className="input">
                <option value="">-- Select customer --</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Branch">
              <input value={form.branch_code}
                onChange={e => setForm({ ...form, branch_code: e.target.value })} className="input" />
            </Field>
            <Field label="Customer Invoice #">
              <input value={form.customer_invoice_no}
                onChange={e => setForm({ ...form, customer_invoice_no: e.target.value })}
                placeholder="Optional external ref" className="input" />
            </Field>
            <Field label="Reference / Notes">
              <input value={form.reference}
                onChange={e => setForm({ ...form, reference: e.target.value })}
                placeholder="PO number, sales agent, etc." className="input" />
            </Field>
          </section>

          {/* Lines */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-700">Line Items</h3>
              <button onClick={addLine}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Add line
              </button>
            </div>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="text-left px-2 py-1.5 w-32">Item Code</th>
                    <th className="text-left px-2 py-1.5">Description</th>
                    <th className="text-right px-2 py-1.5 w-20">Qty</th>
                    <th className="text-right px-2 py-1.5 w-24">Unit Price</th>
                    <th className="text-right px-2 py-1.5 w-20">Disc</th>
                    <th className="text-right px-2 py-1.5 w-16">Tax %</th>
                    <th className="text-right px-2 py-1.5 w-28">Amount</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {form.lines.map((l, i) => {
                    const qty = +l.qty || 0, up = +l.unit_price || 0, dc = +l.discount || 0, tr = +l.tax_rate || 0
                    const net = qty * up - dc
                    const amt = net + net * (tr / 100)
                    return (
                      <tr key={i}>
                        <td><input value={l.item_code}    onChange={e => updateLine(i, { item_code: e.target.value })}    className="line-input" /></td>
                        <td><input value={l.description}  onChange={e => updateLine(i, { description: e.target.value })}  className="line-input" placeholder="Required" /></td>
                        <td><input value={l.qty}          onChange={e => updateLine(i, { qty: e.target.value })}          className="line-input text-right" /></td>
                        <td><input value={l.unit_price}   onChange={e => updateLine(i, { unit_price: e.target.value })}   className="line-input text-right" /></td>
                        <td><input value={l.discount}     onChange={e => updateLine(i, { discount: e.target.value })}     className="line-input text-right" /></td>
                        <td><input value={l.tax_rate}     onChange={e => updateLine(i, { tax_rate: e.target.value })}     className="line-input text-right" /></td>
                        <td className="px-2 py-1.5 text-right font-semibold text-slate-700">{formatCurrency(amt)}</td>
                        <td><button onClick={() => removeLine(i)} className="p-1 text-slate-300 hover:text-rose-500"><Trash2 className="w-3 h-3" /></button></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Totals */}
          <section className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1">
            <Row label="Subtotal"          value={formatCurrency(totals.subtotal)} />
            <Row label="Line Discount"     value={`− ${formatCurrency(totals.discount_total)}`} muted />
            <Row label="Tax"               value={formatCurrency(totals.tax_total)} />
            <div className="flex items-center justify-between pt-1 border-t border-slate-200">
              <span className="text-sm font-bold text-slate-800">Grand Total</span>
              <span className="text-lg font-bold text-indigo-700">{formatCurrency(totals.grand)}</span>
            </div>
          </section>

          {/* Payment hint — payments tracked separately via Official Receipt */}
          <section className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 flex items-start gap-2">
            <div className="text-amber-600 text-base leading-none mt-0.5">ⓘ</div>
            <div className="text-xs text-amber-900">
              <span className="font-semibold">Payments are recorded separately.</span> Once this invoice is saved,
              record customer receipts via <a href="/accounting/official-receipt" className="underline font-medium">Official Receipt</a>{' '}
              (or via POS for over-the-counter sales).
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-white flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {editing ? `Editing ${editing.si_number}` : 'New Invoice'}
            {' — '}{form.lines.length} line(s)
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose}
              className="px-3 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg">
              Cancel
            </button>
            <button onClick={onSave} disabled={saving}
              className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 flex items-center gap-1.5">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving…' : (editing ? 'Update Invoice' : 'Save Invoice')}
            </button>
          </div>
        </div>
      </div>

      {/* Local input styles */}
      <style jsx>{`
        :global(.input) {
          width: 100%;
          padding: 0.5rem 0.75rem;
          font-size: 0.8125rem;
          border: 1px solid rgb(226 232 240);
          border-radius: 0.5rem;
          background: white;
        }
        :global(.input:focus) { outline: none; border-color: rgb(99 102 241); box-shadow: 0 0 0 2px rgb(199 210 254); }
        :global(.line-input) {
          width: 100%;
          padding: 0.375rem 0.5rem;
          font-size: 0.75rem;
          border: 1px solid transparent;
          background: transparent;
        }
        :global(.line-input:focus) { outline: none; border-color: rgb(99 102 241); background: rgb(238 242 255); border-radius: 0.25rem; }
      `}</style>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// SaleInvoicePreview — full A4 HTML invoice using the universal print theme
// (same letterhead, dark table header, cream totals row, signatures + footer
// as Payment Voucher / Purchase Invoice). The wrapping div uses the
// `si-print-host` class so globals.css print rules apply.
// ─────────────────────────────────────────────────────────────────────────
function SaleInvoicePreview({
  inv, onBack, onPrint,
}: { inv: SaleInvoice; onBack: () => void; onPrint: () => void }) {
  const lines = (inv.lines ?? []) as any[]
  const subtotal = lines.reduce((s, l) => {
    const qty = +l.qty || 0, up = +l.unit_price || 0, dc = +l.discount || 0
    return s + (qty * up - dc)
  }, 0)
  const tax = +inv.tax_total || 0
  const total = +inv.amount || subtotal + tax
  const paid = +inv.paid_amount || 0
  const outstanding = Math.max(0, total - paid)
  const status = inv.payment_status || (paid >= total ? 'paid' : paid > 0 ? 'partial' : 'unpaid')
  const statusBadge = ({
    unpaid:  { label: 'UNPAID',  cls: 'border-red-600 text-red-700' },
    partial: { label: 'PARTIAL', cls: 'border-amber-600 text-amber-700' },
    paid:    { label: 'PAID',    cls: 'border-emerald-600 text-emerald-700' },
  } as const)[status as 'unpaid' | 'partial' | 'paid']

  function numberToWords(n: number): string {
    const a = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen']
    const b = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety']
    function chunk(num: number): string {
      if (num === 0) return ''
      if (num < 20) return a[num]
      if (num < 100) return b[Math.floor(num/10)] + (num%10 ? ' ' + a[num%10] : '')
      return a[Math.floor(num/100)] + ' Hundred' + (num%100 ? ' ' + chunk(num%100) : '')
    }
    const intPart = Math.floor(n)
    if (intPart === 0) return 'Zero Ringgit Only'
    let result = ''
    let scale = 0
    const scales = ['', 'Thousand', 'Million', 'Billion']
    let num = intPart
    while (num > 0) {
      const c = num % 1000
      if (c) result = chunk(c) + (scales[scale] ? ' ' + scales[scale] : '') + (result ? ' ' + result : '')
      num = Math.floor(num / 1000)
      scale++
    }
    return result + ' Ringgit Only'
  }

  return (
    <div className="si-print-host fixed inset-0 z-40 flex flex-col bg-slate-200">
      {/* ── Toolbar (hidden when printing) ── */}
      <div className="bg-white border-b border-slate-200 px-5 py-2.5 flex items-center justify-between flex-shrink-0 print:hidden">
        <div className="flex items-center gap-3">
          <button onClick={onBack}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center">
            <Eye className="w-4 h-4 text-violet-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">Sale Invoice Preview · {inv.si_number}</h2>
            <p className="text-xs text-slate-400">Click Print to send to printer</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={onPrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 text-white text-xs font-medium rounded hover:bg-slate-800">
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
          <button onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded">
            <X className="w-3.5 h-3.5" /> Close
          </button>
        </div>
      </div>

      {/* ── Document body ── */}
      <div className="flex-1 overflow-y-auto py-8 print:p-0 print:overflow-visible">
        <div className="si-print-area mx-auto bg-white shadow-lg print:shadow-none print:mx-0
                        w-[210mm] min-h-[297mm] p-12 print:p-10 text-slate-800
                        font-[Arial,Helvetica,sans-serif]">

          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-800 pb-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">CARLANISA SDN BHD</h1>
              <p className="text-xs text-slate-500 mt-0.5">Cloud Business Suite · ELBS ERP</p>
              <p className="text-xs text-slate-500">www.elbs.com.my · elbsit@gmail.com</p>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold uppercase tracking-wider text-slate-800">Sale Invoice</h2>
              <div className={`inline-block mt-2 px-3 py-1 border-2 rounded ${statusBadge.cls}`}>
                <span className="font-bold tracking-widest text-sm">{statusBadge.label}</span>
              </div>
            </div>
          </div>

          {/* Voucher meta — two columns */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-6 text-sm">
            <div className="flex"><span className="w-32 text-slate-500">Invoice No</span><span className="font-bold font-mono text-red-700">{inv.si_number}</span></div>
            <div className="flex"><span className="w-32 text-slate-500">Branch</span><span className="font-semibold">{inv.branch_code} — Head Office</span></div>
            <div className="flex"><span className="w-32 text-slate-500">Invoice Date</span><span className="font-semibold">{formatDate(inv.date)}</span></div>
            <div className="flex"><span className="w-32 text-slate-500">Due Date</span><span className="font-semibold">{inv.due_date ? formatDate(inv.due_date) : '—'}</span></div>
            <div className="flex"><span className="w-32 text-slate-500">Payment Method</span><span className="font-semibold capitalize">{(inv.payment_method || '').replace('_', ' ')}</span></div>
            <div className="flex"><span className="w-32 text-slate-500">Source</span><span className="font-semibold uppercase">{inv.source || 'ERP'}</span></div>
          </div>

          {/* Customer panel */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="border border-slate-300 rounded p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Bill To</div>
              <div className="text-base font-bold text-slate-900">{inv.customer?.name ?? inv.walk_in_name ?? '—'}</div>
              {inv.customer?.email && <div className="text-xs text-slate-500 mt-1">{inv.customer.email}</div>}
              {inv.customer?.phone && <div className="text-xs text-slate-500">{inv.customer.phone}</div>}
            </div>
            <div className="border border-slate-300 rounded p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Reference</div>
              <div className="text-sm font-semibold text-slate-900">{inv.customer_invoice_no || inv.reference || '—'}</div>
            </div>
          </div>

          {/* Lines table */}
          <table className="w-full text-sm border-collapse mb-4">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="px-3 py-2 text-left font-semibold w-12">#</th>
                <th className="px-3 py-2 text-left font-semibold w-28">Item Code</th>
                <th className="px-3 py-2 text-left font-semibold">Description</th>
                <th className="px-3 py-2 text-right font-semibold w-16">Qty</th>
                <th className="px-3 py-2 text-right font-semibold w-24">Unit Price</th>
                <th className="px-3 py-2 text-right font-semibold w-28">Amount (RM)</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => {
                const qty = +l.qty || 0, up = +l.unit_price || 0, dc = +l.discount || 0
                const amt = qty * up - dc
                return (
                  <tr key={i} className="border-b border-slate-200">
                    <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                    <td className="px-3 py-2 font-mono">{l.item_code || '—'}</td>
                    <td className="px-3 py-2 font-medium">{l.description || '—'}</td>
                    <td className="px-3 py-2 text-right font-mono">{qty}</td>
                    <td className="px-3 py-2 text-right font-mono">{up.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right font-mono">{amt.toFixed(2)}</td>
                  </tr>
                )
              })}
              {Array.from({ length: Math.max(0, 5 - lines.length) }).map((_, i) => (
                <tr key={`b-${i}`} className="border-b border-slate-200">
                  <td className="px-3 py-2 text-slate-300">{lines.length + i + 1}</td>
                  <td colSpan={5} />
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td colSpan={5} className="px-3 py-2 text-right text-slate-600">Sub Total:</td><td className="px-3 py-2 text-right font-mono font-semibold border-t border-slate-300">{subtotal.toFixed(2)}</td></tr>
              {(+inv.discount_total || 0) > 0 && <tr><td colSpan={5} className="px-3 py-2 text-right text-slate-600">Discount:</td><td className="px-3 py-2 text-right font-mono">−{(+inv.discount_total).toFixed(2)}</td></tr>}
              {tax > 0 && <tr><td colSpan={5} className="px-3 py-2 text-right text-slate-600">Tax:</td><td className="px-3 py-2 text-right font-mono">{tax.toFixed(2)}</td></tr>}
              <tr className="bg-slate-100 border-t-2 border-slate-800">
                <td colSpan={5} className="px-3 py-2.5 text-right font-bold text-slate-800">TOTAL (RM)</td>
                <td className="px-3 py-2.5 text-right font-mono font-bold text-base text-slate-900">{total.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          {/* Amount in words */}
          <div className="border border-slate-300 rounded p-3 mb-6">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mr-2">Amount in Words:</span>
            <span className="text-sm font-semibold italic text-slate-800">{numberToWords(total)}</span>
          </div>

          {/* Payment Status */}
          <div className="border border-slate-300 rounded p-4 mb-8">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Payment Information</div>
              <div className={`px-2 py-0.5 border rounded font-bold tracking-wider text-xs ${statusBadge.cls}`}>{statusBadge.label}</div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div><div className="text-slate-500 text-xs">Total Amount</div><div className="font-mono font-semibold mt-0.5">RM {total.toFixed(2)}</div></div>
              <div><div className="text-slate-500 text-xs">Total Paid</div><div className="font-mono font-semibold mt-0.5 text-emerald-700">RM {paid.toFixed(2)}</div></div>
              <div><div className="text-slate-500 text-xs">Outstanding</div><div className={`font-mono font-bold mt-0.5 ${status === 'paid' ? 'text-slate-700' : 'text-red-700'}`}>RM {outstanding.toFixed(2)}</div></div>
            </div>
          </div>

          {/* Reference / Description */}
          {(inv.reference || inv.description) && (
            <div className="text-xs text-slate-600 mb-8">
              {inv.reference && <div><span className="font-semibold">Reference:</span> {inv.reference}</div>}
              {inv.description && <div><span className="font-semibold">Note:</span> {inv.description}</div>}
            </div>
          )}

          {/* Signatures */}
          <div className="grid grid-cols-3 gap-8 pt-12 mt-auto">
            {['Prepared By', 'Approved By', 'Received By'].map(label => (
              <div key={label} className="text-center">
                <div className="border-t border-slate-700 pt-2">
                  <div className="text-xs font-semibold text-slate-700">{label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Name &amp; Signature</div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="text-center text-[10px] text-slate-400 mt-8 pt-3 border-t border-slate-200">
            This is a system-generated document from CARLANISA SDN BHD ERP. Printed: {new Date().toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</span>
      {children}
    </label>
  )
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-500">{label}</span>
      <span className={`font-semibold ${muted ? 'text-slate-400' : 'text-slate-700'}`}>{value}</span>
    </div>
  )
}
