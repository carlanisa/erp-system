'use client'

import { useEffect, useState } from 'react'
import { employeesApi } from '@/lib/erp-api'

type Emp = { id: number; name: string; employee_code?: string }

export default function EmployeePicker({
  value,
  onChange,
  placeholder = 'Select employee…',
  className = '',
}: {
  value: number | null
  onChange: (id: number | null) => void
  placeholder?: string
  className?: string
}) {
  const [employees, setEmployees] = useState<Emp[]>([])

  useEffect(() => {
    employeesApi.list({ per_page: 100 }).then((r) => setEmployees(r.data || []))
  }, [])

  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      className={`border rounded-lg px-3 py-2 text-sm ${className}`}
    >
      <option value="">{placeholder}</option>
      {employees.map((e) => (
        <option key={e.id} value={e.id}>
          {e.employee_code ? `${e.employee_code} — ` : ''}{e.name}
        </option>
      ))}
    </select>
  )
}
