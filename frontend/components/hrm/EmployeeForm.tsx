'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Save, Loader2, Trash2, User, Camera, Upload,
  FileText, Download, X, Building2, Briefcase, Clock, MapPin,
  CreditCard, Banknote, Mail, Phone, Calendar, Receipt,
} from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

type Dept   = { id: number; code: string; name: string }
type Desig  = { id: number; title: string; department_id: number | null; department?: { id: number; code: string; name: string } | null }
type Shift  = { id: number; code: string; name: string; start_time: string; end_time: string }

type EmployeeRecord = {
  id?: number
  employee_code?: string
  name: string
  email?: string | null
  phone?: string | null
  cnic?: string | null

  department_id?: number | null
  designation_id?: number | null
  shift_id?: number | null
  department?: string | null
  designation?: string | null

  join_date: string
  basic_salary: number | string

  address?: string | null
  location?: string | null
  gender?: 'male'|'female'|'other'|null
  dob?: string | null

  epf_no?: string | null
  socso_no?: string | null
  tax_no?: string | null

  ic_type?: 'ic'|'passport'|null
  ic_passport_no?: string | null

  bank_name?: string | null
  bank_account_name?: string | null
  bank_account_no?: string | null

  status?: 'active' | 'inactive'
  image_url?: string | null
  image_path?: string | null
}

type Attachment = {
  id: number
  original_filename: string
  url: string
  size_bytes: number
  mime_type: string
  label?: string | null
  created_at?: string
}

type Props = {
  /** Existing employee record for edit mode */
  initial?: EmployeeRecord | null
  /** True when editing */
  isEdit?: boolean
}

const today = () => new Date().toISOString().slice(0, 10)

const blankForm: EmployeeRecord = {
  name: '', email: '', phone: '', cnic: '',
  department_id: null, designation_id: null, shift_id: null,
  department: '', designation: '',
  join_date: today(), basic_salary: '',
  address: '', location: '',
  gender: null, dob: '',
  epf_no: '', socso_no: '', tax_no: '',
  ic_type: 'ic', ic_passport_no: '',
  bank_name: '', bank_account_name: '', bank_account_no: '',
  status: 'active',
}

export default function EmployeeForm({ initial, isEdit = false }: Props) {
  const router = useRouter()

  const [form, setForm]         = useState<EmployeeRecord>(blankForm)
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Masters
  const [depts, setDepts]   = useState<Dept[]>([])
  const [desigs, setDesigs] = useState<Desig[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])

  // Image
  const fileImgRef          = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [pendingImg, setPendingImg] = useState<File | null>(null)
  const [uploadingImg, setUploadingImg] = useState(false)

  // ID document attachments
  const fileDocRef          = useRef<HTMLInputElement>(null)
  const [docs, setDocs]     = useState<Attachment[]>([])
  const [uploadingDoc, setUploadingDoc] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/hrm/master-departments').catch(() => null),
      api.get('/hrm/designations').catch(() => null),
      api.get('/hrm/shifts').catch(() => null),
    ]).then(([d, dg, s]) => {
      setDepts(d?.data?.data ?? [])
      setDesigs(dg?.data?.data ?? [])
      setShifts(s?.data?.data ?? [])
    })
  }, [])

  useEffect(() => {
    if (initial) {
      setForm({ ...blankForm, ...initial, basic_salary: initial.basic_salary ?? '' })
      setPreviewUrl(initial.image_url ?? null)
      if (initial.id) loadDocs(initial.id)
    }
  }, [initial])

  async function loadDocs(empId: number) {
    try {
      const r = await api.get('/attachments', { params: { type: 'employee', id: empId } })
      setDocs(r.data.data ?? [])
    } catch {}
  }

  function set<K extends keyof EmployeeRecord>(k: K, v: EmployeeRecord[K]) {
    setForm(p => ({ ...p, [k]: v }))
  }

  // Filter designations by selected department
  const filteredDesigs = form.department_id
    ? desigs.filter(d => d.department_id === form.department_id || d.department_id === null)
    : desigs

  // ─── Image handling ───
  function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.type.startsWith('image/')) { toast.error('Please choose an image file'); return }
    if (f.size > 4 * 1024 * 1024)     { toast.error('Image must be 4 MB or smaller'); return }
    setPendingImg(f)
    setPreviewUrl(URL.createObjectURL(f))
  }
  function clearImage() {
    setPendingImg(null)
    setPreviewUrl(initial?.image_url ?? null)
    if (fileImgRef.current) fileImgRef.current.value = ''
  }

  async function uploadPendingImage(empId: number) {
    if (!pendingImg) return
    setUploadingImg(true)
    try {
      const fd = new FormData()
      fd.append('image', pendingImg)
      await api.post(`/hrm/employees/${empId}/image`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setPendingImg(null)
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Photo upload failed')
    } finally { setUploadingImg(false) }
  }

  // ─── Document (IC / Passport PDF) handling ───
  async function onPickDoc(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (!form.id) { toast.error('Please save the employee first, then upload PDFs'); return }
    if (f.size > 20 * 1024 * 1024) { toast.error('File must be 20 MB or smaller'); return }
    setUploadingDoc(true)
    try {
      const fd = new FormData()
      fd.append('type', 'employee')
      fd.append('id', String(form.id))
      fd.append('file', f)
      fd.append('label', form.ic_type === 'passport' ? 'Passport' : 'IC / NRIC')
      await api.post('/attachments', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      await loadDocs(form.id)
      toast.success('Document uploaded')
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Upload failed')
    } finally {
      setUploadingDoc(false)
      if (fileDocRef.current) fileDocRef.current.value = ''
    }
  }
  async function deleteDoc(att: Attachment) {
    if (!confirm(`Delete "${att.original_filename}"?`)) return
    try {
      await api.delete(`/attachments/${att.id}`)
      if (form.id) await loadDocs(form.id)
      toast.success('Deleted')
    } catch { toast.error('Failed') }
  }

  // ─── Save ───
  async function save() {
    if (!form.name?.trim()) { toast.error('Name is required'); return }
    if (!form.join_date)    { toast.error('Join date is required'); return }
    if (form.basic_salary === '' || form.basic_salary === null) {
      toast.error('Basic salary is required'); return
    }

    // Sync free-text department/designation from selected master entries
    const selectedDept  = depts.find(d => d.id === form.department_id)
    const selectedDesig = desigs.find(d => d.id === form.designation_id)

    const payload: any = {
      ...form,
      basic_salary: +form.basic_salary,
      department:   selectedDept?.name  || form.department  || null,
      designation:  selectedDesig?.title || form.designation || null,
    }
    // Strip read-only / display fields
    delete payload.image_url
    delete payload.image_path
    delete payload.employee_code

    setSaving(true)
    try {
      let savedId = form.id
      if (isEdit && form.id) {
        await api.put(`/hrm/employees/${form.id}`, payload)
      } else {
        const r = await api.post('/hrm/employees', payload)
        savedId = r.data.data.id
      }

      if (pendingImg && savedId) await uploadPendingImage(savedId)

      toast.success(isEdit ? 'Employee updated' : 'Employee created')
      router.push(`/hrm/employees/${savedId}`)
    } catch (e: any) {
      const errs = e?.response?.data?.errors
      toast.error(errs ? Object.values(errs).flat().join(', ') : e?.response?.data?.message ?? 'Save failed')
    } finally { setSaving(false) }
  }

  async function remove() {
    if (!form.id) return
    if (!confirm(`Delete employee ${form.name}? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await api.delete(`/hrm/employees/${form.id}`)
      toast.success('Deleted')
      router.push('/hrm/employees')
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed')
    } finally { setDeleting(false) }
  }

  return (
    <div className="space-y-5">
      {/* Sticky header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center">
            <User className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800">
              {isEdit ? `Edit Employee — ${form.name || form.employee_code}` : 'New Employee'}
            </h1>
            <p className="text-xs text-slate-400">
              HRM → Employees → {isEdit ? 'Edit profile' : 'Add a new team member'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {isEdit && (
            <button onClick={remove} disabled={deleting || saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-700 text-xs font-medium rounded-lg disabled:opacity-50">
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Trash2 className="w-3.5 h-3.5 text-red-500" />}
              Delete
            </button>
          )}
          <button onClick={save} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Employee
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ─── Left column: photo + IDs + Bank ─── */}
        <div className="space-y-5">
          {/* Photo card */}
          <div className="card">
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
              <Camera className="w-4 h-4 text-indigo-600" />
              <h3 className="font-semibold text-slate-700 text-sm">Employee Photo</h3>
            </div>
            <div className="flex flex-col items-center">
              <div className="relative w-32 h-32 rounded-full overflow-hidden bg-indigo-50 ring-4 ring-indigo-100 flex items-center justify-center">
                {previewUrl ? (
                  <img src={previewUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-indigo-300" />
                )}
                {uploadingImg && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}
              </div>
              <input ref={fileImgRef} type="file" accept="image/*" hidden onChange={onPickImage} />
              <div className="flex items-center gap-2 mt-3">
                <button type="button" onClick={() => fileImgRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100">
                  <Upload className="w-3.5 h-3.5" /> Choose Photo
                </button>
                {pendingImg && (
                  <button type="button" onClick={clearImage}
                    className="flex items-center gap-1 px-2 py-1.5 text-xs text-slate-500 hover:text-red-600">
                    <X className="w-3.5 h-3.5" /> Reset
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-2 text-center">
                {pendingImg ? 'Photo will upload after Save' : 'JPG, PNG or WebP. Max 4 MB.'}
              </p>
            </div>
          </div>

          {/* ID Document card */}
          <div className="card">
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
              <CreditCard className="w-4 h-4 text-rose-600" />
              <h3 className="font-semibold text-slate-700 text-sm">IC / Passport</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Type</label>
                <select value={form.ic_type ?? 'ic'} onChange={e => set('ic_type', e.target.value as any)}
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded bg-white">
                  <option value="ic">IC / NRIC</option>
                  <option value="passport">Passport</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Number</label>
                <input value={form.ic_passport_no ?? ''} onChange={e => set('ic_passport_no', e.target.value)}
                  placeholder={form.ic_type === 'passport' ? 'A12345678' : '901231-14-1234'}
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded font-mono" />
              </div>
            </div>

            {/* PDF list */}
            {isEdit && (
              <div className="space-y-1.5 mt-3">
                <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1.5">Uploaded Documents</p>
                {docs.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic py-2">No documents uploaded</p>
                ) : docs.map(d => (
                  <div key={d.id} className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 rounded text-xs">
                    <FileText className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span className="flex-1 truncate text-slate-700" title={d.original_filename}>{d.original_filename}</span>
                    <a href={d.url} target="_blank" rel="noreferrer" title="Download"
                      className="p-1 text-slate-400 hover:text-indigo-600"><Download className="w-3.5 h-3.5" /></a>
                    <button onClick={() => deleteDoc(d)} title="Delete"
                      className="p-1 text-slate-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
                <input ref={fileDocRef} type="file" accept=".pdf,image/*" hidden onChange={onPickDoc} />
                <button type="button" onClick={() => fileDocRef.current?.click()} disabled={uploadingDoc}
                  className="mt-2 w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 border border-dashed border-rose-200 rounded hover:bg-rose-100 disabled:opacity-50">
                  {uploadingDoc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  Upload PDF / Image
                </button>
              </div>
            )}
            {!isEdit && (
              <p className="text-[10px] text-slate-400 italic mt-3">
                Save the employee first to upload IC/Passport scans.
              </p>
            )}
          </div>

          {/* Bank card */}
          <div className="card">
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
              <Banknote className="w-4 h-4 text-emerald-600" />
              <h3 className="font-semibold text-slate-700 text-sm">Bank Details</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Bank Name</label>
                <input value={form.bank_name ?? ''} onChange={e => set('bank_name', e.target.value)}
                  placeholder="Maybank / CIMB / Public Bank…"
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded" />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Account Holder Name</label>
                <input value={form.bank_account_name ?? ''} onChange={e => set('bank_account_name', e.target.value)}
                  placeholder="As per bank record"
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded" />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Account Number</label>
                <input value={form.bank_account_no ?? ''} onChange={e => set('bank_account_no', e.target.value)}
                  placeholder="1234 5678 9012"
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded font-mono" />
              </div>
            </div>
          </div>
        </div>

        {/* ─── Right column: Personal · Employment · Statutory · Address ─── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Personal */}
          <div className="card">
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
              <User className="w-4 h-4 text-indigo-600" />
              <h3 className="font-semibold text-slate-700 text-sm">Personal Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Full Name *</label>
                <input required value={form.name} onChange={e => set('name', e.target.value)}
                  placeholder="Muhammad Ali Khan"
                  className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded font-medium" />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Email</label>
                <div className="relative">
                  <Mail className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                  <input type="email" value={form.email ?? ''} onChange={e => set('email', e.target.value)}
                    placeholder="ali@company.com"
                    className="w-full pl-7 pr-2 py-1.5 text-xs border border-slate-200 rounded" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                  <input value={form.phone ?? ''} onChange={e => set('phone', e.target.value)}
                    placeholder="012-345-6789"
                    className="w-full pl-7 pr-2 py-1.5 text-xs border border-slate-200 rounded" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Gender</label>
                <select value={form.gender ?? ''} onChange={e => set('gender', (e.target.value || null) as any)}
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded bg-white">
                  <option value="">—</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Date of Birth</label>
                <input type="date" value={form.dob ?? ''} onChange={e => set('dob', e.target.value || null)}
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded" />
              </div>
            </div>
          </div>

          {/* Employment */}
          <div className="card">
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
              <Briefcase className="w-4 h-4 text-blue-600" />
              <h3 className="font-semibold text-slate-700 text-sm">Employment</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Department *</label>
                <div className="relative">
                  <Building2 className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                  <select value={form.department_id ?? ''} onChange={e => { set('department_id', e.target.value ? +e.target.value : null); set('designation_id', null) }}
                    className="w-full pl-7 pr-2 py-1.5 text-xs border border-slate-200 rounded bg-white">
                    <option value="">— Select —</option>
                    {depts.map(d => <option key={d.id} value={d.id}>{d.code} · {d.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Designation</label>
                <select value={form.designation_id ?? ''} onChange={e => set('designation_id', e.target.value ? +e.target.value : null)}
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded bg-white">
                  <option value="">— Select —</option>
                  {filteredDesigs.map(d => <option key={d.id} value={d.id}>{d.title}{d.department ? ` (${d.department.code})` : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Shift</label>
                <div className="relative">
                  <Clock className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                  <select value={form.shift_id ?? ''} onChange={e => set('shift_id', e.target.value ? +e.target.value : null)}
                    className="w-full pl-7 pr-2 py-1.5 text-xs border border-slate-200 rounded bg-white">
                    <option value="">— Select —</option>
                    {shifts.map(s => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                  <input value={form.location ?? ''} onChange={e => set('location', e.target.value)}
                    placeholder="Shah Alam HQ / KL Branch / Remote"
                    className="w-full pl-7 pr-2 py-1.5 text-xs border border-slate-200 rounded" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Join Date *</label>
                <div className="relative">
                  <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                  <input required type="date" value={form.join_date} onChange={e => set('join_date', e.target.value)}
                    className="w-full pl-7 pr-2 py-1.5 text-xs border border-slate-200 rounded" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Basic Salary (RM) *</label>
                <input required type="number" min="0" step="0.01"
                  value={form.basic_salary} onChange={e => set('basic_salary', e.target.value)}
                  placeholder="5000.00"
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded font-mono" />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Status</label>
                <select value={form.status ?? 'active'} onChange={e => set('status', e.target.value as any)}
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded bg-white">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              {isEdit && form.employee_code && (
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Employee Code</label>
                  <input readOnly value={form.employee_code}
                    className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded bg-slate-50 font-mono text-slate-600" />
                </div>
              )}
            </div>
          </div>

          {/* Statutory */}
          <div className="card">
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
              <Receipt className="w-4 h-4 text-amber-600" />
              <h3 className="font-semibold text-slate-700 text-sm">Statutory Numbers</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wide">EPF / KWSP No</label>
                <input value={form.epf_no ?? ''} onChange={e => set('epf_no', e.target.value)}
                  placeholder="EPF number"
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded font-mono" />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wide">SOCSO No</label>
                <input value={form.socso_no ?? ''} onChange={e => set('socso_no', e.target.value)}
                  placeholder="PERKESO number"
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded font-mono" />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Tax / LHDN No</label>
                <input value={form.tax_no ?? ''} onChange={e => set('tax_no', e.target.value)}
                  placeholder="Income tax no"
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded font-mono" />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="card">
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
              <MapPin className="w-4 h-4 text-slate-600" />
              <h3 className="font-semibold text-slate-700 text-sm">Address</h3>
            </div>
            <textarea rows={3} value={form.address ?? ''} onChange={e => set('address', e.target.value)}
              placeholder="Street, area, city, postcode, state…"
              className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded resize-none" />
          </div>
        </div>
      </div>
    </div>
  )
}
