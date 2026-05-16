import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'MYR'): string {
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-MY', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export function isOverdue(dueDate: string, status: string): boolean {
  return status === 'sent' && new Date(dueDate) < new Date()
}
