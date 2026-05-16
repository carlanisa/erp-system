'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft, RefreshCw, Plus, Pencil, Trash2, Save, X, Loader2,
  Building2, Briefcase, UserCheck, CalendarRange, Clock, Layers,
  PlusCircle, MinusCircle, Wallet, MapPin,
} from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

// ─────────── types ───────────
type Dept       = { id: number; code: string; name: string; manager: string | null; notes: string | null; is_active: boolean; employees_count?: number; designations_count?: number }
type Desig      = { id: number; department_id: number | null; title: string; grade: string | null; is_active: boolean; employees_count?: number; department?: { id: number; code: string; name: string } | null }
type LeaveType  = { id: number; code: string; name: string; days_per_year: number; is_paid: boolean; carry_forward: boolean; color: string; is_active: boolean }
type Holiday    = { id: number; date: string; name: string; type: 'public'|'company'|'religious'; notes: string | null; is_active: boolean }
type Shift      = { id: number; code: string; name: string; start_time: string; end_time: string; break_minutes: number; working_days: string[] | null; is_active: boolean; employees_count?: number }
type AllowType  = { id: number; code: string; name: string; calc_type: 'fixed'|'percent'; default_amount: number; default_percent: number; is_taxable: boolean; is_epf_eligible: boolean; color: string; is_active: boolean }
type DeductType = { id: number; code: string; name: string; calc_type: 'fixed'|'percent'|'statutory'; default_amount: number; default_percent: number; is_statutory: boolean; color: string; is_active: boolean }
type Advance    = { id: number; employee_id: number; advance_date: string; amount: number; installments: number; monthly_deduction: number; paid_amount: number; outstanding: number; status: 'active'|'settled'|'cancelled'; reason: string | null; notes: string | null; employee?: { id: number; employee_code: string; name: string; department: string } }
type EmpLite    = { id: number; employee_code: string; name: string; department: string }
type OfficeLoc  = { id: number; code: string; name: string; address: string | null; lat: number; lng: number; geofence_radius_m: number; contact_phone: string | null; is_active: boolean }

type SectionId = 'departments' | 'designations' | 'leave_types' | 'holidays' | 'shifts' | 'allowances' | 'deductions' | 'advances' | 'offices'

const TILES: { id: SectionId; label: string; desc: string; icon: any; color: string; bg: string; ring: string }[] = [
  { id: 'departments',  label: 'Departments',  desc: 'Divisions / business units',         icon: Building2,     color: 'text-indigo-700', bg: 'bg-indigo-50',  ring: 'hover:ring-indigo-400' },
  { id: 'designations', label: 'Designations', desc: 'Job titles per department',          icon: Briefcase,     color: 'text-blue-700',   bg: 'bg-blue-50',    ring: 'hover:ring-blue-400' },
  { id: 'leave_types',  label: 'Leave Types',  desc: 'Annual / Sick / Casual entitlement', icon: UserCheck,     color: 'text-emerald-700',bg: 'bg-emerald-50', ring: 'hover:ring-emerald-400' },
  { id: 'holidays',     label: 'Holidays',     desc: 'Public, religious & company days',   icon: CalendarRange, color: 'text-rose-700',   bg: 'bg-rose-50',    ring: 'hover:ring-rose-400' },
  { id: 'shifts',       label: 'Shifts',       desc: 'Working hours & weekly pattern',     icon: Clock,         color: 'text-amber-700',  bg: 'bg-amber-50',   ring: 'hover:ring-amber-400' },
  { id: 'allowances',   label: 'Allowances',   desc: 'House rent · transport · OT · bonus',icon: PlusCircle,    color: 'text-emerald-700',bg: 'bg-emerald-50', ring: 'hover:ring-emerald-400' },
  { id: 'deductions',   label: 'Deductions',   desc: 'EPF · SOCSO · EIS · PCB · loans',    icon: MinusCircle,   color: 'text-rose-700',   bg: 'bg-rose-50',    ring: 'hover:ring-rose-400' },
  { id: 'advances',     label: 'Salary Advance',desc: 'Issue advance · auto-deduct in payroll',icon: Wallet,    color: 'text-violet-700', bg: 'bg-violet-50',  ring: 'hover:ring-violet-400' },
  { id: 'offices',      label: 'Office Locations',desc: 'GPS geofences for mobile attendance', icon: MapPin,    color: 'text-cyan-700',   bg: 'bg-cyan-50',    ring: 'hover:ring-cyan-400' },
]

const WEEKDAYS: { key: string; label: string }[] = [
  { key: 'mon', label: 'Mon' }, { key: 'tue', label: 'Tue' }, { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' }, { key: 'fri', label: 'Fri' }, { key: 'sat', label: 'Sat' }, { key: 'sun', label: 'Sun' },
]

export default function HrmSetupPage() {
  const router = useRouter()
  const sp     = useSearchParams()
  const initial = (sp.get('tab') as SectionId) || null
  const [active, setActive] = useState<SectionId | null>(initial)

  // ─── Departments ───
  const [depts, setDepts]                   = useState<Dept[]>([])
  const [newDept, setNewDept]               = useState({ code: '', name: '', manager: '' })
  const [editDeptId, setEditDeptId]         = useState<number | null>(null)
  const [editDept, setEditDept]             = useState<Partial<Dept>>({})
  const [savingDept, setSavingDept]         = useState(false)

  // ─── Designations ───
  const [desigs, setDesigs]                 = useState<Desig[]>([])
  const [newDesig, setNewDesig]             = useState({ department_id: '', title: '', grade: '' })
  const [editDesigId, setEditDesigId]       = useState<number | null>(null)
  const [editDesig, setEditDesig]           = useState<Partial<Desig> & { department_id?: number | string }>({})
  const [savingDesig, setSavingDesig]       = useState(false)

  // ─── Leave Types ───
  const [ltypes, setLtypes]                 = useState<LeaveType[]>([])
  const [newLt, setNewLt]                   = useState({ code: '', name: '', days_per_year: '14', is_paid: true, carry_forward: false, color: 'blue' })
  const [editLtId, setEditLtId]             = useState<number | null>(null)
  const [editLt, setEditLt]                 = useState<Partial<LeaveType>>({})
  const [savingLt, setSavingLt]             = useState(false)

  // ─── Holidays ───
  const todayYr = new Date().getFullYear()
  const [holYear, setHolYear]               = useState(todayYr)
  const [holidays, setHolidays]             = useState<Holiday[]>([])
  const [newHoliday, setNewHoliday]         = useState({ date: `${todayYr}-01-01`, name: '', type: 'public' as Holiday['type'] })
  const [editHolId, setEditHolId]           = useState<number | null>(null)
  const [editHol, setEditHol]               = useState<Partial<Holiday>>({})
  const [savingHol, setSavingHol]           = useState(false)

  // ─── Shifts ───
  const [shifts, setShifts]                 = useState<Shift[]>([])
  const [newShift, setNewShift]             = useState({ code: '', name: '', start_time: '09:00', end_time: '18:00', break_minutes: '60', working_days: ['mon','tue','wed','thu','fri'] as string[] })
  const [editShiftId, setEditShiftId]       = useState<number | null>(null)
  const [editShift, setEditShift]           = useState<Partial<Shift>>({})
  const [savingShift, setSavingShift]       = useState(false)

  // ─── Allowances ───
  const [allows, setAllows]                 = useState<AllowType[]>([])
  const [newAllow, setNewAllow]             = useState({ code: '', name: '', calc_type: 'fixed' as 'fixed'|'percent', default_amount: '0', default_percent: '0', is_taxable: true, is_epf_eligible: true })
  const [editAllowId, setEditAllowId]       = useState<number | null>(null)
  const [editAllow, setEditAllow]           = useState<Partial<AllowType>>({})
  const [savingAllow, setSavingAllow]       = useState(false)

  // ─── Deductions ───
  const [deducts, setDeducts]               = useState<DeductType[]>([])
  const [newDeduct, setNewDeduct]           = useState({ code: '', name: '', calc_type: 'fixed' as 'fixed'|'percent'|'statutory', default_amount: '0', default_percent: '0', is_statutory: false })
  const [editDeductId, setEditDeductId]     = useState<number | null>(null)
  const [editDeduct, setEditDeduct]         = useState<Partial<DeductType>>({})
  const [savingDeduct, setSavingDeduct]     = useState(false)

  // ─── Office Locations ───
  const [offices, setOffices]       = useState<OfficeLoc[]>([])
  const [newOffice, setNewOffice]   = useState({ code: '', name: '', address: '', lat: '', lng: '', geofence_radius_m: '100', contact_phone: '' })
  const [editOfficeId, setEditOfficeId] = useState<number | null>(null)
  const [editOffice, setEditOffice]     = useState<Partial<OfficeLoc>>({})
  const [savingOffice, setSavingOffice] = useState(false)

  // ─── Salary Advances ───
  const [advances, setAdvances]             = useState<Advance[]>([])
  const [advSummary, setAdvSummary]         = useState<{ active_count: number; total_outstanding: number; monthly_recovery: number; settled_this_year: number } | null>(null)
  const [empList, setEmpList]               = useState<EmpLite[]>([])
  const [advFilter, setAdvFilter]           = useState<'all'|'active'|'settled'|'cancelled'>('active')
  const [newAdv, setNewAdv]                 = useState({
    employee_id: '' as string | number,
    advance_date: new Date().toISOString().slice(0, 10),
    amount: '',
    installments: '6',
    reason: '',
    notes: '',
  })
  const [savingAdv, setSavingAdv]           = useState(false)

  // ─── loaders ───
  const loadDepts = useCallback(async () => {
    try { const r = await api.get('/hrm/master-departments'); setDepts(r.data.data ?? []) } catch {}
  }, [])
  const loadDesigs = useCallback(async () => {
    try { const r = await api.get('/hrm/designations'); setDesigs(r.data.data ?? []) } catch {}
  }, [])
  const loadLtypes = useCallback(async () => {
    try { const r = await api.get('/hrm/leave-types'); setLtypes(r.data.data ?? []) } catch {}
  }, [])
  const loadHolidays = useCallback(async () => {
    try { const r = await api.get('/hrm/holidays', { params: { year: holYear } }); setHolidays(r.data.data ?? []) } catch {}
  }, [holYear])
  const loadShifts = useCallback(async () => {
    try { const r = await api.get('/hrm/shifts'); setShifts(r.data.data ?? []) } catch {}
  }, [])
  const loadAllows = useCallback(async () => {
    try { const r = await api.get('/hrm/allowance-types'); setAllows(r.data.data ?? []) } catch {}
  }, [])
  const loadDeducts = useCallback(async () => {
    try { const r = await api.get('/hrm/deduction-types'); setDeducts(r.data.data ?? []) } catch {}
  }, [])
  const loadOffices = useCallback(async () => {
    try { const r = await api.get('/hrm/office-locations'); setOffices(r.data.data ?? []) } catch {}
  }, [])
  const loadAdvances = useCallback(async () => {
    try {
      const params: any = {}
      if (advFilter !== 'all') params.status = advFilter
      const [list, sum] = await Promise.all([
        api.get('/hrm/salary-advances', { params }),
        api.get('/hrm/salary-advances/summary'),
      ])
      setAdvances(list.data.data ?? [])
      setAdvSummary(sum.data.data ?? null)
    } catch {}
  }, [advFilter])
  const loadEmpList = useCallback(async () => {
    try {
      const r = await api.get('/hrm/employees', { params: { per_page: 200, status: 'active' } })
      setEmpList(r.data.data ?? [])
    } catch {}
  }, [])

  useEffect(() => { loadDepts(); loadDesigs(); loadLtypes(); loadShifts(); loadAllows(); loadDeducts(); loadOffices() }, [loadDepts, loadDesigs, loadLtypes, loadShifts, loadAllows, loadDeducts, loadOffices])
  useEffect(() => { if (active === 'holidays') loadHolidays() }, [active, loadHolidays])
  useEffect(() => { if (active === 'advances') { loadAdvances(); loadEmpList() } }, [active, loadAdvances, loadEmpList])

  function refreshAll() {
    loadDepts(); loadDesigs(); loadLtypes(); loadShifts(); loadAllows(); loadDeducts()
    if (active === 'holidays') loadHolidays()
    if (active === 'advances') loadAdvances()
    toast.success('Refreshed')
  }

  // ─── Department CRUD ───
  async function addDept() {
    const code = newDept.code.trim().toUpperCase()
    const name = newDept.name.trim()
    if (!code || !name) return
    setSavingDept(true)
    try {
      await api.post('/hrm/master-departments', { code, name, manager: newDept.manager.trim() || null, is_active: true })
      setNewDept({ code: '', name: '', manager: '' })
      await loadDepts()
      toast.success('Department added')
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
    finally { setSavingDept(false) }
  }
  function startEditDept(d: Dept) { setEditDeptId(d.id); setEditDept({ code: d.code, name: d.name, manager: d.manager ?? '', is_active: d.is_active }) }
  async function saveEditDept(id: number) {
    try {
      await api.put(`/hrm/master-departments/${id}`, editDept)
      setEditDeptId(null); await loadDepts(); toast.success('Updated')
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
  }
  async function delDept(d: Dept) {
    if (!confirm(`Delete department "${d.name}"?`)) return
    try { await api.delete(`/hrm/master-departments/${d.id}`); await loadDepts(); toast.success('Deleted') }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
  }

  // ─── Designation CRUD ───
  async function addDesig() {
    const title = newDesig.title.trim()
    if (!title) return
    setSavingDesig(true)
    try {
      await api.post('/hrm/designations', {
        department_id: newDesig.department_id ? +newDesig.department_id : null,
        title, grade: newDesig.grade.trim() || null, is_active: true,
      })
      setNewDesig({ department_id: newDesig.department_id, title: '', grade: '' })
      await loadDesigs()
      toast.success('Designation added')
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
    finally { setSavingDesig(false) }
  }
  function startEditDesig(d: Desig) {
    setEditDesigId(d.id)
    setEditDesig({ department_id: d.department_id ?? '', title: d.title, grade: d.grade ?? '', is_active: d.is_active })
  }
  async function saveEditDesig(id: number) {
    try {
      const payload: any = {
        title: editDesig.title,
        grade: editDesig.grade || null,
        is_active: editDesig.is_active,
        department_id: editDesig.department_id ? +editDesig.department_id : null,
      }
      await api.put(`/hrm/designations/${id}`, payload)
      setEditDesigId(null); await loadDesigs(); toast.success('Updated')
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
  }
  async function delDesig(d: Desig) {
    if (!confirm(`Delete designation "${d.title}"?`)) return
    try { await api.delete(`/hrm/designations/${d.id}`); await loadDesigs(); toast.success('Deleted') }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
  }

  // ─── Leave Type CRUD ───
  async function addLt() {
    const code = newLt.code.trim().toUpperCase()
    const name = newLt.name.trim()
    if (!code || !name) return
    setSavingLt(true)
    try {
      await api.post('/hrm/leave-types', {
        code, name,
        days_per_year: +newLt.days_per_year || 0,
        is_paid: newLt.is_paid, carry_forward: newLt.carry_forward,
        color: newLt.color, is_active: true,
      })
      setNewLt({ code: '', name: '', days_per_year: '14', is_paid: true, carry_forward: false, color: 'blue' })
      await loadLtypes()
      toast.success('Leave type added')
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
    finally { setSavingLt(false) }
  }
  function startEditLt(l: LeaveType) { setEditLtId(l.id); setEditLt({ code: l.code, name: l.name, days_per_year: l.days_per_year, is_paid: l.is_paid, carry_forward: l.carry_forward, color: l.color, is_active: l.is_active }) }
  async function saveEditLt(id: number) {
    try {
      await api.put(`/hrm/leave-types/${id}`, editLt)
      setEditLtId(null); await loadLtypes(); toast.success('Updated')
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
  }
  async function delLt(l: LeaveType) {
    if (!confirm(`Delete leave type "${l.name}"?`)) return
    try { await api.delete(`/hrm/leave-types/${l.id}`); await loadLtypes(); toast.success('Deleted') }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
  }

  // ─── Holiday CRUD ───
  async function addHoliday() {
    if (!newHoliday.date || !newHoliday.name.trim()) return
    setSavingHol(true)
    try {
      await api.post('/hrm/holidays', { ...newHoliday, name: newHoliday.name.trim(), is_active: true })
      setNewHoliday({ date: `${holYear}-01-01`, name: '', type: 'public' })
      await loadHolidays()
      toast.success('Holiday added')
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
    finally { setSavingHol(false) }
  }
  function startEditHol(h: Holiday) { setEditHolId(h.id); setEditHol({ date: h.date, name: h.name, type: h.type, is_active: h.is_active }) }
  async function saveEditHol(id: number) {
    try {
      await api.put(`/hrm/holidays/${id}`, editHol)
      setEditHolId(null); await loadHolidays(); toast.success('Updated')
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
  }
  async function delHol(h: Holiday) {
    if (!confirm(`Delete holiday "${h.name}"?`)) return
    try { await api.delete(`/hrm/holidays/${h.id}`); await loadHolidays(); toast.success('Deleted') }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
  }

  // ─── Shift CRUD ───
  function toggleNewShiftDay(d: string) {
    setNewShift(s => ({
      ...s,
      working_days: s.working_days.includes(d) ? s.working_days.filter(x => x !== d) : [...s.working_days, d],
    }))
  }
  function toggleEditShiftDay(d: string) {
    setEditShift(s => {
      const cur = s.working_days ?? []
      return { ...s, working_days: cur.includes(d) ? cur.filter(x => x !== d) : [...cur, d] }
    })
  }
  async function addShift() {
    const code = newShift.code.trim().toUpperCase()
    const name = newShift.name.trim()
    if (!code || !name) return
    setSavingShift(true)
    try {
      await api.post('/hrm/shifts', {
        code, name,
        start_time: newShift.start_time, end_time: newShift.end_time,
        break_minutes: +newShift.break_minutes || 0,
        working_days: newShift.working_days,
        is_active: true,
      })
      setNewShift({ code: '', name: '', start_time: '09:00', end_time: '18:00', break_minutes: '60', working_days: ['mon','tue','wed','thu','fri'] })
      await loadShifts()
      toast.success('Shift added')
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
    finally { setSavingShift(false) }
  }
  function startEditShift(s: Shift) {
    setEditShiftId(s.id)
    setEditShift({
      code: s.code, name: s.name,
      start_time: s.start_time?.slice(0, 5), end_time: s.end_time?.slice(0, 5),
      break_minutes: s.break_minutes,
      working_days: s.working_days ?? [],
      is_active: s.is_active,
    })
  }
  async function saveEditShift(id: number) {
    try {
      const payload: any = { ...editShift }
      if (typeof payload.start_time === 'string') payload.start_time = payload.start_time.slice(0, 5)
      if (typeof payload.end_time   === 'string') payload.end_time   = payload.end_time.slice(0, 5)
      await api.put(`/hrm/shifts/${id}`, payload)
      setEditShiftId(null); await loadShifts(); toast.success('Updated')
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
  }
  async function delShift(s: Shift) {
    if (!confirm(`Delete shift "${s.name}"?`)) return
    try { await api.delete(`/hrm/shifts/${s.id}`); await loadShifts(); toast.success('Deleted') }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
  }

  // ─── Allowance CRUD ───
  async function addAllow() {
    const code = newAllow.code.trim().toUpperCase()
    const name = newAllow.name.trim()
    if (!code || !name) return
    setSavingAllow(true)
    try {
      await api.post('/hrm/allowance-types', {
        code, name,
        calc_type: newAllow.calc_type,
        default_amount: +newAllow.default_amount || 0,
        default_percent: +newAllow.default_percent || 0,
        is_taxable: newAllow.is_taxable,
        is_epf_eligible: newAllow.is_epf_eligible,
        is_active: true,
      })
      setNewAllow({ code: '', name: '', calc_type: 'fixed', default_amount: '0', default_percent: '0', is_taxable: true, is_epf_eligible: true })
      await loadAllows()
      toast.success('Allowance added')
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
    finally { setSavingAllow(false) }
  }
  function startEditAllow(a: AllowType) {
    setEditAllowId(a.id)
    setEditAllow({
      code: a.code, name: a.name, calc_type: a.calc_type,
      default_amount: a.default_amount, default_percent: a.default_percent,
      is_taxable: a.is_taxable, is_epf_eligible: a.is_epf_eligible, is_active: a.is_active,
    })
  }
  async function saveEditAllow(id: number) {
    try {
      await api.put(`/hrm/allowance-types/${id}`, editAllow)
      setEditAllowId(null); await loadAllows(); toast.success('Updated')
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
  }
  async function delAllow(a: AllowType) {
    if (!confirm(`Delete allowance "${a.name}"?`)) return
    try { await api.delete(`/hrm/allowance-types/${a.id}`); await loadAllows(); toast.success('Deleted') }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
  }

  // ─── Deduction CRUD ───
  async function addDeduct() {
    const code = newDeduct.code.trim().toUpperCase()
    const name = newDeduct.name.trim()
    if (!code || !name) return
    setSavingDeduct(true)
    try {
      await api.post('/hrm/deduction-types', {
        code, name,
        calc_type: newDeduct.calc_type,
        default_amount: +newDeduct.default_amount || 0,
        default_percent: +newDeduct.default_percent || 0,
        is_statutory: newDeduct.is_statutory,
        is_active: true,
      })
      setNewDeduct({ code: '', name: '', calc_type: 'fixed', default_amount: '0', default_percent: '0', is_statutory: false })
      await loadDeducts()
      toast.success('Deduction added')
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
    finally { setSavingDeduct(false) }
  }
  function startEditDeduct(d: DeductType) {
    setEditDeductId(d.id)
    setEditDeduct({
      code: d.code, name: d.name, calc_type: d.calc_type,
      default_amount: d.default_amount, default_percent: d.default_percent,
      is_statutory: d.is_statutory, is_active: d.is_active,
    })
  }
  async function saveEditDeduct(id: number) {
    try {
      await api.put(`/hrm/deduction-types/${id}`, editDeduct)
      setEditDeductId(null); await loadDeducts(); toast.success('Updated')
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
  }
  async function delDeduct(d: DeductType) {
    if (!confirm(`Delete deduction "${d.name}"?`)) return
    try { await api.delete(`/hrm/deduction-types/${d.id}`); await loadDeducts(); toast.success('Deleted') }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
  }

  // ─── Office Location handlers ───
  async function addOffice() {
    const code = newOffice.code.trim().toUpperCase()
    if (!code || !newOffice.name.trim() || !newOffice.lat || !newOffice.lng) {
      toast.error('Code, name, lat and lng are required'); return
    }
    setSavingOffice(true)
    try {
      await api.post('/hrm/office-locations', {
        code, name: newOffice.name.trim(),
        address: newOffice.address.trim() || null,
        lat: +newOffice.lat, lng: +newOffice.lng,
        geofence_radius_m: +newOffice.geofence_radius_m || 100,
        contact_phone: newOffice.contact_phone.trim() || null,
        is_active: true,
      })
      setNewOffice({ code: '', name: '', address: '', lat: '', lng: '', geofence_radius_m: '100', contact_phone: '' })
      await loadOffices()
      toast.success('Office added')
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
    finally { setSavingOffice(false) }
  }
  function startEditOffice(o: OfficeLoc) {
    setEditOfficeId(o.id); setEditOffice({ ...o })
  }
  async function saveEditOffice(id: number) {
    try {
      const payload: any = { ...editOffice }
      payload.lat = +(payload.lat ?? 0); payload.lng = +(payload.lng ?? 0)
      payload.geofence_radius_m = +(payload.geofence_radius_m ?? 100)
      await api.put(`/hrm/office-locations/${id}`, payload)
      setEditOfficeId(null); await loadOffices(); toast.success('Updated')
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
  }
  async function delOffice(o: OfficeLoc) {
    if (!confirm(`Delete office "${o.name}"?`)) return
    try { await api.delete(`/hrm/office-locations/${o.id}`); await loadOffices(); toast.success('Deleted') }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
  }
  async function useMyLocation() {
    if (!navigator.geolocation) { toast.error('Geolocation not available'); return }
    navigator.geolocation.getCurrentPosition(
      pos => setNewOffice(s => ({ ...s, lat: pos.coords.latitude.toFixed(7), lng: pos.coords.longitude.toFixed(7) })),
      err => toast.error('Could not get location: ' + err.message)
    )
  }

  // ─── Salary Advance handlers ───
  async function issueAdvance() {
    if (!newAdv.employee_id) { toast.error('Pick an employee'); return }
    if (!newAdv.amount || +newAdv.amount <= 0) { toast.error('Enter advance amount'); return }
    if (!newAdv.installments || +newAdv.installments < 1) { toast.error('Installments must be 1+'); return }
    setSavingAdv(true)
    try {
      await api.post('/hrm/salary-advances', {
        employee_id: +newAdv.employee_id,
        advance_date: newAdv.advance_date,
        amount: +newAdv.amount,
        installments: +newAdv.installments,
        reason: newAdv.reason || null,
        notes: newAdv.notes || null,
      })
      setNewAdv(s => ({ ...s, employee_id: '', amount: '', reason: '', notes: '' }))
      await loadAdvances()
      toast.success('Advance issued')
    } catch (e: any) {
      const errs = e?.response?.data?.errors
      toast.error(errs ? Object.values(errs).flat().join(', ') : e?.response?.data?.message ?? 'Failed')
    } finally { setSavingAdv(false) }
  }
  async function settleAdvance(a: Advance) {
    if (!confirm(`Mark "${a.employee?.name}" advance as settled? Outstanding: RM ${a.outstanding.toFixed(2)}`)) return
    try {
      await api.put(`/hrm/salary-advances/${a.id}`, { status: 'settled', paid_amount: a.amount })
      await loadAdvances()
      toast.success('Settled')
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
  }
  async function cancelAdvance(a: Advance) {
    if (!confirm(`Cancel this advance for ${a.employee?.name}?`)) return
    try {
      await api.put(`/hrm/salary-advances/${a.id}`, { status: 'cancelled' })
      await loadAdvances()
      toast.success('Cancelled')
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
  }
  async function delAdvance(a: Advance) {
    if (!confirm(`Delete this advance entry?`)) return
    try { await api.delete(`/hrm/salary-advances/${a.id}`); await loadAdvances(); toast.success('Deleted') }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
  }

  // ─── render ───
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center">
            <Layers className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800">HRM Master Setup</h1>
            <p className="text-xs text-slate-400">Departments · Designations · Leave Types · Holidays · Shifts</p>
          </div>
        </div>
        <button onClick={refreshAll}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-600 text-white text-xs font-medium rounded-lg hover:bg-slate-700">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Tiles */}
      <section>
        <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Quick Access — Click a tile to manage</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {TILES.map(t => {
            const Icon = t.icon
            const isActive = active === t.id
            return (
              <button key={t.id} onClick={() => setActive(active === t.id ? null : t.id)}
                className={`group ${t.bg} border-2 ${isActive ? 'border-slate-700 shadow-lg ring-2 ring-slate-300' : 'border-slate-200'} rounded-xl p-3 text-left transition-all hover:shadow-md hover:-translate-y-0.5 hover:ring-2 ${t.ring}`}>
                <div className="flex items-start justify-between mb-1">
                  <Icon className={`w-5 h-5 ${t.color}`} />
                  {isActive && <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-slate-800 text-white rounded">ON</span>}
                </div>
                <div className={`text-[12px] font-bold ${t.color} mt-1`}>{t.label}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{t.desc}</div>
              </button>
            )
          })}
        </div>
        {!active && (
          <div className="mt-4 text-center text-xs text-slate-400 italic py-8 bg-slate-50/60 border border-dashed border-slate-200 rounded-xl">
            👆 Pick a tile above to manage that master
          </div>
        )}
      </section>

      {/* Departments */}
      {active === 'departments' && (
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-indigo-50/40">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-700" />
              <div>
                <h3 className="text-sm font-bold text-slate-800">Departments</h3>
                <p className="text-[11px] text-slate-500">Divisions / business units. Used in Employee assignment & reports.</p>
              </div>
            </div>
            <span className="text-[11px] text-slate-500">{depts.filter(d => d.is_active).length} active</span>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-12 gap-2 mb-3 items-end">
              <div className="col-span-2">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Code</label>
                <input value={newDept.code} onChange={e => setNewDept(s => ({ ...s, code: e.target.value.toUpperCase() }))}
                  placeholder="IT" className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded font-mono uppercase focus:outline-none focus:border-indigo-500" />
              </div>
              <div className="col-span-5">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Name</label>
                <input value={newDept.name} onChange={e => setNewDept(s => ({ ...s, name: e.target.value }))}
                  placeholder="Information Technology" className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-indigo-500" />
              </div>
              <div className="col-span-3">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Manager</label>
                <input value={newDept.manager} onChange={e => setNewDept(s => ({ ...s, manager: e.target.value }))}
                  placeholder="Person in charge" className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-indigo-500" />
              </div>
              <div className="col-span-2">
                <button onClick={addDept} disabled={savingDept || !newDept.code.trim() || !newDept.name.trim()}
                  className="w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded hover:bg-indigo-700 disabled:opacity-50">
                  {savingDept ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Add
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-24">Code</th>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600">Name</th>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-44">Manager</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-28">Designations</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-24">Employees</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-20">Status</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {depts.length === 0 ? (
                    <tr><td colSpan={7} className="py-8 text-center text-slate-400 italic text-xs">No departments yet — add one above ↑</td></tr>
                  ) : depts.map((d, i) => editDeptId === d.id ? (
                    <tr key={d.id} className="border-t border-slate-100 bg-indigo-50/30">
                      <td className="px-1 py-1"><input value={editDept.code as string ?? ''} onChange={e => setEditDept(s => ({ ...s, code: e.target.value.toUpperCase() }))} className="w-full px-2 py-1 text-xs border border-indigo-300 rounded font-mono uppercase" /></td>
                      <td className="px-1 py-1"><input value={editDept.name as string ?? ''} onChange={e => setEditDept(s => ({ ...s, name: e.target.value }))} className="w-full px-2 py-1 text-xs border border-indigo-300 rounded" /></td>
                      <td className="px-1 py-1"><input value={editDept.manager as string ?? ''} onChange={e => setEditDept(s => ({ ...s, manager: e.target.value }))} className="w-full px-2 py-1 text-xs border border-indigo-300 rounded" /></td>
                      <td className="px-3 py-1.5 text-center text-slate-400">—</td>
                      <td className="px-3 py-1.5 text-center text-slate-400">—</td>
                      <td className="px-3 py-1.5 text-center">
                        <select value={editDept.is_active ? '1' : '0'} onChange={e => setEditDept(s => ({ ...s, is_active: e.target.value === '1' }))}
                          className="text-[10px] border border-indigo-300 rounded px-1 py-0.5 bg-white">
                          <option value="1">ACTIVE</option><option value="0">INACTIVE</option>
                        </select>
                      </td>
                      <td className="px-3 py-1 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => saveEditDept(d.id)} className="p-1 rounded text-emerald-600 hover:bg-emerald-50"><Save className="w-3 h-3" /></button>
                          <button onClick={() => setEditDeptId(null)} className="p-1 rounded text-slate-400 hover:bg-slate-100"><X className="w-3 h-3" /></button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={d.id} className={`border-t border-slate-100 hover:bg-indigo-50/40 ${i%2===0?'bg-white':'bg-slate-50/40'}`}>
                      <td className="px-3 py-1.5 font-mono font-bold text-indigo-700">{d.code}</td>
                      <td className="px-3 py-1.5 font-medium text-slate-800">{d.name}</td>
                      <td className="px-3 py-1.5 text-slate-700">{d.manager ?? '—'}</td>
                      <td className="px-3 py-1.5 text-center text-slate-500">{d.designations_count ?? 0}</td>
                      <td className="px-3 py-1.5 text-center text-slate-500">{d.employees_count ?? 0}</td>
                      <td className="px-3 py-1.5 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${d.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{d.is_active ? 'ACTIVE' : 'INACTIVE'}</span>
                      </td>
                      <td className="px-3 py-1 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => startEditDept(d)} className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"><Pencil className="w-3 h-3" /></button>
                          <button onClick={() => delDept(d)} className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Designations */}
      {active === 'designations' && (
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-blue-50/40">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-blue-700" />
              <div>
                <h3 className="text-sm font-bold text-slate-800">Designations</h3>
                <p className="text-[11px] text-slate-500">Job titles per department.</p>
              </div>
            </div>
            <span className="text-[11px] text-slate-500">{desigs.filter(d => d.is_active).length} active</span>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-12 gap-2 mb-3 items-end">
              <div className="col-span-4">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Department</label>
                <select value={newDesig.department_id} onChange={e => setNewDesig(s => ({ ...s, department_id: e.target.value }))}
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:border-blue-500">
                  <option value="">— None —</option>
                  {depts.filter(d => d.is_active).map(d => <option key={d.id} value={d.id}>{d.code} · {d.name}</option>)}
                </select>
              </div>
              <div className="col-span-4">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Title</label>
                <input value={newDesig.title} onChange={e => setNewDesig(s => ({ ...s, title: e.target.value }))}
                  placeholder="Senior Developer" className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-blue-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Grade (opt.)</label>
                <input value={newDesig.grade} onChange={e => setNewDesig(s => ({ ...s, grade: e.target.value }))}
                  placeholder="L4" className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-blue-500" />
              </div>
              <div className="col-span-2">
                <button onClick={addDesig} disabled={savingDesig || !newDesig.title.trim()}
                  className="w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 disabled:opacity-50">
                  {savingDesig ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Add
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-44">Department</th>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600">Title</th>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-24">Grade</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-24">Employees</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-20">Status</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {desigs.length === 0 ? (
                    <tr><td colSpan={6} className="py-8 text-center text-slate-400 italic text-xs">No designations yet</td></tr>
                  ) : desigs.map((d, i) => editDesigId === d.id ? (
                    <tr key={d.id} className="border-t border-slate-100 bg-blue-50/30">
                      <td className="px-1 py-1">
                        <select value={editDesig.department_id ?? ''} onChange={e => setEditDesig(s => ({ ...s, department_id: e.target.value }))}
                          className="w-full px-2 py-1 text-xs border border-blue-300 rounded bg-white">
                          <option value="">— None —</option>
                          {depts.map(dp => <option key={dp.id} value={dp.id}>{dp.code} · {dp.name}</option>)}
                        </select>
                      </td>
                      <td className="px-1 py-1"><input value={editDesig.title as string ?? ''} onChange={e => setEditDesig(s => ({ ...s, title: e.target.value }))} className="w-full px-2 py-1 text-xs border border-blue-300 rounded" /></td>
                      <td className="px-1 py-1"><input value={editDesig.grade as string ?? ''} onChange={e => setEditDesig(s => ({ ...s, grade: e.target.value }))} className="w-full px-2 py-1 text-xs border border-blue-300 rounded" /></td>
                      <td className="px-3 py-1.5 text-center text-slate-400">—</td>
                      <td className="px-3 py-1.5 text-center">
                        <select value={editDesig.is_active ? '1' : '0'} onChange={e => setEditDesig(s => ({ ...s, is_active: e.target.value === '1' }))}
                          className="text-[10px] border border-blue-300 rounded px-1 py-0.5 bg-white">
                          <option value="1">ACTIVE</option><option value="0">INACTIVE</option>
                        </select>
                      </td>
                      <td className="px-3 py-1 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => saveEditDesig(d.id)} className="p-1 rounded text-emerald-600 hover:bg-emerald-50"><Save className="w-3 h-3" /></button>
                          <button onClick={() => setEditDesigId(null)} className="p-1 rounded text-slate-400 hover:bg-slate-100"><X className="w-3 h-3" /></button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={d.id} className={`border-t border-slate-100 hover:bg-blue-50/40 ${i%2===0?'bg-white':'bg-slate-50/40'}`}>
                      <td className="px-3 py-1.5 text-slate-700">{d.department ? `${d.department.code} · ${d.department.name}` : '—'}</td>
                      <td className="px-3 py-1.5 font-medium text-slate-800">{d.title}</td>
                      <td className="px-3 py-1.5 font-mono text-slate-600">{d.grade ?? '—'}</td>
                      <td className="px-3 py-1.5 text-center text-slate-500">{d.employees_count ?? 0}</td>
                      <td className="px-3 py-1.5 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${d.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{d.is_active ? 'ACTIVE' : 'INACTIVE'}</span>
                      </td>
                      <td className="px-3 py-1 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => startEditDesig(d)} className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50"><Pencil className="w-3 h-3" /></button>
                          <button onClick={() => delDesig(d)} className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Leave Types */}
      {active === 'leave_types' && (
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-emerald-50/40">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-700" />
              <div>
                <h3 className="text-sm font-bold text-slate-800">Leave Types</h3>
                <p className="text-[11px] text-slate-500">Annual entitlement controls how many days an employee can request per year.</p>
              </div>
            </div>
            <span className="text-[11px] text-slate-500">{ltypes.filter(l => l.is_active).length} active</span>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-12 gap-2 mb-3 items-end">
              <div className="col-span-2">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Code</label>
                <input value={newLt.code} onChange={e => setNewLt(s => ({ ...s, code: e.target.value.toUpperCase() }))}
                  placeholder="AL" className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded font-mono uppercase focus:outline-none focus:border-emerald-500" />
              </div>
              <div className="col-span-4">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Name</label>
                <input value={newLt.name} onChange={e => setNewLt(s => ({ ...s, name: e.target.value }))}
                  placeholder="Annual Leave" className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-emerald-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Days / Yr</label>
                <input type="number" min="0" value={newLt.days_per_year} onChange={e => setNewLt(s => ({ ...s, days_per_year: e.target.value }))}
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-emerald-500" />
              </div>
              <div className="col-span-1 flex items-center gap-1 text-[10px]">
                <input type="checkbox" checked={newLt.is_paid} onChange={e => setNewLt(s => ({ ...s, is_paid: e.target.checked }))} /> Paid
              </div>
              <div className="col-span-1 flex items-center gap-1 text-[10px]">
                <input type="checkbox" checked={newLt.carry_forward} onChange={e => setNewLt(s => ({ ...s, carry_forward: e.target.checked }))} /> CF
              </div>
              <div className="col-span-2">
                <button onClick={addLt} disabled={savingLt || !newLt.code.trim() || !newLt.name.trim()}
                  className="w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded hover:bg-emerald-700 disabled:opacity-50">
                  {savingLt ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Add
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-20">Code</th>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600">Name</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-24">Days/Yr</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-20">Paid</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-24">Carry-Fwd</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-20">Status</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ltypes.length === 0 ? (
                    <tr><td colSpan={7} className="py-8 text-center text-slate-400 italic text-xs">No leave types yet</td></tr>
                  ) : ltypes.map((l, i) => editLtId === l.id ? (
                    <tr key={l.id} className="border-t border-slate-100 bg-emerald-50/30">
                      <td className="px-1 py-1"><input value={editLt.code as string ?? ''} onChange={e => setEditLt(s => ({ ...s, code: e.target.value.toUpperCase() }))} className="w-full px-2 py-1 text-xs border border-emerald-300 rounded font-mono uppercase" /></td>
                      <td className="px-1 py-1"><input value={editLt.name as string ?? ''} onChange={e => setEditLt(s => ({ ...s, name: e.target.value }))} className="w-full px-2 py-1 text-xs border border-emerald-300 rounded" /></td>
                      <td className="px-1 py-1"><input type="number" value={editLt.days_per_year as number ?? 0} onChange={e => setEditLt(s => ({ ...s, days_per_year: +e.target.value }))} className="w-full px-2 py-1 text-xs border border-emerald-300 rounded text-center" /></td>
                      <td className="px-3 py-1.5 text-center"><input type="checkbox" checked={!!editLt.is_paid} onChange={e => setEditLt(s => ({ ...s, is_paid: e.target.checked }))} /></td>
                      <td className="px-3 py-1.5 text-center"><input type="checkbox" checked={!!editLt.carry_forward} onChange={e => setEditLt(s => ({ ...s, carry_forward: e.target.checked }))} /></td>
                      <td className="px-3 py-1.5 text-center">
                        <select value={editLt.is_active ? '1' : '0'} onChange={e => setEditLt(s => ({ ...s, is_active: e.target.value === '1' }))}
                          className="text-[10px] border border-emerald-300 rounded px-1 py-0.5 bg-white">
                          <option value="1">ACTIVE</option><option value="0">INACTIVE</option>
                        </select>
                      </td>
                      <td className="px-3 py-1 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => saveEditLt(l.id)} className="p-1 rounded text-emerald-600 hover:bg-emerald-50"><Save className="w-3 h-3" /></button>
                          <button onClick={() => setEditLtId(null)} className="p-1 rounded text-slate-400 hover:bg-slate-100"><X className="w-3 h-3" /></button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={l.id} className={`border-t border-slate-100 hover:bg-emerald-50/40 ${i%2===0?'bg-white':'bg-slate-50/40'}`}>
                      <td className="px-3 py-1.5 font-mono font-bold text-emerald-700">{l.code}</td>
                      <td className="px-3 py-1.5 font-medium text-slate-800">{l.name}</td>
                      <td className="px-3 py-1.5 text-center text-slate-700">{l.days_per_year}</td>
                      <td className="px-3 py-1.5 text-center">{l.is_paid ? <span className="text-emerald-600">●</span> : <span className="text-slate-300">—</span>}</td>
                      <td className="px-3 py-1.5 text-center">{l.carry_forward ? <span className="text-emerald-600">●</span> : <span className="text-slate-300">—</span>}</td>
                      <td className="px-3 py-1.5 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${l.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{l.is_active ? 'ACTIVE' : 'INACTIVE'}</span>
                      </td>
                      <td className="px-3 py-1 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => startEditLt(l)} className="p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"><Pencil className="w-3 h-3" /></button>
                          <button onClick={() => delLt(l)} className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Holidays */}
      {active === 'holidays' && (
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-rose-50/40">
            <div className="flex items-center gap-2">
              <CalendarRange className="w-4 h-4 text-rose-700" />
              <div>
                <h3 className="text-sm font-bold text-slate-800">Holidays {holYear}</h3>
                <p className="text-[11px] text-slate-500">Public, religious & company days. Auto-skipped from working days.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select value={holYear} onChange={e => setHolYear(+e.target.value)}
                className="text-xs border border-slate-200 rounded px-2 py-1 bg-white">
                {[todayYr - 1, todayYr, todayYr + 1].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <span className="text-[11px] text-slate-500">{holidays.length} entries</span>
            </div>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-12 gap-2 mb-3 items-end">
              <div className="col-span-3">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Date</label>
                <input type="date" value={newHoliday.date} onChange={e => setNewHoliday(s => ({ ...s, date: e.target.value }))}
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-rose-500" />
              </div>
              <div className="col-span-5">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Name</label>
                <input value={newHoliday.name} onChange={e => setNewHoliday(s => ({ ...s, name: e.target.value }))}
                  placeholder="Hari Merdeka" className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-rose-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Type</label>
                <select value={newHoliday.type} onChange={e => setNewHoliday(s => ({ ...s, type: e.target.value as any }))}
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:border-rose-500">
                  <option value="public">Public</option>
                  <option value="religious">Religious</option>
                  <option value="company">Company</option>
                </select>
              </div>
              <div className="col-span-2">
                <button onClick={addHoliday} disabled={savingHol || !newHoliday.name.trim()}
                  className="w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-rose-600 text-white text-xs font-semibold rounded hover:bg-rose-700 disabled:opacity-50">
                  {savingHol ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Add
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-32">Date</th>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600">Name</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-24">Type</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-24">Status</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {holidays.length === 0 ? (
                    <tr><td colSpan={5} className="py-8 text-center text-slate-400 italic text-xs">No holidays for {holYear}</td></tr>
                  ) : holidays.map((h, i) => editHolId === h.id ? (
                    <tr key={h.id} className="border-t border-slate-100 bg-rose-50/30">
                      <td className="px-1 py-1"><input type="date" value={editHol.date as string ?? ''} onChange={e => setEditHol(s => ({ ...s, date: e.target.value }))} className="w-full px-2 py-1 text-xs border border-rose-300 rounded" /></td>
                      <td className="px-1 py-1"><input value={editHol.name as string ?? ''} onChange={e => setEditHol(s => ({ ...s, name: e.target.value }))} className="w-full px-2 py-1 text-xs border border-rose-300 rounded" /></td>
                      <td className="px-1 py-1">
                        <select value={editHol.type ?? 'public'} onChange={e => setEditHol(s => ({ ...s, type: e.target.value as any }))}
                          className="w-full px-2 py-1 text-xs border border-rose-300 rounded bg-white">
                          <option value="public">Public</option><option value="religious">Religious</option><option value="company">Company</option>
                        </select>
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <select value={editHol.is_active ? '1' : '0'} onChange={e => setEditHol(s => ({ ...s, is_active: e.target.value === '1' }))}
                          className="text-[10px] border border-rose-300 rounded px-1 py-0.5 bg-white">
                          <option value="1">ACTIVE</option><option value="0">INACTIVE</option>
                        </select>
                      </td>
                      <td className="px-3 py-1 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => saveEditHol(h.id)} className="p-1 rounded text-emerald-600 hover:bg-emerald-50"><Save className="w-3 h-3" /></button>
                          <button onClick={() => setEditHolId(null)} className="p-1 rounded text-slate-400 hover:bg-slate-100"><X className="w-3 h-3" /></button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={h.id} className={`border-t border-slate-100 hover:bg-rose-50/40 ${i%2===0?'bg-white':'bg-slate-50/40'}`}>
                      <td className="px-3 py-1.5 font-mono text-rose-700">{h.date}</td>
                      <td className="px-3 py-1.5 font-medium text-slate-800">{h.name}</td>
                      <td className="px-3 py-1.5 text-center"><span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600">{h.type}</span></td>
                      <td className="px-3 py-1.5 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${h.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{h.is_active ? 'ACTIVE' : 'INACTIVE'}</span>
                      </td>
                      <td className="px-3 py-1 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => startEditHol(h)} className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"><Pencil className="w-3 h-3" /></button>
                          <button onClick={() => delHol(h)} className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Shifts */}
      {active === 'shifts' && (
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-amber-50/40">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-700" />
              <div>
                <h3 className="text-sm font-bold text-slate-800">Shifts</h3>
                <p className="text-[11px] text-slate-500">Working hours & weekly pattern. Assigned per-employee.</p>
              </div>
            </div>
            <span className="text-[11px] text-slate-500">{shifts.filter(s => s.is_active).length} active</span>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-12 gap-2 mb-3 items-end">
              <div className="col-span-2">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Code</label>
                <input value={newShift.code} onChange={e => setNewShift(s => ({ ...s, code: e.target.value.toUpperCase() }))}
                  placeholder="GEN" className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded font-mono uppercase focus:outline-none focus:border-amber-500" />
              </div>
              <div className="col-span-3">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Name</label>
                <input value={newShift.name} onChange={e => setNewShift(s => ({ ...s, name: e.target.value }))}
                  placeholder="General (9–6)" className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-amber-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Start</label>
                <input type="time" value={newShift.start_time} onChange={e => setNewShift(s => ({ ...s, start_time: e.target.value }))}
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-amber-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">End</label>
                <input type="time" value={newShift.end_time} onChange={e => setNewShift(s => ({ ...s, end_time: e.target.value }))}
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-amber-500" />
              </div>
              <div className="col-span-1">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Brk(m)</label>
                <input type="number" min="0" value={newShift.break_minutes} onChange={e => setNewShift(s => ({ ...s, break_minutes: e.target.value }))}
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-amber-500" />
              </div>
              <div className="col-span-2">
                <button onClick={addShift} disabled={savingShift || !newShift.code.trim() || !newShift.name.trim()}
                  className="w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded hover:bg-amber-700 disabled:opacity-50">
                  {savingShift ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Add
                </button>
              </div>
              <div className="col-span-12 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-slate-500 uppercase tracking-wide mr-1">Working days:</span>
                {WEEKDAYS.map(w => {
                  const on = newShift.working_days.includes(w.key)
                  return (
                    <button key={w.key} type="button" onClick={() => toggleNewShiftDay(w.key)}
                      className={`px-2 py-0.5 text-[11px] rounded border ${on ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-slate-500 border-slate-200 hover:border-amber-300'}`}>
                      {w.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-20">Code</th>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600">Name</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-32">Hours</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-20">Break</th>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-44">Days</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-20">Emp.</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-20">Status</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shifts.length === 0 ? (
                    <tr><td colSpan={8} className="py-8 text-center text-slate-400 italic text-xs">No shifts yet</td></tr>
                  ) : shifts.map((s, i) => editShiftId === s.id ? (
                    <tr key={s.id} className="border-t border-slate-100 bg-amber-50/30">
                      <td className="px-1 py-1"><input value={editShift.code as string ?? ''} onChange={e => setEditShift(p => ({ ...p, code: e.target.value.toUpperCase() }))} className="w-full px-2 py-1 text-xs border border-amber-300 rounded font-mono uppercase" /></td>
                      <td className="px-1 py-1"><input value={editShift.name as string ?? ''} onChange={e => setEditShift(p => ({ ...p, name: e.target.value }))} className="w-full px-2 py-1 text-xs border border-amber-300 rounded" /></td>
                      <td className="px-1 py-1">
                        <div className="flex items-center gap-1">
                          <input type="time" value={(editShift.start_time as string ?? '').slice(0,5)} onChange={e => setEditShift(p => ({ ...p, start_time: e.target.value }))} className="w-full px-1 py-1 text-xs border border-amber-300 rounded" />
                          <span className="text-slate-400">–</span>
                          <input type="time" value={(editShift.end_time as string ?? '').slice(0,5)} onChange={e => setEditShift(p => ({ ...p, end_time: e.target.value }))} className="w-full px-1 py-1 text-xs border border-amber-300 rounded" />
                        </div>
                      </td>
                      <td className="px-1 py-1"><input type="number" value={editShift.break_minutes ?? 0} onChange={e => setEditShift(p => ({ ...p, break_minutes: +e.target.value }))} className="w-full px-2 py-1 text-xs border border-amber-300 rounded text-center" /></td>
                      <td className="px-1 py-1">
                        <div className="flex flex-wrap gap-0.5">
                          {WEEKDAYS.map(w => {
                            const on = (editShift.working_days ?? []).includes(w.key)
                            return (
                              <button key={w.key} type="button" onClick={() => toggleEditShiftDay(w.key)}
                                className={`px-1 py-0.5 text-[9px] rounded border ${on ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-slate-500 border-slate-200'}`}>
                                {w.label}
                              </button>
                            )
                          })}
                        </div>
                      </td>
                      <td className="px-3 py-1.5 text-center text-slate-400">—</td>
                      <td className="px-3 py-1.5 text-center">
                        <select value={editShift.is_active ? '1' : '0'} onChange={e => setEditShift(p => ({ ...p, is_active: e.target.value === '1' }))}
                          className="text-[10px] border border-amber-300 rounded px-1 py-0.5 bg-white">
                          <option value="1">ACTIVE</option><option value="0">INACTIVE</option>
                        </select>
                      </td>
                      <td className="px-3 py-1 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => saveEditShift(s.id)} className="p-1 rounded text-emerald-600 hover:bg-emerald-50"><Save className="w-3 h-3" /></button>
                          <button onClick={() => setEditShiftId(null)} className="p-1 rounded text-slate-400 hover:bg-slate-100"><X className="w-3 h-3" /></button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={s.id} className={`border-t border-slate-100 hover:bg-amber-50/40 ${i%2===0?'bg-white':'bg-slate-50/40'}`}>
                      <td className="px-3 py-1.5 font-mono font-bold text-amber-700">{s.code}</td>
                      <td className="px-3 py-1.5 font-medium text-slate-800">{s.name}</td>
                      <td className="px-3 py-1.5 text-center font-mono text-slate-700">{s.start_time?.slice(0,5)} – {s.end_time?.slice(0,5)}</td>
                      <td className="px-3 py-1.5 text-center text-slate-600">{s.break_minutes}m</td>
                      <td className="px-3 py-1.5">
                        <div className="flex flex-wrap gap-0.5">
                          {WEEKDAYS.map(w => {
                            const on = (s.working_days ?? []).includes(w.key)
                            return (
                              <span key={w.key} className={`px-1 py-0.5 text-[9px] rounded ${on ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-300'}`}>
                                {w.label}
                              </span>
                            )
                          })}
                        </div>
                      </td>
                      <td className="px-3 py-1.5 text-center text-slate-500">{s.employees_count ?? 0}</td>
                      <td className="px-3 py-1.5 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${s.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{s.is_active ? 'ACTIVE' : 'INACTIVE'}</span>
                      </td>
                      <td className="px-3 py-1 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => startEditShift(s)} className="p-1 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50"><Pencil className="w-3 h-3" /></button>
                          <button onClick={() => delShift(s)} className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Allowances */}
      {active === 'allowances' && (
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-emerald-50/40">
            <div className="flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-emerald-700" />
              <div>
                <h3 className="text-sm font-bold text-slate-800">Allowances</h3>
                <p className="text-[11px] text-slate-500">Earnings added to basic salary. Fixed RM amount or % of basic.</p>
              </div>
            </div>
            <span className="text-[11px] text-slate-500">{allows.filter(a => a.is_active).length} active</span>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-12 gap-2 mb-3 items-end">
              <div className="col-span-2">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Code</label>
                <input value={newAllow.code} onChange={e => setNewAllow(s => ({ ...s, code: e.target.value.toUpperCase() }))}
                  placeholder="HRA" className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded font-mono uppercase focus:outline-none focus:border-emerald-500" />
              </div>
              <div className="col-span-3">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Name</label>
                <input value={newAllow.name} onChange={e => setNewAllow(s => ({ ...s, name: e.target.value }))}
                  placeholder="House Rent Allowance" className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-emerald-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Calc</label>
                <select value={newAllow.calc_type} onChange={e => setNewAllow(s => ({ ...s, calc_type: e.target.value as any }))}
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:border-emerald-500">
                  <option value="fixed">Fixed RM</option>
                  <option value="percent">% of Basic</option>
                </select>
              </div>
              {newAllow.calc_type === 'fixed' ? (
                <div className="col-span-2">
                  <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Amount RM</label>
                  <input type="number" min="0" step="0.01" value={newAllow.default_amount}
                    onChange={e => setNewAllow(s => ({ ...s, default_amount: e.target.value }))}
                    className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded font-mono focus:outline-none focus:border-emerald-500" />
                </div>
              ) : (
                <div className="col-span-2">
                  <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">% of Basic</label>
                  <input type="number" min="0" max="100" step="0.001" value={newAllow.default_percent}
                    onChange={e => setNewAllow(s => ({ ...s, default_percent: e.target.value }))}
                    className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded font-mono focus:outline-none focus:border-emerald-500" />
                </div>
              )}
              <div className="col-span-1 flex items-center gap-1 text-[10px] pb-1.5">
                <input type="checkbox" checked={newAllow.is_taxable} onChange={e => setNewAllow(s => ({ ...s, is_taxable: e.target.checked }))} /> Tax
              </div>
              <div className="col-span-1 flex items-center gap-1 text-[10px] pb-1.5">
                <input type="checkbox" checked={newAllow.is_epf_eligible} onChange={e => setNewAllow(s => ({ ...s, is_epf_eligible: e.target.checked }))} /> EPF
              </div>
              <div className="col-span-1">
                <button onClick={addAllow} disabled={savingAllow || !newAllow.code.trim() || !newAllow.name.trim()}
                  className="w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded hover:bg-emerald-700 disabled:opacity-50">
                  {savingAllow ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-24">Code</th>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600">Name</th>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-24">Calc</th>
                    <th className="text-right px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-32">Default</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-16">Tax</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-16">EPF</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-20">Status</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allows.length === 0 ? (
                    <tr><td colSpan={8} className="py-8 text-center text-slate-400 italic text-xs">No allowances yet</td></tr>
                  ) : allows.map((a, i) => editAllowId === a.id ? (
                    <tr key={a.id} className="border-t border-slate-100 bg-emerald-50/30">
                      <td className="px-1 py-1"><input value={editAllow.code as string ?? ''} onChange={e => setEditAllow(s => ({ ...s, code: e.target.value.toUpperCase() }))} className="w-full px-2 py-1 text-xs border border-emerald-300 rounded font-mono uppercase" /></td>
                      <td className="px-1 py-1"><input value={editAllow.name as string ?? ''} onChange={e => setEditAllow(s => ({ ...s, name: e.target.value }))} className="w-full px-2 py-1 text-xs border border-emerald-300 rounded" /></td>
                      <td className="px-1 py-1">
                        <select value={editAllow.calc_type ?? 'fixed'} onChange={e => setEditAllow(s => ({ ...s, calc_type: e.target.value as any }))}
                          className="w-full px-2 py-1 text-xs border border-emerald-300 rounded bg-white">
                          <option value="fixed">Fixed</option><option value="percent">%</option>
                        </select>
                      </td>
                      <td className="px-1 py-1">
                        {editAllow.calc_type === 'percent' ? (
                          <input type="number" min="0" max="100" step="0.001" value={editAllow.default_percent ?? 0} onChange={e => setEditAllow(s => ({ ...s, default_percent: +e.target.value }))} className="w-full px-2 py-1 text-xs border border-emerald-300 rounded text-right font-mono" />
                        ) : (
                          <input type="number" min="0" step="0.01" value={editAllow.default_amount ?? 0} onChange={e => setEditAllow(s => ({ ...s, default_amount: +e.target.value }))} className="w-full px-2 py-1 text-xs border border-emerald-300 rounded text-right font-mono" />
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-center"><input type="checkbox" checked={!!editAllow.is_taxable} onChange={e => setEditAllow(s => ({ ...s, is_taxable: e.target.checked }))} /></td>
                      <td className="px-3 py-1.5 text-center"><input type="checkbox" checked={!!editAllow.is_epf_eligible} onChange={e => setEditAllow(s => ({ ...s, is_epf_eligible: e.target.checked }))} /></td>
                      <td className="px-3 py-1.5 text-center">
                        <select value={editAllow.is_active ? '1' : '0'} onChange={e => setEditAllow(s => ({ ...s, is_active: e.target.value === '1' }))}
                          className="text-[10px] border border-emerald-300 rounded px-1 py-0.5 bg-white">
                          <option value="1">ACTIVE</option><option value="0">INACTIVE</option>
                        </select>
                      </td>
                      <td className="px-3 py-1 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => saveEditAllow(a.id)} className="p-1 rounded text-emerald-600 hover:bg-emerald-50"><Save className="w-3 h-3" /></button>
                          <button onClick={() => setEditAllowId(null)} className="p-1 rounded text-slate-400 hover:bg-slate-100"><X className="w-3 h-3" /></button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={a.id} className={`border-t border-slate-100 hover:bg-emerald-50/40 ${i%2===0?'bg-white':'bg-slate-50/40'}`}>
                      <td className="px-3 py-1.5 font-mono font-bold text-emerald-700">{a.code}</td>
                      <td className="px-3 py-1.5 font-medium text-slate-800">{a.name}</td>
                      <td className="px-3 py-1.5"><span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600">{a.calc_type === 'percent' ? '% basic' : 'fixed RM'}</span></td>
                      <td className="px-3 py-1.5 text-right font-mono text-slate-700">
                        {a.calc_type === 'percent' ? `${a.default_percent}%` : `RM ${Number(a.default_amount).toFixed(2)}`}
                      </td>
                      <td className="px-3 py-1.5 text-center">{a.is_taxable ? <span className="text-emerald-600">●</span> : <span className="text-slate-300">—</span>}</td>
                      <td className="px-3 py-1.5 text-center">{a.is_epf_eligible ? <span className="text-emerald-600">●</span> : <span className="text-slate-300">—</span>}</td>
                      <td className="px-3 py-1.5 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${a.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{a.is_active ? 'ACTIVE' : 'INACTIVE'}</span>
                      </td>
                      <td className="px-3 py-1 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => startEditAllow(a)} className="p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"><Pencil className="w-3 h-3" /></button>
                          <button onClick={() => delAllow(a)} className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Deductions */}
      {active === 'deductions' && (
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-rose-50/40">
            <div className="flex items-center gap-2">
              <MinusCircle className="w-4 h-4 text-rose-700" />
              <div>
                <h3 className="text-sm font-bold text-slate-800">Deductions</h3>
                <p className="text-[11px] text-slate-500">Subtractions from salary. Statutory items (EPF/SOCSO/EIS/PCB) follow Malaysian formulas.</p>
              </div>
            </div>
            <span className="text-[11px] text-slate-500">{deducts.filter(d => d.is_active).length} active</span>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-12 gap-2 mb-3 items-end">
              <div className="col-span-2">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Code</label>
                <input value={newDeduct.code} onChange={e => setNewDeduct(s => ({ ...s, code: e.target.value.toUpperCase() }))}
                  placeholder="LOAN" className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded font-mono uppercase focus:outline-none focus:border-rose-500" />
              </div>
              <div className="col-span-3">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Name</label>
                <input value={newDeduct.name} onChange={e => setNewDeduct(s => ({ ...s, name: e.target.value }))}
                  placeholder="Salary Loan" className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-rose-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Calc</label>
                <select value={newDeduct.calc_type} onChange={e => setNewDeduct(s => ({ ...s, calc_type: e.target.value as any, is_statutory: e.target.value === 'statutory' }))}
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:border-rose-500">
                  <option value="fixed">Fixed RM</option>
                  <option value="percent">% of Basic</option>
                  <option value="statutory">Statutory</option>
                </select>
              </div>
              {newDeduct.calc_type === 'fixed' ? (
                <div className="col-span-2">
                  <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Amount RM</label>
                  <input type="number" min="0" step="0.01" value={newDeduct.default_amount}
                    onChange={e => setNewDeduct(s => ({ ...s, default_amount: e.target.value }))}
                    className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded font-mono focus:outline-none focus:border-rose-500" />
                </div>
              ) : (
                <div className="col-span-2">
                  <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">% / Rate</label>
                  <input type="number" min="0" max="100" step="0.001" value={newDeduct.default_percent}
                    onChange={e => setNewDeduct(s => ({ ...s, default_percent: e.target.value }))}
                    className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded font-mono focus:outline-none focus:border-rose-500" />
                </div>
              )}
              <div className="col-span-2 flex items-center gap-1 text-[10px] pb-1.5">
                <input type="checkbox" checked={newDeduct.is_statutory} onChange={e => setNewDeduct(s => ({ ...s, is_statutory: e.target.checked }))} /> Statutory
              </div>
              <div className="col-span-1">
                <button onClick={addDeduct} disabled={savingDeduct || !newDeduct.code.trim() || !newDeduct.name.trim()}
                  className="w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-rose-600 text-white text-xs font-semibold rounded hover:bg-rose-700 disabled:opacity-50">
                  {savingDeduct ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-24">Code</th>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600">Name</th>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-28">Calc</th>
                    <th className="text-right px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-32">Default</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-24">Statutory</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-20">Status</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {deducts.length === 0 ? (
                    <tr><td colSpan={7} className="py-8 text-center text-slate-400 italic text-xs">No deductions yet</td></tr>
                  ) : deducts.map((d, i) => editDeductId === d.id ? (
                    <tr key={d.id} className="border-t border-slate-100 bg-rose-50/30">
                      <td className="px-1 py-1"><input value={editDeduct.code as string ?? ''} onChange={e => setEditDeduct(s => ({ ...s, code: e.target.value.toUpperCase() }))} className="w-full px-2 py-1 text-xs border border-rose-300 rounded font-mono uppercase" /></td>
                      <td className="px-1 py-1"><input value={editDeduct.name as string ?? ''} onChange={e => setEditDeduct(s => ({ ...s, name: e.target.value }))} className="w-full px-2 py-1 text-xs border border-rose-300 rounded" /></td>
                      <td className="px-1 py-1">
                        <select value={editDeduct.calc_type ?? 'fixed'} onChange={e => setEditDeduct(s => ({ ...s, calc_type: e.target.value as any, is_statutory: e.target.value === 'statutory' || s.is_statutory }))}
                          className="w-full px-2 py-1 text-xs border border-rose-300 rounded bg-white">
                          <option value="fixed">Fixed</option><option value="percent">%</option><option value="statutory">Statutory</option>
                        </select>
                      </td>
                      <td className="px-1 py-1">
                        {editDeduct.calc_type === 'fixed' ? (
                          <input type="number" min="0" step="0.01" value={editDeduct.default_amount ?? 0} onChange={e => setEditDeduct(s => ({ ...s, default_amount: +e.target.value }))} className="w-full px-2 py-1 text-xs border border-rose-300 rounded text-right font-mono" />
                        ) : (
                          <input type="number" min="0" max="100" step="0.001" value={editDeduct.default_percent ?? 0} onChange={e => setEditDeduct(s => ({ ...s, default_percent: +e.target.value }))} className="w-full px-2 py-1 text-xs border border-rose-300 rounded text-right font-mono" />
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-center"><input type="checkbox" checked={!!editDeduct.is_statutory} onChange={e => setEditDeduct(s => ({ ...s, is_statutory: e.target.checked }))} /></td>
                      <td className="px-3 py-1.5 text-center">
                        <select value={editDeduct.is_active ? '1' : '0'} onChange={e => setEditDeduct(s => ({ ...s, is_active: e.target.value === '1' }))}
                          className="text-[10px] border border-rose-300 rounded px-1 py-0.5 bg-white">
                          <option value="1">ACTIVE</option><option value="0">INACTIVE</option>
                        </select>
                      </td>
                      <td className="px-3 py-1 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => saveEditDeduct(d.id)} className="p-1 rounded text-emerald-600 hover:bg-emerald-50"><Save className="w-3 h-3" /></button>
                          <button onClick={() => setEditDeductId(null)} className="p-1 rounded text-slate-400 hover:bg-slate-100"><X className="w-3 h-3" /></button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={d.id} className={`border-t border-slate-100 hover:bg-rose-50/40 ${i%2===0?'bg-white':'bg-slate-50/40'}`}>
                      <td className="px-3 py-1.5 font-mono font-bold text-rose-700">{d.code}</td>
                      <td className="px-3 py-1.5 font-medium text-slate-800">{d.name}</td>
                      <td className="px-3 py-1.5"><span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600">{d.calc_type}</span></td>
                      <td className="px-3 py-1.5 text-right font-mono text-slate-700">
                        {d.calc_type === 'fixed'
                          ? `RM ${Number(d.default_amount).toFixed(2)}`
                          : `${Number(d.default_percent).toFixed(3)}%`}
                      </td>
                      <td className="px-3 py-1.5 text-center">{d.is_statutory ? <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">YES</span> : <span className="text-slate-300">—</span>}</td>
                      <td className="px-3 py-1.5 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${d.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{d.is_active ? 'ACTIVE' : 'INACTIVE'}</span>
                      </td>
                      <td className="px-3 py-1 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => startEditDeduct(d)} className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"><Pencil className="w-3 h-3" /></button>
                          <button onClick={() => delDeduct(d)} className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Salary Advance */}
      {active === 'advances' && (
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-violet-50/40">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-violet-700" />
              <div>
                <h3 className="text-sm font-bold text-slate-800">Salary Advance</h3>
                <p className="text-[11px] text-slate-500">Issue advance to an employee. Auto-deducted as monthly installments in payroll.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select value={advFilter} onChange={e => setAdvFilter(e.target.value as any)}
                className="text-xs border border-slate-200 rounded px-2 py-1 bg-white">
                <option value="active">Active</option>
                <option value="settled">Settled</option>
                <option value="cancelled">Cancelled</option>
                <option value="all">All</option>
              </select>
            </div>
          </div>

          {/* Summary cards */}
          {advSummary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4 pt-4">
              <div className="bg-violet-50/60 border border-violet-100 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wide text-violet-600 font-semibold">Active Advances</p>
                <p className="text-lg font-bold text-violet-700 mt-0.5">{advSummary.active_count}</p>
              </div>
              <div className="bg-rose-50/60 border border-rose-100 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wide text-rose-600 font-semibold">Total Outstanding</p>
                <p className="text-lg font-bold text-rose-700 mt-0.5">RM {Number(advSummary.total_outstanding).toFixed(2)}</p>
              </div>
              <div className="bg-amber-50/60 border border-amber-100 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wide text-amber-600 font-semibold">Monthly Recovery</p>
                <p className="text-lg font-bold text-amber-700 mt-0.5">RM {Number(advSummary.monthly_recovery).toFixed(2)}</p>
              </div>
              <div className="bg-emerald-50/60 border border-emerald-100 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wide text-emerald-600 font-semibold">Settled This Year</p>
                <p className="text-lg font-bold text-emerald-700 mt-0.5">{advSummary.settled_this_year}</p>
              </div>
            </div>
          )}

          {/* Issue advance form */}
          <div className="p-4">
            <div className="grid grid-cols-12 gap-2 mb-3 items-end">
              <div className="col-span-3">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Employee *</label>
                <select value={newAdv.employee_id} onChange={e => setNewAdv(s => ({ ...s, employee_id: e.target.value }))}
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:border-violet-500">
                  <option value="">— Pick employee —</option>
                  {empList.map(e => <option key={e.id} value={e.id}>{e.employee_code} · {e.name}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Date *</label>
                <input type="date" value={newAdv.advance_date} onChange={e => setNewAdv(s => ({ ...s, advance_date: e.target.value }))}
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-violet-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Amount RM *</label>
                <input type="number" min="0" step="0.01" value={newAdv.amount} onChange={e => setNewAdv(s => ({ ...s, amount: e.target.value }))}
                  placeholder="0.00"
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded font-mono focus:outline-none focus:border-violet-500" />
              </div>
              <div className="col-span-1">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Months *</label>
                <input type="number" min="1" max="36" value={newAdv.installments} onChange={e => setNewAdv(s => ({ ...s, installments: e.target.value }))}
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded font-mono text-center focus:outline-none focus:border-violet-500" />
              </div>
              <div className="col-span-3">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Reason</label>
                <input value={newAdv.reason} onChange={e => setNewAdv(s => ({ ...s, reason: e.target.value }))}
                  placeholder="Medical · school fees · emergency"
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-violet-500" />
              </div>
              <div className="col-span-1">
                <button onClick={issueAdvance} disabled={savingAdv}
                  className="w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-violet-600 text-white text-xs font-semibold rounded hover:bg-violet-700 disabled:opacity-50">
                  {savingAdv ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Issue
                </button>
              </div>
            </div>

            {newAdv.amount && newAdv.installments && +newAdv.installments > 0 && (
              <div className="mb-3 px-3 py-2 bg-violet-50 border border-violet-100 rounded text-[11px] text-violet-700">
                Monthly installment: <span className="font-bold">RM {(+newAdv.amount / +newAdv.installments).toFixed(2)}</span> for {newAdv.installments} month(s)
              </div>
            )}

            {/* Advances list */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-28">Date</th>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600">Employee</th>
                    <th className="text-right px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-28">Amount</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-20">Months</th>
                    <th className="text-right px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-28">Monthly</th>
                    <th className="text-right px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-28">Paid</th>
                    <th className="text-right px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-28">Outstanding</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-24">Status</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-32">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {advances.length === 0 ? (
                    <tr><td colSpan={9} className="py-8 text-center text-slate-400 italic text-xs">
                      {advFilter === 'active' ? 'No active advances' : `No ${advFilter} advances`}
                    </td></tr>
                  ) : advances.map((a, i) => (
                    <tr key={a.id} className={`border-t border-slate-100 hover:bg-violet-50/40 ${i%2===0?'bg-white':'bg-slate-50/40'}`}>
                      <td className="px-3 py-1.5 font-mono text-violet-700">{a.advance_date}</td>
                      <td className="px-3 py-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center text-[10px] font-bold text-violet-700">
                            {a.employee?.name?.charAt(0) ?? '?'}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{a.employee?.name}</p>
                            <p className="text-[10px] text-slate-400">{a.employee?.employee_code} · {a.employee?.department}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono font-bold text-slate-800">RM {Number(a.amount).toFixed(2)}</td>
                      <td className="px-3 py-1.5 text-center text-slate-700">{a.installments}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-amber-700">RM {Number(a.monthly_deduction).toFixed(2)}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-emerald-700">RM {Number(a.paid_amount).toFixed(2)}</td>
                      <td className="px-3 py-1.5 text-right font-mono font-bold text-rose-700">RM {Number(a.outstanding).toFixed(2)}</td>
                      <td className="px-3 py-1.5 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          a.status === 'active'    ? 'bg-violet-100 text-violet-700'   :
                          a.status === 'settled'   ? 'bg-emerald-100 text-emerald-700' :
                                                     'bg-slate-200 text-slate-600'
                        }`}>{a.status}</span>
                      </td>
                      <td className="px-3 py-1 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {a.status === 'active' && (
                            <>
                              <button onClick={() => settleAdvance(a)} title="Mark settled"
                                className="px-1.5 py-0.5 rounded text-[10px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100">Settle</button>
                              <button onClick={() => cancelAdvance(a)} title="Cancel"
                                className="p-1 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50"><X className="w-3 h-3" /></button>
                            </>
                          )}
                          {a.paid_amount === 0 && (
                            <button onClick={() => delAdvance(a)} title="Delete"
                              className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-3 h-3" /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Office Locations */}
      {active === 'offices' && (
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-cyan-50/40">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-700" />
              <div>
                <h3 className="text-sm font-bold text-slate-800">Office Locations & Geofences</h3>
                <p className="text-[11px] text-slate-500">
                  Used by the Mobile App: staff can only mark attendance via Face Recognition <b>at the office</b>.
                  GPS coordinates must be inside the radius (default 100m).
                </p>
              </div>
            </div>
            <span className="text-[11px] text-slate-500">{offices.filter(o => o.is_active).length} active</span>
          </div>

          <div className="bg-cyan-50/30 border-b border-cyan-100 px-4 py-3 text-[11px] text-cyan-800 leading-relaxed">
            <b>📱 Mobile attendance flow:</b><br/>
            1. Staff opens the app → app fetches active office geofences (<code className="px-1 bg-white rounded">GET /api/mobile/attendance/offices</code>)<br/>
            2. Staff hits <b>Clock In</b> → app captures GPS + face image → posts to <code className="px-1 bg-white rounded">POST /api/mobile/attendance/check-in</code><br/>
            3. Server validates <b>GPS within geofence</b> + <b>face_match_score ≥ 0.85</b>, then saves attendance for today
          </div>

          <div className="p-4">
            <div className="grid grid-cols-12 gap-2 mb-3 items-end">
              <div className="col-span-2">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Code</label>
                <input value={newOffice.code} onChange={e => setNewOffice(s => ({ ...s, code: e.target.value.toUpperCase() }))}
                  placeholder="HQ" className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded font-mono uppercase" />
              </div>
              <div className="col-span-4">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Name</label>
                <input value={newOffice.name} onChange={e => setNewOffice(s => ({ ...s, name: e.target.value }))}
                  placeholder="HQ — Shah Alam" className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Latitude</label>
                <input value={newOffice.lat} onChange={e => setNewOffice(s => ({ ...s, lat: e.target.value }))}
                  placeholder="3.0822" className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded font-mono" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Longitude</label>
                <input value={newOffice.lng} onChange={e => setNewOffice(s => ({ ...s, lng: e.target.value }))}
                  placeholder="101.5320" className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded font-mono" />
              </div>
              <div className="col-span-1">
                <label className="block text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Radius m</label>
                <input value={newOffice.geofence_radius_m} onChange={e => setNewOffice(s => ({ ...s, geofence_radius_m: e.target.value }))}
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded font-mono text-center" />
              </div>
              <div className="col-span-1 flex flex-col gap-1">
                <button type="button" onClick={useMyLocation} title="Use current GPS"
                  className="text-[10px] px-1 py-1 bg-white border border-slate-200 rounded hover:bg-cyan-50">📍 GPS</button>
                <button onClick={addOffice} disabled={savingOffice}
                  className="flex items-center justify-center px-1 py-1 bg-cyan-600 text-white text-xs font-semibold rounded hover:bg-cyan-700 disabled:opacity-50">
                  {savingOffice ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="col-span-12">
                <input value={newOffice.address} onChange={e => setNewOffice(s => ({ ...s, address: e.target.value }))}
                  placeholder="Full address (optional)" className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded" />
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-20">Code</th>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-semibold text-slate-600">Name / Address</th>
                    <th className="text-right px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-32">Lat / Lng</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-20">Radius</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-20">Status</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-semibold text-slate-600 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {offices.length === 0 ? (
                    <tr><td colSpan={6} className="py-8 text-center text-slate-400 italic text-xs">No office locations yet</td></tr>
                  ) : offices.map((o, i) => editOfficeId === o.id ? (
                    <tr key={o.id} className="border-t border-slate-100 bg-cyan-50/30">
                      <td className="px-1 py-1"><input value={editOffice.code as string ?? ''} onChange={e => setEditOffice(s => ({ ...s, code: e.target.value.toUpperCase() }))} className="w-full px-2 py-1 text-xs border border-cyan-300 rounded font-mono uppercase" /></td>
                      <td className="px-1 py-1">
                        <input value={editOffice.name as string ?? ''} onChange={e => setEditOffice(s => ({ ...s, name: e.target.value }))} className="w-full px-2 py-1 text-xs border border-cyan-300 rounded mb-1" />
                        <input value={editOffice.address as string ?? ''} onChange={e => setEditOffice(s => ({ ...s, address: e.target.value }))} className="w-full px-2 py-1 text-[10px] border border-cyan-300 rounded" placeholder="Address" />
                      </td>
                      <td className="px-1 py-1">
                        <input value={editOffice.lat as number ?? ''} onChange={e => setEditOffice(s => ({ ...s, lat: +e.target.value }))} className="w-full px-2 py-1 text-xs border border-cyan-300 rounded text-right font-mono mb-1" placeholder="Lat" />
                        <input value={editOffice.lng as number ?? ''} onChange={e => setEditOffice(s => ({ ...s, lng: +e.target.value }))} className="w-full px-2 py-1 text-xs border border-cyan-300 rounded text-right font-mono" placeholder="Lng" />
                      </td>
                      <td className="px-1 py-1">
                        <input type="number" value={editOffice.geofence_radius_m as number ?? 100} onChange={e => setEditOffice(s => ({ ...s, geofence_radius_m: +e.target.value }))} className="w-full px-2 py-1 text-xs border border-cyan-300 rounded text-center font-mono" />
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <select value={editOffice.is_active ? '1' : '0'} onChange={e => setEditOffice(s => ({ ...s, is_active: e.target.value === '1' }))}
                          className="text-[10px] border border-cyan-300 rounded px-1 py-0.5 bg-white">
                          <option value="1">ACTIVE</option><option value="0">INACTIVE</option>
                        </select>
                      </td>
                      <td className="px-3 py-1 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => saveEditOffice(o.id)} className="p-1 rounded text-emerald-600 hover:bg-emerald-50"><Save className="w-3 h-3" /></button>
                          <button onClick={() => setEditOfficeId(null)} className="p-1 rounded text-slate-400 hover:bg-slate-100"><X className="w-3 h-3" /></button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={o.id} className={`border-t border-slate-100 hover:bg-cyan-50/40 ${i%2===0?'bg-white':'bg-slate-50/40'}`}>
                      <td className="px-3 py-1.5 font-mono font-bold text-cyan-700">{o.code}</td>
                      <td className="px-3 py-1.5">
                        <p className="font-medium text-slate-800">{o.name}</p>
                        {o.address && <p className="text-[10px] text-slate-400">{o.address}</p>}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono text-slate-600">
                        <p>{o.lat.toFixed(5)}</p>
                        <p>{o.lng.toFixed(5)}</p>
                      </td>
                      <td className="px-3 py-1.5 text-center text-slate-700 font-mono">{o.geofence_radius_m}m</td>
                      <td className="px-3 py-1.5 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${o.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{o.is_active ? 'ACTIVE' : 'INACTIVE'}</span>
                      </td>
                      <td className="px-3 py-1 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <a href={`https://maps.google.com/?q=${o.lat},${o.lng}`} target="_blank" rel="noreferrer"
                            className="p-1 rounded text-slate-400 hover:text-cyan-600 hover:bg-cyan-50" title="View on Google Maps">🗺️</a>
                          <button onClick={() => startEditOffice(o)} className="p-1 rounded text-slate-400 hover:text-cyan-600 hover:bg-cyan-50"><Pencil className="w-3 h-3" /></button>
                          <button onClick={() => delOffice(o)} className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
