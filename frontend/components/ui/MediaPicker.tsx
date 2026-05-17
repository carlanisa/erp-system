'use client'

import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { Image as ImageIcon, Upload, Search, Trash2, X, Check, Loader2 } from 'lucide-react'

type Media = {
  id: number
  filename: string
  original_name: string
  url: string                  // e.g. /storage/media/baju-kurung.jpg
  alt_text: string | null
  size: number
  width: number | null
  height: number | null
  folder: string
}

type Props = {
  /** Current image URL (e.g. /storage/media/foo.jpg). May be empty/null. */
  value: string | null | undefined
  /** Called with the new URL when the user picks/uploads, or '' to clear. */
  onChange: (url: string, alt?: string) => void
  /** Optional: lift alt text up too (admin can edit it in the picker). */
  altText?: string
  /** Optional folder label so uploads cluster by area (theme / products / banners…). */
  folder?: string
  /** Compact (no preview) vs full preview tile. */
  compact?: boolean
  /** Label shown above the picker. */
  label?: string
  className?: string
}

const PUBLIC_PREFIX =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '') || ''

/** Build a fully-qualified URL for display (so /storage/... works when the
 *  frontend is on a different origin than Laravel). */
export function mediaSrc(url: string | null | undefined): string | null {
  if (!url) return null
  if (/^https?:/i.test(url)) return url
  if (PUBLIC_PREFIX && url.startsWith('/storage')) return PUBLIC_PREFIX + url
  return url
}

export function MediaPicker({ value, onChange, altText, folder = 'uploads', compact = false, label, className }: Props) {
  const [open, setOpen] = useState(false)
  const src = mediaSrc(value)

  return (
    <div className={className}>
      {label && <label className="text-xs font-medium text-slate-600">{label}</label>}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`mt-1 flex w-full items-center gap-3 rounded-md border border-dashed border-slate-300 px-3 py-2 text-left text-sm transition hover:border-indigo-400 hover:bg-indigo-50/30 ${compact ? '' : 'min-h-[64px]'}`}
      >
        {src ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={altText ?? ''} className={`flex-none rounded object-cover ${compact ? 'h-8 w-8' : 'h-14 w-14'}`} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-slate-700">{value?.split('/').pop()}</div>
              {altText && <div className="truncate text-[11px] text-slate-400">alt: {altText}</div>}
            </div>
            <span className="text-xs font-medium text-indigo-600">Change</span>
          </>
        ) : (
          <>
            <span className={`flex flex-none items-center justify-center rounded bg-slate-100 text-slate-400 ${compact ? 'h-8 w-8' : 'h-14 w-14'}`}>
              <ImageIcon className="h-4 w-4" />
            </span>
            <span className="flex-1 text-slate-500">Choose image…</span>
            <Upload className="h-3.5 w-3.5 text-slate-400" />
          </>
        )}
      </button>
      {src && (
        <button type="button" onClick={() => onChange('')}
          className="mt-1 text-[11px] text-slate-400 hover:text-rose-500">Remove image</button>
      )}
      {open && (
        <MediaModal
          folder={folder}
          onClose={() => setOpen(false)}
          onPick={(m) => { onChange(m.url, m.alt_text ?? undefined); setOpen(false) }}
        />
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// Modal: gallery + uploader
// ──────────────────────────────────────────────────────────────────
function MediaModal({ folder, onClose, onPick }: { folder: string; onClose: () => void; onPick: (m: Media) => void }) {
  const [tab, setTab] = useState<'library' | 'upload'>('library')
  const [items, setItems] = useState<Media[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/media', { params: { search, per_page: 60 } })
      setItems(data?.data ?? data?.data?.data ?? [])
    } finally { setLoading(false) }
  }
  useEffect(() => { load() /* eslint-disable-line */ }, [])
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t) /* eslint-disable-line */ }, [search])

  async function del(m: Media) {
    if (!confirm(`Delete "${m.filename}"? This is permanent.`)) return
    try { await api.delete(`/media/${m.id}`); load() } catch { toast.error('Delete failed') }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
           onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-slate-500" />
            <h2 className="font-semibold">Media library</h2>
          </div>
          <div className="flex items-center gap-1 rounded-full border border-slate-200 p-0.5 text-xs">
            <button onClick={() => setTab('library')} className={`rounded-full px-3 py-1 ${tab === 'library' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>Library</button>
            <button onClick={() => setTab('upload')}  className={`rounded-full px-3 py-1 ${tab === 'upload'  ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>Upload new</button>
          </div>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </header>

        {tab === 'library' && (
          <div className="flex-1 overflow-y-auto p-5">
            <div className="mb-4 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by filename or alt text…"
                className="w-full rounded-md border border-slate-300 pl-9 pr-3 py-2 text-sm" />
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-12 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : items.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center text-slate-400">
                No images yet. Click <strong>Upload new</strong> to add one.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 md:grid-cols-5 lg:grid-cols-6">
                {items.map((m) => (
                  <div key={m.id} className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 hover:border-indigo-400">
                    <button onClick={() => onPick(m)} className="block h-full w-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={mediaSrc(m.url) ?? ''} alt={m.alt_text ?? ''} className="h-full w-full object-cover transition group-hover:scale-105" />
                    </button>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 py-1 text-[10px] text-white opacity-0 transition group-hover:opacity-100">
                      <div className="truncate font-mono">{m.filename}</div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); del(m) }}
                      className="absolute right-1 top-1 hidden rounded-full bg-white/90 p-1 text-rose-500 shadow group-hover:block"
                      aria-label="Delete">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'upload' && (
          <UploadPane folder={folder} onUploaded={(m) => { onPick(m) }} />
        )}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// Upload pane (drag-drop or click)
// ──────────────────────────────────────────────────────────────────
function UploadPane({ folder, onUploaded }: { folder: string; onUploaded: (m: Media) => void }) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [altText, setAltText] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', folder)
      if (altText) fd.append('alt_text', altText)
      const { data } = await api.post('/media/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success(`Uploaded ${data.filename}`)
      onUploaded(data)
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Upload failed')
    } finally { setUploading(false) }
  }

  return (
    <div className="flex-1 overflow-y-auto p-5">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault(); setDragging(false)
          const f = e.dataTransfer.files?.[0]; if (f) handleFile(f)
        }}
        className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition ${dragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300'}`}>
        <Upload className="mb-3 h-10 w-10 text-slate-400" />
        <p className="text-sm text-slate-600">Drag &amp; drop an image here</p>
        <p className="text-xs text-slate-400">or</p>
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="mt-3 inline-flex items-center gap-1 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
          {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</> : <>Browse files</>}
        </button>
        <input ref={fileRef} type="file" hidden accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        <p className="mt-3 text-[11px] text-slate-400">JPG, PNG, WebP, GIF or SVG · up to 10&nbsp;MB</p>
      </div>

      <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold text-slate-700">How filenames work</p>
        <p className="mt-1 text-xs text-slate-500">
          The image keeps a clean, slugified name based on your file. <span className="font-mono">Baju Kurung Red.JPG</span> becomes
          <span className="font-mono"> baju-kurung-red.jpg</span> and its URL is <span className="font-mono">/storage/media/baju-kurung-red.jpg</span> — no random hash.
          If a file with the same name already exists, we append <span className="font-mono">-2</span>, <span className="font-mono">-3</span> etc.
        </p>
        <div className="mt-3">
          <label className="text-xs font-medium text-slate-600">Alt text (optional — auto-filled from filename if blank)</label>
          <input value={altText} onChange={(e) => setAltText(e.target.value)} placeholder="e.g. Red Baju Kurung with songket trim"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
      </div>
    </div>
  )
}
