'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { Sortable } from '@/components/ui/Sortable'
import { ArrowLeft, Plus, Pencil, Trash2, X, Menu as MenuIcon, ExternalLink } from 'lucide-react'

type Item = { id: number; menu_id: number; label: string; link_type: 'page'|'product'|'category'|'custom'; link_value: string|null; open_in_new_tab: boolean; sort_order: number; parent_id: number|null }
type Menu = { id: number; location: string; label: string; items: Item[] }
type Page = { id: number; slug: string; title: string; is_home: boolean }

const LOCATION_LABEL: Record<string, string> = {
  header: 'Header navigation',
  footer_shop: 'Footer · Shop',
  footer_help: 'Footer · Help',
  footer_company: 'Footer · Company',
}

export default function MenusPage() {
  const [menus, setMenus] = useState<Menu[]>([])
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [addingTo, setAddingTo] = useState<Menu | null>(null)

  async function load() {
    setLoading(true)
    try {
      const [m, p] = await Promise.all([
        api.get('/admin/storefront/menus'),
        api.get('/admin/storefront/pages'),
      ])
      setMenus(m.data ?? [])
      setPages(p.data ?? [])
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function reorder(menu: Menu, nextItems: Item[]) {
    setMenus(menus.map((m) => m.id === menu.id ? { ...m, items: nextItems } : m))
    await api.post(`/admin/storefront/menus/${menu.id}/reorder`, { order: nextItems.map((i) => i.id) })
  }
  async function deleteItem(it: Item) {
    if (!confirm(`Delete "${it.label}"?`)) return
    await api.delete(`/admin/storefront/menu-items/${it.id}`)
    load()
  }
  async function saveItem(menuId: number, body: Partial<Item>, id?: number) {
    if (id) await api.put(`/admin/storefront/menu-items/${id}`, body)
    else    await api.post(`/admin/storefront/menus/${menuId}/items`, body)
    setEditingItem(null); setAddingTo(null); load()
  }

  return (
    <div>
      <Link href="/storefront" className="inline-flex items-center gap-1 mb-3 text-sm text-slate-500 hover:text-indigo-600">
        <ArrowLeft className="h-3.5 w-3.5" /> Storefront
      </Link>
      <div className="mb-1 flex items-center gap-2">
        <MenuIcon className="h-5 w-5 text-indigo-600" />
        <h1 className="text-2xl font-semibold text-slate-800">Navigation Menus</h1>
      </div>
      <p className="mb-6 text-sm text-slate-500">Header + footer menus. Items can link to a custom URL, a page you built, a product, or a category.</p>

      {loading ? <div className="text-slate-400">Loading…</div> : (
        <div className="space-y-6">
          {menus.map((menu) => (
            <div key={menu.id} className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold">{LOCATION_LABEL[menu.location] ?? menu.label}</h2>
                <button onClick={() => setAddingTo(menu)}
                  className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700">
                  <Plus className="h-3 w-3" /> Add item
                </button>
              </div>
              {menu.items.length === 0 ? (
                <p className="rounded border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">No items yet.</p>
              ) : (
                <Sortable items={menu.items} onChange={(next) => reorder(menu, next as Item[])} vertical>
                  {(it) => (
                    <div className="flex items-center gap-3 rounded border border-slate-100 bg-slate-50 px-3 py-2">
                      <span className="flex-1">
                        <span className="text-sm font-medium">{(it as Item).label}</span>
                        <span className="ml-2 text-xs font-mono text-slate-400">
                          {(it as Item).link_type === 'page' ? `/p/${(it as Item).link_value}` :
                           (it as Item).link_type === 'product' ? `/product/${(it as Item).link_value}` :
                           (it as Item).link_type === 'category' ? `/shop/${(it as Item).link_value}` :
                           (it as Item).link_value}
                        </span>
                        {(it as Item).open_in_new_tab && <ExternalLink className="ml-1 inline h-3 w-3 text-slate-400" />}
                      </span>
                      <button onClick={() => setEditingItem(it as Item)} className="text-slate-400 hover:text-indigo-600"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => deleteItem(it as Item)} className="text-slate-400 hover:text-rose-500"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  )}
                </Sortable>
              )}
            </div>
          ))}
        </div>
      )}

      {(addingTo || editingItem) && (
        <ItemModal
          item={editingItem ?? undefined}
          menu={addingTo ?? menus.find((m) => m.id === editingItem?.menu_id)!}
          pages={pages}
          onClose={() => { setEditingItem(null); setAddingTo(null) }}
          onSave={(body) => saveItem((addingTo ?? menus.find((m) => m.id === editingItem!.menu_id)!).id, body, editingItem?.id)}
        />
      )}
    </div>
  )
}

function ItemModal({ item, menu, pages, onClose, onSave }: {
  item?: Item; menu: Menu; pages: Page[]; onClose: () => void; onSave: (b: Partial<Item>) => void
}) {
  const [label, setLabel] = useState(item?.label ?? '')
  const [linkType, setLinkType] = useState<Item['link_type']>(item?.link_type ?? 'custom')
  const [linkValue, setLinkValue] = useState(item?.link_value ?? '')
  const [openNew, setOpenNew] = useState(item?.open_in_new_tab ?? false)

  function submit() {
    if (!label.trim()) return
    onSave({ label: label.trim(), link_type: linkType, link_value: linkValue.trim(), open_in_new_tab: openNew })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="font-semibold">{item ? 'Edit item' : 'Add item'} — {LOCATION_LABEL[menu.location]}</h2>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </header>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-600">Label</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Link type</label>
            <select value={linkType} onChange={(e) => setLinkType(e.target.value as Item['link_type'])}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="custom">Custom URL</option>
              <option value="page">Page (built in editor)</option>
              <option value="product">Product</option>
              <option value="category">Category</option>
            </select>
          </div>
          {linkType === 'page' ? (
            <div>
              <label className="text-xs font-medium text-slate-600">Page</label>
              <select value={linkValue} onChange={(e) => setLinkValue(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                <option value="">— Select a page —</option>
                {pages.filter((p) => !p.is_home).map((p) => (
                  <option key={p.id} value={p.slug}>{p.title} (/p/{p.slug})</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="text-xs font-medium text-slate-600">
                {linkType === 'custom' ? 'URL (e.g. /shop, /sale, https://...)'
                  : linkType === 'product' ? 'Product slug'
                  : 'Category slug (e.g. baju-kurung)'}
              </label>
              <input value={linkValue} onChange={(e) => setLinkValue(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={openNew} onChange={(e) => setOpenNew(e.target.checked)} />
            Open in new tab
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm">Cancel</button>
          <button onClick={submit} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Save</button>
        </div>
      </div>
    </div>
  )
}
