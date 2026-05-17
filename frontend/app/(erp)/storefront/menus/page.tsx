'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { Sortable } from '@/components/ui/Sortable'
import {
  ArrowLeft, Plus, Pencil, Trash2, X, Menu as MenuIcon, ExternalLink,
  CornerDownRight, GripVertical,
} from 'lucide-react'

type Item = {
  id: number; menu_id: number; parent_id: number | null
  label: string
  link_type: 'page'|'product'|'category'|'custom'
  link_value: string | null
  open_in_new_tab: boolean
  sort_order: number
}
type Menu = { id: number; location: string; label: string; items: Item[] }
type Page = { id: number; slug: string; title: string; is_home: boolean }

const LOCATION_LABEL: Record<string, string> = {
  header: 'Header navigation',
  footer_shop: 'Footer · Shop',
  footer_help: 'Footer · Help',
  footer_company: 'Footer · Company',
}

function hrefFor(it: Item): string {
  return it.link_type === 'page'     ? `/p/${it.link_value}`
       : it.link_type === 'product'  ? `/products/${it.link_value}`
       : it.link_type === 'category' ? `/collections/${it.link_value}`
       : it.link_value ?? ''
}

export default function MenusPage() {
  const [menus, setMenus] = useState<Menu[]>([])
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Item | null>(null)
  const [adding, setAdding] = useState<{ menu: Menu; parent?: Item | null } | null>(null)

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

  async function reorder(menu: Menu, parentId: number | null, nextSiblings: Item[]) {
    // Optimistic local update
    setMenus(menus.map((m) => m.id === menu.id ? {
      ...m,
      items: [
        ...m.items.filter((i) => (i.parent_id ?? null) !== parentId),
        ...nextSiblings.map((it, i) => ({ ...it, sort_order: i })),
      ],
    } : m))
    await api.post(`/admin/storefront/menus/${menu.id}/reorder`, { order: nextSiblings.map((i) => i.id) })
  }

  async function deleteItem(menu: Menu, it: Item) {
    const kids = menu.items.filter((x) => x.parent_id === it.id).length
    if (!confirm(kids > 0
      ? `Delete "${it.label}" and its ${kids} sub-item(s)?`
      : `Delete "${it.label}"?`)) return
    await api.delete(`/admin/storefront/menu-items/${it.id}`); load()
  }

  async function saveItem(menuId: number, body: Partial<Item> & { parent_id?: number | null }, id?: number) {
    if (id) await api.put(`/admin/storefront/menu-items/${id}`, body)
    else    await api.post(`/admin/storefront/menus/${menuId}/items`, body)
    setEditing(null); setAdding(null); load()
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
      <p className="mb-6 text-sm text-slate-500">
        Header + footer menus. Click <CornerDownRight className="inline h-3 w-3" /> on any row to add a sub-item (mega-menu style).
        Drag the <GripVertical className="inline h-3 w-3" /> handle on the left of a row to reorder.
      </p>

      {loading ? <div className="text-slate-400">Loading…</div> : (
        <div className="space-y-6">
          {menus.map((menu) => (
            <MenuCard key={menu.id} menu={menu}
              onAddRoot={() => setAdding({ menu })}
              onAddChild={(parent) => setAdding({ menu, parent })}
              onEdit={(it) => setEditing(it)}
              onDelete={(it) => deleteItem(menu, it)}
              onReorder={reorder}
            />
          ))}
        </div>
      )}

      {(adding || editing) && (() => {
        const activeMenu = adding?.menu ?? menus.find((m) => m.id === editing!.menu_id)!
        const activeParent = adding?.parent ?? menus.flatMap((m) => m.items).find((x) => x.id === editing?.parent_id) ?? null
        return (
          <ItemModal
            item={editing ?? undefined}
            menu={activeMenu}
            parent={activeParent}
            pages={pages}
            onClose={() => { setEditing(null); setAdding(null) }}
            onSave={(body) => saveItem(activeMenu.id, body, editing?.id)}
          />
        )
      })()}
    </div>
  )
}

function MenuCard({ menu, onAddRoot, onAddChild, onEdit, onDelete, onReorder }: {
  menu: Menu
  onAddRoot: () => void
  onAddChild: (parent: Item) => void
  onEdit: (it: Item) => void
  onDelete: (it: Item) => void
  onReorder: (menu: Menu, parentId: number | null, items: Item[]) => void
}) {
  const root = useMemo(
    () => menu.items.filter((i) => i.parent_id == null).sort((a, b) => a.sort_order - b.sort_order),
    [menu.items]
  )
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">{LOCATION_LABEL[menu.location] ?? menu.label}</h2>
        <button onClick={onAddRoot}
          className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700">
          <Plus className="h-3 w-3" /> Add item
        </button>
      </div>
      {root.length === 0 ? (
        <p className="rounded border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">No items yet.</p>
      ) : (
        <Sortable items={root} onChange={(next) => onReorder(menu, null, next as Item[])} vertical withHandle={false}>
          {(it) => (
            <ItemRow
              item={it as Item} menu={menu}
              onAddChild={() => onAddChild(it as Item)}
              onEdit={() => onEdit(it as Item)}
              onDelete={() => onDelete(it as Item)}
              onReorder={onReorder}
              onEditChild={onEdit}
              onDeleteChild={onDelete}
            />
          )}
        </Sortable>
      )}
    </div>
  )
}

function ItemRow({ item, menu, onAddChild, onEdit, onDelete, onReorder, onEditChild, onDeleteChild }: {
  item: Item; menu: Menu
  onAddChild: () => void; onEdit: () => void; onDelete: () => void
  onReorder: (menu: Menu, parentId: number | null, items: Item[]) => void
  onEditChild: (it: Item) => void
  onDeleteChild: (it: Item) => void
}) {
  const children = useMemo(
    () => menu.items.filter((i) => i.parent_id === item.id).sort((a, b) => a.sort_order - b.sort_order),
    [menu.items, item.id]
  )
  return (
    <div className="mb-1">
      <div className="flex items-center gap-2 rounded border border-slate-100 bg-slate-50 px-3 py-2 hover:border-indigo-200">
        <GripVertical className="h-4 w-4 cursor-grab touch-none text-slate-400" />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium">{item.label}</span>
          <span className="ml-2 text-xs font-mono text-slate-400">{hrefFor(item)}</span>
          {item.open_in_new_tab && <ExternalLink className="ml-1 inline h-3 w-3 text-slate-400" />}
        </div>
        <button onClick={onAddChild} title="Add sub-item" className="text-slate-400 hover:text-indigo-600">
          <CornerDownRight className="h-3.5 w-3.5" />
        </button>
        <button onClick={onEdit} title="Edit" className="text-slate-400 hover:text-indigo-600"><Pencil className="h-3.5 w-3.5" /></button>
        <button onClick={onDelete} title="Delete" className="text-slate-400 hover:text-rose-500"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
      {children.length > 0 && (
        <div className="ml-6 mt-1 border-l-2 border-slate-200 pl-3">
          <Sortable items={children} onChange={(next) => onReorder(menu, item.id, next as Item[])} vertical withHandle={false}>
            {(c) => (
              <div className="mb-1 flex items-center gap-2 rounded border border-slate-100 bg-white px-3 py-1.5 hover:border-indigo-200">
                <GripVertical className="h-3.5 w-3.5 cursor-grab touch-none text-slate-400" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium">{(c as Item).label}</span>
                  <span className="ml-2 text-[10px] font-mono text-slate-400">{hrefFor(c as Item)}</span>
                  {(c as Item).open_in_new_tab && <ExternalLink className="ml-1 inline h-3 w-3 text-slate-400" />}
                </div>
                <button onClick={() => onEditChild(c as Item)} className="text-slate-400 hover:text-indigo-600"><Pencil className="h-3 w-3" /></button>
                <button onClick={() => onDeleteChild(c as Item)} className="text-slate-400 hover:text-rose-500"><Trash2 className="h-3 w-3" /></button>
              </div>
            )}
          </Sortable>
        </div>
      )}
    </div>
  )
}

function ItemModal({ item, menu, parent, pages, onClose, onSave }: {
  item?: Item; menu: Menu; parent: Item | null; pages: Page[]
  onClose: () => void; onSave: (b: Partial<Item> & { parent_id?: number | null }) => void
}) {
  const [label, setLabel] = useState(item?.label ?? '')
  const [linkType, setLinkType] = useState<Item['link_type']>(item?.link_type ?? 'custom')
  const [linkValue, setLinkValue] = useState(item?.link_value ?? '')
  const [openNew, setOpenNew] = useState(item?.open_in_new_tab ?? false)

  function submit() {
    if (!label.trim()) return
    onSave({
      label: label.trim(),
      link_type: linkType,
      link_value: linkValue.trim(),
      open_in_new_tab: openNew,
      parent_id: item ? item.parent_id : (parent?.id ?? null),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div>
            <h2 className="font-semibold">{item ? 'Edit item' : 'Add item'} — {LOCATION_LABEL[menu.location]}</h2>
            {parent && <p className="text-[11px] text-slate-500">Sub-item under <span className="font-medium">{parent.label}</span></p>}
          </div>
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
              <option value="category">Collection (category)</option>
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
                {linkType === 'custom' ? 'URL (e.g. /shop, /sale, https://…)'
                  : linkType === 'product' ? 'Product slug (e.g. zedan-teluk-belanga-smokey-purple)'
                  : 'Collection slug (e.g. baju-kebaya)'}
              </label>
              <input value={linkValue} onChange={(e) => setLinkValue(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              {linkType === 'product' && <p className="mt-1 text-[10px] text-slate-500">Resolves to /products/{linkValue || 'your-slug'}</p>}
              {linkType === 'category' && <p className="mt-1 text-[10px] text-slate-500">Resolves to /collections/{linkValue || 'your-slug'}</p>}
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
