'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { ArrowLeft, Send, DollarSign, Printer, Loader2, X, CheckCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Invoice } from '@/types/index'

const statusStyles: Record<string, string> = {
  draft:     'badge-blue',
  sent:      'badge-yellow',
  paid:      'badge-green',
  overdue:   'badge-red',
  cancelled: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500',
}

type Payment = { id: number; date: string; amount: number; method: string; reference?: string }

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading]   = useState(true)
  const [sending, setSending]   = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)

  const [payForm, setPayForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    amount: '',
    method: 'bank_transfer',
    reference: '',
    notes: '',
  })
  const [paying, setPaying] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get(`/accounting/invoices/${id}`)
      setInvoice(data.data)
      setPayments(data.data.payments ?? [])
    } catch {
      toast.error('Invoice not found')
      router.push('/accounting/invoices')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  async function handleSend() {
    setSending(true)
    try {
      await api.post(`/accounting/invoices/${id}/send`)
      toast.success('Invoice marked as sent')
      load()
    } catch { toast.error('Failed') }
    finally { setSending(false) }
  }

  async function handlePayment() {
    if (!payForm.amount) return toast.error('Enter payment amount')
    setPaying(true)
    try {
      await api.post(`/accounting/invoices/${id}/payments`, payForm)
      toast.success('Payment recorded successfully')
      setShowPayModal(false)
      setPayForm({ date: new Date().toISOString().slice(0, 10), amount: '', method: 'bank_transfer', reference: '', notes: '' })
      load()
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Payment failed')
    } finally { setPaying(false) }
  }

  const amountPaid = payments.reduce((s, p) => s + p.amount, 0)
  const amountDue  = (invoice?.total ?? 0) - amountPaid

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    )
  }
  if (!invoice) return null

  return (
    <div className="max-w-3xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/accounting/invoices" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-800">{invoice.number}</h1>
              <span className={statusStyles[invoice.status]}>{invoice.status}</span>
            </div>
            <p className="text-sm text-slate-500">Issued {formatDate(invoice.date)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="btn-outline flex items-center gap-2">
            <Printer className="w-4 h-4" /> Print
          </button>
          {invoice.status === 'draft' && (
            <button onClick={handleSend} disabled={sending} className="btn-outline flex items-center gap-2">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Mark as Sent
            </button>
          )}
          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
            <button onClick={() => setShowPayModal(true)} className="btn-primary flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> Record Payment
            </button>
          )}
        </div>
      </div>

      {/* Paid banner */}
      {invoice.status === 'paid' && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-emerald-700 text-sm font-medium">
          <CheckCircle className="w-4 h-4" /> This invoice is fully paid.
        </div>
      )}

      {/* Invoice Card */}
      <div className="card space-y-6">
        {/* Customer + Amounts */}
        <div className="flex justify-between flex-wrap gap-6">
          <div>
            <p className="text-xs text-slate-400 font-medium mb-1">BILLED TO</p>
            <p className="font-bold text-slate-800 text-base">{invoice.customer?.name}</p>
            {invoice.customer?.email && <p className="text-sm text-slate-500">{invoice.customer.email}</p>}
            {invoice.customer?.phone && <p className="text-sm text-slate-500">{invoice.customer.phone}</p>}
            {invoice.customer?.city  && <p className="text-sm text-slate-500">{invoice.customer.city}</p>}
          </div>
          <div className="text-right">
            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
              <span className="text-slate-400">Issue Date:</span>
              <span className="font-medium text-slate-700">{formatDate(invoice.date)}</span>
              <span className="text-slate-400">Due Date:</span>
              <span className="font-medium text-slate-700">{formatDate(invoice.due_date)}</span>
              <span className="text-slate-400">Amount Due:</span>
              <span className="font-bold text-indigo-600">{formatCurrency(amountDue)}</span>
            </div>
          </div>
        </div>

        {/* Items table */}
        <div className="border border-slate-100 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left text-xs text-slate-500 font-semibold px-4 py-2.5">Description</th>
                <th className="text-right text-xs text-slate-500 font-semibold px-3 py-2.5">Qty</th>
                <th className="text-right text-xs text-slate-500 font-semibold px-3 py-2.5">Price</th>
                <th className="text-right text-xs text-slate-500 font-semibold px-3 py-2.5">Tax</th>
                <th className="text-right text-xs text-slate-500 font-semibold px-4 py-2.5">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {invoice.items?.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-slate-700">{item.description}</td>
                  <td className="px-3 py-3 text-right text-slate-500">{item.quantity}</td>
                  <td className="px-3 py-3 text-right text-slate-500">{formatCurrency(item.unit_price)}</td>
                  <td className="px-3 py-3 text-right text-slate-400">{item.tax_rate ?? 0}%</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-800">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm text-slate-500">
              <span>Subtotal</span><span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-500">
              <span>Tax</span><span>{formatCurrency(invoice.tax_amount)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-500 pt-1 border-t border-slate-100">
              <span>Amount Paid</span>
              <span className="text-emerald-600">- {formatCurrency(amountPaid)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-slate-800 pt-1 border-t border-slate-200">
              <span>Amount Due</span>
              <span className="text-indigo-600">{formatCurrency(amountDue)}</span>
            </div>
          </div>
        </div>

        {invoice.notes && (
          <div className="bg-slate-50 rounded-lg px-4 py-3 text-sm text-slate-600">
            <span className="font-medium text-slate-700">Notes: </span>{invoice.notes}
          </div>
        )}
      </div>

      {/* Payments history */}
      {payments.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Payment History</h3>
          <div className="space-y-2">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-700">{formatDate(p.date)}</p>
                  <p className="text-xs text-slate-400 capitalize">{p.method.replace('_', ' ')} {p.reference ? `· ${p.reference}` : ''}</p>
                </div>
                <span className="text-sm font-semibold text-emerald-600">{formatCurrency(p.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Record Payment</h3>
              <button onClick={() => setShowPayModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Amount Due</p>
                <p className="text-xl font-bold text-indigo-600">{formatCurrency(amountDue)}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Date *</label>
                  <input type="date" value={payForm.date}
                    onChange={e => setPayForm({...payForm, date: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Amount *</label>
                  <input type="number" value={payForm.amount} max={amountDue}
                    onChange={e => setPayForm({...payForm, amount: e.target.value})}
                    placeholder={String(amountDue)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Payment Method</label>
                <select value={payForm.method} onChange={e => setPayForm({...payForm, method: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="card">Card</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Reference # (optional)</label>
                <input type="text" value={payForm.reference}
                  onChange={e => setPayForm({...payForm, reference: e.target.value})}
                  placeholder="Cheque no / Transaction ID..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setShowPayModal(false)} className="btn-outline">Cancel</button>
              <button onClick={handlePayment} disabled={paying} className="btn-primary flex items-center gap-2">
                {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
