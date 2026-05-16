'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, UserPlus, Search, ShieldCheck, X, ChevronDown, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { permissionsApi, MatrixPayload, MatrixUser } from '@/lib/settings-api'

const MODULE_LABELS: Record<string, string> = {
  dashboard:       'Dashboard',
  general_ledger:  'General Ledger',
  suppliers:       'Suppliers',
  sales:           'Sales',
  inventory:       'Inventory',
  hrm:             'HRM',
  crm:             'CRM',
  projects:        'Projects',
  reports:         'Reports',
  settings:        'Settings',
}

const ACTION_LABELS: Record<string, string> = {
  view:   'View',
  create: 'Create',
  edit:   'Edit',
  delete: 'Delete',
}

export function PermissionsTab() {
  const [data, setData] = useState<MatrixPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingUser, setSavingUser] = useState<number | null>(null)
  const [query, setQuery] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try { setData(await permissionsApi.matrix()) }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed to load users') }
    finally { setLoading(false) }
  }

  const filtered = useMemo(() => {
    if (!data) return []
    const q = query.trim().toLowerCase()
    if (!q) return data.users
    return data.users.filter(u =>
      u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    )
  }, [data, query])

  function hasPerm(u: MatrixUser, perm: string) {
    if (u.is_admin) return true
    return u.permissions.includes(perm)
  }

  async function persist(user: MatrixUser, next: string[]) {
    setSavingUser(user.id)
    setData(prev => prev && ({
      ...prev,
      users: prev.users.map(u => u.id === user.id ? { ...u, permissions: next } : u),
    }))
    try {
      const r = await permissionsApi.updateUser(user.id, next)
      setData(prev => prev && ({
        ...prev,
        users: prev.users.map(u => u.id === user.id ? { ...u, permissions: r.permissions } : u),
      }))
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to save')
      setData(prev => prev && ({
        ...prev,
        users: prev.users.map(u => u.id === user.id ? { ...u, permissions: user.permissions } : u),
      }))
    } finally { setSavingUser(null) }
  }

  function togglePerm(user: MatrixUser, perm: string) {
    if (user.is_admin) {
      toast('Admins have all permissions by default', { icon: 'ℹ️' })
      return
    }
    const has = user.permissions.includes(perm)
    const next = has ? user.permissions.filter(p => p !== perm) : [...user.permissions, perm]
    persist(user, next)
  }

  function toggleAllForModule(user: MatrixUser, module: string, enable: boolean) {
    if (user.is_admin) return
    const actions = data?.actions ?? []
    const modulePerms = actions.map(a => `${module}.${a}`)
    let next = [...user.permissions]
    if (enable) modulePerms.forEach(p => { if (!next.includes(p)) next.push(p) })
    else next = next.filter(p => !modulePerms.includes(p))
    persist(user, next)
  }

  function toggleAllForUser(user: MatrixUser, enable: boolean) {
    if (user.is_admin) return
    const all: string[] = []
    data!.modules.forEach(m => data!.actions.forEach(a => all.push(`${m}.${a}`)))
    persist(user, enable ? all : [])
  }

  function toggle(userId: number) {
    setExpanded(p => ({ ...p, [userId]: !p[userId] }))
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
  if (!data) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            Roles & Permissions
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Click a username to expand and grant or revoke specific module permissions. Admins always have full access.
          </p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg font-medium">
          <UserPlus className="w-4 h-4" /> Add Staff User
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="space-y-3">
        {filtered.map(user => {
          const isOpen = !!expanded[user.id]
          const grantedCount = user.is_admin
            ? data.modules.length * data.actions.length
            : user.permissions.length
          const totalCount = data.modules.length * data.actions.length
          return (
            <div key={user.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              {/* Header row */}
              <button
                onClick={() => toggle(user.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left"
              >
                {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                  {user.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-800 text-sm truncate">{user.name}</p>
                    {user.is_admin
                      ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Admin — Full Access</span>
                      : <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">Staff</span>
                    }
                    {savingUser === user.id && <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />}
                  </div>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-slate-700">{grantedCount} / {totalCount}</p>
                  <p className="text-[10px] text-slate-400">permissions</p>
                </div>
              </button>

              {/* Expanded module list */}
              {isOpen && (
                <div className="border-t border-slate-100 bg-slate-50/40 p-4 space-y-3">
                  {user.is_admin && (
                    <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2">
                      This user is an <b>Admin</b> — all permissions are granted automatically and cannot be revoked here.
                    </div>
                  )}

                  {!user.is_admin && (
                    <div className="flex items-center justify-end gap-2 pb-1">
                      <button
                        onClick={() => toggleAllForUser(user, true)}
                        className="text-[11px] px-2.5 py-1 border border-indigo-200 bg-indigo-50 text-indigo-700 rounded-md font-medium hover:bg-indigo-100"
                      >
                        Grant All Permissions
                      </button>
                      <button
                        onClick={() => toggleAllForUser(user, false)}
                        className="text-[11px] px-2.5 py-1 border border-slate-200 bg-white text-slate-600 rounded-md font-medium hover:bg-slate-50"
                      >
                        Revoke All
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {data.modules.map(m => {
                      const allEnabled = data.actions.every(a => hasPerm(user, `${m}.${a}`))
                      const someEnabled = data.actions.some(a => hasPerm(user, `${m}.${a}`))
                      return (
                        <div key={m} className="bg-white border border-slate-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-semibold text-slate-800">{MODULE_LABELS[m] ?? m}</p>
                            {!user.is_admin && (
                              <button
                                onClick={() => toggleAllForModule(user, m, !allEnabled)}
                                className="text-[10px] text-indigo-600 hover:underline font-medium"
                              >
                                {allEnabled ? 'Revoke all' : someEnabled ? 'Grant all' : 'Grant all'}
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            {data.actions.map(a => {
                              const perm = `${m}.${a}`
                              const checked = hasPerm(user, perm)
                              return (
                                <label
                                  key={a}
                                  className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs cursor-pointer transition-colors ${
                                    user.is_admin
                                      ? 'bg-amber-50/60 text-slate-600 cursor-not-allowed'
                                      : checked
                                        ? 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
                                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={user.is_admin}
                                    onChange={() => togglePerm(user, perm)}
                                    className="w-3.5 h-3.5 accent-indigo-600 disabled:cursor-not-allowed"
                                  />
                                  <span className="font-medium">{ACTION_LABELS[a] ?? a}</span>
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm bg-white rounded-xl border border-slate-200">
            No users found
          </div>
        )}
      </div>

      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load() }} />}
    </div>
  )
}

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'staff' as 'staff' | 'admin' })
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await permissionsApi.createUser(form)
      toast.success('User created')
      onCreated()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? Object.values(e?.response?.data?.errors ?? {})[0]?.[0] ?? 'Failed to create user')
    } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={submit} className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Add Staff User</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div>
          <label className="form-label">Full name</label>
          <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="form-input" />
        </div>
        <div>
          <label className="form-label">Email</label>
          <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="form-input" />
        </div>
        <div>
          <label className="form-label">Temporary password</label>
          <input required type="text" minLength={8} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="form-input" />
          <p className="text-[11px] text-slate-400 mt-1">Min. 8 characters. Staff can change after login.</p>
        </div>
        <div>
          <label className="form-label">Role</label>
          <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as any })} className="form-input">
            <option value="staff">Staff (custom permissions)</option>
            <option value="admin">Admin (full access)</option>
          </select>
        </div>
        <button disabled={busy} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          Create user
        </button>
      </form>
    </div>
  )
}
