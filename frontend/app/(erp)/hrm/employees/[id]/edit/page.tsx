'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import EmployeeForm from '@/components/hrm/EmployeeForm'

export default function EditEmployeePage() {
  const { id } = useParams()
  const [emp, setEmp] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/hrm/employees/${id}`).then(r => setEmp(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
    </div>
  )
  if (!emp) return <div className="text-center py-20 text-slate-400">Employee not found.</div>

  return <EmployeeForm initial={emp} isEdit />
}
