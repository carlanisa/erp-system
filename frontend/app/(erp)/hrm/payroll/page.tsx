'use client'

import { useEffect, useState } from 'react'
import {
  DollarSign, Users, CheckCircle, Clock,
  ChevronLeft, ChevronRight, Loader2, Play, Eye, Download, Plus, Mail,
  Printer, X, ArrowLeft, ScanEye,
} from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'
import BackToHrm from '@/components/hrm/BackToHrm'
import PayrollEntryModal from '@/components/hrm/PayrollEntryModal'

type PayrollLine = {
  id: number; line_type: 'earning'|'deduction'; code: string; name: string; amount: number;
  is_statutory?: boolean; is_taxable?: boolean; is_epf_eligible?: boolean;
}
type PayrollRecord = {
  id: number
  employee: { id: number; name: string; employee_code: string; department: string; email?: string }
  month: number
  year: number
  basic_salary: number
  allowances: number
  deductions: number
  net_salary: number
  status: 'draft' | 'paid'
  paid_date: string | null
  email_sent_at: string | null
  email_sent_to: string | null
  email_status: string | null
  lines?: PayrollLine[]
}

type Stats = {
  total: number
  present_today: number
  on_leave: number
  absent: number
  total_payroll: number
  pending_leaves: number
  departments: number
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December']

// Lightweight English number-to-words (Ringgit + Sen)
function numberToWords(n: number): string {
  if (!isFinite(n) || n < 0) return '—'
  if (n === 0) return 'Zero Ringgit Only'
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen']
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety']
  const u1k = (num: number): string => {
    if (num === 0) return ''
    if (num < 20) return ones[num]
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '')
    return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + u1k(num % 100) : '')
  }
  const whole = (num: number): string => {
    const mn = Math.floor(num / 1_000_000)
    const th = Math.floor((num % 1_000_000) / 1000)
    const rs = num % 1000
    let out = ''
    if (mn) out += u1k(mn) + ' Million '
    if (th) out += u1k(th) + ' Thousand '
    if (rs) out += u1k(rs)
    return out.trim()
  }
  const intP = Math.floor(n)
  const fracP = Math.round((n - intP) * 100)
  let out = whole(intP) + ' Ringgit'
  if (fracP > 0) out += ' and ' + u1k(fracP) + ' Sen'
  return out + ' Only'
}

export default function PayrollPage() {
  const now = new Date()
  const [month, setMonth]       = useState(now.getMonth() + 1)
  const [year, setYear]         = useState(now.getFullYear())
  const [records, setRecords]   = useState<PayrollRecord[]>([])
  const [stats, setStats]       = useState<Stats | null>(null)
  const [loading, setLoading]   = useState(true)
  const [generating, setGen]    = useState(false)
  const [markingId, setMarkId]  = useState<number | null>(null)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [manualOpen, setManualOpen] = useState(false)
  const [emailingId, setEmailingId] = useState<number | null>(null)
  const [bulkEmailing, setBulkEmailing] = useState(false)
  const [previewing, setPreviewing] = useState<PayrollRecord | null>(null)

  useEffect(() => { loadStats() }, [])
  useEffect(() => { load() }, [month, year])

  async function loadStats() {
    try {
      const r = await api.get('/hrm/employees/stats')
      setStats(r.data.data)
    } catch {}
  }

  async function load() {
    setLoading(true)
    try {
      const r = await api.get('/hrm/payroll', { params: { month, year } })
      setRecords(r.data.data)
    } catch {
      setRecords([])
    } finally { setLoading(false) }
  }

  async function generate() {
    setGen(true)
    try {
      await api.post('/hrm/payroll/generate', { month, year })
      toast.success('Payroll generated successfully')
      load()
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Failed to generate')
    } finally { setGen(false) }
  }

  async function markPaid(id: number) {
    setMarkId(id)
    try {
      await api.post(`/hrm/payroll/${id}/pay`)
      toast.success('Marked as paid')
      load()
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Failed')
    } finally { setMarkId(null) }
  }

  async function emailPayslip(rec: PayrollRecord) {
    if (!rec.employee.email) { toast.error('No email on file for this employee'); return }
    setEmailingId(rec.id)
    try {
      await api.post(`/hrm/payroll/${rec.id}/email`)
      toast.success(`Payslip sent to ${rec.employee.email}`)
      load()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Email failed')
    } finally { setEmailingId(null) }
  }

  async function emailAllUnsent() {
    if (!confirm(`Email payslips for ${MONTHS[month - 1]} ${year} to all employees with email? (Already-sent ones will be skipped)`)) return
    setBulkEmailing(true)
    try {
      const r = await api.post('/hrm/payroll/email-bulk', { month, year, only_unsent: true })
      const d = r.data.data
      toast.success(`Sent ${d.sent}, skipped ${d.skipped_no_email} (no email), failed ${d.failed}`)
      load()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed')
    } finally { setBulkEmailing(false) }
  }

  async function downloadPayslip(id: number) {
    try {
      const r = await api.get(`/hrm/payroll/${id}/pdf`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      const cd = r.headers['content-disposition'] || ''
      const match = /filename="?([^";]+)"?/i.exec(cd)
      a.download = match?.[1] ?? `payslip-${id}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      toast.error('Failed to download payslip')
    }
  }

  function shiftMonth(d: number) {
    let m = month + d
    let y = year
    if (m > 12) { m = 1; y++ }
    if (m < 1)  { m = 12; y-- }
    setMonth(m); setYear(y)
  }

  const totalNet   = records.reduce((s, r) => s + r.net_salary, 0)
  const paidCount  = records.filter(r => r.status === 'paid').length
  const draftCount = records.filter(r => r.status === 'draft').length

  const detail = records.find(r => r.id === detailId)

  // ── PRINTABLE PREVIEW (Payslip — Carlanisa layout in ERP cream/terracotta) ─
  if (previewing) {
    const r = previewing
    const lines = r.lines ?? []

    // Earnings & Deductions split (Basic always first earning)
    const earnLinesAll = [
      { code: 'BASIC PAY', name: 'Basic Pay', amount: r.basic_salary },
      ...lines.filter(l => l.line_type === 'earning').map(l => ({ code: l.code, name: l.name, amount: l.amount })),
    ]
    const deductLinesAll = lines.filter(l => l.line_type === 'deduction')
      .map(l => ({ code: l.code, name: l.name, amount: l.amount }))

    // Standard Malaysian deductions — show all 4 even if 0 (matches Carlanisa pattern)
    const findDed = (code: string) => deductLinesAll.find(d => d.code === code)?.amount
    const epf   = findDed('EPF_E')   ?? r.basic_salary * 0.11
    const socso = findDed('SOCSO_E') ?? r.basic_salary * 0.005
    const eis   = findDed('EIS_E')   ?? r.basic_salary * 0.002
    const pcb   = findDed('PCB')     ?? Math.max(0, r.deductions - epf - socso - eis)
    const otherDeducts = deductLinesAll.filter(d => !['EPF_E','SOCSO_E','EIS_E','PCB'].includes(d.code))

    const totalEarn = earnLinesAll.reduce((s, l) => s + l.amount, 0)
    const totalDed  = epf + socso + eis + pcb + otherDeducts.reduce((s, l) => s + l.amount, 0)
    const netPay    = totalEarn - totalDed

    // Employer contributions
    const empEpf   = r.basic_salary <= 5000 ? r.basic_salary * 0.13 : r.basic_salary * 0.12
    const empSocso = r.basic_salary * 0.0175
    const empEis   = r.basic_salary * 0.002

    const period = `${MONTHS_FULL[r.month - 1]} ${r.year}`
    const fmt    = (n: number) => n > 0 ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'

    const status = r.status === 'paid'
      ? { label: 'PAID',    cls: 'border-emerald-600 text-emerald-700 bg-emerald-50' }
      : { label: 'PENDING', cls: 'border-amber-600   text-amber-700   bg-amber-50' }

    const idLabel  = (r.employee as any).ic_type === 'passport' ? 'PASSPORT NO.' : 'IC NO.'
    const idValue  = (r.employee as any).ic_passport_no || (r.employee as any).cnic || '—'

    return (
      <div className="payslip-print-host fixed inset-0 z-40 flex flex-col bg-slate-200">
        {/* Toolbar (hidden when printing) */}
        <div className="bg-white border-b border-slate-200 px-5 py-2.5 flex items-center justify-between flex-shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <button onClick={() => setPreviewing(null)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center">
              <ScanEye className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Payslip Preview · {r.employee.employee_code} · {period}</h2>
              <p className="text-xs text-slate-400">Click Print to send to printer</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => downloadPayslip(r.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 text-xs font-medium rounded">
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
            <button onClick={() => emailPayslip(r)} disabled={emailingId === r.id || !r.employee.email}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-amber-300 hover:bg-amber-50 text-slate-700 text-xs font-medium rounded disabled:opacity-50">
              {emailingId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
              {r.email_sent_at ? 'Re-send' : 'Email'}
            </button>
            <button onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700">
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button onClick={() => setPreviewing(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white text-xs font-medium rounded hover:bg-emerald-600">
              <X className="w-3.5 h-3.5" /> Close
            </button>
          </div>
        </div>

        {/* ─── Document body — OR-style theme on Carlanisa Payslip layout ─── */}
        <div className="flex-1 overflow-y-auto py-8 print:p-0 print:overflow-visible">
          <div className="payslip-print-area mx-auto bg-white shadow-lg print:shadow-none print:mx-0
                          w-[210mm] min-h-[297mm] p-12 print:p-10 text-slate-800
                          font-[Arial,Helvetica,sans-serif]">

            {/* Header — small CN monogram + big CARLANISA wordmark */}
            <div className="flex items-start justify-between border-b-2 border-slate-800 pb-4 mb-6">
              <div className="flex items-start gap-4">
                {/* Small monogram-only (bottom "CARLANISA" text from logo cropped out via aspect-ratio container) */}
                <div className="w-14 h-12 overflow-hidden flex-shrink-0">
                  <img src="/carlanisa-logo.jpg" alt="Carlanisa monogram"
                    className="block"
                    style={{
                      width: '100%',
                      height: '160%',           // taller than container so we can see only the monogram
                      objectFit: 'cover',
                      objectPosition: 'center top',
                      marginTop: '-2px',
                    }} />
                </div>
                <div>
                  {/* Big serif wordmark */}
                  <h1 className="text-3xl font-bold tracking-[0.4em] text-slate-900 leading-none"
                      style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                    CARLANISA
                  </h1>
                  <p className="text-[11px] text-slate-500 mt-2 tracking-wide">SDN BHD · Cloud Business Suite</p>
                  <p className="text-[11px] text-slate-500">www.elbs.com.my · hello@carlanisa.com</p>
                  <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                    E-17, Jalan Serai Wangi 16M/M, Alam Avenue 2, Seksyen 16, 40200 Shah Alam
                  </p>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-2xl font-bold uppercase tracking-wider text-slate-800">Payslip</h2>
                <div className={`inline-block mt-2 px-3 py-1 border-2 rounded ${status.cls}`}>
                  <span className="font-bold tracking-widest text-sm">{status.label}</span>
                </div>
              </div>
            </div>

            {/* Pay-Period meta — two-col labels (like OR Voucher meta) */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-6 text-sm">
              <div className="flex">
                <span className="w-32 text-slate-500">Pay Period</span>
                <span className="font-bold font-mono text-emerald-700">{period.toUpperCase()}</span>
              </div>
              <div className="flex">
                <span className="w-32 text-slate-500">Department</span>
                <span className="font-semibold uppercase">{r.employee.department}</span>
              </div>
              <div className="flex">
                <span className="w-32 text-slate-500">Employee No.</span>
                <span className="font-semibold font-mono">{r.employee.employee_code}</span>
              </div>
              <div className="flex">
                <span className="w-32 text-slate-500">Job Position</span>
                <span className="font-semibold uppercase">{(r.employee as any).designation || '—'}</span>
              </div>
              <div className="flex">
                <span className="w-32 text-slate-500">Pay Date</span>
                <span className="font-semibold">{r.paid_date ? formatDate(r.paid_date) : '—'}</span>
              </div>
              <div className="flex">
                <span className="w-32 text-slate-500">EPF No.</span>
                <span className="font-mono">{(r.employee as any).epf_no || '—'}</span>
              </div>
            </div>

            {/* Employee + Bank cards (same style as OR's Received From / Payment By boxes) */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="border border-slate-300 rounded p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Employee</div>
                <div className="text-base font-bold text-slate-900">{r.employee.name.toUpperCase()}</div>
                <div className="text-xs text-slate-600 mt-1">
                  {idLabel}: <span className="font-mono font-semibold">{idValue}</span>
                </div>
              </div>
              <div className="border border-slate-300 rounded p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Bank Account</div>
                <div className="text-base font-bold text-slate-900">{((r.employee as any).bank_name || '—').toUpperCase()}</div>
                <div className="text-xs text-slate-600 mt-1">
                  A/C: <span className="font-mono font-semibold">{(r.employee as any).bank_account_no || '—'}</span>
                </div>
              </div>
            </div>

            {/* Earnings + Deductions split table (Carlanisa structure, OR styling) */}
            <table className="w-full text-sm border-collapse mb-4">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="px-3 py-2 text-left font-semibold w-1/2">EARNING (RM) &nbsp;/&nbsp; +</th>
                  <th className="px-3 py-2 text-left font-semibold w-1/2 border-l border-slate-700">DEDUCTION (RM) &nbsp;/&nbsp; -</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const dedRows = [
                    { name: 'EPF', amount: epf },
                    { name: 'SOCSO', amount: socso },
                    { name: 'EIS', amount: eis },
                    { name: 'PCB', amount: pcb },
                    ...otherDeducts,
                  ]
                  const maxRows = Math.max(earnLinesAll.length, dedRows.length, 5)
                  const rows = []
                  for (let i = 0; i < maxRows; i++) {
                    const e = earnLinesAll[i]
                    const d = dedRows[i]
                    rows.push(
                      <tr key={i} className={i % 2 === 0 ? 'bg-amber-50/30' : ''}>
                        <td className="px-3 py-2 border-b border-slate-200">
                          {e ? (
                            <div className="flex justify-between">
                              <span className="font-semibold uppercase tracking-tight">{e.name}</span>
                              <span className="font-mono font-semibold">{fmt(e.amount)}</span>
                            </div>
                          ) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-2 border-b border-slate-200 border-l border-slate-200">
                          {d ? (
                            <div className="flex justify-between">
                              <span className="font-semibold uppercase tracking-tight">{d.name}</span>
                              <span className="font-mono font-semibold">{fmt(d.amount)}</span>
                            </div>
                          ) : <span className="text-slate-300">—</span>}
                        </td>
                      </tr>
                    )
                  }
                  return rows
                })()}
              </tbody>
              <tfoot>
                {/* TOTAL EARNING / TOTAL DEDUCTION row — cream highlight like OR */}
                <tr className="bg-amber-50">
                  <td className="px-3 py-2.5 border-t border-slate-300">
                    <div className="flex justify-between">
                      <span className="font-bold uppercase text-slate-700">TOTAL EARNING <span className="text-[10px] text-slate-500">(RM)</span></span>
                      <span className="font-mono font-bold text-slate-900">{fmt(totalEarn)}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 border-t border-slate-300 border-l border-slate-200">
                    <div className="flex justify-between">
                      <span className="font-bold uppercase text-slate-700">TOTAL DEDUCTION <span className="text-[10px] text-slate-500">(RM)</span></span>
                      <span className="font-mono font-bold text-slate-900">{fmt(totalDed)}</span>
                    </div>
                  </td>
                </tr>
                {/* NET PAY (left) + EMPLOYER stack (right) */}
                <tr className="bg-slate-100 border-t-2 border-slate-800">
                  <td className="px-3 py-3 align-middle">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold uppercase tracking-wide text-slate-800">NET PAY <span className="text-[10px] text-slate-500">(RM)</span></span>
                      <span className="font-mono font-extrabold text-base text-emerald-700">{fmt(netPay)}</span>
                    </div>
                  </td>
                  <td rowSpan={3} className="px-3 py-2 border-l border-slate-200 align-top bg-white">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[13px]">
                        <span className="font-semibold uppercase text-slate-700">Employer EPF <span className="text-[10px] text-slate-400">(RM)</span></span>
                        <span className="font-mono font-bold">{fmt(empEpf)}</span>
                      </div>
                      <div className="flex justify-between text-[13px]">
                        <span className="font-semibold uppercase text-slate-700">Employer SOCSO <span className="text-[10px] text-slate-400">(RM)</span></span>
                        <span className="font-mono font-bold">{fmt(empSocso)}</span>
                      </div>
                      <div className="flex justify-between text-[13px]">
                        <span className="font-semibold uppercase text-slate-700">Employer EIS <span className="text-[10px] text-slate-400">(RM)</span></span>
                        <span className="font-mono font-bold">{fmt(empEis)}</span>
                      </div>
                      <div className="flex justify-between text-[13px] pt-1.5 border-t border-slate-200">
                        <span className="font-bold uppercase text-slate-700">Total Employer</span>
                        <span className="font-mono font-extrabold text-emerald-700">{fmt(empEpf + empSocso + empEis)}</span>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr><td className="border-t border-slate-200" /></tr>
              </tfoot>
            </table>

            {/* Amount in Words (cream tint, like OR) */}
            <div className="border border-slate-300 rounded p-3 mb-6 bg-amber-50/40">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mr-2">Amount in Words:</span>
              <span className="text-sm font-semibold italic text-slate-800">{numberToWords(netPay)}</span>
            </div>

            {/* Signature row — 3-col like OR (Prepared / Approved / Received) */}
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

            {/* Cut-line — Carlanisa "POTONG GARISAN DI ATAS" preserved */}
            <div className="mt-8 pt-4 border-t-2 border-dashed border-slate-300 text-center text-[10px] font-bold tracking-widest uppercase text-slate-500">
              -- POTONG GARISAN DI ATAS -- POTONG GARISAN DI ATAS -- POTONG GARISAN DI ATAS -- POTONG GARISAN DI ATAS --
            </div>

            {/* Footer */}
            <div className="text-center text-[10px] text-slate-400 mt-4 pt-2 border-t border-slate-200">
              This is a system-generated payslip from CARLANISA SDN BHD ERP. Confidential. Printed: {new Date().toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BackToHrm />
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Payroll</h1>
            <p className="text-sm text-slate-500 mt-0.5">Monthly salary management</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={emailAllUnsent} disabled={bulkEmailing || records.length === 0}
            className="btn-outline flex items-center gap-2 disabled:opacity-50">
            {bulkEmailing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            Email All
          </button>
          <button onClick={() => setManualOpen(true)}
            className="btn-outline flex items-center gap-2">
            <Plus className="w-4 h-4" /> Manual Entry
          </button>
          <button onClick={generate} disabled={generating}
            className="btn-primary flex items-center gap-2 disabled:opacity-60">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Generate Payroll
          </button>
        </div>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card flex items-center gap-4">
            <div className="p-3 bg-indigo-50 rounded-xl"><Users className="w-5 h-5 text-indigo-600" /></div>
            <div>
              <p className="text-xs text-slate-500">Total Employees</p>
              <p className="text-xl font-bold text-slate-800">{stats.total}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-xl"><CheckCircle className="w-5 h-5 text-green-600" /></div>
            <div>
              <p className="text-xs text-slate-500">Paid This Month</p>
              <p className="text-xl font-bold text-slate-800">{paidCount}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="p-3 bg-amber-50 rounded-xl"><Clock className="w-5 h-5 text-amber-600" /></div>
            <div>
              <p className="text-xs text-slate-500">Pending</p>
              <p className="text-xl font-bold text-slate-800">{draftCount}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="p-3 bg-purple-50 rounded-xl"><DollarSign className="w-5 h-5 text-purple-600" /></div>
            <div>
              <p className="text-xs text-slate-500">Total Payroll</p>
              <p className="text-xl font-bold text-slate-800">{formatCurrency(stats.total_payroll)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Month navigator + table */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <button onClick={() => shiftMonth(-1)}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-base font-semibold text-slate-800 w-32 text-center">
              {MONTHS[month - 1]} {year}
            </span>
            <button onClick={() => shiftMonth(1)}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          {records.length > 0 && (
            <p className="text-sm font-medium text-slate-600">
              Total: <span className="text-indigo-600 font-bold">{formatCurrency(totalNet)}</span>
            </p>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wide">Employee</th>
                <th className="text-right py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wide">Basic</th>
                <th className="text-right py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wide">Allowances</th>
                <th className="text-right py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wide">Deductions</th>
                <th className="text-right py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wide">Net Salary</th>
                <th className="text-center py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
                <th className="py-3 px-2" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="py-3 px-2">
                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>No payroll generated for {MONTHS[month - 1]} {year}</p>
                    <button onClick={generate} disabled={generating}
                      className="mt-3 btn-primary inline-flex items-center gap-2 text-sm">
                      {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                      Generate Now
                    </button>
                  </td>
                </tr>
              ) : records.map(rec => (
                <tr key={rec.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                        {rec.employee.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{rec.employee.name}</p>
                        <p className="text-xs text-slate-400">{rec.employee.department}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right text-slate-600">{formatCurrency(rec.basic_salary)}</td>
                  <td className="py-3 px-2 text-right text-green-600">+{formatCurrency(rec.allowances)}</td>
                  <td className="py-3 px-2 text-right text-red-500">-{formatCurrency(rec.deductions)}</td>
                  <td className="py-3 px-2 text-right font-bold text-slate-800">{formatCurrency(rec.net_salary)}</td>
                  <td className="py-3 px-2 text-center">
                    <span className={rec.status === 'paid' ? 'badge-green' : 'badge-yellow'}>
                      {rec.status}
                    </span>
                    {rec.paid_date && (
                      <p className="text-xs text-slate-400 mt-0.5">{rec.paid_date}</p>
                    )}
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setPreviewing(rec)} title="Preview & print payslip"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50">
                        <ScanEye className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDetailId(rec.id)} title="Quick view"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => downloadPayslip(rec.id)} title="Download PDF"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50">
                        <Download className="w-4 h-4" />
                      </button>
                      <button onClick={() => emailPayslip(rec)} disabled={emailingId === rec.id || !rec.employee.email}
                        title={rec.email_sent_at ? `Re-send (last sent ${rec.email_sent_at})` : (rec.employee.email ? `Email to ${rec.employee.email}` : 'No email on file')}
                        className={`p-1.5 rounded-lg ${rec.email_sent_at ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'} disabled:opacity-30`}>
                        {emailingId === rec.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                      </button>
                      {rec.status === 'draft' && (
                        <button onClick={() => markPaid(rec.id)} disabled={markingId === rec.id}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50">
                          {markingId === rec.id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <CheckCircle className="w-3.5 h-3.5" />}
                          Mark Paid
                        </button>
                      )}
                    </div>
                    {rec.email_sent_at && (
                      <p className="text-[10px] text-emerald-600 text-right mt-0.5">✉ Emailed</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            {records.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50">
                  <td className="py-3 px-2 font-semibold text-slate-700">Total</td>
                  <td className="py-3 px-2 text-right font-semibold text-slate-700">
                    {formatCurrency(records.reduce((s, r) => s + r.basic_salary, 0))}
                  </td>
                  <td className="py-3 px-2 text-right font-semibold text-green-600">
                    +{formatCurrency(records.reduce((s, r) => s + r.allowances, 0))}
                  </td>
                  <td className="py-3 px-2 text-right font-semibold text-red-500">
                    -{formatCurrency(records.reduce((s, r) => s + r.deductions, 0))}
                  </td>
                  <td className="py-3 px-2 text-right font-bold text-indigo-600">
                    {formatCurrency(totalNet)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Manual Entry Modal */}
      <PayrollEntryModal
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        onSaved={() => { setManualOpen(false); load(); loadStats() }}
        defaultMonth={month}
        defaultYear={year}
      />

      {/* Slip Detail Modal */}
      {detail && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800">Salary Slip</h3>
                <p className="text-xs text-slate-500">{MONTHS[detail.month - 1]} {detail.year}</p>
              </div>
              <button onClick={() => setDetailId(null)}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-xl font-bold text-indigo-600">
                  {detail.employee.name.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-slate-800">{detail.employee.name}</p>
                  <p className="text-sm text-slate-500">{detail.employee.department}</p>
                </div>
              </div>
              <div className="space-y-2.5 text-sm">
                {[
                  { label: 'Basic Salary',  value: formatCurrency(detail.basic_salary),  color: 'text-slate-700' },
                  { label: 'Allowances',    value: `+ ${formatCurrency(detail.allowances)}`, color: 'text-green-600' },
                  { label: 'Deductions',    value: `- ${formatCurrency(detail.deductions)}`, color: 'text-red-500'   },
                ].map(row => (
                  <div key={row.label} className="flex justify-between">
                    <span className="text-slate-500">{row.label}</span>
                    <span className={`font-medium ${row.color}`}>{row.value}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-slate-200">
                  <span className="font-semibold text-slate-700">Net Salary</span>
                  <span className="font-bold text-indigo-600 text-base">{formatCurrency(detail.net_salary)}</span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${detail.status === 'paid' ? 'badge-green' : 'badge-yellow'}`}>
                  {detail.status}
                </span>
                {detail.paid_date && (
                  <span className="text-xs text-slate-400">Paid on {detail.paid_date}</span>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => { setPreviewing(detail); setDetailId(null) }}
                className="btn-outline flex items-center gap-2 text-sm">
                <ScanEye className="w-4 h-4" /> Preview & Print
              </button>
              <button onClick={() => downloadPayslip(detail.id)}
                className="btn-outline flex items-center gap-2 text-sm">
                <Download className="w-4 h-4" /> Download PDF
              </button>
              <button onClick={() => emailPayslip(detail)} disabled={emailingId === detail.id || !detail.employee.email}
                className="btn-outline flex items-center gap-2 text-sm disabled:opacity-50">
                {emailingId === detail.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                {detail.email_sent_at ? 'Re-send Email' : 'Email Payslip'}
              </button>
              {detail.status === 'draft' && (
                <button onClick={() => { markPaid(detail.id); setDetailId(null) }}
                  className="btn-primary flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4" /> Mark as Paid
                </button>
              )}
              <button onClick={() => setDetailId(null)} className="btn-outline text-sm">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
