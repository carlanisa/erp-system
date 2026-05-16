'use client'

import { useRef, useState } from 'react'
import { Building2, Loader2, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { settingsApi } from '@/lib/settings-api'

export function LogoUpload({
  logoUrl,
  onUploaded,
}: {
  logoUrl: string | null
  onUploaded: (url: string) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function handleFile(file: File) {
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be 2MB or smaller')
      return
    }
    setBusy(true)
    try {
      const res = await settingsApi.uploadLogo(file)
      onUploaded(res.logo_url)
      toast.success('Logo uploaded')
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 bg-indigo-50 rounded-xl flex items-center justify-center border-2 border-dashed border-indigo-300 overflow-hidden">
          {logoUrl
            ? <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
            : <Building2 className="w-8 h-8 text-indigo-400" />
          }
        </div>
        <div>
          <p className="text-sm font-medium text-slate-700">Brand Logo</p>
          <p className="text-xs text-slate-400 mt-0.5">PNG, JPG up to 2MB. Recommended 200×200px</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="mt-2 inline-flex items-center gap-1.5 text-xs px-3 py-1.5 border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md font-medium disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {busy ? 'Uploading…' : (logoUrl ? 'Replace logo' : 'Upload logo')}
          </button>
        </div>
      </div>
    </div>
  )
}
