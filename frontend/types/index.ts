export type User = {
  id: number
  name: string
  email: string
  role: string
  company?: string
}

export type Customer = {
  id: number
  name: string
  email?: string
  phone?: string
  address?: string
  city?: string
  country?: string
  tax_number?: string
  credit_limit?: number
  is_active?: boolean
  balance?: number
}

export type InvoiceItem = {
  id: number
  invoice_id: number
  description: string
  quantity: number
  unit_price: number
  tax_rate?: number
  total: number
}

export type Payment = {
  id: number
  invoice_id: number
  date: string
  amount: number
  method: string
  reference?: string
  notes?: string
}

export type Invoice = {
  id: number
  number: string
  customer_id: number
  customer?: Customer
  date: string
  due_date: string
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  subtotal: number
  tax_amount: number
  total: number
  notes?: string
  items?: InvoiceItem[]
  payments?: Payment[]
}

export type Account = {
  id: number
  code: string
  name: string
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
  parent_id?: number
  description?: string
  is_active?: boolean
  children?: Account[]
  balance?: number
}

export type Product = {
  id: number
  sku: string
  name: string
  description?: string
  category?: string
  cost_price: number
  sale_price: number
  stock: number
  low_stock_alert: number
  costing_method?: 'fifo' | 'lifo' | 'average'
  is_active?: boolean
  stockMovements?: StockMovement[]
}

export type StockMovement = {
  id: number
  product_id: number
  type: 'in' | 'out' | 'adjustment' | 'transfer'
  quantity: number
  unit_cost: number
  reference?: string
  notes?: string
  created_at: string
  product?: Pick<Product, 'id' | 'name' | 'sku'>
  created_by?: { id: number; name: string }
}

export type Employee = {
  id: number
  employee_code: string
  name: string
  email?: string
  phone?: string
  cnic?: string
  address?: string
  department: string
  designation: string
  join_date: string
  basic_salary: number
  status: 'active' | 'inactive'
}

export type ApiMeta = {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export type ApiResponse<T> = {
  success: boolean
  data: T
  message?: string
  meta?: ApiMeta
}
