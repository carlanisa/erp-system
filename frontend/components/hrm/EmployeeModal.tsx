'use client'

import { useEffect, useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import type { Employee } from '@/types/index'

type Props = {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editing?: Employee | null
  departments: string[]
}

const DESIGNATIONS: Record<string, string[]> = {
  IT:         ['Senior Developer', 'Junior Developer', 'DevOps Engineer', 'QA Engineer', 'IT Manager'],
  HR:         ['HR Manager', 'HR Executive', 'Recruiter', 'HR Assistant'],
  Finance:    ['Finance Manager', 'Accountant', 'Senior Accountant', 'Finance Analyst'],
  Sales:      ['Sales Manager', 'Sales Executive', 'Business Development', 'Account Manager'],
  Marketing:  ['Marketing Manager', 'Content Writer', 'SEO Specialist', 'Graphic Designer'],
  Operations: ['Operations Manager', 'Operations Executive', 'Supply Chain', 'Logistics'],
}

const ALL_DEPTS = Object.keys(DESIGNATIONS)

const empty = {
  name: '', email: '', phone: '', cnic: '',
  department: '', designation: '', join_date: new Date().toISOString().slice(0, 10),
  basic_salary: '', address: '',
}

export default function EmployeeModal({ open, onClose, onSaved, editing, departments }: Props) {
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (editing) {
      setForm({
        name:         editing.name,
        email:        editing.email ?? '',
        phone:        editing.phone ?? '',
        cnic:         editing.cnic ?? '',
        department:   editing.department,
        designation:  editing.designation,
        join_date:    editing.join_date,
        basic_salary: String(editing.basic_salary),
        address:      editing.address ?? '',
      })
    } else {
      setForm(empty)
    }
  }, [editing, open])

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  const desigOptions = DESIGNATIONS[form.department] ?? []

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = { ...form, basic_salary: +form.basic_salary }
    try {
      if (editing) {
        await api.put(`/hrm/employees/${editing.id}`, payload)
        toast.success('Employee updated')
      } else {
        await api.post('/hrm/employees', payload)
        toast.success('Employee added')
      }
      onSaved(); onClose()
    } catch (e: any) {
      const errs = e.response?.data?.errors
      toast.error(errs ? Object.values(errs).flat().join(', ') : e.response?.data?.message ?? 'Failed')
    } finally { setSaving(false) }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
          <h3 className="font-bold text-slate-800">{editing ? 'Edit Employee' : 'New Employee'}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Full Name *</label>
            <input required value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="Muhammad Ali Khan"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="ali@company.com"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Phone</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)}
                placeholder="0300-1234567"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* CNIC */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">CNIC</label>
            <input value={form.cnic} onChange={e => set('cnic', e.target.value)}
              placeholder="42101-1234567-1"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            />
          </div>

          {/* Department + Designation */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Department *</label>
              <select required value={form.department}
                onChange={e => { set('department', e.target.value); set('designation', '') }}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">Select...</option>
                {ALL_DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
                {departments.filter(d => !ALL_DEPTS.includes(d)).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Designation *</label>
              {desigOptions.length > 0 ? (
                <select required value={form.designation} onChange={e => set('designation', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">Select...</option>
                  {desigOptions.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              ) : (
                <input required value={form.designation} onChange={e => set('designation', e.target.value)}
                  placeholder="Job title"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              )}
            </div>
          </div>

          {/* Join Date + Salary */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Join Date *</label>
              <input required type="date" value={form.join_date} onChange={e => set('join_date', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Basic Salary (RM) *</label>
              <input required type="number" min="0" value={form.basic_salary}
                onChange={e => set('basic_salary', e.target.value)} placeholder="50000"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Address</label>
            <textarea rows={2} value={form.address} onChange={e => set('address', e.target.value)}
              placeholder="City, Malaysia"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editing ? 'Update' : 'Add Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
