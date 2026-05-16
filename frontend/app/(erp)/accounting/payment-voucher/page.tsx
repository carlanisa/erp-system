'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, RefreshCw, Pencil, Trash2, X, Loader2, Save,
  Printer, Eye, FileOutput, PlusCircle, MinusCircle,
  ChevronFirst, ChevronLast, ChevronLeft, ChevronRight,
  FilePlus, ScanEye, FileSearch, ArrowLeft, Copy, Mail,
} from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'
import EmailComposer from '@/components/email/EmailComposer'
import { openPdf, openPdfAndPrint } from '@/lib/pdf'

type Account = { id: number; name: string; code: string; parent_id?: number | null; type?: string }
type PVLine = { id?: number; account_id: string; code: string; description: string; amount: string }
type PVPayment = { id?: number; payee: string; account_id: string; voucher_no: string; payment_date: string; amount: string; reference: string; notes: string }
type PV = {
  id: number
  pv_number: string
  branch_code: string
  date: string
  posting_date: string | null
  payment_date: string | null
  payee: string
  account: Account
  bank_account: Account | null
  amount: number
  paid_amount: number
  bank_charges: number
  payment_method: string
  cheque_number: string | null
  reference: string | null
  description: string | null
  agent: string | null
  area: string | null
  status: string
  payment_status: 'unpaid' | 'partial' | 'paid'
  is_cancelled: boolean
  lines: { id: number; account: Account; description: string | null; amount: number }[]
  payments?: { id: number; payee: string | null; payment_date: string; amount: number; reference: string | null; notes: string | null }[]
}

type ColFilters = {
  doc_no: string; doc_date: string; bcode: string
  pay_code: string; pay_name: string; pay_to: string; amount: string
}
const emptyColFilters: ColFilters = {
  doc_no: '', doc_date: '', bcode: '', pay_code: '', pay_name: '', pay_to: '', amount: '',
}

const BRANCHES = ['HQ','KL','JB','PG','SBH']

const emptyLine: PVLine = { account_id: '', code: '', description: '', amount: '' }

const emptyPayment: PVPayment = { payee: '', account_id: '', voucher_no: '', payment_date: '', amount: '', reference: '', notes: '' }

const emptyForm = {
  date: new Date().toISOString().slice(0,10),
  posting_date: new Date().toISOString().slice(0,10),
  payment_date: '',
  branch_code: 'HQ',
  payee: '',
  bank_account_id: '',
  account_id: '',
  payment_method: 'cheque',
  cheque_number: '',
  bank_charges: '0',
  paid_amount: '0',
  reference: '',
  description: '',
  agent: 'NA',
  area: 'NA',
  status: 'draft',
  lines: [{ ...emptyLine }] as PVLine[],
  payments: [] as PVPayment[],
}

// ── Convert a number to words (Malaysian Ringgit + Sen) for invoices ─────────
function numberToWords(n: number, currency = 'Ringgit', subUnit = 'Sen'): string {
  if (!isFinite(n) || n < 0) return '—'
  if (n === 0) return `Zero ${currency} Only`

  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
                'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen']
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety']

  function chunkUnder1000(num: number): string {
    if (num === 0) return ''
    if (num < 20) return ones[num]
    if (num < 100) return tens[Math.floor(num/10)] + (num%10 ? ' ' + ones[num%10] : '')
    return ones[Math.floor(num/100)] + ' Hundred' + (num%100 ? ' ' + chunkUnder1000(num%100) : '')
  }

  function whole(num: number): string {
    if (num === 0) return ''
    const billions  = Math.floor(num / 1_000_000_000)
    const millions  = Math.floor((num % 1_000_000_000) / 1_000_000)
    const thousands = Math.floor((num % 1_000_000) / 1000)
    const rest      = num % 1000
    let out = ''
    if (billions)  out += chunkUnder1000(billions) + ' Billion '
    if (millions)  out += chunkUnder1000(millions) + ' Million '
    if (thousands) out += chunkUnder1000(thousands) + ' Thousand '
    if (rest)      out += chunkUnder1000(rest)
    return out.trim()
  }

  const intPart = Math.floor(n)
  const fracPart = Math.round((n - intPart) * 100)
  let out = whole(intPart) + ' ' + currency
  if (fracPart > 0) out += ' and ' + chunkUnder1000(fracPart) + ' ' + subUnit
  return out + ' Only'
}

// ── A/C Code picker — grid-style popup (AC Code | Description | Curr) ────────
// Searches by code OR name (substring), scrollable, arrow-keys + Enter, click-to-pick
function AccountCodePicker({
  rowIndex, value, accounts, onChange, onCommit,
}: {
  rowIndex: number
  value: string
  accounts: Account[]
  onChange: (code: string) => void           // live typing → updates code/account_id
  onCommit: (code: string) => void           // selection committed → also moves focus
}) {
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const q = value.trim().toLowerCase()
  const filtered = useMemo(() =>
    !q ? accounts : accounts.filter(a =>
      a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)
    ),
  [accounts, q])

  useEffect(() => { setHighlight(0) }, [q])

  // Click outside → close
  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  // Keep highlighted row visible
  useEffect(() => {
    if (!open) return
    const row = listRef.current?.querySelector<HTMLElement>(`[data-row-idx="${highlight}"]`)
    row?.scrollIntoView({ block: 'nearest' })
  }, [highlight, open])

  function pick(code: string) {
    setOpen(false)
    onCommit(code)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) { setOpen(true); return }
      setHighlight(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight(i => Math.max(i - 1, 0))
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      // 1. dropdown open + a row is highlighted → pick that row
      if (open && filtered[highlight]) { pick(filtered[highlight].code); return }
      // 2. typed value matches a code exactly → commit it
      const exact = accounts.find(a => a.code.toLowerCase() === value.trim().toLowerCase())
      if (exact) { pick(exact.code); return }
      // 3. typed value matches a name exactly → commit that account's code
      const byName = accounts.find(a => a.name.toLowerCase() === value.trim().toLowerCase())
      if (byName) { pick(byName.code); return }
      // 4. only one filtered match → pick it
      if (filtered.length === 1) { pick(filtered[0].code); return }
      // 5. nothing resolved → still move forward (existing UX)
      onCommit(value)
    } else if (e.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <div className="flex">
        <input
          data-pv-cell={`${rowIndex}-code`}
          type="text"
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Code or name…"
          className="flex-1 min-w-0 px-2 py-1 text-xs border border-slate-200 rounded-l bg-white focus:outline-none focus:border-indigo-400 font-mono uppercase"
        />
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={e => { e.preventDefault(); setOpen(o => !o) }}
          className="px-1.5 border border-l-0 border-slate-200 rounded-r bg-slate-50 hover:bg-slate-100 text-slate-500 text-[10px]"
          aria-label="Open accounts list"
        >▼</button>
      </div>

      {open && (
        <div ref={listRef}
             className="absolute z-50 left-0 top-full mt-0.5 w-[460px] max-h-72 overflow-auto bg-white border border-slate-300 rounded shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-xs text-slate-400 text-center">No matching accounts</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-10 bg-slate-100 shadow-[0_1px_0_0_#e2e8f0]">
                <tr>
                  <th className="px-2 py-1 text-left font-semibold text-slate-700 w-24">AC Code</th>
                  <th className="px-2 py-1 text-left font-semibold text-slate-700">Description</th>
                  <th className="px-2 py-1 text-left font-semibold text-slate-700 w-12">Curr</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, i) => (
                  <tr key={a.id}
                      data-row-idx={i}
                      onMouseDown={e => { e.preventDefault(); pick(a.code) }}
                      onMouseEnter={() => setHighlight(i)}
                      className={`cursor-pointer border-b border-slate-50 ${i === highlight ? 'bg-indigo-100' : 'hover:bg-slate-50'}`}>
                    <td className="px-2 py-1 font-mono text-slate-700 whitespace-nowrap">{a.code}</td>
                    <td className="px-2 py-1 text-slate-800 uppercase">{a.name}</td>
                    <td className="px-2 py-1 text-slate-500 font-mono">MYR</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

export default function PaymentVoucherPage() {
  const router = useRouter()
  const [records, setRecords]   = useState<PV[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [page, setPage]         = useState(1)
  const [perPage]               = useState(50)
  const [meta, setMeta]         = useState({ last_page: 1, total: 0, grand_total: 0 })
  const [loading, setLoading]   = useState(true)
  const [selectedRow, setSelectedRow] = useState<PV | null>(null)

  // Form mode: 'list' | 'create' | 'edit'
  const [mode, setMode]     = useState<'list'|'create'|'edit'|'preview'>('list')
  const [previewing, setPreviewing] = useState<PV | null>(null)
  const [emailOpen, setEmailOpen] = useState(false)
  const [editing, setEditing] = useState<PV | null>(null)
  const [form, setForm]     = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'main'|'external'|'note'>('main')
  const [attachments, setAttachments] = useState<any[]>([])
  const [uploadingFile, setUploadingFile] = useState(false)

  async function loadAttachments(pvId: number) {
    try {
      const r = await api.get('/attachments', { params: { type: 'payment_voucher', id: pvId } })
      setAttachments(r.data.data ?? [])
    } catch { setAttachments([]) }
  }
  async function uploadAttachment(file: File, label = '') {
    if (!editing) { toast.error('Save the voucher first before attaching files'); return }
    setUploadingFile(true)
    try {
      const fd = new FormData()
      fd.append('type', 'payment_voucher')
      fd.append('id', String(editing.id))
      fd.append('file', file)
      if (label) fd.append('label', label)
      await api.post('/attachments', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success(`Uploaded ${file.name}`)
      await loadAttachments(editing.id)
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Upload failed')
    } finally { setUploadingFile(false) }
  }
  async function deleteAttachment(att: any) {
    if (!confirm(`Delete ${att.original_filename}?`)) return
    try {
      await api.delete(`/attachments/${att.id}`)
      setAttachments(prev => prev.filter(a => a.id !== att.id))
      toast.success('File deleted')
    } catch { toast.error('Delete failed') }
  }

  const [colF, setColF] = useState<ColFilters>(emptyColFilters)

  useEffect(() => { api.get('/accounting/accounts/flat').then(r => setAccounts(r.data.data)) }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/accounting/payment-vouchers', { params: { page, per_page: perPage } })
      setRecords(r.data.data)
      setMeta(r.data.meta)
    } catch {} finally { setLoading(false) }
  }, [page, perPage])

  useEffect(() => { load() }, [load])

  // Column filters
  const filtered = useMemo(() => records.filter(r => {
    const payCode = r.bank_account?.code ?? r.account?.code ?? ''
    const payName = r.bank_account?.name ?? ''
    return (
      (!colF.doc_no   || r.pv_number.toLowerCase().includes(colF.doc_no.toLowerCase()))   &&
      (!colF.doc_date || formatDate(r.date).toLowerCase().includes(colF.doc_date.toLowerCase())) &&
      (!colF.bcode    || r.branch_code.toLowerCase().includes(colF.bcode.toLowerCase()))   &&
      (!colF.pay_code || payCode.toLowerCase().includes(colF.pay_code.toLowerCase()))      &&
      (!colF.pay_name || payName.toLowerCase().includes(colF.pay_name.toLowerCase()))      &&
      (!colF.pay_to   || r.payee.toLowerCase().includes(colF.pay_to.toLowerCase()))        &&
      (!colF.amount   || String(r.amount).includes(colF.amount))
    )
  }), [records, colF])

  const hasColFilter   = Object.values(colF).some(v => v !== '')
  const filteredTotal  = filtered.filter(r => !r.is_cancelled).reduce((s,r) => s+r.amount, 0)
  const cf = (k: keyof ColFilters, v: string) => setColF(p => ({...p,[k]:v}))

  // Form helpers
  const sf = (k: string, v: string) => setForm(p => ({...p,[k]:v}))

  function addLine() { setForm(p => ({...p, lines: [...p.lines, {...emptyLine}]})) }
  function removeLine(i: number) { setForm(p => ({...p, lines: p.lines.filter((_,idx) => idx !== i)})) }
  function updateLine(i: number, k: keyof PVLine, v: string) {
    setForm(p => ({ ...p, lines: p.lines.map((l, idx) => idx===i ? {...l,[k]:v} : l) }))
  }
  // Postable (leaf) accounts: ids that are NOT a parent of another account.
  // Header/group rows like 1000 Assets, 1100 Current Assets, 2000 Liabilities are excluded.
  // ALSO: SUP-XXXX supplier sub-ledger accounts are filtered out — Payment Voucher
  // is for generic expenses; supplier accounts belong to Purchase Invoice / Supplier Payment.
  const postableAccounts = useMemo(() => {
    const parentIds = new Set(
      accounts
        .map(a => a.parent_id)
        .filter((v): v is number => v != null)
    )
    return accounts.filter(a =>
      !parentIds.has(a.id) &&
      !a.code.toUpperCase().startsWith('SUP-')
    )
  }, [accounts])

  // Inventory accounts (Product / Fabric / etc) belong on Purchase Invoice — keep them OUT of Payment Voucher line picker.
  const generalLineAccounts = useMemo(() => {
    const INVENTORY_PATTERN = /(inventory|stock|fabric|material|product|goods|raw|accessor|brooch)/i
    return postableAccounts.filter(a => {
      // Drop inventory-related accounts (these go to Purchase Invoice)
      if (INVENTORY_PATTERN.test(`${a.name} ${a.code}`)) return false
      return true
    })
  }, [postableAccounts])

  // Live-resolve A/C Code → account_id (only resolves to postable leaf accounts)
  function setLineCode(i: number, code: string) {
    const acc = postableAccounts.find(a => a.code.toLowerCase() === code.trim().toLowerCase())
    setForm(p => ({
      ...p,
      lines: p.lines.map((l, idx) => idx===i ? { ...l, code, account_id: acc ? String(acc.id) : '' } : l),
    }))
  }
  // Focus a specific cell by data-pv-cell="rowIdx-field"
  function focusCell(rowIdx: number, field: 'code'|'title'|'description'|'amount') {
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLInputElement>(`[data-pv-cell="${rowIdx}-${field}"]`)
      el?.focus()
      if (el && 'select' in el) el.select?.()
    })
  }
  // Enter on a line cell → move to next field; on Amount → next row's A/C Code (adds line if last)
  function handleLineKey(e: React.KeyboardEvent, rowIdx: number, field: 'code'|'title'|'description'|'amount') {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const order: Array<'code'|'title'|'description'|'amount'> = ['code','title','description','amount']
    const next = order[order.indexOf(field) + 1]
    if (next) {
      focusCell(rowIdx, next)
    } else {
      if (rowIdx === form.lines.length - 1) addLine()
      focusCell(rowIdx + 1, 'code')
    }
  }

  const lineTotal   = form.lines.reduce((s,l) => s + (parseFloat(l.amount)||0), 0)
  const netTotal    = lineTotal + (parseFloat(form.bank_charges)||0)

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setMode('create')
  }

  // Build lines for the form: prefer real line records; fall back to a single
  // line from the legacy single-account fields (account_id + amount) for old
  // vouchers that were saved before the lines table was introduced.
  function linesForForm(r: PV): PVLine[] {
    if (r.lines?.length) {
      return r.lines.map(l => ({
        id: l.id,
        account_id: String(l.account.id),
        code: l.account.code,
        description: l.description ?? '',
        amount: String(l.amount),
      }))
    }
    if (r.account) {
      return [{
        account_id: String(r.account.id),
        code: r.account.code,
        description: r.description ?? '',
        amount: String(r.amount),
      }]
    }
    return [{ ...emptyLine }]
  }

  function openPreview(r: PV) {
    setPreviewing(r)
    setMode('preview')
  }

  // Open the styled HTML preview and auto-trigger window.print() once rendered.
  // Used by the form-level "Print" button so it prints the same template the
  // user sees in Preview (instead of the plain backend PDF).
  const [autoPrint, setAutoPrint] = useState(false)
  function openPreviewAndPrint(r: PV) {
    setPreviewing(r)
    setMode('preview')
    setAutoPrint(true)
  }
  useEffect(() => {
    if (mode === 'preview' && previewing && autoPrint) {
      const t = setTimeout(() => { window.print(); setAutoPrint(false) }, 350)
      return () => clearTimeout(t)
    }
  }, [mode, previewing, autoPrint])

  function openEdit(r: PV) {
    setEditing(r)
    loadAttachments(r.id)
    setActiveTab('main')
    setForm({
      date: r.date.slice(0,10),
      posting_date: r.posting_date ? r.posting_date.slice(0,10) : r.date.slice(0,10),
      payment_date: r.payment_date ? r.payment_date.slice(0,10) : '',
      branch_code: r.branch_code,
      payee: r.payee,
      bank_account_id: r.bank_account ? String(r.bank_account.id) : '',
      account_id: r.account ? String(r.account.id) : '',
      payment_method: r.payment_method,
      cheque_number: r.cheque_number ?? '',
      bank_charges: String(r.bank_charges ?? 0),
      paid_amount: String(r.paid_amount ?? 0),
      reference: r.reference ?? '',
      description: r.description ?? '',
      agent: r.agent ?? 'NA',
      area: r.area ?? 'NA',
      status: r.status,
      lines: linesForForm(r),
      payments: (r.payments ?? []).map(p => ({
        id: p.id,
        payee: p.payee ?? r.payee ?? '',
        account_id:  (p as any).account_id ? String((p as any).account_id) : '',
        voucher_no:  (p as any).voucher_no ?? '',
        payment_date: p.payment_date.slice(0,10),
        amount: String(p.amount),
        reference: p.reference ?? '',
        notes: p.notes ?? '',
      })),
    })
    setMode('edit')
  }

  function addPayment() {
    setForm(p => ({
      ...p,
      payments: [...p.payments, {
        ...emptyPayment,
        payee: p.payee,                                          // default to voucher's Pay To
        payment_date: new Date().toISOString().slice(0,10),
      }],
    }))
  }
  function removePayment(i: number) {
    setForm(p => ({ ...p, payments: p.payments.filter((_, idx) => idx !== i) }))
  }
  function updatePayment(i: number, k: keyof PVPayment, v: string) {
    setForm(p => ({ ...p, payments: p.payments.map((pay, idx) => idx===i ? { ...pay, [k]: v } : pay) }))
  }

  // Duplicate: pre-fill form with this voucher's data but in CREATE mode (new voucher number assigned on save)
  function duplicateVoucher(r: PV) {
    setEditing(null)
    const today = new Date().toISOString().slice(0,10)
    setForm({
      date: today,
      posting_date: today,
      payment_date: '',           // duplicate is a fresh bill — payment not yet made
      branch_code: r.branch_code,
      payee: r.payee,
      bank_account_id: r.bank_account ? String(r.bank_account.id) : '',
      account_id: r.account ? String(r.account.id) : '',
      payment_method: r.payment_method,
      cheque_number: '',          // cheque always cleared on duplicate
      bank_charges: String(r.bank_charges ?? 0),
      paid_amount: '0',           // unpaid by default
      reference: '',              // reference cleared
      description: r.description ?? '',
      agent: r.agent ?? 'NA',
      area: r.area ?? 'NA',
      status: 'draft',
      lines: linesForForm(r).map(({ id, ...rest }) => rest),  // strip line ids
      payments: [],                // duplicate starts unpaid
    })
    setMode('create')
    toast.success(`Duplicated from ${r.pv_number}`)
  }

  // Duplicate the form in-place (works during create OR edit) — drops the editing reference so save creates a new voucher
  function duplicateCurrent() {
    setEditing(null)
    const today = new Date().toISOString().slice(0,10)
    setForm(p => ({
      ...p,
      date: today,
      posting_date: today,
      payment_date: '',
      paid_amount: '0',
      cheque_number: '',
      reference: '',
      lines: p.lines.map(({ id, ...rest }) => rest),
      payments: [],
    }))
    setMode('create')
    toast.success('Form duplicated — saving will create a new voucher')
  }

  async function handleSave(asDraft = false) {
    if (!form.payee) { toast.error('Pay To is required'); return }
    if (!form.bank_account_id) { toast.error('Payment By (Bank) is required'); return }
    if (form.lines.some(l => !l.account_id || !l.amount)) { toast.error('Fill all account lines'); return }

    // Validate installments: each must have date + amount > 0
    for (const [i, p] of form.payments.entries()) {
      if (!p.payment_date) { toast.error(`Payment row ${i+1}: date required`); return }
      if (!p.amount || parseFloat(p.amount) <= 0) { toast.error(`Payment row ${i+1}: amount required`); return }
    }

    const paidSum = form.payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0)
    const billTotal = lineTotal + (parseFloat(form.bank_charges)||0)
    if (paidSum > billTotal + 0.0001) {
      toast.error(`Total payments (${paidSum.toFixed(2)}) exceed bill amount (${billTotal.toFixed(2)})`)
      return
    }

    setSaving(true)
    const payload = {
      ...form,
      amount: lineTotal,
      bank_charges: parseFloat(form.bank_charges)||0,
      // paid_amount + payment_date are auto-synced server-side from payments[], but send for safety
      paid_amount: paidSum,
      payment_date: null,
      bank_account_id: form.bank_account_id || null,
      account_id: form.account_id || null,
      status: asDraft ? 'draft' : form.status,
      lines: form.lines.map(l => ({
        account_id: parseInt(l.account_id),
        description: l.description || null,
        amount: parseFloat(l.amount),
      })),
      payments: form.payments.map(p => ({
        payee: p.payee || form.payee,                       // default to voucher payee on save
        account_id: p.account_id ? parseInt(p.account_id) : null,
        voucher_no: p.voucher_no || null,
        payment_date: p.payment_date,
        amount: parseFloat(p.amount),
        reference: p.reference || null,
        notes: p.notes || null,
      })),
    }
    try {
      if (editing) {
        await api.put(`/accounting/payment-vouchers/${editing.id}`, payload)
        toast.success('PV updated')
      } else {
        const r = await api.post('/accounting/payment-vouchers', payload)
        toast.success(`Created ${r.data.data.pv_number}`)
      }
      setMode('list'); load()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed')
    } finally { setSaving(false) }
  }

  async function handleDelete(r: PV) {
    if (!confirm(`Delete ${r.pv_number}?`)) return
    try {
      await api.delete(`/accounting/payment-vouchers/${r.id}`)
      toast.success('Deleted'); load()
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Cannot delete') }
  }

  async function toggleCancel(r: PV) {
    try {
      await api.post(`/accounting/payment-vouchers/${r.id}/cancel`)
      load()
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
  }

  const bankAccounts = postableAccounts.filter(a =>
    a.name.toLowerCase().includes('bank') || a.name.toLowerCase().includes('cash') ||
    a.name.toLowerCase().includes('maybank') || a.name.toLowerCase().includes('cimb')
  )

  const recordStart = (page-1)*perPage+1
  const recordEnd   = Math.min(page*perPage, meta.total)

  // ── PREVIEW VIEW (Printable Invoice) ──────────────────────────────────────
  if (mode === 'preview' && previewing) {
    const r = previewing
    const billLines = r.lines?.length
      ? r.lines.map(l => ({ code: l.account.code, name: l.account.name, description: l.description ?? '', amount: l.amount }))
      : (r.account ? [{ code: r.account.code, name: r.account.name, description: r.description ?? '', amount: r.amount }] : [])
    const subtotal       = billLines.reduce((s, l) => s + (l.amount || 0), 0)
    const total          = subtotal + (r.bank_charges ?? 0)
    const paymentStatus  = r.payment_status ?? (r.paid_amount > 0 ? (r.paid_amount >= r.amount ? 'paid' : 'partial') : 'unpaid')
    const statusBadge = {
      unpaid:  { label: 'UNPAID',  cls: 'border-red-600     text-red-700'    },
      partial: { label: 'PARTIAL', cls: 'border-amber-600   text-amber-700'  },
      paid:    { label: 'PAID',    cls: 'border-emerald-600 text-emerald-700'},
    }[paymentStatus]

    return (
      <div className="pv-print-host fixed inset-0 z-40 flex flex-col bg-slate-200">
        {/* ── Toolbar (hidden when printing) ── */}
        <div className="bg-white border-b border-slate-200 px-5 py-2.5 flex items-center justify-between flex-shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <button onClick={() => { setPreviewing(null); setMode(editing ? 'edit' : 'list') }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center">
              <ScanEye className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Payment Voucher Preview · {r.pv_number}</h2>
              <p className="text-xs text-slate-400">Click Print to send to printer</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700">
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button onClick={() => { setPreviewing(null); setMode(editing ? 'edit' : 'list') }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded hover:bg-red-600">
              <X className="w-3.5 h-3.5" /> Close
            </button>
          </div>
        </div>

        {/* ── Document body (visible on screen + when printing) ── */}
        <div className="flex-1 overflow-y-auto py-8 print:p-0 print:overflow-visible">
          <div className="pv-print-area mx-auto bg-white shadow-lg print:shadow-none print:mx-0
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
                <h2 className="text-2xl font-bold uppercase tracking-wider text-slate-800">Payment Voucher</h2>
                <div className={`inline-block mt-2 px-3 py-1 border-2 rounded ${statusBadge.cls}`}>
                  <span className="font-bold tracking-widest text-sm">{statusBadge.label}</span>
                </div>
              </div>
            </div>

            {/* Voucher meta — two columns */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-6 text-sm">
              <div className="flex">
                <span className="w-32 text-slate-500">Voucher No</span>
                <span className="font-bold font-mono text-red-700">{r.pv_number}</span>
              </div>
              <div className="flex">
                <span className="w-32 text-slate-500">Branch</span>
                <span className="font-semibold">{r.branch_code} — Head Office</span>
              </div>
              <div className="flex">
                <span className="w-32 text-slate-500">Entry Date</span>
                <span className="font-semibold">{formatDate(r.date)}</span>
              </div>
              <div className="flex">
                <span className="w-32 text-slate-500">Posting Date</span>
                <span className="font-semibold">{r.posting_date ? formatDate(r.posting_date) : '—'}</span>
              </div>
              {(() => {
                // Effective method: if 'cheque' was set but no cheque number actually entered,
                // legacy data is really a bank transfer — display accordingly.
                const effectiveMethod = (r.payment_method === 'cheque' && !r.cheque_number)
                  ? 'bank_transfer'
                  : r.payment_method
                const methodLabel = effectiveMethod === 'bank_transfer' ? 'Bank Transfer'
                                  : effectiveMethod === 'cheque'        ? 'Cheque'
                                  : effectiveMethod === 'cash'          ? 'Cash'
                                  : (effectiveMethod || '—').toString().replace('_',' ')
                return (
                  <>
                    <div className="flex">
                      <span className="w-32 text-slate-500">Payment Method</span>
                      <span className="font-semibold">{methodLabel}</span>
                    </div>
                    <div className="flex">
                      <span className="w-32 text-slate-500">Cheque No.</span>
                      <span className="font-mono">
                        {effectiveMethod === 'cheque' ? (r.cheque_number || '—') : 'Nil'}
                      </span>
                    </div>
                  </>
                )
              })()}
            </div>

            {/* Pay To & Payment By panel */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="border border-slate-300 rounded p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Pay To</div>
                <div className="text-base font-bold text-slate-900">{r.payee}</div>
              </div>
              <div className="border border-slate-300 rounded p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Payment By</div>
                <div className="text-base font-bold text-slate-900">
                  {r.bank_account ? `${r.bank_account.code} — ${r.bank_account.name}` : '—'}
                </div>
              </div>
            </div>

            {/* Lines table */}
            <table className="w-full text-sm border-collapse mb-4">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="px-3 py-2 text-left font-semibold w-12">#</th>
                  <th className="px-3 py-2 text-left font-semibold w-28">A/C Code</th>
                  <th className="px-3 py-2 text-left font-semibold">Account Title</th>
                  <th className="px-3 py-2 text-left font-semibold">Description</th>
                  <th className="px-3 py-2 text-right font-semibold w-32">Amount (RM)</th>
                </tr>
              </thead>
              <tbody>
                {billLines.map((l, i) => (
                  <tr key={i} className="border-b border-slate-200">
                    <td className="px-3 py-2 text-slate-500">{i+1}</td>
                    <td className="px-3 py-2 font-mono">{l.code}</td>
                    <td className="px-3 py-2 font-medium">{l.name}</td>
                    <td className="px-3 py-2 text-slate-700">{l.description || '—'}</td>
                    <td className="px-3 py-2 text-right font-mono">{l.amount.toFixed(2)}</td>
                  </tr>
                ))}
                {/* Filler rows so the table looks substantial on print */}
                {Array.from({ length: Math.max(0, 5 - billLines.length) }).map((_, i) => (
                  <tr key={`blank-${i}`} className="border-b border-slate-200">
                    <td className="px-3 py-2 text-slate-300">{billLines.length + i + 1}</td>
                    <td colSpan={4} />
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="px-3 py-2 text-right text-slate-600">Sub Total:</td>
                  <td className="px-3 py-2 text-right font-mono font-semibold border-t border-slate-300">{subtotal.toFixed(2)}</td>
                </tr>
                {(r.bank_charges ?? 0) > 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-2 text-right text-slate-600">Bank Charges:</td>
                    <td className="px-3 py-2 text-right font-mono">{r.bank_charges.toFixed(2)}</td>
                  </tr>
                )}
                <tr className="bg-slate-100 border-t-2 border-slate-800">
                  <td colSpan={4} className="px-3 py-2.5 text-right font-bold text-slate-800">TOTAL (RM)</td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold text-base text-slate-900">{total.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>

            {/* Amount in words */}
            <div className="border border-slate-300 rounded p-3 mb-6 bg-slate-50/40">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mr-2">Amount in Words:</span>
              <span className="text-sm font-semibold italic text-slate-800">{numberToWords(total)}</span>
            </div>

            {/* Payment Status block */}
            <div className="border border-slate-300 rounded p-4 mb-8">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Payment Information</div>
                <div className={`px-2 py-0.5 border rounded font-bold tracking-wider text-xs ${statusBadge.cls}`}>
                  {statusBadge.label}
                </div>
              </div>

              {/* Installment list */}
              {(r.payments && r.payments.length > 0) ? (
                <table className="w-full text-xs border-collapse mb-2">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300">
                      <th className="px-2 py-1.5 text-left font-semibold w-8">#</th>
                      <th className="px-2 py-1.5 text-left font-semibold w-24">Date</th>
                      <th className="px-2 py-1.5 text-right font-semibold w-28">Amount (RM)</th>
                      <th className="px-2 py-1.5 text-left font-semibold">Pay To</th>
                      <th className="px-2 py-1.5 text-left font-semibold w-28">Reference</th>
                      <th className="px-2 py-1.5 text-left font-semibold">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.payments.map((p, i) => (
                      <tr key={p.id} className="border-b border-slate-200">
                        <td className="px-2 py-1.5 text-slate-500">{i+1}</td>
                        <td className="px-2 py-1.5">{formatDate(p.payment_date)}</td>
                        <td className="px-2 py-1.5 text-right font-mono">{p.amount.toFixed(2)}</td>
                        <td className="px-2 py-1.5 font-medium">{p.payee || r.payee}</td>
                        <td className="px-2 py-1.5 font-mono text-slate-700">{p.reference || '—'}</td>
                        <td className="px-2 py-1.5 text-slate-600">{p.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 border-t border-slate-300">
                      <td colSpan={2} className="px-2 py-1.5 text-right font-semibold">Total Paid:</td>
                      <td className="px-2 py-1.5 text-right font-mono font-bold">{(r.paid_amount ?? 0).toFixed(2)}</td>
                      <td colSpan={3}></td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                <div className="text-xs text-slate-500 italic mb-2">No payments recorded yet.</div>
              )}

              <div className="grid grid-cols-3 gap-4 text-sm pt-2 border-t border-slate-200 mt-2">
                <div>
                  <div className="text-slate-500 text-xs">Last Payment Date</div>
                  <div className="font-semibold mt-0.5">{r.payment_date ? formatDate(r.payment_date) : '—'}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-xs">Total Paid</div>
                  <div className="font-mono font-semibold mt-0.5 text-emerald-700">RM {(r.paid_amount ?? 0).toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-xs">Outstanding</div>
                  <div className={`font-mono font-bold mt-0.5 ${paymentStatus==='paid'?'text-slate-700':'text-red-700'}`}>
                    RM {Math.max(0, total - (r.paid_amount ?? 0)).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Reference / Description */}
            {(r.reference || r.description) && (
              <div className="text-xs text-slate-600 mb-8">
                {r.reference && <div><span className="font-semibold">Reference:</span> {r.reference}</div>}
                {r.description && <div><span className="font-semibold">Note:</span> {r.description}</div>}
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

  // ── FORM VIEW (Create / Edit) ──────────────────────────────────────────────
  if (mode === 'create' || mode === 'edit') {
    const selectedBank = form.bank_account_id
      ? (bankAccounts.find(a=>String(a.id)===form.bank_account_id) || accounts.find(a=>String(a.id)===form.bank_account_id))
      : null

    return (
      <div className="fixed inset-0 z-40 flex flex-col bg-slate-100">
        {/* ── Modern header bar with full ELBS button set ── */}
        <div className="bg-white border-b border-slate-200 px-5 py-2.5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setMode('list')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
              title="Back to Payment Voucher list">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
              <FileOutput className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                {editing ? `Edit ${editing.pv_number}` : 'New Payment Voucher'}
              </h2>
              <p className="text-xs text-slate-400">General Ledger → Payment Voucher</p>
            </div>
          </div>

          {/* ELBS feature set — modern styled */}
          <div className="flex items-center gap-1.5">
            <button onClick={() => handleSave(false)} disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700 disabled:opacity-60">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save
            </button>
            <button onClick={() => editing
                ? openPreviewAndPrint(editing)
                : toast.error('Save the voucher first to print')}
              disabled={!editing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 text-white text-xs font-medium rounded hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Open the styled invoice and print">
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button onClick={() => editing && setEmailOpen(true)} disabled={!editing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
              title={editing ? 'Email this voucher with attachments' : 'Save the voucher first'}>
              <Mail className="w-3.5 h-3.5" /> Email
            </button>
            <button onClick={() => setMode('list')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded hover:bg-red-600">
              <X className="w-3.5 h-3.5" /> Close
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm">

            {/* Row 1 */}
            <div className="border-b border-slate-100 px-4 py-3 grid grid-cols-12 gap-3 items-center">
              <div className="col-span-3">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Branch</label>
                <select value={form.branch_code} onChange={e=>sf('branch_code',e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-blue-50 focus:outline-none focus:border-indigo-400 font-medium">
                  {BRANCHES.map(b=><option key={b} value={b}>{b} — HEAD OFFICE</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Project</label>
                <select className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white focus:outline-none focus:border-indigo-400">
                  <option>NA</option>
                </select>
              </div>
              <div className="col-span-1" />
              <div className="col-span-2">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Voucher No</label>
                <input readOnly value={editing?.pv_number ?? '(Auto)'} placeholder="Auto"
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded bg-slate-50 text-slate-500 font-mono" />
              </div>
              <div className="col-span-4">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Date</label>
                <input type="date" value={form.date}
                  onChange={e => { sf('date', e.target.value); sf('posting_date', e.target.value) }}
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:border-indigo-400" />
              </div>
            </div>

            {/* Row 2 — Agent + Area */}
            <div className="border-b border-slate-100 px-4 py-2 grid grid-cols-12 gap-3 items-center">
              <div className="col-span-6" />
              <div className="col-span-3">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Agent</label>
                <select value={form.agent} onChange={e=>sf('agent',e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white focus:outline-none focus:border-indigo-400">
                  <option value="NA">NA</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
              <div className="col-span-3">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Area</label>
                <select value={form.area} onChange={e=>sf('area',e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white focus:outline-none focus:border-indigo-400">
                  <option value="NA">NA</option>
                  <option value="HQ">HQ</option>
                  <option value="KL">KL</option>
                </select>
              </div>
            </div>

            {/* Pay To */}
            <div className="border-b border-slate-100 px-4 py-3 flex items-center gap-3">
              <label className="text-sm font-semibold text-slate-700 w-28 flex-shrink-0">Pay To</label>
              <input value={form.payee} onChange={e=>sf('payee',e.target.value)}
                placeholder="Payee name — e.g. KWSP - EPF, Vendor Name, Staff Name"
                className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:border-indigo-400 font-medium" />
            </div>

            {/* Payment By + Method + Cheque + Bank Charges */}
            <div className="border-b border-slate-100 px-4 py-3 grid grid-cols-12 gap-3 items-end">
              <div className="col-span-1">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Payment By</label>
              </div>
              <div className="col-span-3">
                <select value={form.bank_account_id}
                  onChange={e => {
                    const id = e.target.value
                    sf('bank_account_id', id)
                    // Auto-set method: Cash account → cash, otherwise bank_transfer (unless cheque already typed)
                    const acc = accounts.find(a => String(a.id) === id)
                    if (acc) {
                      const isCash = acc.name.toLowerCase().includes('cash')
                      if (isCash) sf('payment_method', 'cash')
                      else if (!form.cheque_number) sf('payment_method', 'bank_transfer')
                    }
                  }}
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white focus:outline-none focus:border-indigo-400">
                  <option value="">Select bank / cash...</option>
                  {(bankAccounts.length ? bankAccounts : postableAccounts).map(a=>
                    <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                  )}
                </select>
              </div>
              <div className="col-span-2">
                <input
                  value={selectedBank?.name ?? ''}
                  readOnly
                  placeholder="Bank / Account name"
                  className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded bg-slate-50 text-slate-600"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Payment Method</label>
                <select value={form.payment_method}
                  onChange={e => {
                    sf('payment_method', e.target.value)
                    if (e.target.value !== 'cheque') sf('cheque_number', '') // clear cheque when not by cheque
                  }}
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white focus:outline-none focus:border-indigo-400">
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Cheque No.</label>
                <input value={form.cheque_number}
                  onChange={e => {
                    sf('cheque_number', e.target.value)
                    if (e.target.value && form.payment_method !== 'cheque') sf('payment_method', 'cheque')
                  }}
                  placeholder={form.payment_method === 'cheque' ? 'Cheque number' : 'N/A'}
                  disabled={form.payment_method !== 'cheque'}
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:border-indigo-400 font-mono disabled:bg-slate-100 disabled:text-slate-400" />
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Bank Charges</label>
                <input type="number" min="0" step="0.01" value={form.bank_charges} onChange={e=>sf('bank_charges',e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:border-indigo-400 font-mono text-right" />
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200">
              <div className="flex gap-0 px-4 pt-2">
                {([
                  { key: 'main',     label: 'Main' },
                  { key: 'external', label: `External Document${attachments.length ? ` (${attachments.length})` : ''}` },
                  { key: 'note',     label: 'Note' },
                ] as const).map(t => (
                  <button key={t.key} type="button" onClick={() => setActiveTab(t.key)}
                    className={`px-4 py-1.5 text-xs font-medium border-b-2 cursor-pointer transition-colors ${
                      activeTab===t.key ? 'border-indigo-600 text-indigo-700 bg-white'
                                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* External Document tab */}
            {activeTab === 'external' && (
              <div className="px-4 py-3">
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 bg-slate-50/50">
                  {!editing ? (
                    <div className="text-center text-sm text-slate-500 py-4">
                      <FileSearch className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                      <p className="font-semibold text-slate-700 mb-1">Save the voucher first to attach files</p>
                      <p className="text-xs mb-4 max-w-md mx-auto">
                        Attachments need a voucher ID. Save as draft first — you can keep editing afterwards and your scanned receipts will be uploaded to this voucher.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 mb-4">
                        <FilePlus className="w-5 h-5 text-emerald-600" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm text-slate-700">Audit Documents</h4>
                          <p className="text-xs text-slate-500">Attach payment receipts, supporting documents, contracts, etc. (PDF / images / docs, max 20 MB each)</p>
                        </div>
                        <label className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded hover:bg-emerald-700 cursor-pointer">
                          {uploadingFile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FilePlus className="w-3.5 h-3.5" />}
                          Upload File
                          <input type="file" className="hidden"
                            disabled={uploadingFile}
                            onChange={e => {
                              const f = e.target.files?.[0]
                              if (f) uploadAttachment(f)
                              e.target.value = ''
                            }} />
                        </label>
                      </div>

                      {attachments.length === 0 ? (
                        <div className="text-center py-8 text-xs text-slate-400">
                          <FileSearch className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          No documents uploaded yet. Click "Upload File" to attach a scan.
                        </div>
                      ) : (
                        <div className="bg-white border border-slate-200 rounded overflow-hidden">
                          <table className="w-full text-xs">
                            <thead className="bg-slate-100 border-b border-slate-200">
                              <tr>
                                <th className="px-3 py-2 text-left font-semibold text-slate-700 w-8">#</th>
                                <th className="px-3 py-2 text-left font-semibold text-slate-700">File</th>
                                <th className="px-3 py-2 text-left font-semibold text-slate-700 w-32">Size</th>
                                <th className="px-3 py-2 text-left font-semibold text-slate-700 w-40">Uploaded By</th>
                                <th className="px-3 py-2 text-left font-semibold text-slate-700 w-36">Date</th>
                                <th className="px-3 py-2 text-center font-semibold text-slate-700 w-32">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {attachments.map((a, i) => (
                                <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50">
                                  <td className="px-3 py-2 text-slate-400">{i+1}</td>
                                  <td className="px-3 py-2">
                                    <div className="font-medium text-slate-800">{a.original_filename}</div>
                                    {a.label && <div className="text-[10px] text-slate-500 mt-0.5">{a.label}</div>}
                                    <div className="text-[10px] text-slate-400 mt-0.5 font-mono">{a.mime_type}</div>
                                  </td>
                                  <td className="px-3 py-2 font-mono text-slate-600">{(a.size_bytes/1024).toFixed(1)} KB</td>
                                  <td className="px-3 py-2 text-slate-600">{a.uploaded_by?.name ?? '—'}</td>
                                  <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{formatDate(a.created_at)}</td>
                                  <td className="px-3 py-2 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <a href={a.url} target="_blank" rel="noreferrer"
                                        className="px-2 py-1 text-[10px] bg-blue-50 text-blue-700 hover:bg-blue-100 rounded font-semibold">View</a>
                                      <a href={`http://127.0.0.1:8001${a.download_url}`} target="_blank" rel="noreferrer" download={a.original_filename}
                                        className="px-2 py-1 text-[10px] bg-slate-100 text-slate-700 hover:bg-slate-200 rounded font-semibold">Download</a>
                                      <button type="button" onClick={() => deleteAttachment(a)}
                                        className="px-2 py-1 text-[10px] bg-red-50 text-red-600 hover:bg-red-100 rounded font-semibold">Delete</button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Note tab */}
            {activeTab === 'note' ? (
              <div className="px-4 py-3">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Internal Notes</label>
                <textarea
                  value={form.description || ''}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  rows={10}
                  placeholder="Any internal notes about this voucher"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:border-indigo-400 font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1.5">These notes are saved with the voucher and visible to your team.</p>
              </div>
            ) : null}

            {/* Lines table — Main tab */}
            {activeTab === 'main' && (
            <div className="px-4 py-3">
              <div className="flex items-center gap-1 mb-2">
                <button onClick={addLine}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded text-slate-600 border border-slate-200">
                  <PlusCircle className="w-3.5 h-3.5 text-green-600" /> Add Line
                </button>
                <button onClick={()=> form.lines.length>1 && removeLine(form.lines.length-1)}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded text-slate-600 border border-slate-200">
                  <MinusCircle className="w-3.5 h-3.5 text-red-500" /> Remove Line
                </button>
                <div className="text-xs text-slate-400 ml-2">
                  A/C Code — Account Title — Description — Amount
                </div>
              </div>

              <div className="border border-slate-200 rounded">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200">
                      <th className="w-6 px-2 py-1.5" />
                      <th className="px-3 py-1.5 text-left font-semibold text-slate-600 w-40">A/C Code</th>
                      <th className="px-3 py-1.5 text-left font-semibold text-slate-600">Account Title</th>
                      <th className="px-3 py-1.5 text-left font-semibold text-slate-600">Description</th>
                      <th className="px-3 py-1.5 text-right font-semibold text-slate-600 w-36">Amount</th>
                      <th className="w-8 px-2 py-1.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {form.lines.map((line, i) => {
                      const acct = accounts.find(a => String(a.id) === line.account_id)
                      return (
                        <tr key={i} className={`border-b border-slate-100 ${i%2===0?'bg-white':'bg-slate-50/50'}`}>
                          <td className="px-2 py-1 text-slate-400 text-center">{i+1}</td>
                          {/* A/C Code — grid-style picker with code/name search */}
                          <td className="px-1.5 py-1">
                            <AccountCodePicker
                              rowIndex={i}
                              value={line.code}
                              accounts={generalLineAccounts}
                              onChange={code => setLineCode(i, code)}
                              onCommit={code => { setLineCode(i, code); focusCell(i, 'title') }}
                            />
                          </td>
                          {/* Account Title — auto-filled, focusable for Enter-through */}
                          <td className="px-1.5 py-1">
                            <input
                              readOnly
                              data-pv-cell={`${i}-title`}
                              value={acct?.name ?? ''}
                              onKeyDown={e => handleLineKey(e, i, 'title')}
                              className="w-full px-2 py-1 text-xs border border-slate-100 rounded bg-slate-50 text-slate-600 cursor-default focus:outline-none focus:border-indigo-400 focus:bg-white"
                              placeholder="Auto-filled"
                            />
                          </td>
                          {/* Description */}
                          <td className="px-1.5 py-1">
                            <input
                              data-pv-cell={`${i}-description`}
                              value={line.description}
                              onChange={e => updateLine(i,'description',e.target.value)}
                              onKeyDown={e => handleLineKey(e, i, 'description')}
                              placeholder="Description..."
                              className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:border-indigo-400"
                            />
                          </td>
                          {/* Amount */}
                          <td className="px-1.5 py-1">
                            <input
                              type="number" min="0" step="0.01"
                              data-pv-cell={`${i}-amount`}
                              value={line.amount}
                              onChange={e => updateLine(i,'amount',e.target.value)}
                              onKeyDown={e => handleLineKey(e, i, 'amount')}
                              placeholder="0.00"
                              className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:border-indigo-400 text-right font-mono"
                            />
                          </td>
                          <td className="px-2 py-1 text-center">
                            {form.lines.length > 1 && (
                              <button onClick={()=>removeLine(i)} className="text-red-400 hover:text-red-600">
                                <MinusCircle className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                    {Array.from({length: Math.max(0, 6-form.lines.length)}).map((_,i)=>(
                      <tr key={`empty-${i}`} className={`border-b border-slate-50 ${i%2===0?'bg-white':'bg-slate-50/30'}`}>
                        <td className="px-2 py-2" colSpan={6}>&nbsp;</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Net Total */}
              <div className="flex justify-end mt-3 gap-6 items-center">
                <div className="text-xs text-slate-500">Lines: {form.lines.length}</div>
                <div className="flex items-center gap-3">
                  {parseFloat(form.bank_charges) > 0 && (
                    <div className="text-xs text-slate-500">
                      Sub Total: <span className="font-mono font-semibold">{lineTotal.toFixed(2)}</span>
                      &nbsp;+&nbsp; Bank Charges: <span className="font-mono font-semibold">{parseFloat(form.bank_charges).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="bg-slate-800 text-white px-4 py-2 rounded font-mono text-sm font-bold">
                    Net Total:&nbsp;&nbsp;{netTotal.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* ── Payment Installments panel ── */}
            {(() => {
              const billTotal   = netTotal
              const paidSum     = form.payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0)
              const outstanding = Math.max(0, billTotal - paidSum)
              const status      = paidSum <= 0 ? 'unpaid' : (paidSum >= billTotal && billTotal > 0 ? 'paid' : 'partial')
              const statusBadge = {
                unpaid:  { label: 'UNPAID',  cls: 'bg-red-100 text-red-700 border-red-300' },
                partial: { label: 'PARTIAL', cls: 'bg-amber-100 text-amber-700 border-amber-300' },
                paid:    { label: 'PAID',    cls: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
              }[status]

              return (
                <div className="border-t border-slate-100 px-4 py-3 bg-slate-50/50">
                  {/* Header: title + summary */}
                  <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-semibold text-slate-700">Payment Installments</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide border ${statusBadge.cls}`}>
                        {statusBadge.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <div>Bill: <span className="font-mono font-semibold">{billTotal.toFixed(2)}</span></div>
                      <div>Paid: <span className="font-mono font-semibold text-emerald-700">{paidSum.toFixed(2)}</span></div>
                      <div>Outstanding: <span className={`font-mono font-bold ${outstanding>0?'text-red-700':'text-slate-500'}`}>{outstanding.toFixed(2)}</span></div>
                    </div>
                  </div>

                  {/* Installments table */}
                  <div className="border border-slate-200 rounded overflow-hidden bg-white">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200">
                          <th className="w-8 px-2 py-1.5 text-center font-semibold text-slate-600">#</th>
                          <th className="px-3 py-1.5 text-left font-semibold text-slate-600 w-28">A/C Code</th>
                          <th className="px-3 py-1.5 text-left font-semibold text-slate-600 w-32">Date</th>
                          <th className="px-3 py-1.5 text-right font-semibold text-slate-600 w-28">Amount</th>
                          <th className="px-3 py-1.5 text-left font-semibold text-slate-600 w-36">Pay To</th>
                          <th className="px-3 py-1.5 text-left font-semibold text-slate-600 w-28">Voucher No.</th>
                          <th className="px-3 py-1.5 text-left font-semibold text-slate-600 w-32">Reference</th>
                          <th className="px-3 py-1.5 text-left font-semibold text-slate-600">Notes</th>
                          <th className="w-10 px-2 py-1.5"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.payments.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="px-3 py-4 text-center text-slate-400 text-xs italic">
                              No payments yet — click <span className="font-semibold">Add Payment</span> below to record an installment
                            </td>
                          </tr>
                        ) : form.payments.map((p, i) => {
                          const subLedgerCode = editing?.pv_number ?? '(new PV)'
                          return (
                          <tr key={i} className={i%2===0 ? 'bg-white' : 'bg-slate-50/40'}>
                            <td className="px-2 py-1 text-center text-slate-400">{i+1}</td>
                            {/* A/C Code — auto-locked to the parent PV number (acts as sub-ledger) */}
                            <td className="px-1.5 py-1">
                              <input
                                readOnly
                                value={subLedgerCode}
                                title="This installment is auto-tagged to the parent Payment Voucher (sub-ledger reference for cash book / GL reports)."
                                className="w-full px-2 py-1 text-xs border border-slate-200 rounded bg-slate-100 text-slate-700 font-mono font-semibold cursor-default focus:outline-none"
                              />
                            </td>
                            <td className="px-1.5 py-1">
                              <input type="date" value={p.payment_date}
                                onChange={e => updatePayment(i, 'payment_date', e.target.value)}
                                className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:border-indigo-400" />
                            </td>
                            <td className="px-1.5 py-1">
                              <input type="number" min="0" step="0.01" value={p.amount}
                                onChange={e => updatePayment(i, 'amount', e.target.value)}
                                placeholder="0.00"
                                className="w-full px-2 py-1 text-xs border border-slate-200 rounded text-right font-mono focus:outline-none focus:border-indigo-400" />
                            </td>
                            <td className="px-1.5 py-1">
                              <input value={p.payee}
                                onChange={e => updatePayment(i, 'payee', e.target.value)}
                                placeholder={form.payee || 'Payee name'}
                                className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:border-indigo-400 font-medium" />
                            </td>
                            <td className="px-1.5 py-1">
                              <input value={p.voucher_no}
                                onChange={e => updatePayment(i, 'voucher_no', e.target.value)}
                                placeholder="CV-001"
                                className="w-full px-2 py-1 text-xs border border-slate-200 rounded font-mono focus:outline-none focus:border-indigo-400" />
                            </td>
                            <td className="px-1.5 py-1">
                              <input value={p.reference}
                                onChange={e => updatePayment(i, 'reference', e.target.value)}
                                placeholder="Cheque / Txn no."
                                className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:border-indigo-400" />
                            </td>
                            <td className="px-1.5 py-1">
                              <input value={p.notes}
                                onChange={e => updatePayment(i, 'notes', e.target.value)}
                                placeholder="Optional"
                                className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:border-indigo-400" />
                            </td>
                            <td className="px-2 py-1 text-center">
                              <button type="button" onClick={() => removePayment(i)}
                                className="text-red-400 hover:text-red-600" title="Remove this payment">
                                <MinusCircle className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                          )
                        })}
                      </tbody>
                      {form.payments.length > 0 && (
                        <tfoot className="bg-slate-50 border-t border-slate-200">
                          <tr>
                            <td colSpan={3} className="px-3 py-1.5 text-right text-slate-600 font-semibold">TOTAL PAID</td>
                            <td className="px-3 py-1.5 text-right font-mono font-bold text-slate-800">{paidSum.toFixed(2)}</td>
                            <td colSpan={5}></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>

                  {/* Action row */}
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <button type="button" onClick={addPayment}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700">
                      <PlusCircle className="w-3.5 h-3.5" /> Add Payment
                    </button>
                    <button type="button"
                      onClick={() => {
                        if (outstanding <= 0) return
                        const today = new Date().toISOString().slice(0,10)
                        setForm(p => ({
                          ...p,
                          payments: [...p.payments, {
                            payee: p.payee, account_id: '', voucher_no: '',
                            payment_date: today, amount: outstanding.toFixed(2),
                            reference: '', notes: '',
                          }],
                        }))
                      }}
                      disabled={outstanding <= 0}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs bg-white border border-slate-200 text-slate-700 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      title={outstanding <= 0 ? 'Bill is fully paid' : 'Add a payment for the remaining balance'}>
                      <Plus className="w-3.5 h-3.5" /> Pay Outstanding ({outstanding.toFixed(2)})
                    </button>
                    {form.payments.length > 0 && (
                      <button type="button"
                        onClick={() => setForm(p => ({ ...p, payments: [] }))}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs bg-white border border-slate-200 text-slate-600 rounded hover:bg-red-50 hover:text-red-600 hover:border-red-200">
                        <X className="w-3.5 h-3.5" /> Clear All Payments
                      </button>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* Footer: After Save New + Reference */}
            <div className="border-t border-slate-100 px-4 py-3 flex items-center gap-6 flex-wrap">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" className="w-3.5 h-3.5 rounded border-slate-300 accent-indigo-600" />
                <span className="text-sm text-slate-700">After Save New</span>
              </label>

              <div className="flex-1" />
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500">Reference:</label>
                <input value={form.reference} onChange={e=>sf('reference',e.target.value)}
                  placeholder="Ref no."
                  className="px-2.5 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-indigo-400 w-40" />
              </div>
            </div>
          </div>
        </div>

        {/* Email composer modal */}
        {editing && (
          <EmailComposer
            open={emailOpen}
            onClose={() => setEmailOpen(false)}
            relatedType="payment_voucher"
            relatedId={editing.id}
            defaultSubject={`Payment Voucher ${editing.pv_number}`}
            defaultBody={`Dear Sir / Madam,\n\nPlease find attached our payment voucher ${editing.pv_number} dated ${formatDate(editing.date)} for RM ${Number(editing.amount).toFixed(2)}, paid to ${editing.payee}.\n\nKindly acknowledge receipt.\n\nRegards,\nCARLANISA SDN BHD`}
            documentLabel={editing.pv_number}
          />
        )}
      </div>
    )
  }

  // ── LIST VIEW ──────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/accounting/general-ledger')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
            title="Back to General Ledger">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center">
            <FileOutput className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800">Payment Voucher</h1>
            <p className="text-xs text-slate-400">General Ledger → Payment Voucher</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700">
            <Plus className="w-3.5 h-3.5" /> Create New Voucher
          </button>
          <button onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-600 text-white text-xs font-medium rounded-lg hover:bg-slate-700">
            <Printer className="w-3.5 h-3.5" /> Print Cash Book Listing
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1 px-4 py-1.5 bg-slate-50 border-b border-slate-200">
        <button onClick={() => selectedRow && openEdit(selectedRow)}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-slate-200">
          <Eye className="w-3.5 h-3.5" /> View
        </button>
        <button onClick={() => selectedRow && openEdit(selectedRow)}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-slate-200">
          <Pencil className="w-3.5 h-3.5" /> Edit
        </button>
        <button onClick={load}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-slate-200">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
        <div className="w-px h-5 bg-slate-200 mx-1" />
        <button onClick={() => window.print()}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-slate-200">
          <Printer className="w-3.5 h-3.5" /> Print
        </button>
        {hasColFilter && (
          <>
            <div className="w-px h-5 bg-slate-200 mx-1" />
            <button onClick={() => setColF(emptyColFilters)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded border border-transparent hover:border-red-200">
              <X className="w-3.5 h-3.5" /> Clear Filters
            </button>
            <span className="text-xs text-amber-600 font-medium ml-1">
              {filtered.length} of {records.length} shown
            </span>
          </>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-700 text-white">
              <th className="w-8 px-2 py-2 text-center font-medium">#</th>
              <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">Doc No</th>
              <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">Doc Date</th>
              <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">Bcode</th>
              <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">Payment Code</th>
              <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">Payment Name</th>
              <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">Pay To</th>
              <th className="text-right px-3 py-2 font-semibold whitespace-nowrap">Bill Amt</th>
              <th className="text-right px-3 py-2 font-semibold whitespace-nowrap">Paid</th>
              <th className="text-center px-3 py-2 font-semibold whitespace-nowrap">Status</th>
              <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">Pay Date</th>
              <th className="text-center px-3 py-2 font-semibold whitespace-nowrap">Cancel</th>
              <th className="px-3 py-2 font-semibold whitespace-nowrap">Actions</th>
            </tr>
            {/* Column filter row */}
            <tr className="bg-slate-600 border-b-2 border-slate-500">
              <th className="px-2 py-1" />
              {(['doc_no','doc_date','bcode','pay_code','pay_name','pay_to','amount'] as (keyof ColFilters)[]).map((key, i) => (
                <th key={key} className="px-1.5 py-1">
                  <input value={colF[key]} onChange={e=>cf(key,e.target.value)}
                    placeholder="Filter…"
                    className={`w-full px-2 py-1 text-xs bg-slate-500 border border-slate-400 rounded text-white placeholder-slate-300 focus:outline-none focus:border-yellow-400 focus:bg-slate-400 ${key==='amount'?'text-right':''}`}
                    style={{minWidth: key==='pay_to'?'120px': key==='pay_name'?'100px': key==='doc_no'?'80px':'60px'}}
                  />
                </th>
              ))}
              {/* Empty filters for Paid / Status / PayDate / Cancel / Actions */}
              <th className="px-2 py-1" />
              <th className="px-2 py-1" />
              <th className="px-2 py-1" />
              <th className="px-2 py-1" />
              <th className="px-2 py-1" />
            </tr>
          </thead>

          <tbody>
            {loading ? (
              Array.from({length:10}).map((_,i)=>(
                <tr key={i} className={i%2===0?'bg-white':'bg-slate-50'}>
                  {Array.from({length:13}).map((_,j)=>(
                    <td key={j} className="px-3 py-2"><div className="h-3 bg-slate-100 rounded animate-pulse"/></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={13} className="py-16 text-center text-slate-400">
                  <FileOutput className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">{hasColFilter ? 'No records match the filters' : 'No payment vouchers found'}</p>
                  {!hasColFilter && (
                    <button onClick={openCreate} className="mt-2 btn-primary text-xs px-3 py-1.5">
                      Create First Voucher
                    </button>
                  )}
                </td>
              </tr>
            ) : filtered.map((r, idx) => {
              const isSel = selectedRow?.id === r.id
              return (
                <tr key={r.id}
                  onClick={() => setSelectedRow(r)}
                  onDoubleClick={() => openEdit(r)}
                  className={`border-b border-slate-100 cursor-pointer transition-colors ${
                    r.is_cancelled
                      ? 'bg-red-50 text-red-400 line-through'
                      : isSel
                        ? 'bg-indigo-100 ring-1 ring-inset ring-indigo-400'
                        : idx%2===0 ? 'bg-white hover:bg-indigo-50' : 'bg-slate-50/60 hover:bg-indigo-50'
                  }`}>
                  <td className="px-2 py-1.5 text-center text-slate-400">{(page-1)*perPage+idx+1}</td>
                  <td className="px-3 py-1.5"><span className="font-mono font-bold text-red-700">{r.pv_number}</span></td>
                  <td className="px-3 py-1.5 text-slate-600 whitespace-nowrap">{formatDate(r.date)}</td>
                  <td className="px-3 py-1.5">
                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-medium text-[11px]">{r.branch_code}</span>
                  </td>
                  <td className="px-3 py-1.5 font-mono text-indigo-700 font-medium">{r.bank_account?.code ?? r.account?.code ?? '—'}</td>
                  <td className="px-3 py-1.5 text-slate-700 font-medium">{r.bank_account?.name ?? '—'}</td>
                  <td className="px-3 py-1.5 text-slate-800 font-medium max-w-[220px] truncate" title={r.payee}>{r.payee}</td>
                  <td className="px-3 py-1.5 text-right font-bold font-mono text-slate-800">{r.amount.toFixed(2)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-slate-700">{(r.paid_amount ?? 0).toFixed(2)}</td>
                  <td className="px-3 py-1.5 text-center">
                    {(() => {
                      const ps = r.payment_status ?? (r.paid_amount > 0 ? (r.paid_amount >= r.amount ? 'paid' : 'partial') : 'unpaid')
                      const cls = ps==='paid'    ? 'bg-emerald-100 text-emerald-700'
                                : ps==='partial' ? 'bg-amber-100 text-amber-700'
                                                 : 'bg-red-100 text-red-700'
                      return <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide ${cls}`}>{ps.toUpperCase()}</span>
                    })()}
                  </td>
                  <td className="px-3 py-1.5 text-slate-600 whitespace-nowrap">{r.payment_date ? formatDate(r.payment_date) : '—'}</td>
                  <td className="px-3 py-1.5 text-center" onClick={e=>e.stopPropagation()}>
                    <input type="checkbox" checked={r.is_cancelled} onChange={()=>toggleCancel(r)}
                      className="w-3.5 h-3.5 rounded border-slate-300 accent-red-500 cursor-pointer" />
                  </td>
                  <td className="px-3 py-1.5" onClick={e=>e.stopPropagation()}>
                    {!r.is_cancelled && (
                      <div className="flex items-center gap-1">
                        <button onClick={()=>openPreview(r)} title="Preview / Print" className="p-1 rounded text-slate-400 hover:text-violet-600 hover:bg-violet-50"><ScanEye className="w-3 h-3"/></button>
                        <button onClick={()=>openEdit(r)} title="Edit" className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"><Pencil className="w-3 h-3"/></button>
                        <button onClick={()=>duplicateVoucher(r)} title="Duplicate" className="p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"><Copy className="w-3 h-3"/></button>
                        <button onClick={()=>handleDelete(r)} title="Delete" className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-3 h-3"/></button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>

          {filtered.length > 0 && (
            <tfoot className="bg-slate-700 text-white sticky bottom-0">
              <tr>
                <td colSpan={7} className="px-3 py-2 text-xs font-semibold text-right">
                  {hasColFilter ? `${filtered.length} filtered` : `${meta.total} records`}
                </td>
                <td className="px-3 py-2 text-right text-sm font-bold font-mono whitespace-nowrap">
                  {hasColFilter ? filteredTotal.toFixed(2) : (meta.grand_total?.toFixed(2) ?? '—')}
                </td>
                <td colSpan={5}/>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-t border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <button onClick={()=>setPage(1)} disabled={page===1} className="p-1 rounded hover:bg-slate-200 disabled:opacity-40"><ChevronFirst className="w-4 h-4 text-slate-600"/></button>
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="p-1 rounded hover:bg-slate-200 disabled:opacity-40"><ChevronLeft className="w-4 h-4 text-slate-600"/></button>
          <span className="px-2">Record <span className="font-semibold">{records.length>0?recordStart:0}–{recordEnd}</span> of <span className="font-semibold">{meta.total}</span></span>
          <button onClick={()=>setPage(p=>Math.min(meta.last_page,p+1))} disabled={page===meta.last_page} className="p-1 rounded hover:bg-slate-200 disabled:opacity-40"><ChevronRight className="w-4 h-4 text-slate-600"/></button>
          <button onClick={()=>setPage(meta.last_page)} disabled={page===meta.last_page} className="p-1 rounded hover:bg-slate-200 disabled:opacity-40"><ChevronLast className="w-4 h-4 text-slate-600"/></button>
        </div>
        <div className="text-xs text-slate-500">
          Page {page} of {meta.last_page} &nbsp;·&nbsp; Grand Total:
          <span className="font-bold text-slate-800 ml-1">{formatCurrency(meta.grand_total ?? 0)}</span>
        </div>
      </div>
    </div>
  )
}
