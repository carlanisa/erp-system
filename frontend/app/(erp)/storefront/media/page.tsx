'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { mediaSrc } from '@/components/ui/MediaPicker'
import {
  ArrowLeft, Image as ImageIcon, Upload, Search, Trash2, Pencil, X,
  Copy, Loader2, Filter, ChevronLeft, ChevronRight,
} from 'lucide-react'

type Media = {
  id: number
  filename: string
  original_name: string
  url: string
  alt_text: string | null
  size: number
  width: number | null
  height: number | null
  folder: string
  created_at: string
}

const FOLDERS = ['all', 'uploads', 'theme', 'hero', 'categories', 'image-text', 'instagram', 'products', 'bundles']

export default function MediaLibraryPage() {
  const [items, setItems] = useState<Media[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [folder, setFolder] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [editing, setEditing] = useState<Media | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/media', {
        params: { search, page, per_page: 48, folder: folder === 'all' ? undefined : folder },
      })
      setItems(data?.data ?? [])
      setLastPage(data?.last_page ?? 1)
      setTotal(data?.total ?? 0)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() /* eslint-disable-line */ }, [page, folder])
  useEffect(() => { setPage(1); const t = setTimeout(load, 250); return () => clearTimeout(t) /* eslint-disable-line */ }, [search])

  async function handleFile(file: File) {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', folder === 'all' ? 'uploads' : folder)
      await api.post('/media/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success(`Uploaded ${file.name}`)
      load()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Upload failed')
    } finally { setUploading(false) }
  }

  async function del(m: Media) {
    if (!confirm(`Delete "${m.filename}"? This is permanent.`)) return
    try { await api.delete(`/media/${m.id}`); toast.success('Deleted'); load() } catch { toast.error('Delete failed') }
  }

  async function copyUrl(m: Media) {
    try { await navigator.clipboard.writeText(m.url); toast.success('URL copied') } catch {}
  }

  function fmtSize(b: number) {
    if (b < 1024) return `${b} B`
    if (b < 1_048_576) return `${(b / 1024).toFixed(1)} KB`
    return `${(b / 1_048_576).toFixed(1)} MB`
  }

  return (
    <div>
      <Link href="/storefront" className="inline-flex items-center gap-1 mb-3 text-sm text-slate-500 hover:text-indigo-600">
        <ArrowLeft className="h-3.5 w-3.5" /> Storefront
      </Link>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-indigo-600" />
          <h1 className="text-2xl font-semibold text-slate-800">Media Library</h1>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{total} {total === 1 ? 'image' : 'images'}</span>
        </div>
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
          {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</> : <><Upload className="h-4 w-4" /> Upload images</>}
        </button>
        <input ref={fileRef} type="file" hidden multiple accept="image/*"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? [])
            files.reduce((p, f) => p.then(() => handleFile(f)), Promise.resolve())
          }} />
      </div>
      <p className="mb-6 text-sm text-slate-600">All uploaded images. URLs are clean slugs like <code className="rounded bg-slate-100 px-1.5 py-0.5">/storage/media/baju-kurung-red.jpg</code> — no random hashes.</p>

      {/* Filters */}
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by filename or alt text…"
            className="w-full rounded-md border border-slate-300 pl-9 pr-3 py-2 text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500" />
          <select value={folder} onChange={(e) => { setFolder(e.target.value); setPage(1) }}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            {FOLDERS.map((f) => <option key={f} value={f}>{f === 'all' ? 'All folders' : f}</option>)}
          </select>
        </div>
      </div>

      {/* Drag-drop overlay zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault(); setDragging(false)
          const files = Array.from(e.dataTransfer.files ?? [])
          files.reduce((p, f) => p.then(() => handleFile(f)), Promise.resolve())
        }}
        className={`mb-5 rounded-xl border-2 border-dashed transition ${dragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-slate-50/50'} p-4 text-center text-sm text-slate-500`}>
        Drag &amp; drop images anywhere here to upload. JPG, PNG, WebP, GIF, SVG · up to 10 MB each.
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-16 text-center text-slate-400">
          No images. Click <strong>Upload images</strong> above or drag files onto the drop zone.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
            {items.map((m) => (
              <div key={m.id} className="group rounded-lg border border-slate-200 bg-white overflow-hidden hover:border-indigo-400 hover:shadow-md transition">
                <div className="relative aspect-square bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mediaSrc(m.url) ?? ''} alt={m.alt_text ?? ''} className="h-full w-full object-cover" />
                  <span className="absolute right-1 top-1 rounded bg-slate-900/70 px-1.5 py-0.5 text-[10px] font-mono text-white">{m.folder}</span>
                </div>
                <div className="p-2.5 space-y-1">
                  <div className="truncate text-xs font-medium text-slate-800" title={m.filename}>{m.filename}</div>
                  {m.alt_text && <div className="truncate text-[11px] text-slate-500" title={m.alt_text}>alt: {m.alt_text}</div>}
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    {m.width && m.height && <span>{m.width}×{m.height}</span>}
                    <span>·</span>
                    <span>{fmtSize(m.size)}</span>
                  </div>
                  <div className="flex items-center gap-1 pt-1">
                    <button onClick={() => copyUrl(m)} title="Copy URL"
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Copy className="h-3 w-3" /></button>
                    <button onClick={() => setEditing(m)} title="Edit alt text"
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-indigo-600"><Pencil className="h-3 w-3" /></button>
                    <button onClick={() => del(m)} title="Delete"
                      className="ml-auto rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-500"><Trash2 className="h-3 w-3" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {lastPage > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2 text-sm">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-50">
                <ChevronLeft className="h-4 w-4" /> Prev
              </button>
              <span className="text-slate-500">Page {page} of {lastPage}</span>
              <button onClick={() => setPage((p) => Math.min(lastPage, p + 1))} disabled={page === lastPage}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-50">
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}

      {editing && <EditModal media={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
    </div>
  )
}

function EditModal({ media, onClose, onSaved }: { media: Media; onClose: () => void; onSaved: () => void }) {
  const [alt, setAlt] = useState(media.alt_text ?? '')
  const [folder, setFolder] = useState(media.folder ?? 'uploads')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      await api.put(`/media/${media.id}`, { alt_text: alt, folder })
      toast.success('Saved')
      onSaved()
    } catch { toast.error('Save failed') } finally { setSaving(false) }
  }

  async function copyUrl() {
    try { await navigator.clipboard.writeText(media.url); toast.success('URL copied') } catch {}
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-xl rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="font-semibold">Edit image</h2>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </header>
        <div className="p-5 space-y-4">
          <div className="aspect-video overflow-hidden rounded-lg bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediaSrc(media.url) ?? ''} alt={media.alt_text ?? ''} className="h-full w-full object-contain" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Filename</label>
            <input value={media.filename} readOnly
              className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-700" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Public URL</label>
            <div className="mt-1 flex gap-2">
              <input value={media.url} readOnly
                className="flex-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700" />
              <button onClick={copyUrl} className="rounded-md border border-slate-300 px-3 text-sm hover:bg-slate-50">Copy</button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Alt text (SEO + accessibility)</label>
            <input value={alt} onChange={(e) => setAlt(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Folder</label>
            <select value={folder} onChange={(e) => setFolder(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              {FOLDERS.filter((f) => f !== 'all').map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm">Cancel</button>
          <button onClick={save} disabled={saving}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
