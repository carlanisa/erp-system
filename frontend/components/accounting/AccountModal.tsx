'use client'

import { useEffect, useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import type { Account } from '@/types/index'

type Props = {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editing?: Account | null
  allAccounts: Account[]
}

const TYPES = [
  { value: 'asset',     label: 'Asset',     color: 'text-blue-600' },
  { value: 'liability', label: 'Liability', color: 'text-red-600' },
  { value: 'equity',    label: 'Equity',    color: 'text-purple-600' },
  { value: 'revenue',   label: 'Revenue',   color: 'text-emerald-600' },
  { value: 'expense',   label: 'Expense',   color: 'text-amber-600' },
]

export default function AccountModal({ open, onClose, onSaved, editing, allAccounts }: Props) {
  const [form, setForm] = useState({ code: '', name: '', type: 'asset', parent_id: '', description: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (editing) {
      setForm({
        code:        editing.code,
        name:        editing.name,
        type:        editing.type,
        parent_id:   editing.parent_id ? String(editing.parent_id) : '',
        description: editing.description ?? '',
      })
    } else {
      setForm({ code: '', name: '', type: 'asset', parent_id: '', description: '' })
    }
  }, [editing, open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, parent_id: form.parent_id || null }
      if (editing) {
        await api.put(`/accounting/accounts/${editing.id}`, payload)
        toast.success('Account updated')
      } else {
        await api.post('/accounting/accounts', payload)
        toast.success('Account created')
      }
      onSaved()
      onClose()
    } catch (e: any) {
      const msg = e.response?.data?.errors
        ? Object.values(e.response.data.errors).flat().join(', ')
        : e.response?.data?.message ?? 'Failed to save'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  const parentOptions = allAccounts.filter(a => !editing || a.id !== editing.id)

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">{editing ? 'Edit Account' : 'New Account'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Type selector */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">Account Type *</label>
            <div className="grid grid-cols-5 gap-1.5">
              {TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm({ ...form, type: t.value })}
                  className={`py-2 px-1 text-xs font-medium rounded-lg border-2 transition-all ${
                    form.type === t.value
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Code + Name row */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Code *</label>
              <input
                required
                value={form.code}
                onChange={e => setForm({ ...form, code: e.target.value })}
                placeholder="e.g. 1110"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Account Name *</label>
              <input
                required
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Cash in Hand"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Parent account */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Parent Account (optional)</label>
            <select
              value={form.parent_id}
              onChange={e => setForm({ ...form, parent_id: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">— No parent (top-level) —</option>
              {parentOptions.map(a => (
                <option key={a.id} value={a.id}>
                  {a.code} — {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Description (optional)</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Brief description of this account..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editing ? 'Update Account' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
