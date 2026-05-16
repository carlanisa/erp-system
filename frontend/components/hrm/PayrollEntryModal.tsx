'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  X, Loader2, Banknote, User, Calendar, Plus, Minus, Trash2,
  Calculator, PlusCircle, MinusCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'

type Employee = {
  id: number
  employee_code: string
  name: string
  department: string
  basic_salary: number
}
type AllowanceType = {
  id: number; code: string; name: string;
  calc_type: 'fixed'|'percent'; default_amount: number; default_percent: number;
  is_taxable: boolean; is_epf_eligible: boolean;
}
type DeductionType = {
  id: number; code: string; name: string;
  calc_type: 'fixed'|'percent'|'statutory'; default_amount: number; default_percent: number;
  is_statutory: boolean;
}
type Line = {
  line_type: 'earning' | 'deduction'
  allowance_type_id?: number | null
  deduction_type_id?: number | null
  code: string
  name: string
  amount: string
  calc_type?: 'fixed'|'percent'|'statutory'
  is_taxable?: boolean
  is_epf_eligible?: boolean
  is_statutory?: boolean
}

type Props = {
  open: boolean
  onClose: () => void
  onSaved: () => void
  defaultMonth?: number
  defaultYear?: number
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const fmt = (n: number) => `RM ${(+n || 0).toFixed(2)}`

export default function PayrollEntryModal({ open, onClose, onSaved, defaultMonth, defaultYear }: Props) {
  const now = new Date()

  const [employees, setEmployees]     = useState<Employee[]>([])
  const [allowTypes, setAllowTypes]   = useState<AllowanceType[]>([])
  const [deductTypes, setDeductTypes] = useState<DeductionType[]>([])

  const [empId, setEmpId]   = useState<number | ''>('')
  const [month, setMonth]   = useState(defaultMonth ?? now.getMonth() + 1)
  const [year, setYear]     = useState(defaultYear ?? now.getFullYear())
  const [basic, setBasic]   = useState('')
  const [lines, setLines]   = useState<Line[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setEmpId(''); setBasic(''); setLines([])
    setMonth(defaultMonth ?? now.getMonth() + 1)
    setYear(defaultYear ?? now.getFullYear())

    Promise.all([
      api.get('/hrm/employees', { params: { per_page: 200, status: 'active' } }).catch(() => null),
      api.get('/hrm/allowance-types').catch(() => null),
      api.get('/hrm/deduction-types').catch(() => null),
    ]).then(([emp, al, dd]) => {
      setEmployees(emp?.data?.data ?? [])
      setAllowTypes((al?.data?.data ?? []).filter((x: AllowanceType & { is_active?: boolean }) => x.is_active !== false))
      setDeductTypes((dd?.data?.data ?? []).filter((x: DeductionType & { is_active?: boolean }) => x.is_active !== false))
    })
  }, [open, defaultMonth, defaultYear])

  // Auto-fill basic + standard statutory deductions when employee selected
  function pickEmployee(idStr: string) {
    const id = idStr ? +idStr : ''
    setEmpId(id)
    if (!id) return
    const emp = employees.find(e => e.id === id)
    if (!emp) return
    setBasic(String(emp.basic_salary))

    // Reset lines and pre-load Malaysian statutory using the masters
    const stat = deductTypes.filter(d => d.is_statutory)
    const newLines: Line[] = stat.map(d => ({
      line_type: 'deduction',
      deduction_type_id: d.id,
      code: d.code,
      name: d.name,
      amount: (() => {
        if (d.calc_type === 'percent' || d.calc_type === 'statutory') {
          return ((emp.basic_salary * d.default_percent) / 100).toFixed(2)
        }
        return d.default_amount.toFixed(2)
      })(),
      calc_type: d.calc_type,
      is_statutory: d.is_statutory,
    })).filter(l => +l.amount > 0)

    setLines(newLines)
  }

  function addEarningFromMaster(masterId: number) {
    const m = allowTypes.find(a => a.id === masterId)
    if (!m) return
    const empBasic = +basic || 0
    const amount = m.calc_type === 'percent' ? (empBasic * m.default_percent / 100) : m.default_amount
    setLines(ls => [...ls, {
      line_type: 'earning',
      allowance_type_id: m.id,
      code: m.code, name: m.name,
      amount: amount.toFixed(2),
      calc_type: m.calc_type,
      is_taxable: m.is_taxable,
      is_epf_eligible: m.is_epf_eligible,
    }])
  }

  function addDeductionFromMaster(masterId: number) {
    const m = deductTypes.find(d => d.id === masterId)
    if (!m) return
    const empBasic = +basic || 0
    const amount = m.calc_type === 'percent' || m.calc_type === 'statutory'
      ? (empBasic * m.default_percent / 100) : m.default_amount
    setLines(ls => [...ls, {
      line_type: 'deduction',
      deduction_type_id: m.id,
      code: m.code, name: m.name,
      amount: amount.toFixed(2),
      calc_type: m.calc_type,
      is_statutory: m.is_statutory,
    }])
  }

  function addCustomLine(type: 'earning'|'deduction') {
    setLines(ls => [...ls, {
      line_type: type,
      code: '',
      name: '',
      amount: '0',
      calc_type: 'fixed',
    }])
  }

  function updateLine(i: number, patch: Partial<Line>) {
    setLines(ls => ls.map((l, idx) => idx === i ? { ...l, ...patch } : l))
  }

  function removeLine(i: number) {
    setLines(ls => ls.filter((_, idx) => idx !== i))
  }

  // ── totals ──
  const earnSum   = useMemo(() => lines.filter(l => l.line_type === 'earning').reduce((s, l) => s + (+l.amount || 0), 0), [lines])
  const deductSum = useMemo(() => lines.filter(l => l.line_type === 'deduction').reduce((s, l) => s + (+l.amount || 0), 0), [lines])
  const grossEarn = (+basic || 0) + earnSum
  const netPay    = Math.max(0, grossEarn - deductSum)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!empId)  return toast.error('Pick an employee')
    if (!basic)  return toast.error('Enter basic salary')

    // Validate every line has code + name
    for (const l of lines) {
      if (!l.code?.trim() || !l.name?.trim()) {
        return toast.error('Every line needs code + name (or remove it)')
      }
    }

    setSaving(true)
    try {
      await api.post('/hrm/payroll', {
        employee_id: +empId,
        month: +month, year: +year,
        basic_salary: +basic,
        lines: lines.map(l => ({
          line_type: l.line_type,
          allowance_type_id: l.allowance_type_id ?? null,
          deduction_type_id: l.deduction_type_id ?? null,
          code: l.code.trim().toUpperCase(),
          name: l.name.trim(),
          amount: +l.amount || 0,
          calc_type: l.calc_type,
          is_taxable: !!l.is_taxable,
          is_epf_eligible: !!l.is_epf_eligible,
          is_statutory: !!l.is_statutory,
        })),
      })
      toast.success(`Payroll entry created — Net Pay ${fmt(netPay)}`)
      onSaved(); onClose()
    } catch (e: any) {
      const errs = e?.response?.data?.errors
      toast.error(errs ? Object.values(errs).flat().join(', ') : e?.response?.data?.message ?? 'Save failed')
    } finally { setSaving(false) }
  }

  if (!open) return null

  const earnLines   = lines.map((l, i) => ({ l, i })).filter(x => x.l.line_type === 'earning')
  const deductLines = lines.map((l, i) => ({ l, i })).filter(x => x.l.line_type === 'deduction')

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center">
              <Banknote className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Manual Payroll Entry</h3>
              <p className="text-xs text-slate-400">Multi-line earnings &amp; deductions — same as the printable payslip</p>
            </div>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        <form onSubmit={submit} className="px-6 py-5 space-y-5">

          {/* Employee + period + basic */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Employee *</label>
              <div className="relative">
                <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <select required value={empId} onChange={e => pickEmployee(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-300">
                  <option value="">— Pick —</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.employee_code} · {emp.name} · {emp.department}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Month *</label>
              <select required value={month} onChange={e => setMonth(+e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white">
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Year *</label>
              <input required type="number" min="2020" max="2100" value={year}
                onChange={e => setYear(+e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono" />
            </div>
            <div className="md:col-span-4">
              <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Basic Salary (RM) *</label>
              <input required type="number" min="0" step="0.01" value={basic}
                onChange={e => setBasic(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-amber-300" />
            </div>
          </div>

          {/* Earnings + Deductions side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* EARNINGS */}
            <div className="bg-emerald-50/30 border border-emerald-100 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-emerald-50/60 border-b border-emerald-100">
                <div className="flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-emerald-700" />
                  <h4 className="font-semibold text-emerald-800 text-sm">Earnings (RM) / +</h4>
                </div>
                <div className="flex items-center gap-1">
                  <select onChange={e => { if (e.target.value) { addEarningFromMaster(+e.target.value); e.target.value = '' } }}
                    className="text-xs border border-emerald-200 rounded px-2 py-1 bg-white">
                    <option value="">+ Add from master</option>
                    {allowTypes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                  <button type="button" onClick={() => addCustomLine('earning')}
                    className="px-2 py-1 text-xs font-medium text-emerald-700 bg-white border border-emerald-200 rounded hover:bg-emerald-50">
                    + Custom
                  </button>
                </div>
              </div>
              <div className="p-3 space-y-2 min-h-[140px]">
                {earnLines.length === 0 && <p className="text-xs text-emerald-600/60 italic text-center py-6">No earnings yet — add Allowances above</p>}
                {earnLines.map(({ l, i }) => (
                  <div key={i} className="flex items-center gap-2 bg-white border border-emerald-100 rounded p-2">
                    <input value={l.code} onChange={e => updateLine(i, { code: e.target.value.toUpperCase() })}
                      placeholder="CODE"
                      className="w-20 px-2 py-1 text-xs border border-slate-200 rounded font-mono uppercase" />
                    <input value={l.name} onChange={e => updateLine(i, { name: e.target.value })}
                      placeholder="Description"
                      className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded" />
                    <input type="number" min="0" step="0.01" value={l.amount}
                      onChange={e => updateLine(i, { amount: e.target.value })}
                      className="w-24 px-2 py-1 text-xs border border-emerald-200 rounded text-right font-mono font-bold" />
                    <button type="button" onClick={() => removeLine(i)}
                      className="p-1 text-slate-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2 border-t border-emerald-100 bg-white text-sm font-bold text-emerald-700 flex justify-between">
                <span>+ Total Earnings</span>
                <span className="font-mono">{fmt(earnSum)}</span>
              </div>
            </div>

            {/* DEDUCTIONS */}
            <div className="bg-rose-50/30 border border-rose-100 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-rose-50/60 border-b border-rose-100">
                <div className="flex items-center gap-2">
                  <MinusCircle className="w-4 h-4 text-rose-700" />
                  <h4 className="font-semibold text-rose-800 text-sm">Deductions (RM) / -</h4>
                </div>
                <div className="flex items-center gap-1">
                  <select onChange={e => { if (e.target.value) { addDeductionFromMaster(+e.target.value); e.target.value = '' } }}
                    className="text-xs border border-rose-200 rounded px-2 py-1 bg-white">
                    <option value="">+ Add from master</option>
                    {deductTypes.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                  <button type="button" onClick={() => addCustomLine('deduction')}
                    className="px-2 py-1 text-xs font-medium text-rose-700 bg-white border border-rose-200 rounded hover:bg-rose-50">
                    + Custom
                  </button>
                </div>
              </div>
              <div className="p-3 space-y-2 min-h-[140px]">
                {deductLines.length === 0 && <p className="text-xs text-rose-600/60 italic text-center py-6">Pick an employee — statutory items auto-fill</p>}
                {deductLines.map(({ l, i }) => (
                  <div key={i} className="flex items-center gap-2 bg-white border border-rose-100 rounded p-2">
                    <input value={l.code} onChange={e => updateLine(i, { code: e.target.value.toUpperCase() })}
                      placeholder="CODE"
                      className="w-20 px-2 py-1 text-xs border border-slate-200 rounded font-mono uppercase" />
                    <input value={l.name} onChange={e => updateLine(i, { name: e.target.value })}
                      placeholder="Description"
                      className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded" />
                    <input type="number" min="0" step="0.01" value={l.amount}
                      onChange={e => updateLine(i, { amount: e.target.value })}
                      className="w-24 px-2 py-1 text-xs border border-rose-200 rounded text-right font-mono font-bold" />
                    <button type="button" onClick={() => removeLine(i)}
                      className="p-1 text-slate-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2 border-t border-rose-100 bg-white text-sm font-bold text-rose-700 flex justify-between">
                <span>- Total Deductions</span>
                <span className="font-mono">{fmt(deductSum)}</span>
              </div>
            </div>
          </div>

          {/* Net pay summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="w-4 h-4 text-amber-600" />
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Calculation</span>
            </div>
            <div className="grid grid-cols-4 gap-3 text-sm">
              <div className="bg-white border border-slate-200 rounded p-2.5">
                <p className="text-[10px] uppercase font-bold text-slate-500">Basic</p>
                <p className="font-mono font-bold text-slate-800">{fmt(+basic || 0)}</p>
              </div>
              <div className="bg-white border border-emerald-200 rounded p-2.5">
                <p className="text-[10px] uppercase font-bold text-emerald-600">+ Earnings</p>
                <p className="font-mono font-bold text-emerald-700">{fmt(earnSum)}</p>
              </div>
              <div className="bg-white border border-rose-200 rounded p-2.5">
                <p className="text-[10px] uppercase font-bold text-rose-600">- Deductions</p>
                <p className="font-mono font-bold text-rose-700">{fmt(deductSum)}</p>
              </div>
              <div className="bg-amber-600 text-white rounded p-2.5 ring-2 ring-amber-300">
                <p className="text-[10px] uppercase font-bold opacity-90">Net Pay</p>
                <p className="font-mono font-bold text-base">{fmt(netPay)}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Payroll Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
