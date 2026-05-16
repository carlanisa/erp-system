'use client'

import { useEffect, useState } from 'react'
import {
  Users, Plus, Search, ChevronLeft, ChevronRight,
  Pencil, Eye, Phone, Mail, MapPin, X, Loader2,
} from 'lucide-react'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

type Customer = {
  id: number
  name: string
  email?: string
  phone?: string
  address?: string
  city?: string
  country?: string
  created_at: string
}

const empty = { name: '', email: '', phone: '', address: '', city: '', country: 'Malaysia' }

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch]       = useState('')
  const [page, setPage]           = useState(1)
  const [meta, setMeta]           = useState({ last_page: 1, total: 0 })
  const [loading, setLoading]     = useState(true)
  const [modalOpen, setModal]     = useState(false)
  const [editing, setEditing]     = useState<Customer | null>(null)
  const [form, setForm]           = useState(empty)
  const [saving, setSaving]       = useState(false)

  useEffect(() => { load() }, [search, page])

  async function load() {
    setLoading(true)
    try {
      const r = await api.get('/crm/customers', { params: { search, page, per_page: 15 } })
      setCustomers(r.data.data)
      setMeta(r.data.meta)
    } catch {}
    finally { setLoading(false) }
  }

  function openAdd() {
    setEditing(null)
    setForm(empty)
    setModal(true)
  }

  function openEdit(c: Customer) {
    setEditing(c)
    setForm({
      name:    c.name,
      email:   c.email    ?? '',
      phone:   c.phone    ?? '',
      address: c.address  ?? '',
      city:    c.city     ?? '',
      country: c.country  ?? 'Malaysia',
    })
    setModal(true)
  }

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        await api.put(`/crm/customers/${editing.id}`, form)
        toast.success('Customer updated')
      } else {
        await api.post('/crm/customers', form)
        toast.success('Customer added')
      }
      setModal(false)
      load()
    } catch (e: any) {
      const errs = e.response?.data?.errors
      toast.error(errs ? Object.values(errs).flat().join(', ') : e.response?.data?.message ?? 'Failed')
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Customers</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage your customer database</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Customer
        </button>
      </div>

      {/* Table card */}
      <div className="card">
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search by name, email, phone..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wide">Customer</th>
                <th className="text-left py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wide">Contact</th>
                <th className="text-left py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wide">Location</th>
                <th className="text-left py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wide">Added</th>
                <th className="py-3 px-2" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="py-3 px-2">
                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    No customers found
                  </td>
                </tr>
              ) : customers.map(c => (
                <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 shrink-0">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <p className="font-medium text-slate-800">{c.name}</p>
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <div className="space-y-0.5">
                      {c.email && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Mail className="w-3 h-3" />{c.email}
                        </div>
                      )}
                      {c.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Phone className="w-3 h-3" />{c.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    {(c.city || c.country) && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <MapPin className="w-3 h-3" />
                        {[c.city, c.country].filter(Boolean).join(', ')}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-2 text-xs text-slate-400">{formatDate(c.created_at)}</td>
                  <td className="py-3 px-2">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(c)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta.last_page > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Showing {customers.length} of {meta.total} customers
            </p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 text-xs text-slate-600">{page} / {meta.last_page}</span>
              <button onClick={() => setPage(p => Math.min(meta.last_page, p + 1))} disabled={page === meta.last_page}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-40">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">{editing ? 'Edit Customer' : 'New Customer'}</h3>
              <button onClick={() => setModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Full Name *</label>
                <input required value={form.name} onChange={e => set('name', e.target.value)}
                  placeholder="Ahmad Traders"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Email</label>
                  <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                    placeholder="info@ahmad.com"
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">City</label>
                  <input value={form.city} onChange={e => set('city', e.target.value)}
                    placeholder="Kuala Lumpur"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Country</label>
                  <input value={form.country} onChange={e => set('country', e.target.value)}
                    placeholder="Malaysia"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Address</label>
                <textarea rows={2} value={form.address} onChange={e => set('address', e.target.value)}
                  placeholder="Street address..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setModal(false)} className="btn-outline">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editing ? 'Update' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
