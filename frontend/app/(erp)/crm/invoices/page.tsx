'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, RefreshCw, Pencil, Trash2, X, Loader2, Save,
  Printer, Eye, FileOutput, PlusCircle, MinusCircle,
  ChevronFirst, ChevronLast, ChevronLeft, ChevronRight,
  ChevronUp, ChevronDown,
  FilePlus, ScanEye, FileSearch, ArrowLeft, Copy, Mail,
} from 'lucide-react'
import { api } from '@/lib/api'
import { openPdf, openPdfAndPrint } from '@/lib/pdf'
import { formatCurrency, formatDate } from '@/lib/utils'
import EmailComposer from '@/components/email/EmailComposer'
import toast from 'react-hot-toast'

// ─────────── Types ───────────
type Account  = { id: number; name: string; code: string; parent_id?: number | null; type?: string }
type Customer = { id: number; name: string; email?: string | null; phone?: string | null; address?: string | null; city?: string | null; country?: string | null; tax_number?: string | null; payment_terms?: string | null; account_id?: number | null }

type CILine = {
  id?: number
  code: string          // SKU shown in A/C Code column (parent SKU)
  item_code: string     // resolved variant SKU
  description: string
  color: string
  size: string
  qty: string
  roll_count: string
  uom: string
  unit_price: string
  discount: string
  amount: string
}

type CIPayment = {
  id?: number
  account_id: string
  code: string
  payee: string
  payment_date: string
  amount: string
  payment_method: string
  cheque_number: string
  reference: string
  notes: string
}

type CI = {
  id: number
  invoice_no: string
  customer_invoice_no: string | null
  branch_code: string
  date: string
  due_date: string | null
  terms: string | null
  customer_id: number | null
  customer?: Customer | null
  walk_in_name?: string | null
  amount: number
  paid_amount: number
  outstanding: number
  bank_charges: number
  payment_method: string
  cheque_number: string | null
  reference: string | null
  notes: string | null
  agent: string | null
  area: string | null
  status: string
  payment_status: 'unpaid' | 'partial' | 'paid' | 'cancelled'
  is_cancelled: boolean
  bank_account_id: number | null
  items?: any[]
  payments?: any[]
}

type ColFilters = {
  doc_no: string; doc_date: string; bcode: string
  customer: string; amount: string
}
const emptyColFilters: ColFilters = { doc_no: '', doc_date: '', bcode: '', customer: '', amount: '' }

const BRANCHES = ['HQ','KL','JB','PG','SBH']

const emptyLine: CILine = {
  code: '', item_code: '', description: '',
  color: '', size: '', qty: '1', roll_count: '0', uom: 'UNIT',
  unit_price: '0', discount: '0', amount: '0',
}

const emptyPayment: CIPayment = {
  account_id: '', code: '', payee: '', payment_date: '', amount: '',
  payment_method: 'cash', cheque_number: '', reference: '', notes: '',
}

const emptyForm = {
  date: new Date().toISOString().slice(0,10),
  due_date: '',
  branch_code: 'HQ',
  customer_id: '',
  walk_in_name: '',
  customer_invoice_no: '',
  terms: 'Net 30',
  bank_account_id: '',
  payment_method: 'bank_transfer',
  cheque_number: '',
  bank_charges: '0',
  reference: '',
  notes: '',
  agent: 'NA',
  area: 'NA',
  status: 'draft',
  lines: [{ ...emptyLine }] as CILine[],
  payments: [] as CIPayment[],
}

// ─────────── Product picker (parent SKU rows) ───────────
type ProductVariantOption = { sku: string; parent_sku: string; name: string; color: string; size: string; uom: string; sale_price: number; product_type: string; stock: number }
type BaseProductOption = { sku: string; name: string; uom: string; product_type: string; stock_total: number; sale_price: number }

function ProductPicker({
  rowIndex, value, variants, onChange, onPick,
}: {
  rowIndex: number
  value: string
  variants: ProductVariantOption[]
  onChange: (sku: string) => void
  onPick:   (v: BaseProductOption) => void
}) {
  const bases: BaseProductOption[] = useMemo(() => {
    const map = new Map<string, BaseProductOption>()
    for (const v of variants) {
      const key = v.parent_sku || v.sku
      const existing = map.get(key)
      if (existing) {
        existing.stock_total += v.stock
      } else {
        map.set(key, { sku: key, name: v.name, uom: v.uom, product_type: v.product_type, stock_total: v.stock, sale_price: v.sale_price })
      }
    }
    return [...map.values()].sort((a, b) => a.sku.localeCompare(b.sku))
  }, [variants])

  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const q = value.trim().toLowerCase()
  const filtered = useMemo(() =>
    !q ? bases : bases.filter(b => b.sku.toLowerCase().includes(q) || b.name.toLowerCase().includes(q)),
  [bases, q])

  useEffect(() => { setHighlight(0) }, [q])

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  useEffect(() => {
    if (!open) return
    const row = listRef.current?.querySelector<HTMLElement>(`[data-row-idx="${highlight}"]`)
    row?.scrollIntoView({ block: 'nearest' })
  }, [highlight, open])

  function pick(b: BaseProductOption) { setOpen(false); onPick(b) }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) { setOpen(true); return }
      setHighlight(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight(i => Math.max(i - 1, 0))
    } else if (e.key === 'Escape') {
      setOpen(false)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (open && filtered[highlight]) { pick(filtered[highlight]); return }
      const exact = bases.find(b => b.sku.toLowerCase() === value.trim().toLowerCase())
      if (exact) { pick(exact); return }
      if (filtered.length === 1) { pick(filtered[0]); return }
    } else if (e.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <div className="flex">
        <input
          data-ci-cell={`${rowIndex}-code`}
          type="text"
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="SKU / search…"
          className="flex-1 min-w-0 px-2 py-1 text-xs border border-slate-200 rounded-l bg-white focus:outline-none focus:border-indigo-400 font-mono uppercase"
        />
        <button type="button" tabIndex={-1}
          onMouseDown={e => { e.preventDefault(); setOpen(o => !o) }}
          className="px-1.5 border border-l-0 border-slate-200 rounded-r bg-slate-50 hover:bg-slate-100 text-slate-500 text-[10px]"
          aria-label="Open product list">▼</button>
      </div>
      {open && (
        <div ref={listRef}
             className="absolute z-50 left-0 top-full mt-0.5 w-[480px] max-h-72 overflow-auto bg-white border border-slate-300 rounded shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-xs text-slate-400 text-center">No matching products</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-10 bg-slate-100 shadow-[0_1px_0_0_#e2e8f0]">
                <tr>
                  <th className="px-2 py-1 text-left font-semibold text-slate-700 w-28">ItemCode</th>
                  <th className="px-2 py-1 text-left font-semibold text-slate-700">Description</th>
                  <th className="px-2 py-1 text-right font-semibold text-slate-700 w-20">Bal. Qty</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b, i) => (
                  <tr key={b.sku}
                      data-row-idx={i}
                      onMouseDown={e => { e.preventDefault(); pick(b) }}
                      onMouseEnter={() => setHighlight(i)}
                      className={`cursor-pointer border-b border-slate-50 ${i === highlight ? 'bg-indigo-100' : 'hover:bg-slate-50'}`}>
                    <td className="px-2 py-1 font-mono text-slate-700 whitespace-nowrap">{b.sku}</td>
                    <td className="px-2 py-1 text-slate-800 uppercase">{b.name}</td>
                    <td className="px-2 py-1 text-right font-mono text-slate-700">{b.stock_total.toFixed(0)}</td>
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

// ─────────── Customer combobox: pick existing customer OR type a walk-in name ───────────
function CustomerPicker({
  value, walkInName, customers, onPickCustomer, onWalkIn,
}: {
  value: string                                        // selected customer_id (string)
  walkInName: string                                   // typed walk-in name when no id selected
  customers: Customer[]
  onPickCustomer: (id: string, c?: Customer) => void   // called when user picks an existing customer
  onWalkIn: (name: string) => void                     // called when user types a free-text name (walk-in)
}) {
  const selected = customers.find(c => String(c.id) === value)
  const display  = selected ? `${selected.name}${selected.phone ? ` · ${selected.phone}` : ''}${selected.city ? ` · ${selected.city}` : ''}` : walkInName

  const [text, setText] = useState(display)
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Re-sync display when external value/walkInName changes (e.g. opening edit form)
  useEffect(() => { setText(display) }, [display])

  const q = text.trim().toLowerCase()
  const filtered = useMemo(() =>
    !q ? customers : customers.filter(c =>
      c.name.toLowerCase().includes(q)
      || (c.phone || '').toLowerCase().includes(q)
      || (c.email || '').toLowerCase().includes(q)
      || (c.city  || '').toLowerCase().includes(q)
    ),
  [customers, q])

  useEffect(() => { setHighlight(0) }, [q])

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  function pick(c: Customer) {
    setOpen(false)
    setText(`${c.name}${c.phone ? ` · ${c.phone}` : ''}${c.city ? ` · ${c.city}` : ''}`)
    onPickCustomer(String(c.id), c)
  }
  function commitFreeText() {
    const t = text.trim()
    // Exact (case-insensitive) match → treat as picking that customer
    const exact = customers.find(c => c.name.toLowerCase() === t.toLowerCase())
    if (exact) { pick(exact); return }
    // Otherwise → walk-in
    onWalkIn(t)
    onPickCustomer('', undefined)
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
      setOpen(false)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (open && filtered[highlight]) { pick(filtered[highlight]); return }
      commitFreeText()
      setOpen(false)
    } else if (e.key === 'Tab') {
      setOpen(false)
      // Only commit walk-in if text doesn't already match the selected customer
      if (!selected || display !== text) commitFreeText()
    }
  }

  const isWalkIn = !selected && (text.trim().length > 0)

  return (
    <div ref={wrapRef} className="relative">
      <div className="flex">
        <input
          type="text"
          value={text}
          onChange={e => { setText(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          onBlur={() => { /* commit on Enter / Tab — onBlur left intentional */ }}
          placeholder="Pick a customer or type a name..."
          className="flex-1 min-w-0 px-2.5 py-1.5 text-sm border border-slate-300 rounded-l bg-white focus:outline-none focus:border-indigo-400 font-medium"
        />
        <button type="button" tabIndex={-1}
          onMouseDown={e => { e.preventDefault(); setOpen(o => !o) }}
          className="px-2 border border-l-0 border-slate-300 rounded-r bg-slate-50 hover:bg-slate-100 text-slate-500 text-xs"
          aria-label="Open customer list">▼</button>
      </div>
      {isWalkIn && (
        <div className="text-[10px] text-amber-600 mt-1">
          Walk-in (not saved as customer). To save, add via CRM → Customers.
        </div>
      )}
      {open && (
        <div ref={listRef}
             className="absolute z-50 left-0 top-full mt-0.5 w-[420px] max-h-72 overflow-auto bg-white border border-slate-300 rounded shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-xs text-slate-500 text-center">
              <div>No matching customer</div>
              {text.trim() && (
                <div className="mt-1.5">
                  Press <kbd className="px-1 bg-slate-100 border border-slate-200 rounded font-mono text-[10px]">Enter</kbd> to use
                  <span className="font-semibold text-amber-700"> &quot;{text.trim()}&quot;</span> as walk-in
                </div>
              )}
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-10 bg-slate-100 shadow-[0_1px_0_0_#e2e8f0]">
                <tr>
                  <th className="px-2 py-1 text-left font-semibold text-slate-700 w-8">#</th>
                  <th className="px-2 py-1 text-left font-semibold text-slate-700">Name</th>
                  <th className="px-2 py-1 text-left font-semibold text-slate-700 w-28">Phone</th>
                  <th className="px-2 py-1 text-left font-semibold text-slate-700 w-24">City</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={c.id}
                      onMouseDown={e => { e.preventDefault(); pick(c) }}
                      onMouseEnter={() => setHighlight(i)}
                      className={`cursor-pointer border-b border-slate-50 ${i === highlight ? 'bg-indigo-100' : 'hover:bg-slate-50'}`}>
                    <td className="px-2 py-1 text-slate-400">{c.id}</td>
                    <td className="px-2 py-1 font-medium text-slate-800">{c.name}</td>
                    <td className="px-2 py-1 font-mono text-slate-600">{c.phone || '—'}</td>
                    <td className="px-2 py-1 text-slate-600">{c.city || '—'}</td>
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

export default function CustomerInvoicePage() {
  const router = useRouter()

  const [records, setRecords]     = useState<CI[]>([])
  const [accounts, setAccounts]   = useState<Account[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [productVariants, setProductVariants] = useState<ProductVariantOption[]>([])
  const [page, setPage]           = useState(1)
  const [perPage]                 = useState(50)
  const [meta, setMeta]           = useState({ last_page: 1, total: 0, grand_total: 0 })
  const [loading, setLoading]     = useState(true)
  const [selectedRow, setSelectedRow] = useState<CI | null>(null)

  const [mode, setMode]           = useState<'list'|'create'|'edit'>('list')
  const [activeTab, setActiveTab] = useState<'main'|'note'>('main')
  const [editing, setEditing]     = useState<CI | null>(null)
  const [form, setForm]           = useState(emptyForm)
  const [saving, setSaving]       = useState(false)
  const [emailOpen, setEmailOpen] = useState(false)

  const [colF, setColF] = useState<ColFilters>(emptyColFilters)

  // ── Lookups ──
  const refreshLookups = useCallback(() => {
    api.get('/accounting/accounts/flat').then(r => setAccounts(r.data.data ?? [])).catch(() => {})
    api.get('/crm/customers', { params: { per_page: 500 } }).then(r => setCustomers(r.data.data ?? [])).catch(() => {})
    api.get('/inventory/products', { params: { per_page: 500 } }).then(r => {
      const products = r.data.data ?? []
      const flat: ProductVariantOption[] = []
      for (const p of products) {
        const ptype = p.product_type || 'apparel'
        const variants = p.variants ?? []
        if (variants.length) {
          for (const v of variants) {
            flat.push({
              sku: v.sku || p.sku,
              parent_sku: p.sku,
              name: p.name,
              color: v.color || '',
              size: v.size || '',
              uom: p.uom || 'UNIT',
              sale_price: Number(v.sale_price ?? p.sale_price ?? 0),
              product_type: ptype,
              stock: Number(v.stock ?? 0),
            })
          }
        } else {
          flat.push({
            sku: p.sku,
            parent_sku: p.sku,
            name: p.name,
            color: '',
            size: '',
            uom: p.uom || 'UNIT',
            sale_price: Number(p.sale_price ?? 0),
            product_type: ptype,
            stock: Number(p.stock ?? 0),
          })
        }
      }
      setProductVariants(flat)
    }).catch(() => {})
  }, [])

  useEffect(() => { refreshLookups() }, [refreshLookups])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/crm/invoices', { params: { page, per_page: perPage } })
      setRecords(r.data.data)
      setMeta(r.data.meta)
    } catch {} finally { setLoading(false) }
  }, [page, perPage])

  useEffect(() => { load() }, [load])

  // Postable bank accounts
  const bankAccounts = useMemo(() => accounts.filter(a => /bank|cash/i.test(a.name) && !accounts.some(x => x.parent_id === a.id)), [accounts])

  // Filters
  const filtered = useMemo(() => records.filter(r => {
    return (
      (!colF.doc_no   || r.invoice_no.toLowerCase().includes(colF.doc_no.toLowerCase())) &&
      (!colF.doc_date || formatDate(r.date).toLowerCase().includes(colF.doc_date.toLowerCase())) &&
      (!colF.bcode    || r.branch_code.toLowerCase().includes(colF.bcode.toLowerCase())) &&
      (!colF.customer || (r.customer?.name ?? r.walk_in_name ?? '').toLowerCase().includes(colF.customer.toLowerCase())) &&
      (!colF.amount   || String(r.amount).includes(colF.amount))
    )
  }), [records, colF])
  const hasColFilter   = Object.values(colF).some(v => v !== '')
  const filteredTotal  = filtered.filter(r => !r.is_cancelled).reduce((s,r) => s+r.amount, 0)
  const cf = (k: keyof ColFilters, v: string) => setColF(p => ({...p,[k]:v}))

  // ── Form helpers ──
  const sf = (k: string, v: string) => setForm(p => ({...p,[k]:v}))

  function addLine() { setForm(p => ({...p, lines: [...p.lines, {...emptyLine}]})) }
  function removeLine(i: number) { setForm(p => ({...p, lines: p.lines.filter((_,idx) => idx !== i)})) }
  function moveLine(i: number, dir: 1 | -1) {
    setForm(p => {
      const target = i + dir
      if (target < 0 || target >= p.lines.length) return p
      const ls = [...p.lines]
      ;[ls[i], ls[target]] = [ls[target], ls[i]]
      return { ...p, lines: ls }
    })
  }
  function updateLine(i: number, k: keyof CILine, v: string) {
    setForm(p => ({
      ...p,
      lines: p.lines.map((l, idx) => {
        if (idx !== i) return l
        const next = { ...l, [k]: v }
        if (k === 'qty' || k === 'unit_price' || k === 'discount') {
          const q = parseFloat(next.qty)        || 0
          const u = parseFloat(next.unit_price) || 0
          const d = parseFloat(next.discount)   || 0
          next.amount = (q * u - d).toFixed(2)
        }
        return next
      }),
    }))
  }

  function addPayment() {
    const cust = customers.find(c => String(c.id) === form.customer_id)
    setForm(p => ({
      ...p,
      payments: [...p.payments, {
        ...emptyPayment,
        payee: cust?.name ?? '',
        payment_date: form.date,
      }],
    }))
  }
  function updatePayment(i: number, k: keyof CIPayment, v: string) {
    setForm(p => ({ ...p, payments: p.payments.map((x, idx) => idx === i ? { ...x, [k]: v } : x) }))
  }
  function removePayment(i: number) {
    setForm(p => ({ ...p, payments: p.payments.filter((_, idx) => idx !== i) }))
  }

  // Totals
  const netTotal = useMemo(() =>
    form.lines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0) + (parseFloat(form.bank_charges) || 0)
  , [form.lines, form.bank_charges])

  // Open create / edit
  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setMode('create')
    setActiveTab('main')
  }
  function openEdit(r: CI) {
    setEditing(r)
    setForm({
      date: r.date,
      due_date: r.due_date ?? '',
      branch_code: r.branch_code ?? 'HQ',
      customer_id: r.customer_id ? String(r.customer_id) : '',
      walk_in_name: r.walk_in_name ?? '',
      customer_invoice_no: r.customer_invoice_no ?? '',
      terms: r.terms ?? 'Net 30',
      bank_account_id: r.bank_account_id ? String(r.bank_account_id) : '',
      payment_method: r.payment_method ?? 'bank_transfer',
      cheque_number: r.cheque_number ?? '',
      bank_charges: String(r.bank_charges ?? 0),
      reference: r.reference ?? '',
      notes: r.notes ?? '',
      agent: r.agent ?? 'NA',
      area: r.area ?? 'NA',
      status: r.status,
      lines: (r.items ?? []).map((it: any) => ({
        code: it.parent_sku ?? it.item_code ?? '',
        item_code: it.item_code ?? '',
        description: it.description ?? '',
        color: it.color ?? '',
        size: it.size ?? '',
        qty: String(it.qty ?? '1'),
        roll_count: String(it.roll_count ?? '0'),
        uom: it.uom ?? 'UNIT',
        unit_price: String(it.unit_price ?? '0'),
        discount: String(it.discount ?? '0'),
        amount: String(it.line_total ?? '0'),
      })) as CILine[],
      payments: (r.payments ?? []).map((p: any) => ({
        account_id: p.account_id ? String(p.account_id) : '',
        code: p.code ?? '',
        payee: p.payee ?? '',
        payment_date: p.payment_date,
        amount: String(p.amount ?? '0'),
        payment_method: p.payment_method ?? 'cash',
        cheque_number: p.cheque_number ?? '',
        reference: p.reference ?? '',
        notes: p.notes ?? '',
      })) as CIPayment[],
    })
    setMode('edit')
    setActiveTab('main')
  }

  async function handleSaveAndAfter(after: 'pdf'|'print') {
    if (!form.customer_id && !form.lines.some(l => l.description || l.code)) {
      toast.error('Pick a customer and add at least one line')
      return
    }
    setSaving(true)
    try {
      const payload = { ...form }
      let inv = editing
      if (editing) {
        const r = await api.put(`/crm/invoices/${editing.id}`, payload)
        inv = r.data.data
        setEditing(inv)
        toast.success('Invoice updated')
      } else {
        const r = await api.post('/crm/invoices', payload)
        inv = r.data.data
        setEditing(inv)
        setMode('edit')
        toast.success('Invoice created')
      }
      load()
      if (inv) {
        if (after === 'print') openPdfAndPrint(`/crm/invoices/${inv.id}/pdf`, `${inv.invoice_no}.pdf`)
        else                   openPdf(`/crm/invoices/${inv.id}/pdf`, `${inv.invoice_no}.pdf`)
      }
    } catch (e: any) {
      const errs = e.response?.data?.errors
      toast.error(errs ? Object.values(errs).flat().join(', ') : e.response?.data?.message ?? 'Failed')
    } finally { setSaving(false) }
  }

  async function handleSave(stayInForm = false) {
    if (!form.customer_id && !form.lines.some(l => l.description || l.code)) {
      toast.error('Pick a customer and add at least one line')
      return
    }
    setSaving(true)
    try {
      const payload = { ...form }
      if (editing) {
        const r = await api.put(`/crm/invoices/${editing.id}`, payload)
        toast.success('Invoice updated')
        setEditing(r.data.data)
      } else {
        const r = await api.post('/crm/invoices', payload)
        toast.success('Invoice created')
        if (stayInForm) {
          setEditing(r.data.data)
          setMode('edit')
        } else {
          setMode('list')
        }
      }
      load()
    } catch (e: any) {
      const errs = e.response?.data?.errors
      toast.error(errs ? Object.values(errs).flat().join(', ') : e.response?.data?.message ?? 'Failed')
    } finally { setSaving(false) }
  }

  async function handleDelete(r: CI) {
    if (!confirm(`Delete ${r.invoice_no}?`)) return
    try {
      await api.delete(`/crm/invoices/${r.id}`)
      toast.success('Deleted')
      if (mode !== 'list') setMode('list')
      load()
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Failed')
    }
  }
  async function cancelInvoice(r: CI) {
    try {
      await api.post(`/crm/invoices/${r.id}/cancel`)
      toast.success(r.is_cancelled ? 'Restored' : 'Cancelled')
      load()
      if (editing) {
        const fresh = await api.get(`/crm/invoices/${r.id}`)
        setEditing(fresh.data.data)
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Failed')
    }
  }
  function duplicateCurrent() {
    setEditing(null)
    setForm(p => ({ ...p, payments: [], status: 'draft' }))
    setMode('create')
    toast.success('Duplicated — review & save')
  }
  function duplicateRecord(r: CI) {
    setEditing(null)
    setForm({
      date: new Date().toISOString().slice(0, 10),
      due_date: r.due_date ?? '',
      branch_code: r.branch_code ?? 'HQ',
      customer_id: r.customer_id ? String(r.customer_id) : '',
      walk_in_name: r.walk_in_name ?? '',
      customer_invoice_no: '',
      terms: r.terms ?? 'Net 30',
      bank_account_id: r.bank_account_id ? String(r.bank_account_id) : '',
      payment_method: r.payment_method ?? 'bank_transfer',
      cheque_number: '',
      bank_charges: String(r.bank_charges ?? 0),
      reference: '',
      notes: r.notes ?? '',
      agent: r.agent ?? 'NA',
      area: r.area ?? 'NA',
      status: 'draft',
      lines: (r.items ?? []).map((it: any) => ({
        code: it.parent_sku ?? it.item_code ?? '',
        item_code: it.item_code ?? '',
        description: it.description ?? '',
        color: it.color ?? '',
        size: it.size ?? '',
        qty: String(it.qty ?? '1'),
        roll_count: String(it.roll_count ?? '0'),
        uom: it.uom ?? 'UNIT',
        unit_price: String(it.unit_price ?? '0'),
        discount: String(it.discount ?? '0'),
        amount: String(it.line_total ?? '0'),
      })) as CILine[],
      payments: [],
    })
    setMode('create')
    toast.success(`Duplicated from ${r.invoice_no} — review & save`)
  }

  const recordStart = (page-1)*perPage + 1
  const recordEnd   = Math.min(page*perPage, meta.total)

  // ───────────────────────────────── FORM VIEW ─────────────────────────────────
  if (mode === 'create' || mode === 'edit') {
    return (
      <div className="fixed inset-0 z-40 flex flex-col bg-slate-100">
        {/* Top bar — Back + title on left; action buttons on right */}
        <div className="bg-white border-b border-slate-200 px-5 py-2.5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setMode('list')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
              title="Back to invoice list">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <FileOutput className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                {editing ? `Edit ${editing.invoice_no}` : 'New Customer Invoice'}
              </h2>
              <p className="text-xs text-slate-400">CRM → Customer Invoice</p>
            </div>
          </div>

          {/* Standard ELBS toolbar — Save, Print, Email, Close */}
          <div className="flex items-center gap-1.5">
            <button onClick={() => handleSave(false)} disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700 disabled:opacity-60">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
            </button>
            <button onClick={() => editing
                ? openPdfAndPrint(`/crm/invoices/${editing.id}/pdf`, `${editing.invoice_no}.pdf`)
                : toast.error('Save the invoice first to print')}
              disabled={!editing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 text-white text-xs font-medium rounded hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Open the styled invoice and print">
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button onClick={() => editing && setEmailOpen(true)} disabled={!editing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
              title={editing ? 'Email this invoice with attachments' : 'Save the invoice first'}>
              <Mail className="w-3.5 h-3.5" /> Email
            </button>
            <button onClick={() => setMode('list')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded hover:bg-red-600">
              <X className="w-3.5 h-3.5" /> Close
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* ── Main form ── */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm">

            {/* Row 1 — Branch · Project · Voucher No · Entry Date · Due Date */}
            <div className="border-b border-slate-100 px-4 py-3 grid grid-cols-12 gap-3 items-center">
              <div className="col-span-3">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Branch</label>
                <select value={form.branch_code} onChange={e => sf('branch_code', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-blue-50 focus:outline-none focus:border-indigo-400 font-medium">
                  {BRANCHES.map(b => <option key={b} value={b}>{b} — HEAD OFFICE</option>)}
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
                <input readOnly value={editing?.invoice_no ?? '(Auto)'} placeholder="Auto"
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded bg-slate-50 text-slate-500 font-mono" />
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Entry Date</label>
                <input type="date" value={form.date} onChange={e => sf('date', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:border-indigo-400" />
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Due Date</label>
                <input type="date" value={form.due_date} onChange={e => sf('due_date', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:border-indigo-400" />
              </div>
            </div>

            {/* Row 2 — Customer Inv. No. · Terms · Agent · Area */}
            <div className="border-b border-slate-100 px-4 py-2 grid grid-cols-12 gap-3 items-center">
              <div className="col-span-3">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Customer Inv. No.</label>
                <input value={form.customer_invoice_no} onChange={e => sf('customer_invoice_no', e.target.value)}
                  placeholder="External / customer ref"
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:border-indigo-400 font-mono" />
              </div>
              <div className="col-span-3">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Terms</label>
                <select value={form.terms} onChange={e => sf('terms', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white focus:outline-none focus:border-indigo-400">
                  <option value="COD">COD (Cash on Delivery)</option>
                  <option value="Cash">Cash</option>
                  <option value="Net 7">Net 7</option>
                  <option value="Net 14">Net 14</option>
                  <option value="Net 30">Net 30</option>
                  <option value="Net 45">Net 45</option>
                  <option value="Net 60">Net 60</option>
                  <option value="Net 90">Net 90</option>
                  <option value="Advance">Advance</option>
                </select>
              </div>
              <div className="col-span-3">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Agent</label>
                <select value={form.agent} onChange={e => sf('agent', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white focus:outline-none focus:border-indigo-400">
                  <option value="NA">NA</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
              <div className="col-span-3">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Area</label>
                <select value={form.area} onChange={e => sf('area', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white focus:outline-none focus:border-indigo-400">
                  <option value="NA">NA</option>
                  <option value="HQ">HQ</option>
                  <option value="KL">KL</option>
                </select>
              </div>
            </div>

            {/* Customer — single inline row (wide combobox: pick existing OR type walk-in) */}
            <div className="border-b border-slate-100 px-4 py-3 flex items-center gap-3">
              <label className="text-sm font-semibold text-slate-700 w-28 flex-shrink-0">Customer</label>
              <div className="flex-1">
                <CustomerPicker
                  value={form.customer_id}
                  walkInName={(form as any).walk_in_name ?? ''}
                  customers={customers}
                  onPickCustomer={(id, c) => {
                    setForm(p => ({
                      ...p,
                      customer_id: id,
                      walk_in_name: id ? '' : (p as any).walk_in_name,
                      terms: c?.payment_terms || p.terms || 'Net 30',
                      payments: p.payments.map(pay => ({
                        ...pay,
                        payee: pay.payee || c?.name || '',
                      })),
                    }) as any)
                  }}
                  onWalkIn={(name) => {
                    setForm(p => ({ ...p, customer_id: '', walk_in_name: name } as any))
                  }}
                />
              </div>
            </div>

            {/* Payment By + Bank Name + Method + Cheque + Bank Charges — single inline row */}
            <div className="border-b border-slate-100 px-4 py-3 grid grid-cols-12 gap-3 items-end">
              <div className="col-span-1">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Payment By</label>
              </div>
              <div className="col-span-3">
                <select value={form.bank_account_id}
                  onChange={e => {
                    const id = e.target.value
                    sf('bank_account_id', id)
                    const acc = accounts.find(a => String(a.id) === id)
                    if (acc) {
                      const isCash = acc.name.toLowerCase().includes('cash')
                      if (isCash) sf('payment_method', 'cash')
                      else if (!form.cheque_number) sf('payment_method', 'bank_transfer')
                    }
                  }}
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white focus:outline-none focus:border-indigo-400">
                  <option value="">Select bank / cash...</option>
                  {bankAccounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <input
                  value={accounts.find(a => String(a.id) === form.bank_account_id)?.name ?? ''}
                  readOnly
                  placeholder="Bank / Account name"
                  className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded bg-slate-50 text-slate-600" />
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Payment Method</label>
                <select value={form.payment_method}
                  onChange={e => {
                    sf('payment_method', e.target.value)
                    if (e.target.value !== 'cheque') sf('cheque_number', '')
                  }}
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white focus:outline-none focus:border-indigo-400">
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="card">Card</option>
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
                <input type="number" min="0" step="0.01" value={form.bank_charges} onChange={e => sf('bank_charges', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:border-indigo-400 font-mono text-right" />
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200">
              <div className="flex gap-0 px-4 pt-2">
                {([
                  { key: 'main', label: 'Main' },
                  { key: 'note', label: 'Note' },
                ] as const).map(t => (
                  <button key={t.key} type="button" onClick={() => setActiveTab(t.key)}
                    className={`px-4 py-1.5 text-xs font-medium border-b-2 cursor-pointer transition-colors ${
                      activeTab === t.key ? 'border-indigo-600 text-indigo-700 bg-white'
                                          : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Note tab ── */}
            {activeTab === 'note' && (
              <div className="px-4 py-3">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Internal Notes</label>
                <textarea value={form.notes} onChange={e => sf('notes', e.target.value)} rows={10}
                  placeholder="Any notes about this customer invoice — terms, special conditions, etc."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:border-indigo-400 font-mono" />
              </div>
            )}

            {/* ── Lines table — Main tab ── */}
            {activeTab === 'main' && (
            <div className="px-4 py-3">
              <div className="flex items-center gap-1 mb-2">
                <button onClick={addLine}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded text-slate-600 border border-slate-200">
                  <PlusCircle className="w-3.5 h-3.5 text-emerald-600" /> Add Line
                </button>
                <button onClick={() => form.lines.length > 1 && removeLine(form.lines.length - 1)}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded text-slate-600 border border-slate-200">
                  <MinusCircle className="w-3.5 h-3.5 text-rose-500" /> Remove Line
                </button>
                <div className="text-xs text-slate-400 ml-2">
                  A/C Code (Product) · Description · Color · Size · Qty · Roll · UOM · Unit Price · Discount · Amount
                </div>
              </div>

              <div className="border border-slate-200 rounded overflow-x-auto">
                <table className="w-full text-xs min-w-[1400px]">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200">
                      <th className="w-6 px-1 py-1.5" />
                      <th className="px-1.5 py-1.5 text-left font-semibold text-slate-600 w-40">A/C Code</th>
                      <th className="px-1.5 py-1.5 text-left font-semibold text-slate-600">Description</th>
                      <th className="px-1.5 py-1.5 text-left font-semibold text-slate-600 w-20">Color</th>
                      <th className="px-1.5 py-1.5 text-left font-semibold text-slate-600 w-20">Size</th>
                      <th className="px-1.5 py-1.5 text-right font-semibold text-slate-600 w-20">Qty</th>
                      <th className="px-1.5 py-1.5 text-right font-semibold text-slate-600 w-16">Roll</th>
                      <th className="px-1.5 py-1.5 text-left font-semibold text-slate-600 w-20">UOM</th>
                      <th className="px-1.5 py-1.5 text-right font-semibold text-slate-600 w-24">Unit Price</th>
                      <th className="px-1.5 py-1.5 text-right font-semibold text-slate-600 w-20">Discount</th>
                      <th className="px-1.5 py-1.5 text-right font-semibold text-slate-600 w-28">Amount</th>
                      <th className="w-8 px-1 py-1.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {form.lines.map((line, i) => (
                      <tr key={i} className={`border-b border-slate-100 ${i%2===0?'bg-white':'bg-slate-50/50'}`}>
                        <td className="px-1 py-1 text-slate-400 text-center">{i+1}</td>
                        {/* A/C Code — product picker */}
                        <td className="px-1 py-1">
                          <ProductPicker
                            rowIndex={i}
                            value={line.code}
                            variants={productVariants}
                            onChange={code => updateLine(i, 'code', code)}
                            onPick={b => {
                              setForm(p => ({
                                ...p,
                                lines: p.lines.map((l, idx) => idx === i ? {
                                  ...l,
                                  code:        b.sku,
                                  item_code:   b.sku,
                                  description: b.name,
                                  color:       '',
                                  size:        '',
                                  uom:         b.uom,
                                  unit_price:  b.sale_price ? String(b.sale_price) : (l.unit_price || '0'),
                                  amount:      ((parseFloat(l.qty) || 1) * (b.sale_price || 0)).toFixed(2),
                                } : l),
                              }))
                            }}
                          />
                        </td>
                        {/* Description */}
                        <td className="px-1 py-1">
                          <input value={line.description}
                            onChange={e => updateLine(i, 'description', e.target.value)}
                            placeholder="Auto-fills from Item Code"
                            className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:border-indigo-400 uppercase" />
                        </td>
                        {/* Color */}
                        <td className="px-1 py-1">
                          {(() => {
                            const lineVariants = productVariants.filter(v => v.parent_sku === line.code)
                            const colors = [...new Set(lineVariants.map(v => v.color).filter(Boolean))]
                            return colors.length > 0 ? (
                              <select value={line.color}
                                onChange={e => {
                                  const newColor = e.target.value
                                  const match = lineVariants.find(v => v.color === newColor && (!line.size || v.size === line.size))
                                              ?? lineVariants.find(v => v.color === newColor)
                                  setForm(p => ({
                                    ...p,
                                    lines: p.lines.map((l, idx) => idx === i ? {
                                      ...l,
                                      color: newColor,
                                      item_code: match ? match.sku : l.item_code,
                                      unit_price: match ? String(match.sale_price) : l.unit_price,
                                    } : l),
                                  }))
                                }}
                                className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:border-indigo-400 bg-white">
                                <option value="">— Color —</option>
                                {colors.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            ) : (
                              <input value={line.color} onChange={e => updateLine(i, 'color', e.target.value)}
                                className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:border-indigo-400" />
                            )
                          })()}
                        </td>
                        {/* Size */}
                        <td className="px-1 py-1">
                          {(() => {
                            const lineVariants = productVariants.filter(v => v.parent_sku === line.code && (!line.color || v.color === line.color))
                            const sizes = [...new Set(lineVariants.map(v => v.size).filter(Boolean))]
                            return sizes.length > 0 ? (
                              <select value={line.size}
                                onChange={e => {
                                  const newSize = e.target.value
                                  const match = lineVariants.find(v => v.size === newSize)
                                  setForm(p => ({
                                    ...p,
                                    lines: p.lines.map((l, idx) => idx === i ? {
                                      ...l,
                                      size: newSize,
                                      item_code: match ? match.sku : l.item_code,
                                      unit_price: match ? String(match.sale_price) : l.unit_price,
                                    } : l),
                                  }))
                                }}
                                className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:border-indigo-400 bg-white">
                                <option value="">— Size —</option>
                                {sizes.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            ) : (
                              <input value={line.size} onChange={e => updateLine(i, 'size', e.target.value)}
                                placeholder="NA"
                                className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:border-indigo-400" />
                            )
                          })()}
                        </td>
                        {/* Qty */}
                        <td className="px-1 py-1">
                          <input type="number" step="0.001" min="0" value={line.qty}
                            onChange={e => updateLine(i, 'qty', e.target.value)}
                            className="w-full px-1.5 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:border-indigo-400 text-right font-mono" />
                        </td>
                        {/* Roll */}
                        <td className="px-1 py-1">
                          <input type="number" step="0.001" min="0" value={line.roll_count}
                            onChange={e => updateLine(i, 'roll_count', e.target.value)}
                            className="w-full px-1.5 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:border-indigo-400 text-right font-mono" />
                        </td>
                        {/* UOM */}
                        <td className="px-1 py-1">
                          <select value={line.uom} onChange={e => updateLine(i, 'uom', e.target.value)}
                            className="w-full px-1.5 py-1 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:border-indigo-400">
                            <option value="UNIT">UNIT</option>
                            <option value="MTR">MTR</option>
                            <option value="YARD">YARD</option>
                            <option value="KG">KG</option>
                            <option value="PCS">PCS</option>
                            <option value="ROLL">ROLL</option>
                            <option value="BOX">BOX</option>
                            <option value="LITRE">LITRE</option>
                          </select>
                        </td>
                        {/* Unit Price */}
                        <td className="px-1 py-1">
                          <input type="number" step="0.0001" min="0" value={line.unit_price}
                            onChange={e => updateLine(i, 'unit_price', e.target.value)}
                            className="w-full px-1.5 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:border-indigo-400 text-right font-mono" />
                        </td>
                        {/* Discount */}
                        <td className="px-1 py-1">
                          <input type="number" step="0.01" min="0" value={line.discount}
                            onChange={e => updateLine(i, 'discount', e.target.value)}
                            className="w-full px-1.5 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:border-indigo-400 text-right font-mono" />
                        </td>
                        {/* Amount */}
                        <td className="px-1 py-1">
                          <input type="number" step="0.01" min="0" value={line.amount}
                            onChange={e => updateLine(i, 'amount', e.target.value)}
                            className="w-full px-1.5 py-1 text-xs border border-slate-200 rounded bg-slate-50 focus:outline-none focus:border-indigo-400 focus:bg-white text-right font-mono font-semibold"
                            title="Auto: Qty × Unit Price − Discount. You can override." />
                        </td>
                        <td className="px-1 py-1 text-center">
                          <div className="flex items-center justify-center gap-0.5">
                            <button onClick={() => moveLine(i, -1)} disabled={i === 0} className="text-slate-400 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronUp className="w-3.5 h-3.5" /></button>
                            <button onClick={() => moveLine(i, 1)} disabled={i === form.lines.length - 1} className="text-slate-400 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronDown className="w-3.5 h-3.5" /></button>
                            {form.lines.length > 1 && (
                              <button onClick={() => removeLine(i)} className="text-rose-400 hover:text-rose-600 ml-0.5"><MinusCircle className="w-3.5 h-3.5" /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {Array.from({length: Math.max(0, 4 - form.lines.length)}).map((_, i) => (
                      <tr key={`empty-${i}`} className={`border-b border-slate-50 ${i%2===0?'bg-white':'bg-slate-50/30'}`}>
                        <td className="px-2 py-2" colSpan={12}>&nbsp;</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer summary */}
              {(() => {
                const totalQty  = form.lines.reduce((s, l) => s + (parseFloat(l.qty)        || 0), 0)
                const totalRoll = form.lines.reduce((s, l) => s + (parseFloat(l.roll_count) || 0), 0)
                const totalDisc = form.lines.reduce((s, l) => s + (parseFloat(l.discount)   || 0), 0)
                const paidSum   = form.payments.reduce((s, p) => s + (parseFloat(p.amount)  || 0), 0)
                const outstanding = Math.max(0, netTotal - paidSum)
                return (
                  <div className="mt-3 bg-slate-100 border border-slate-200 rounded px-3 py-2 flex items-center gap-6 flex-wrap text-xs">
                    <div><span className="text-slate-500">Records:</span> <span className="font-bold text-slate-800 font-mono">{form.lines.length}</span></div>
                    <div className="w-px h-4 bg-slate-300" />
                    <div><span className="text-slate-500">Total Qty:</span> <span className="font-mono font-semibold text-slate-800">{totalQty.toFixed(2)}</span></div>
                    <div><span className="text-slate-500">Total Roll:</span> <span className="font-mono font-semibold text-slate-800">{totalRoll.toFixed(2)}</span></div>
                    {totalDisc > 0 && <div><span className="text-slate-500">Total Disc:</span> <span className="font-mono font-semibold text-amber-700">{totalDisc.toFixed(2)}</span></div>}
                    <div className="w-px h-4 bg-slate-300" />
                    {parseFloat(form.bank_charges) > 0 && (
                      <div><span className="text-slate-500">Bank Charges:</span> <span className="font-mono font-semibold text-slate-800">{parseFloat(form.bank_charges).toFixed(2)}</span></div>
                    )}
                    <div><span className="text-slate-500">Outstanding:</span> <span className={`font-mono font-bold ${outstanding>0?'text-rose-700':'text-emerald-700'}`}>{outstanding.toFixed(2)}</span></div>
                    <div className="flex-1" />
                    <div className="bg-slate-800 text-white px-4 py-1.5 rounded font-mono text-sm font-bold">
                      Net Total:&nbsp;&nbsp;{netTotal.toFixed(2)}
                    </div>
                  </div>
                )
              })()}
            </div>
            )}

            {/* ── PAYMENT INSTALLMENTS (embedded) ── */}
            {(() => {
              const billTotal   = netTotal
              const paidSum     = form.payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0)
              const outstanding = Math.max(0, billTotal - paidSum)
              const status      = paidSum <= 0 ? 'unpaid' : (paidSum >= billTotal && billTotal > 0 ? 'paid' : 'partial')
              const statusBadge = {
                unpaid:  { label: 'UNPAID',  cls: 'bg-rose-100 text-rose-700 border-rose-300' },
                partial: { label: 'PARTIAL', cls: 'bg-amber-100 text-amber-700 border-amber-300' },
                paid:    { label: 'PAID',    cls: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
              }[status]
              const cust = customers.find(c => String(c.id) === form.customer_id)

              return (
                <div className="border-t border-slate-100 px-4 py-3 bg-slate-50/50">
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
                      <div>Outstanding: <span className={`font-mono font-bold ${outstanding>0?'text-rose-700':'text-slate-500'}`}>{outstanding.toFixed(2)}</span></div>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded overflow-hidden bg-white">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200">
                          <th className="w-8 px-2 py-1.5 text-center font-semibold text-slate-600">#</th>
                          <th className="px-3 py-1.5 text-left font-semibold text-slate-600 w-36">Date</th>
                          <th className="px-3 py-1.5 text-right font-semibold text-slate-600 w-28">Amount</th>
                          <th className="px-3 py-1.5 text-left font-semibold text-slate-600 w-32">Method</th>
                          <th className="px-3 py-1.5 text-left font-semibold text-slate-600 w-44">Received From</th>
                          <th className="px-3 py-1.5 text-left font-semibold text-slate-600 w-36">Reference</th>
                          <th className="px-3 py-1.5 text-left font-semibold text-slate-600">Notes</th>
                          <th className="w-10 px-2 py-1.5"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.payments.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-3 py-4 text-center text-slate-400 text-xs italic">
                              No installments yet — click <span className="font-semibold">Add Payment</span> below to record a kisht
                            </td>
                          </tr>
                        ) : form.payments.map((p, i) => (
                          <tr key={i} className={i%2===0 ? 'bg-white' : 'bg-slate-50/40'}>
                            <td className="px-2 py-1 text-center text-slate-400">{i+1}</td>
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
                              <select value={p.payment_method} onChange={e => updatePayment(i, 'payment_method', e.target.value)}
                                className="w-full px-2 py-1 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:border-indigo-400">
                                <option value="cash">Cash</option>
                                <option value="cheque">Cheque</option>
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="card">Card</option>
                              </select>
                            </td>
                            <td className="px-1.5 py-1">
                              <input value={p.payee}
                                onChange={e => updatePayment(i, 'payee', e.target.value)}
                                placeholder={cust?.name || 'Customer name'}
                                className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:border-indigo-400 font-medium" />
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
                                className="text-rose-400 hover:text-rose-600">
                                <MinusCircle className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {form.payments.length > 0 && (
                        <tfoot className="bg-slate-50 border-t border-slate-200">
                          <tr>
                            <td colSpan={2} className="px-3 py-1.5 text-right text-slate-600 font-semibold">TOTAL PAID</td>
                            <td className="px-3 py-1.5 text-right font-mono font-bold text-slate-800">{paidSum.toFixed(2)}</td>
                            <td colSpan={5}></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>

                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <button type="button" onClick={addPayment}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700">
                      <PlusCircle className="w-3.5 h-3.5" /> Add Payment
                    </button>
                    <button type="button"
                      onClick={() => {
                        if (outstanding <= 0) return
                        const today = new Date().toISOString().slice(0,10)
                        setForm(p => {
                          const c = customers.find(x => String(x.id) === p.customer_id)
                          return {
                            ...p,
                            payments: [...p.payments, {
                              ...emptyPayment,
                              payee: c?.name ?? '',
                              payment_date: today,
                              amount: outstanding.toFixed(2),
                              payment_method: p.payment_method,
                            }],
                          }
                        })
                      }}
                      disabled={outstanding <= 0}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs bg-white border border-slate-200 text-slate-700 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      title={outstanding <= 0 ? 'Bill is fully paid' : 'Add a payment for the remaining balance'}>
                      <Plus className="w-3.5 h-3.5" /> Pay Outstanding ({outstanding.toFixed(2)})
                    </button>
                    <button type="button"
                      onClick={() => {
                        const n = parseInt(prompt('Number of installments?', '6') ?? '0')
                        if (!n || n < 1) return
                        const each = +(outstanding / n).toFixed(2)
                        const adj  = +(outstanding - each * (n - 1)).toFixed(2)
                        const today = new Date(form.date)
                        const c = customers.find(x => String(x.id) === form.customer_id)
                        const rows: CIPayment[] = Array.from({ length: n }, (_, idx) => {
                          const d = new Date(today)
                          d.setMonth(d.getMonth() + idx)
                          return {
                            ...emptyPayment,
                            payee: c?.name ?? '',
                            payment_date: d.toISOString().slice(0,10),
                            amount: idx === n-1 ? String(adj) : String(each),
                            payment_method: form.payment_method,
                          }
                        })
                        setForm(p => ({ ...p, payments: [...p.payments, ...rows] }))
                      }}
                      disabled={outstanding <= 0}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs bg-white border border-slate-200 text-slate-700 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Auto-split outstanding into N monthly kisht">
                      <RefreshCw className="w-3.5 h-3.5" /> Auto-split N kisht
                    </button>
                    {form.payments.length > 0 && (
                      <button type="button" onClick={() => setForm(p => ({ ...p, payments: [] }))}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs bg-white border border-slate-200 text-slate-600 rounded hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200">
                        <X className="w-3.5 h-3.5" /> Clear All Payments
                      </button>
                    )}
                  </div>
                </div>
              )
            })()}

            <div className="border-t border-slate-100 px-4 py-3 flex items-center gap-6 flex-wrap">
              <div className="flex-1" />
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500">Reference:</label>
                <input value={form.reference} onChange={e => sf('reference', e.target.value)}
                  placeholder="Ref no."
                  className="px-2.5 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-indigo-400 w-40" />
              </div>
            </div>
          </div>

        </div>

        {/* Email composer modal */}
        {editing && (() => {
          const cust = customers.find(c => String(c.id) === form.customer_id)
          return (
            <EmailComposer
              open={emailOpen}
              onClose={() => setEmailOpen(false)}
              relatedType="crm_invoice"
              relatedId={editing.id}
              defaultTo={cust?.email ?? ''}
              defaultSubject={`Customer Invoice ${editing.invoice_no}${editing.customer_invoice_no ? ` (${editing.customer_invoice_no})` : ''}`}
              defaultBody={`Dear ${cust?.name ?? 'Sir / Madam'},\n\nPlease find attached our invoice ${editing.invoice_no} dated ${formatDate(editing.date)} for RM ${Number(editing.amount).toFixed(2)}.\n\nKindly arrange payment by ${editing.due_date ? formatDate(editing.due_date) : 'the due date'} to the account details on the invoice.\n\nLet us know if you require any further documentation.\n\nRegards,\nCARLANISA SDN BHD`}
              documentLabel={editing.invoice_no}
            />
          )
        })()}
      </div>
    )
  }

  // ───────────────────────────────── LIST VIEW ─────────────────────────────────
  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/crm')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
            title="Back to CRM">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
            <FileOutput className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800">Customer Invoice</h1>
            <p className="text-xs text-slate-400">CRM → Customer Invoice</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700">
            <Plus className="w-3.5 h-3.5" /> Create New Invoice
          </button>
          <button onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-600 text-white text-xs font-medium rounded-lg hover:bg-slate-700">
            <Printer className="w-3.5 h-3.5" /> Print List
          </button>
        </div>
      </div>

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
        {hasColFilter && (
          <>
            <div className="w-px h-5 bg-slate-200 mx-1" />
            <button onClick={() => setColF(emptyColFilters)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-rose-500 hover:bg-rose-50 rounded border border-transparent hover:border-rose-200">
              <X className="w-3.5 h-3.5" /> Clear Filters
            </button>
            <span className="text-xs text-amber-600 font-medium ml-1">
              {filtered.length} of {records.length} shown
            </span>
          </>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-700 text-white">
              <th className="w-8 px-2 py-2 text-center font-medium">#</th>
              <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">Doc No</th>
              <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">Doc Date</th>
              <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">Bcode</th>
              <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">Customer</th>
              <th className="text-right px-3 py-2 font-semibold whitespace-nowrap">Bill Amt</th>
              <th className="text-right px-3 py-2 font-semibold whitespace-nowrap">Paid</th>
              <th className="text-right px-3 py-2 font-semibold whitespace-nowrap">Outstanding</th>
              <th className="text-center px-3 py-2 font-semibold whitespace-nowrap">Status</th>
              <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">Due</th>
              <th className="px-3 py-2 font-semibold whitespace-nowrap">Actions</th>
            </tr>
            <tr className="bg-slate-600 border-b-2 border-slate-500">
              <th className="px-2 py-1" />
              {(['doc_no','doc_date','bcode','customer','amount'] as (keyof ColFilters)[]).map(key => (
                <th key={key} className="px-1.5 py-1">
                  <input value={colF[key]} onChange={e => cf(key, e.target.value)}
                    placeholder="Filter…"
                    className={`w-full px-2 py-1 text-xs bg-slate-500 border border-slate-400 rounded text-white placeholder-slate-300 focus:outline-none focus:border-yellow-400 focus:bg-slate-400 ${key==='amount'?'text-right':''}`} />
                </th>
              ))}
              <th /><th /><th /><th /><th />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({length: 10}).map((_, i) => (
                <tr key={i} className={i%2===0?'bg-white':'bg-slate-50'}>
                  {Array.from({length: 11}).map((_, j) => (
                    <td key={j} className="px-3 py-2"><div className="h-3 bg-slate-100 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-16 text-center text-slate-400">
                  <FileOutput className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">{hasColFilter ? 'No records match the filters' : 'No customer invoices found'}</p>
                  {!hasColFilter && (
                    <button onClick={openCreate} className="mt-2 btn-primary text-xs px-3 py-1.5">
                      Create First Invoice
                    </button>
                  )}
                </td>
              </tr>
            ) : filtered.map((r, idx) => {
              const isSel = selectedRow?.id === r.id
              const ps = r.payment_status ?? (r.paid_amount > 0 ? (r.paid_amount >= r.amount ? 'paid' : 'partial') : 'unpaid')
              const cls = ps==='paid'    ? 'bg-emerald-100 text-emerald-700'
                        : ps==='partial' ? 'bg-amber-100 text-amber-700'
                        : ps==='cancelled' ? 'bg-slate-200 text-slate-500'
                                           : 'bg-rose-100 text-rose-700'
              return (
                <tr key={r.id}
                  onClick={() => setSelectedRow(r)}
                  onDoubleClick={() => openEdit(r)}
                  className={`border-b border-slate-100 cursor-pointer transition-colors ${
                    r.is_cancelled
                      ? 'bg-rose-50 text-rose-400 line-through'
                      : isSel
                        ? 'bg-indigo-100 ring-1 ring-inset ring-indigo-400'
                        : idx%2===0 ? 'bg-white hover:bg-indigo-50' : 'bg-slate-50/60 hover:bg-indigo-50'
                  }`}>
                  <td className="px-2 py-1.5 text-center text-slate-400">{(page-1)*perPage+idx+1}</td>
                  <td className="px-3 py-1.5"><span className="font-mono font-bold text-blue-700">{r.invoice_no}</span></td>
                  <td className="px-3 py-1.5 text-slate-600 whitespace-nowrap">{formatDate(r.date)}</td>
                  <td className="px-3 py-1.5">
                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-medium text-[11px]">{r.branch_code}</span>
                  </td>
                  <td className="px-3 py-1.5 text-slate-800 font-medium max-w-[220px] truncate" title={r.customer?.name ?? r.walk_in_name ?? ''}>{r.customer?.name ?? r.walk_in_name ?? '—'}</td>
                  <td className="px-3 py-1.5 text-right font-bold font-mono text-slate-800">{Number(r.amount).toFixed(2)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-emerald-700">{Number(r.paid_amount ?? 0).toFixed(2)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-rose-600">{Number(r.outstanding ?? Math.max(0, r.amount - (r.paid_amount ?? 0))).toFixed(2)}</td>
                  <td className="px-3 py-1.5 text-center">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide ${cls}`}>{ps.toUpperCase()}</span>
                  </td>
                  <td className="px-3 py-1.5 text-slate-600 whitespace-nowrap">{r.due_date ? formatDate(r.due_date) : '—'}</td>
                  <td className="px-3 py-1.5" onClick={e => e.stopPropagation()}>
                    {!r.is_cancelled && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => openPdfAndPrint(`/crm/invoices/${r.id}/pdf`, `${r.invoice_no}.pdf`)} title="Print PDF" className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"><Printer className="w-3 h-3" /></button>
                        <button onClick={() => { openEdit(r); setTimeout(() => setEmailOpen(true), 200) }} title="Email" className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50"><Mail className="w-3 h-3" /></button>
                        <button onClick={() => openEdit(r)} title="Edit" className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"><Pencil className="w-3 h-3" /></button>
                        <button onClick={() => duplicateRecord(r)} title="Duplicate" className="p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"><Copy className="w-3 h-3" /></button>
                        <button onClick={() => handleDelete(r)} title="Delete" className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"><Trash2 className="w-3 h-3" /></button>
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
                <td colSpan={5} className="px-3 py-2 text-xs font-semibold text-right">
                  {hasColFilter ? `${filtered.length} filtered` : `${meta.total} records`}
                </td>
                <td className="px-3 py-2 text-right text-sm font-bold font-mono whitespace-nowrap">
                  {hasColFilter ? filteredTotal.toFixed(2) : (meta.grand_total?.toFixed(2) ?? '—')}
                </td>
                <td colSpan={5} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-t border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <button onClick={() => setPage(1)} disabled={page === 1} className="p-1 rounded hover:bg-slate-200 disabled:opacity-40"><ChevronFirst className="w-4 h-4 text-slate-600" /></button>
          <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} className="p-1 rounded hover:bg-slate-200 disabled:opacity-40"><ChevronLeft className="w-4 h-4 text-slate-600" /></button>
          <span className="px-2">Record <span className="font-semibold">{records.length>0?recordStart:0}–{recordEnd}</span> of <span className="font-semibold">{meta.total}</span></span>
          <button onClick={() => setPage(p => Math.min(meta.last_page, p+1))} disabled={page === meta.last_page} className="p-1 rounded hover:bg-slate-200 disabled:opacity-40"><ChevronRight className="w-4 h-4 text-slate-600" /></button>
          <button onClick={() => setPage(meta.last_page)} disabled={page === meta.last_page} className="p-1 rounded hover:bg-slate-200 disabled:opacity-40"><ChevronLast className="w-4 h-4 text-slate-600" /></button>
        </div>
        <div className="text-xs text-slate-500">
          Page {page} of {meta.last_page} &nbsp;·&nbsp; Grand Total:
          <span className="font-bold text-slate-800 ml-1">{formatCurrency(meta.grand_total ?? 0)}</span>
        </div>
      </div>
    </div>
  )
}
