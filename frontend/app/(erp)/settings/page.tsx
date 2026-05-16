'use client'

import { useEffect, useState } from 'react'
import {
  Settings, Building2, DollarSign, Globe, Bell, Shield, ShieldCheck,
  Save, ChevronRight, Loader2, Check, Users,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  settingsApi, twoFactorApi,
  SettingsPayload, CompanyInfo, AccountingSettings, SystemSettings, NotificationSettings, SecuritySettings,
} from '@/lib/settings-api'
import { LogoUpload } from './_components/LogoUpload'
import { TwoFactorModal } from './_components/TwoFactorModal'
import { PermissionsTab } from './_components/PermissionsTab'

type Tab = 'company' | 'accounting' | 'system' | 'notifications' | 'security' | 'permissions'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'company',       label: 'Company',       icon: Building2 },
  { id: 'accounting',    label: 'Accounting',    icon: DollarSign },
  { id: 'system',        label: 'System',        icon: Globe },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security',      label: 'Security',      icon: Shield },
  { id: 'permissions',   label: 'Permissions',   icon: Users },
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('company')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [company, setCompany] = useState<CompanyInfo | null>(null)
  const [accounting, setAccounting] = useState<AccountingSettings | null>(null)
  const [system, setSystem] = useState<SystemSettings | null>(null)
  const [notifs, setNotifs] = useState<NotificationSettings | null>(null)
  const [security, setSecurity] = useState<SecuritySettings | null>(null)

  const [twoFAEnabled, setTwoFAEnabled] = useState(false)
  const [show2FAModal, setShow2FAModal] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [s, t] = await Promise.all([settingsApi.get(), twoFactorApi.status()])
      apply(s)
      setTwoFAEnabled(t.two_factor_enabled)
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to load settings')
    } finally { setLoading(false) }
  }

  function apply(s: SettingsPayload) {
    setCompany(s.company)
    setAccounting(s.accounting)
    setSystem(s.system)
    setNotifs(s.notifications)
    setSecurity(s.security)
  }

  async function handleSave() {
    if (!company || !accounting || !system || !notifs || !security) return
    setSaving(true)
    try {
      if (activeTab === 'company')          apply(await settingsApi.updateCompany(company))
      else if (activeTab === 'accounting')  apply(await settingsApi.updateAccounting(accounting))
      else if (activeTab === 'system')      apply(await settingsApi.updateSystem(system))
      else if (activeTab === 'notifications') apply(await settingsApi.updateNotifications(notifs))
      else if (activeTab === 'security')    apply(await settingsApi.updateSecurity(security))
      setSaved(true)
      toast.success('Settings saved')
      setTimeout(() => setSaved(false), 2500)
    } catch (e: any) {
      const errs = e?.response?.data?.errors
      const firstErr = errs ? (Object.values(errs)[0] as any[])[0] : null
      toast.error(firstErr ?? e?.response?.data?.message ?? 'Save failed')
    } finally { setSaving(false) }
  }

  if (loading || !company || !accounting || !system || !notifs || !security) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
  }

  const fc = (k: keyof CompanyInfo, v: any) => setCompany({ ...company, [k]: v })
  const fa = (k: keyof AccountingSettings, v: any) => setAccounting({ ...accounting, [k]: v })
  const fs = (k: keyof SystemSettings, v: any) => setSystem({ ...system, [k]: v })
  const fn2 = (k: keyof NotificationSettings, v: boolean) => setNotifs({ ...notifs, [k]: v })
  const fsec = (k: keyof SecuritySettings, v: any) => setSecurity({ ...security, [k]: v })

  const showSaveButton = activeTab !== 'permissions'

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-slate-700 rounded-lg flex items-center justify-center">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Settings</h1>
            <p className="text-xs text-slate-500">Configure your ERP system preferences</p>
          </div>
        </div>
        {showSaveButton && (
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" />
                    : saved  ? <Check className="w-4 h-4" />
                             : <Save className="w-4 h-4" />}
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
          </button>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-52 bg-white border-r border-slate-200 py-4 flex-shrink-0">
          {TABS.map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  active
                    ? 'bg-indigo-50 text-indigo-700 border-r-2 border-indigo-600 font-medium'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {tab.label}
                {active && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
              </button>
            )
          })}
        </aside>

        <main className="flex-1 overflow-y-auto p-6">

          {activeTab === 'company' && (
            <div className="max-w-2xl space-y-6">
              <div>
                <h2 className="text-base font-bold text-slate-800 mb-4">Company Information</h2>
                <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="form-label">Company Name</label>
                      <input value={company.company_name ?? ''} onChange={e => fc('company_name', e.target.value)} className="form-input" />
                    </div>
                    <div>
                      <label className="form-label">Registration No.</label>
                      <input value={company.reg_number ?? ''} onChange={e => fc('reg_number', e.target.value)} className="form-input" placeholder="SSM number" />
                    </div>
                    <div>
                      <label className="form-label">GST / SST / Tax ID</label>
                      <input value={company.tax_id ?? ''} onChange={e => fc('tax_id', e.target.value)} className="form-input" />
                    </div>
                    <div className="col-span-2">
                      <label className="form-label">Address</label>
                      <input value={company.address ?? ''} onChange={e => fc('address', e.target.value)} className="form-input" />
                    </div>
                    <div><label className="form-label">City</label>
                      <input value={company.city ?? ''} onChange={e => fc('city', e.target.value)} className="form-input" /></div>
                    <div><label className="form-label">State</label>
                      <input value={company.state ?? ''} onChange={e => fc('state', e.target.value)} className="form-input" /></div>
                    <div><label className="form-label">Postcode</label>
                      <input value={company.postcode ?? ''} onChange={e => fc('postcode', e.target.value)} className="form-input" /></div>
                    <div><label className="form-label">Country</label>
                      <input value={company.country ?? ''} onChange={e => fc('country', e.target.value)} className="form-input" /></div>
                    <div><label className="form-label">Phone</label>
                      <input value={company.phone ?? ''} onChange={e => fc('phone', e.target.value)} className="form-input" /></div>
                    <div><label className="form-label">Email</label>
                      <input type="email" value={company.email ?? ''} onChange={e => fc('email', e.target.value)} className="form-input" /></div>
                    <div className="col-span-2">
                      <label className="form-label">Website</label>
                      <input value={company.website ?? ''} onChange={e => fc('website', e.target.value)} className="form-input" />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-base font-bold text-slate-800 mb-4">Company Logo</h2>
                <LogoUpload
                  logoUrl={company.logo_url}
                  onUploaded={url => setCompany({ ...company, logo_url: url })}
                />
              </div>
            </div>
          )}

          {activeTab === 'accounting' && (
            <div className="max-w-2xl space-y-6">
              <h2 className="text-base font-bold text-slate-800">Accounting Preferences</h2>
              <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="form-label">Currency Code</label>
                    <select value={accounting.currency} onChange={e => fa('currency', e.target.value)} className="form-input">
                      <option value="MYR">MYR — Malaysian Ringgit</option>
                      <option value="USD">USD — US Dollar</option>
                      <option value="SGD">SGD — Singapore Dollar</option>
                      <option value="GBP">GBP — British Pound</option>
                      <option value="EUR">EUR — Euro</option>
                    </select></div>
                  <div><label className="form-label">Currency Symbol</label>
                    <input value={accounting.currency_symbol} onChange={e => fa('currency_symbol', e.target.value)} className="form-input" /></div>
                  <div><label className="form-label">Fiscal Year Start (Month)</label>
                    <select value={accounting.fiscal_year_start} onChange={e => fa('fiscal_year_start', e.target.value)} className="form-input">
                      {['01','02','03','04','05','06','07','08','09','10','11','12'].map((m, i) => (
                        <option key={m} value={m}>{['January','February','March','April','May','June','July','August','September','October','November','December'][i]}</option>
                      ))}
                    </select></div>
                  <div><label className="form-label">Default Tax Rate (%)</label>
                    <input type="number" min="0" max="30" step="0.1" value={accounting.tax_rate} onChange={e => fa('tax_rate', e.target.value)} className="form-input" /></div>
                  <div><label className="form-label">Default Branch Code</label>
                    <input value={accounting.default_branch} onChange={e => fa('default_branch', e.target.value)} className="form-input" /></div>
                  <div><label className="form-label">Payment Terms (days)</label>
                    <input type="number" min="0" value={accounting.payment_terms} onChange={e => fa('payment_terms', e.target.value)} className="form-input" /></div>
                  <div><label className="form-label">Decimal Places</label>
                    <select value={accounting.decimal_places} onChange={e => fa('decimal_places', e.target.value)} className="form-input">
                      <option value="0">0</option><option value="2">2</option><option value="4">4</option>
                    </select></div>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Document Number Prefixes</p>
                  <div className="grid grid-cols-4 gap-3">
                    {([
                      { key: 'invoice_prefix', label: 'Invoice' },
                      { key: 'pv_prefix',      label: 'Payment Voucher' },
                      { key: 'or_prefix',      label: 'Official Receipt' },
                      { key: 'je_prefix',      label: 'Journal Entry' },
                    ] as { key: keyof AccountingSettings; label: string }[]).map(({ key, label }) => (
                      <div key={key}>
                        <label className="form-label">{label}</label>
                        <input value={accounting[key] as string} onChange={e => fa(key, e.target.value)} className="form-input font-mono" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="max-w-2xl space-y-6">
              <h2 className="text-base font-bold text-slate-800">System Preferences</h2>
              <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="form-label">Language</label>
                    <select value={system.language} onChange={e => fs('language', e.target.value)} className="form-input">
                      <option value="en">English</option>
                    </select></div>
                  <div><label className="form-label">Timezone</label>
                    <select value={system.timezone} onChange={e => fs('timezone', e.target.value)} className="form-input">
                      <option value="Asia/Kuala_Lumpur">Asia/Kuala Lumpur (UTC+8)</option>
                      <option value="Asia/Singapore">Asia/Singapore (UTC+8)</option>
                      <option value="Asia/Karachi">Asia/Karachi (UTC+5)</option>
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">America/New_York</option>
                    </select></div>
                  <div><label className="form-label">Date Format</label>
                    <select value={system.date_format} onChange={e => fs('date_format', e.target.value)} className="form-input">
                      <option value="DD MMM YYYY">DD MMM YYYY (01 Jan 2026)</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY (01/01/2026)</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD (2026-01-01)</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY (01/01/2026)</option>
                    </select></div>
                  <div><label className="form-label">Time Format</label>
                    <select value={system.time_format} onChange={e => fs('time_format', e.target.value as any)} className="form-input">
                      <option value="12h">12-hour (2:30 PM)</option>
                      <option value="24h">24-hour (14:30)</option>
                    </select></div>
                  <div><label className="form-label">Theme</label>
                    <select value={system.theme} onChange={e => fs('theme', e.target.value as any)} className="form-input">
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                    </select></div>
                  <div><label className="form-label">Records Per Page</label>
                    <select value={system.items_per_page} onChange={e => fs('items_per_page', Number(e.target.value))} className="form-input">
                      <option value="10">10</option><option value="20">20</option>
                      <option value="50">50</option><option value="100">100</option>
                    </select></div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="max-w-2xl space-y-6">
              <h2 className="text-base font-bold text-slate-800">Notification Settings</h2>
              <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-1">
                {([
                  { key: 'invoice_due',       label: 'Invoice Due Reminders',     desc: 'Alert when invoices are approaching due date' },
                  { key: 'payment_received',  label: 'Payment Received',          desc: 'Notify when a payment is recorded' },
                  { key: 'low_stock',         label: 'Low Stock Alerts',          desc: 'Alert when product quantity falls below minimum' },
                  { key: 'payroll_due',       label: 'Payroll Processing Due',    desc: 'Monthly payroll generation reminders' },
                  { key: 'leave_request',     label: 'Leave Request Alerts',      desc: 'Notify when employees submit leave requests' },
                  { key: 'email_notify',      label: 'Email Notifications',       desc: 'Send alerts via email' },
                  { key: 'system_notify',     label: 'In-App Notifications',      desc: 'Show notifications inside the system' },
                ] as { key: keyof NotificationSettings; label: string; desc: string }[]).map(({ key, label, desc }) => (
                  <label key={key} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-lg cursor-pointer">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">{label}</p>
                      <p className="text-xs text-slate-400">{desc}</p>
                    </div>
                    <div
                      onClick={() => fn2(key, !notifs[key])}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifs[key] ? 'bg-indigo-600' : 'bg-slate-300'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${notifs[key] ? 'translate-x-6' : 'translate-x-1'}`} />
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="max-w-2xl space-y-6">
              <h2 className="text-base font-bold text-slate-800">Security Settings</h2>

              <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                <h3 className="text-sm font-semibold text-slate-700">Password Policy</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Session Timeout (minutes)</label>
                    <input type="number" min={5} max={1440} value={security.session_timeout_minutes}
                      onChange={e => fsec('session_timeout_minutes', Number(e.target.value))} className="form-input" />
                  </div>
                  <div>
                    <label className="form-label">Password Minimum Length</label>
                    <input type="number" min={6} max={64} value={security.password_min_length}
                      onChange={e => fsec('password_min_length', Number(e.target.value))} className="form-input" />
                  </div>
                </div>
                <label className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                  <input type="checkbox" checked={security.require_2fa_for_admins}
                    onChange={e => fsec('require_2fa_for_admins', e.target.checked)}
                    className="w-4 h-4 accent-indigo-600" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">Require 2FA for all admins</p>
                    <p className="text-xs text-slate-400">Admin accounts will be forced to enable 2FA before logging in</p>
                  </div>
                </label>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                <h3 className="text-sm font-semibold text-slate-700">Two-Factor Authentication</h3>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className={`w-5 h-5 ${twoFAEnabled ? 'text-green-600' : 'text-slate-400'}`} />
                    <div>
                      <p className="text-sm font-medium text-slate-700">Authenticator App (TOTP)</p>
                      <p className="text-xs text-slate-400">{twoFAEnabled ? 'Enabled — required at every login' : 'Not enabled'}</p>
                    </div>
                  </div>
                  <button onClick={() => setShow2FAModal(true)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-md ${twoFAEnabled
                      ? 'border border-red-200 text-red-600 hover:bg-red-50'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}>
                    {twoFAEnabled ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'permissions' && <PermissionsTab />}

        </main>
      </div>

      <TwoFactorModal
        open={show2FAModal}
        enabled={twoFAEnabled}
        onClose={() => setShow2FAModal(false)}
        onChange={setTwoFAEnabled}
      />
    </div>
  )
}
