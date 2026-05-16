'use client'

import { useState } from 'react'
import { X, Loader2, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { twoFactorApi } from '@/lib/settings-api'

export function TwoFactorModal({
  open,
  enabled,
  onClose,
  onChange,
}: {
  open: boolean
  enabled: boolean
  onClose: () => void
  onChange: (enabled: boolean) => void
}) {
  const [step, setStep] = useState<'idle' | 'setup' | 'disable'>('idle')
  const [secret, setSecret] = useState('')
  const [qr, setQr] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  if (!open) return null

  async function startEnable() {
    setBusy(true)
    try {
      const r = await twoFactorApi.enable()
      setSecret(r.secret)
      setQr(r.qr_svg)
      setStep('setup')
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Could not start 2FA setup')
    } finally { setBusy(false) }
  }

  async function confirmEnable() {
    if (code.length !== 6) return toast.error('Enter the 6-digit code')
    setBusy(true)
    try {
      await twoFactorApi.confirm(code)
      toast.success('Two-factor authentication enabled')
      onChange(true)
      reset()
      onClose()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Invalid code')
    } finally { setBusy(false) }
  }

  async function doDisable() {
    if (!password || code.length !== 6) return toast.error('Password and code required')
    setBusy(true)
    try {
      await twoFactorApi.disable(password, code)
      toast.success('Two-factor authentication disabled')
      onChange(false)
      reset()
      onClose()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Invalid credentials')
    } finally { setBusy(false) }
  }

  function reset() {
    setStep('idle'); setSecret(''); setQr(''); setCode(''); setPassword('')
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800">Two-Factor Authentication</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        {/* IDLE — show enable/disable controls */}
        {step === 'idle' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              {enabled
                ? 'Two-factor authentication is currently active. You can disable it below.'
                : 'Add an extra layer of security by requiring a code from your authenticator app at every login.'}
            </p>
            {enabled
              ? <button onClick={() => setStep('disable')} disabled={busy}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg font-medium text-sm">
                  Disable 2FA
                </button>
              : <button onClick={startEnable} disabled={busy}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2">
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                  Enable 2FA
                </button>
            }
          </div>
        )}

        {/* SETUP step */}
        {step === 'setup' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Scan this QR with Google Authenticator, Authy, or any TOTP app, then enter the 6-digit code below.
            </p>
            <div className="flex justify-center bg-slate-50 rounded-lg p-4">
              {qr && <img src={qr} alt="2FA QR" className="w-48 h-48" />}
            </div>
            <div>
              <label className="text-xs text-slate-500">Manual key (if scan fails)</label>
              <div className="mt-1 font-mono text-xs bg-slate-100 px-3 py-2 rounded break-all">{secret}</div>
            </div>
            <div>
              <label className="form-label">Verification code</label>
              <input
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                inputMode="numeric"
                className="form-input text-center text-lg tracking-widest font-mono"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={reset} className="flex-1 border border-slate-200 py-2.5 rounded-lg text-sm">Cancel</button>
              <button onClick={confirmEnable} disabled={busy || code.length !== 6}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                Verify & Enable
              </button>
            </div>
          </div>
        )}

        {/* DISABLE step */}
        {step === 'disable' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Confirm your password and current 6-digit code to disable 2FA.</p>
            <div>
              <label className="form-label">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="form-input" />
            </div>
            <div>
              <label className="form-label">Current 2FA Code</label>
              <input
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                inputMode="numeric"
                className="form-input text-center text-lg tracking-widest font-mono"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep('idle')} className="flex-1 border border-slate-200 py-2.5 rounded-lg text-sm">Back</button>
              <button onClick={doDisable} disabled={busy}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                Disable 2FA
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
