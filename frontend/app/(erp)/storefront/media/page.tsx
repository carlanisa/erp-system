'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { mediaSrc } from '@/components/ui/MediaPicker'
import {
  ArrowLeft, Image as ImageIcon, Upload, Search, Trash2, Pencil, X, Copy,
  Loader2, Folder, FolderPlus, FolderOpen, ChevronLeft, ChevronRight,
  MoreVertical, CheckSquare, Square, Move, FolderInput,
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
type FolderInfo = { name: string; count: number; size: number }

export default function MediaLibraryPage() {
  // ── State ──────────────────────────────────────────────────────
  const [folders, setFolders] = useState<FolderInfo[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [totalSize, setTotalSize] = useState(0)
  const [activeFolder, setActiveFolder] = useState<string>('all')
  const [items, setItems] = useState<Media[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [editing, setEditing] = useState<Media | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [showMoveTo, setShowMoveTo] = useState(false)
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Loaders ───────────────────────────────────────────────────
  async function loadFolders() {
    try {
      const { data } = await api.get('/media/folders')
      setFolders(data?.folders ?? [])
      setTotalCount(data?.total_count ?? 0)
      setTotalSize(data?.total_size ?? 0)
    } catch {}
  }
  async function loadImages() {
    setLoading(true)
    try {
      const params: any = { search, page, per_page: 48 }
      if (activeFolder !== 'all') params.folder = activeFolder
      const { data } = await api.get('/media', { params })
      setItems(data?.data ?? [])
      setLastPage(data?.last_page ?? 1)
    } finally { setLoading(false) }
  }
  useEffect(() => { loadFolders() }, [])
  useEffect(() => { loadImages() /* eslint-disable-line */ }, [activeFolder, page])
  useEffect(() => {
    setPage(1); const t = setTimeout(loadImages, 250); return () => clearTimeout(t)
    /* eslint-disable-next-line */
  }, [search])

  // ── Upload ────────────────────────────────────────────────────
  async function handleFiles(files: File[]) {
    if (files.length === 0) return
    setUploading(true)
    try {
      for (const file of files) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('folder', activeFolder === 'all' ? 'uploads' : activeFolder)
        await api.post('/media/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      }
      toast.success(`Uploaded ${files.length} ${files.length === 1 ? 'image' : 'images'}`)
      loadImages(); loadFolders()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Upload failed')
    } finally { setUploading(false) }
  }

  // ── Image ops ─────────────────────────────────────────────────
  async function del(m: Media) {
    if (!confirm(`Delete "${m.filename}"? Permanent.`)) return
    try { await api.delete(`/media/${m.id}`); toast.success('Deleted'); loadImages(); loadFolders() }
    catch { toast.error('Delete failed') }
  }
  async function copyUrl(m: Media) {
    try { await navigator.clipboard.writeText(m.url); toast.success('URL copied') } catch {}
  }
  function toggleSelect(id: number) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id); else next.add(id)
    setSelected(next)
  }
  function clearSelect() { setSelected(new Set()) }
  function selectAll() { setSelected(new Set(items.map((i) => i.id))) }
  async function bulkMove(toFolder: string) {
    try {
      await api.post('/media/bulk-move', { ids: Array.from(selected), folder: toFolder })
      toast.success(`Moved ${selected.size} ${selected.size === 1 ? 'image' : 'images'} to ${toFolder}`)
      clearSelect(); setShowMoveTo(false); loadImages(); loadFolders()
    } catch { toast.error('Move failed') }
  }
  async function bulkDelete() {
    if (!confirm(`Delete ${selected.size} ${selected.size === 1 ? 'image' : 'images'}? Permanent.`)) return
    try {
      await Promise.all(Array.from(selected).map((id) => api.delete(`/media/${id}`)))
      toast.success('Deleted')
      clearSelect(); loadImages(); loadFolders()
    } catch { toast.error('Delete failed') }
  }

  // ── Folder ops ────────────────────────────────────────────────
  async function createFolder() {
    if (!newFolderName.trim()) return
    try {
      const { data } = await api.post('/media/folders', { name: newFolderName.trim() })
      toast.success(`Folder "${data.name}" created`)
      setNewFolderName(''); setCreatingFolder(false)
      loadFolders(); setActiveFolder(data.name)
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Create failed') }
  }
  async function renameFolderSubmit(oldName: string) {
    const next = renameValue.trim()
    if (!next || next === oldName) { setRenamingFolder(null); return }
    try {
      const { data } = await api.put(`/media/folders/${encodeURIComponent(oldName)}`, { name: next })
      toast.success(`Renamed to ${data.name}`)
      setRenamingFolder(null)
      loadFolders()
      if (activeFolder === oldName) setActiveFolder(data.name)
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Rename failed') }
  }
  async function deleteFolder(name: string) {
    if (name === 'uploads') return
    const info = folders.find((f) => f.name === name)
    const hasImages = (info?.count ?? 0) > 0
    const msg = hasImages
      ? `Delete folder "${name}"? Its ${info?.count} images will be moved to "uploads".`
      : `Delete folder "${name}"?`
    if (!confirm(msg)) return
    try {
      await api.delete(`/media/folders/${encodeURIComponent(name)}`)
      toast.success(`Folder "${name}" deleted`)
      if (activeFolder === name) setActiveFolder('all')
      loadFolders(); loadImages()
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Delete failed') }
  }

  // ── Helpers ───────────────────────────────────────────────────
  const fmtSize = (b: number) => {
    if (b < 1024) return `${b} B`
    if (b < 1_048_576) return `${(b / 1024).toFixed(1)} KB`
    return `${(b / 1_048_576).toFixed(1)} MB`
  }
  const moveTargets = useMemo(() => folders.filter((f) => f.name !== activeFolder), [folders, activeFolder])

  return (
    <div>
      <Link href="/storefront" className="inline-flex items-center gap-1 mb-3 text-sm text-slate-500 hover:text-indigo-600">
        <ArrowLeft className="h-3.5 w-3.5" /> Storefront
      </Link>
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-indigo-600" />
          <h1 className="text-2xl font-semibold text-slate-800">Media Library</h1>
        </div>
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
          {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</> : <><Upload className="h-4 w-4" /> Upload to {activeFolder === 'all' ? 'uploads' : activeFolder}</>}
        </button>
        <input ref={fileRef} type="file" hidden multiple accept="image/*"
          onChange={(e) => { const f = Array.from(e.target.files ?? []); handleFiles(f) }} />
      </div>
      <p className="mb-6 text-sm text-slate-500">{totalCount} images · {fmtSize(totalSize)} total · uploads go into the active folder</p>

      <div className="flex gap-5">
        {/* ── Sidebar: folders ───────────────────────────────── */}
        <aside className="w-60 flex-none">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Folders</span>
            <button onClick={() => setCreatingFolder(true)} className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800">
              <FolderPlus className="h-3 w-3" /> New
            </button>
          </div>
          <div className="space-y-0.5 rounded-lg border border-slate-200 bg-white p-1">
            <FolderRow
              active={activeFolder === 'all'} icon={ImageIcon}
              name="All images" count={totalCount}
              onClick={() => { setActiveFolder('all'); clearSelect() }}
            />
            {creatingFolder && (
              <div className="flex items-center gap-1 px-2 py-1.5">
                <FolderPlus className="h-4 w-4 text-indigo-500" />
                <input autoFocus value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') createFolder()
                    if (e.key === 'Escape') { setCreatingFolder(false); setNewFolderName('') }
                  }}
                  placeholder="Folder name…"
                  className="flex-1 rounded border border-indigo-300 px-2 py-0.5 text-sm" />
                <button onClick={createFolder} className="text-xs font-medium text-indigo-600">OK</button>
              </div>
            )}
            {folders.map((f) => (
              renamingFolder === f.name ? (
                <div key={f.name} className="flex items-center gap-1 px-2 py-1.5">
                  <FolderOpen className="h-4 w-4 text-indigo-500" />
                  <input autoFocus value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') renameFolderSubmit(f.name)
                      if (e.key === 'Escape') setRenamingFolder(null)
                    }}
                    className="flex-1 rounded border border-indigo-300 px-2 py-0.5 text-sm" />
                  <button onClick={() => renameFolderSubmit(f.name)} className="text-xs font-medium text-indigo-600">OK</button>
                </div>
              ) : (
                <FolderRow
                  key={f.name}
                  active={activeFolder === f.name}
                  icon={activeFolder === f.name ? FolderOpen : Folder}
                  name={f.name} count={f.count}
                  isDefault={f.name === 'uploads'}
                  onClick={() => { setActiveFolder(f.name); clearSelect() }}
                  onRename={() => { setRenamingFolder(f.name); setRenameValue(f.name) }}
                  onDelete={() => deleteFolder(f.name)}
                />
              )
            ))}
          </div>
        </aside>

        {/* ── Main: images in active folder ─────────────────── */}
        <main className="flex-1 min-w-0">
          {/* Filters + bulk actions */}
          <div className="mb-4 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by filename or alt text…"
                className="w-full rounded-md border border-slate-300 pl-9 pr-3 py-2 text-sm" />
            </div>
            {items.length > 0 && (
              <button onClick={selected.size === items.length ? clearSelect : selectAll}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-2 text-xs">
                {selected.size === items.length ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                {selected.size === items.length ? 'Unselect all' : 'Select all'}
              </button>
            )}
          </div>

          {/* Bulk action bar */}
          {selected.size > 0 && (
            <div className="mb-4 flex items-center justify-between rounded-lg bg-indigo-50 border border-indigo-200 px-4 py-2">
              <span className="text-sm font-medium text-indigo-700">
                {selected.size} selected
              </span>
              <div className="flex items-center gap-2 relative">
                <button onClick={() => setShowMoveTo((v) => !v)}
                  className="inline-flex items-center gap-1 rounded-md bg-white border border-indigo-300 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100">
                  <FolderInput className="h-3.5 w-3.5" /> Move to…
                </button>
                {showMoveTo && (
                  <div className="absolute right-0 top-full mt-1 z-10 max-h-64 w-56 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
                    {moveTargets.map((f) => (
                      <button key={f.name} onClick={() => bulkMove(f.name)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50">
                        <Folder className="h-3.5 w-3.5 text-slate-400" /> {f.name}
                      </button>
                    ))}
                  </div>
                )}
                <button onClick={bulkDelete}
                  className="inline-flex items-center gap-1 rounded-md bg-white border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50">
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
                <button onClick={clearSelect} className="text-xs text-slate-500 hover:text-slate-700">Cancel</button>
              </div>
            </div>
          )}

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault(); setDragging(false)
              handleFiles(Array.from(e.dataTransfer.files ?? []))
            }}
            className={`mb-4 rounded-xl border-2 border-dashed transition ${dragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-slate-50/50'} px-4 py-3 text-center text-xs text-slate-500`}>
            Drag &amp; drop images here to upload to <strong>{activeFolder === 'all' ? 'uploads' : activeFolder}</strong>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center text-slate-400">
              No images in this folder. Drag-drop above or click <strong>Upload</strong>.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {items.map((m) => {
                  const isSelected = selected.has(m.id)
                  return (
                    <div key={m.id} className={`group rounded-lg border overflow-hidden bg-white transition ${isSelected ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-slate-200 hover:border-indigo-400 hover:shadow-md'}`}>
                      <div className="relative aspect-square bg-slate-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={mediaSrc(m.url) ?? ''} alt={m.alt_text ?? ''} className="h-full w-full object-cover" />
                        <button onClick={() => toggleSelect(m.id)}
                          className={`absolute left-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded border-2 transition
                            ${isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-white bg-white/80 opacity-0 group-hover:opacity-100'}`}>
                          {isSelected && <CheckSquare className="h-3 w-3 text-white" />}
                        </button>
                        <span className="absolute right-1 top-1 rounded bg-slate-900/70 px-1.5 py-0.5 text-[10px] font-mono text-white">{m.folder}</span>
                      </div>
                      <div className="p-2.5 space-y-1">
                        <div className="truncate text-xs font-medium text-slate-800" title={m.filename}>{m.filename}</div>
                        {m.alt_text && <div className="truncate text-[11px] text-slate-500" title={m.alt_text}>alt: {m.alt_text}</div>}
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          {m.width && m.height && <span>{m.width}×{m.height}</span>}
                          {m.width && m.height && <span>·</span>}
                          <span>{fmtSize(m.size)}</span>
                        </div>
                        <div className="flex items-center gap-1 pt-1">
                          <button onClick={() => copyUrl(m)} title="Copy URL"
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Copy className="h-3 w-3" /></button>
                          <button onClick={() => setEditing(m)} title="Edit alt text / move folder"
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-indigo-600"><Pencil className="h-3 w-3" /></button>
                          <button onClick={() => del(m)} title="Delete"
                            className="ml-auto rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-500"><Trash2 className="h-3 w-3" /></button>
                        </div>
                      </div>
                    </div>
                  )
                })}
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
        </main>
      </div>

      {editing && (
        <EditModal media={editing} folders={folders} onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); loadImages(); loadFolders() }} />
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// Folder sidebar row
// ──────────────────────────────────────────────────────────────────
function FolderRow({ active, icon: Icon, name, count, isDefault, onClick, onRename, onDelete }: {
  active: boolean; icon: any; name: string; count: number; isDefault?: boolean
  onClick: () => void; onRename?: () => void; onDelete?: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <div className="relative group">
      <button onClick={onClick}
        className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm transition
          ${active ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-700 hover:bg-slate-50'}`}>
        <Icon className={`h-4 w-4 ${active ? 'text-indigo-500' : 'text-slate-400'}`} />
        <span className="flex-1 truncate text-left">{name}</span>
        <span className={`rounded-full px-1.5 text-[10px] font-mono ${active ? 'bg-indigo-200/50 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
      </button>
      {onRename && onDelete && (
        <>
          <button onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v) }}
            className="absolute right-1 top-1 hidden rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 group-hover:block">
            <MoreVertical className="h-3 w-3" />
          </button>
          {menuOpen && (
            <div className="absolute right-2 top-7 z-10 w-40 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg" onMouseLeave={() => setMenuOpen(false)}>
              <button onClick={() => { setMenuOpen(false); onRename() }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-slate-50">
                <Pencil className="h-3 w-3" /> Rename
              </button>
              {!isDefault && (
                <button onClick={() => { setMenuOpen(false); onDelete() }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-rose-600 hover:bg-rose-50">
                  <Trash2 className="h-3 w-3" /> Delete folder
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// Per-image edit modal
// ──────────────────────────────────────────────────────────────────
function EditModal({ media, folders, onClose, onSaved }: { media: Media; folders: FolderInfo[]; onClose: () => void; onSaved: () => void }) {
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
            <label className="text-xs font-medium text-slate-600">Alt text</label>
            <input value={alt} onChange={(e) => setAlt(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Folder</label>
            <select value={folder} onChange={(e) => setFolder(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              {folders.map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
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
