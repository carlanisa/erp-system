import { api } from './api'

export interface CompanyInfo {
  company_name: string
  legal_name: string | null
  tax_id: string | null
  reg_number: string | null
  address: string | null
  city: string | null
  state: string | null
  postcode: string | null
  country: string | null
  phone: string | null
  email: string | null
  website: string | null
  logo_path: string | null
  logo_url: string | null
}

export interface AccountingSettings {
  currency: string
  currency_symbol: string
  fiscal_year_start: string
  tax_rate: number | string
  default_branch: string
  invoice_prefix: string
  pv_prefix: string
  or_prefix: string
  je_prefix: string
  payment_terms: number | string
  decimal_places: number | string
}

export interface SystemSettings {
  language: string
  timezone: string
  date_format: string
  time_format: '12h' | '24h'
  theme: 'light' | 'dark'
  items_per_page: number | string
}

export interface NotificationSettings {
  invoice_due: boolean
  payment_received: boolean
  low_stock: boolean
  payroll_due: boolean
  leave_request: boolean
  email_notify: boolean
  system_notify: boolean
}

export interface SecuritySettings {
  session_timeout_minutes: number
  password_min_length: number
  require_2fa_for_admins: boolean
}

export interface SettingsPayload {
  company: CompanyInfo
  accounting: AccountingSettings
  system: SystemSettings
  notifications: NotificationSettings
  security: SecuritySettings
}

export const settingsApi = {
  get: () => api.get('/settings').then(r => r.data.data as SettingsPayload),
  updateCompany:       (d: Partial<CompanyInfo>)        => api.put('/settings/company', d).then(r => r.data.data as SettingsPayload),
  updateAccounting:    (d: AccountingSettings)          => api.put('/settings/accounting', d).then(r => r.data.data as SettingsPayload),
  updateSystem:        (d: SystemSettings)              => api.put('/settings/system', d).then(r => r.data.data as SettingsPayload),
  updateNotifications: (d: NotificationSettings)        => api.put('/settings/notifications', d).then(r => r.data.data as SettingsPayload),
  updateSecurity:      (d: SecuritySettings)            => api.put('/settings/security', d).then(r => r.data.data as SettingsPayload),
  uploadLogo: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post('/settings/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then(r => r.data.data as { logo_path: string; logo_url: string })
  },
}

export const twoFactorApi = {
  status:  () => api.get('/2fa/status').then(r => r.data.data as { two_factor_enabled: boolean; two_factor_pending: boolean }),
  enable:  () => api.post('/2fa/enable').then(r => r.data.data as { secret: string; qr_svg: string; otpauth: string }),
  confirm: (code: string) => api.post('/2fa/confirm', { code }).then(r => r.data),
  disable: (password: string, code: string) => api.post('/2fa/disable', { password, code }).then(r => r.data),
  verifyChallenge: (challenge_token: string, code: string) =>
    api.post('/auth/2fa/verify', { challenge_token, code }).then(r => r.data.data as { user: any; token: string }),
}

export interface MatrixUser {
  id: number
  name: string
  email: string
  role: string
  is_active: boolean
  is_admin: boolean
  permissions: string[]
}

export interface MatrixPayload {
  users: MatrixUser[]
  modules: string[]
  actions: string[]
}

export const permissionsApi = {
  matrix: () => api.get('/permissions/matrix').then(r => r.data.data as MatrixPayload),
  updateUser: (userId: number, permissions: string[]) =>
    api.put(`/permissions/users/${userId}`, { permissions }).then(r => r.data.data),
  createUser: (payload: { name: string; email: string; password: string; role: 'admin' | 'staff' }) =>
    api.post('/permissions/users', payload).then(r => r.data.data),
}
