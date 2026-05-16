'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { notificationsApi } from '@/lib/erp-api'
import EmployeePicker from '@/components/projects/EmployeePicker'
import { Bell, Check } from 'lucide-react'

export default function NotificationsPage() {
  const [employeeId, setEmployeeId] = useState<number | null>(null)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const load = () => {
    if (!employeeId) return
    setLoading(true)
    notificationsApi.list(employeeId).then((r) => setItems(r.data || [])).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [employeeId])

  const markRead = async (id: number) => { await notificationsApi.markRead(id); load() }
  const markAll = async () => { if (!employeeId) return; await notificationsApi.markAllRead(employeeId); load() }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6 text-indigo-600" />
          <h1 className="text-xl font-bold">Notifications</h1>
        </div>
        <div className="flex gap-2">
          <EmployeePicker value={employeeId} onChange={setEmployeeId} placeholder="Pick employee…" />
          {employeeId && <button onClick={markAll} className="text-xs px-3 py-2 bg-slate-100 rounded">Mark all read</button>}
        </div>
      </div>

      {!employeeId && <p className="text-slate-400 text-sm">Please select an employee.</p>}

      {employeeId && (
        <div className="card divide-y">
          {loading && <p className="text-slate-400 text-sm p-4">Loading…</p>}
          {!loading && items.length === 0 && <p className="text-slate-400 text-sm p-4">No notifications.</p>}
          {items.map((n) => (
            <div key={n.id} className={`p-3 flex items-start gap-3 ${!n.read_at ? 'bg-indigo-50/50' : ''}`}>
              <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!n.read_at ? 'bg-indigo-600' : 'bg-slate-300'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{n.body}</p>
                <p className="text-[10px] text-slate-400 mt-1">{new Date(n.created_at).toLocaleString()} · {n.type}</p>
                {n.link && <Link href={n.link} className="text-xs text-indigo-600 hover:underline">Open →</Link>}
              </div>
              {!n.read_at && (
                <button onClick={() => markRead(n.id)} className="text-xs text-slate-400 hover:text-indigo-600"><Check className="w-4 h-4" /></button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
