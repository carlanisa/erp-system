'use client'

import { useEffect, useState } from 'react'
import { X, Send, Loader2, Paperclip, History, Mail, AlertCircle, FileText } from 'lucide-react'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

// Pre-built templates — user picks one and subject/body auto-fill.
// Replaces {DOC} with the document label (PI-00001 etc.) when applied.
type EmailTemplate = { key: string; label: string; subject: string; body: string }
const TEMPLATES: EmailTemplate[] = [
  {
    key: 'default',
    label: '— Default —',
    subject: '',
    body: '',
  },
  {
    key: 'invoice_to_supplier',
    label: 'Invoice → Supplier',
    subject: 'Purchase Invoice {DOC}',
    body: `Dear Sir / Madam,

Please find attached our purchase invoice {DOC} along with the supporting documents.

Kindly acknowledge receipt and let us know if you require anything else.

Regards,
CARLANISA SDN BHD`,
  },
  {
    key: 'payment_confirmation',
    label: 'Payment Confirmation',
    subject: 'Payment Confirmation — {DOC}',
    body: `Dear Sir / Madam,

We have processed your payment against {DOC}. Please find the payment voucher and proof of transfer attached.

If there is any discrepancy, kindly let us know within 7 days.

Regards,
CARLANISA SDN BHD`,
  },
  {
    key: 'overdue_reminder',
    label: 'Overdue Reminder',
    subject: 'Reminder: Overdue Invoice {DOC}',
    body: `Dear Sir / Madam,

This is a friendly reminder that invoice {DOC} is overdue.

Please process the payment at your earliest convenience or get in touch if there is any issue.

Regards,
CARLANISA SDN BHD`,
  },
  {
    key: 'auditor_submission',
    label: 'Auditor Submission',
    subject: 'Document Submission for Audit — {DOC}',
    body: `Dear Auditor,

Please find attached {DOC} along with all supporting documentation as part of our audit submission.

Let us know if any additional information is required.

Regards,
Accounts Department
CARLANISA SDN BHD`,
  },
]

type Attachment = {
  id: number
  original_filename: string
  size_bytes: number
  mime_type: string | null
}

type EmailHistoryRow = {
  id: number
  to_addresses: string
  subject: string
  status: 'queued' | 'sent' | 'failed'
  error_message: string | null
  sent_at: string | null
  created_at: string
  sent_by: { id: number; name: string; email: string } | null
}

type Props = {
  open: boolean
  onClose: () => void
  relatedType: 'purchase_invoice' | 'payment_voucher' | 'official_receipt' | 'ap_deposit' | 'ar_deposit' | 'journal_entry' | 'crm_invoice'
  relatedId: number
  defaultTo?: string                          // pre-fill recipient email
  defaultSubject?: string
  defaultBody?: string
  documentLabel?: string                      // e.g. "PI-00002" — shown in header
}

export default function EmailComposer({
  open, onClose,
  relatedType, relatedId,
  defaultTo = '',
  defaultSubject = '',
  defaultBody = '',
  documentLabel,
}: Props) {
  const [to, setTo]           = useState(defaultTo)
  const [cc, setCc]           = useState('')
  const [bcc, setBcc]         = useState('')
  const [subject, setSubject] = useState(defaultSubject)
  const [body, setBody]       = useState(defaultBody)
  const [files, setFiles]     = useState<Attachment[]>([])
  const [picked, setPicked]   = useState<Set<number>>(new Set())
  const [history, setHistory] = useState<EmailHistoryRow[]>([])
  const [sending, setSending] = useState(false)
  const [tab, setTab]         = useState<'compose'|'history'>('compose')
  const [includePdf, setIncludePdf] = useState(true)
  const [templateKey, setTemplateKey] = useState('default')

  // PDF generation only applies to certain doc types
  const pdfSupported = relatedType === 'purchase_invoice' || relatedType === 'payment_voucher'

  function applyTemplate(key: string) {
    setTemplateKey(key)
    const tpl = TEMPLATES.find(t => t.key === key)
    if (!tpl || tpl.key === 'default') return
    const docLabel = documentLabel ?? ''
    setSubject(tpl.subject.replace(/\{DOC\}/g, docLabel))
    setBody(tpl.body.replace(/\{DOC\}/g, docLabel))
  }

  // When the modal opens, reset to defaults & fetch attachments + history
  useEffect(() => {
    if (!open) return
    setTo(defaultTo)
    setSubject(defaultSubject)
    setBody(defaultBody)
    setCc('')
    setBcc('')
    setPicked(new Set())
    setTab('compose')
    setTemplateKey('default')
    setIncludePdf(pdfSupported)        // default ON when supported

    api.get('/attachments', { params: { type: relatedType, id: relatedId } })
      .then(r => {
        const list: Attachment[] = r.data.data ?? []
        setFiles(list)
        setPicked(new Set(list.map(f => f.id)))     // pre-select all by default
      })
      .catch(() => setFiles([]))

    api.get('/email/history', { params: { type: relatedType, id: relatedId } })
      .then(r => setHistory(r.data.data ?? []))
      .catch(() => setHistory([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, relatedType, relatedId])

  function togglePick(id: number) {
    setPicked(p => {
      const next = new Set(p)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleSend() {
    if (!to.trim()) { toast.error('At least one recipient (To) is required'); return }
    if (!subject.trim()) { toast.error('Subject is required'); return }
    setSending(true)
    try {
      const r = await api.post('/email/send', {
        related_type: relatedType,
        related_id:   relatedId,
        to, cc, bcc, subject, body,
        attachment_ids: Array.from(picked),
        include_pdf:   includePdf && pdfSupported,
      })
      toast.success(r.data?.message ?? 'Email sent')
      onClose()
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? 'Email send failed'
      toast.error(msg, { duration: 6000 })
    } finally { setSending(false) }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Email{documentLabel ? ` · ${documentLabel}` : ''}</h2>
              <p className="text-xs text-slate-500">Send invoice + attached documents to supplier / auditor</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-5 bg-slate-50">
          {([
            { key: 'compose', label: 'Compose' },
            { key: 'history', label: `History${history.length ? ` (${history.length})` : ''}` },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                tab===t.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'compose' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {/* Template picker */}
            <div className="flex items-center gap-2 text-xs">
              <label className="font-semibold text-slate-500 uppercase tracking-wide text-[11px]">Template:</label>
              <select value={templateKey} onChange={e=>applyTemplate(e.target.value)}
                className="px-2 py-1 text-xs border border-slate-300 rounded bg-white focus:outline-none focus:border-blue-400">
                {TEMPLATES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
              <span className="text-[10px] text-slate-400">— picks subject + body for this scenario</span>
            </div>

            {/* To */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">To <span className="text-red-500">*</span></label>
              <input value={to} onChange={e=>setTo(e.target.value)}
                placeholder="supplier@company.com, auditor@firm.com"
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:border-blue-400" />
              <p className="text-[10px] text-slate-400 mt-0.5">Multiple addresses separated by commas</p>
            </div>

            {/* CC + BCC */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">CC</label>
                <input value={cc} onChange={e=>setCc(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">BCC</label>
                <input value={bcc} onChange={e=>setBcc(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:border-blue-400" />
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Subject <span className="text-red-500">*</span></label>
              <input value={subject} onChange={e=>setSubject(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:border-blue-400 font-medium" />
            </div>

            {/* Body */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Message</label>
              <textarea value={body} onChange={e=>setBody(e.target.value)}
                rows={8}
                placeholder="Dear Sir / Madam,&#10;&#10;Please find attached the purchase invoice along with the supporting documents.&#10;&#10;Regards,"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:border-blue-400" />
            </div>

            {/* Include auto-generated PDF */}
            {pdfSupported && (
              <label className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded cursor-pointer">
                <input type="checkbox" checked={includePdf} onChange={e=>setIncludePdf(e.target.checked)}
                  className="w-4 h-4 rounded accent-blue-600" />
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-medium text-slate-700">Auto-attach the system-generated invoice PDF</span>
                <span className="text-[10px] text-slate-500 ml-auto">{documentLabel}.pdf</span>
              </label>
            )}

            {/* Attachments */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Attachments</label>
                <span className="text-[10px] text-slate-400">— from External Document tab</span>
              </div>
              {files.length === 0 ? (
                <div className="text-xs text-slate-400 italic px-2 py-3 border border-dashed border-slate-200 rounded text-center">
                  No documents attached to this record yet. Upload them in the External Document tab first.
                </div>
              ) : (
                <div className="border border-slate-200 rounded divide-y divide-slate-100">
                  {files.map(f => (
                    <label key={f.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                      <input type="checkbox" checked={picked.has(f.id)} onChange={() => togglePick(f.id)}
                        className="w-3.5 h-3.5 rounded accent-blue-600" />
                      <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                      <span className="flex-1 text-xs font-medium text-slate-700 truncate">{f.original_filename}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{(f.size_bytes/1024).toFixed(1)} KB</span>
                    </label>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-slate-400 mt-1">{picked.size} of {files.length} selected</p>
            </div>

            {/* SMTP warning */}
            <div className="bg-amber-50 border border-amber-200 rounded p-2 flex gap-2 text-[11px] text-amber-800">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">Mail sending requires SMTP credentials.</div>
                Currently the backend is in <code className="font-mono">log</code> mode (writes to logs only).
                Update <code className="font-mono">.env</code> with <code>MAIL_MAILER=smtp</code> + your provider's host/port/credentials to actually send.
              </div>
            </div>
          </div>
        )}

        {tab === 'history' && (
          <div className="flex-1 overflow-y-auto p-5">
            {history.length === 0 ? (
              <div className="text-center text-sm text-slate-400 py-8">
                <History className="w-10 h-10 mx-auto mb-2 opacity-30" />
                No email has been sent for this document yet.
              </div>
            ) : (
              <div className="space-y-3">
                {history.map(h => (
                  <div key={h.id} className="border border-slate-200 rounded p-3">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-800 truncate">{h.subject}</div>
                        <div className="text-xs text-slate-500 truncate">To: {h.to_addresses}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${
                        h.status==='sent'   ? 'bg-emerald-100 text-emerald-700' :
                        h.status==='failed' ? 'bg-red-100 text-red-700'         :
                                              'bg-amber-100 text-amber-700'
                      }`}>{h.status.toUpperCase()}</span>
                    </div>
                    {h.error_message && (
                      <div className="text-[11px] text-red-600 bg-red-50 rounded p-1.5 mt-1">{h.error_message}</div>
                    )}
                    <div className="text-[10px] text-slate-400 mt-1">
                      {h.sent_by?.name ?? 'System'} · {h.sent_at ? formatDate(h.sent_at) : formatDate(h.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50">
          <button onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded">Close</button>
          {tab === 'compose' && (
            <button onClick={handleSend} disabled={sending}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 disabled:opacity-60">
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Send
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
