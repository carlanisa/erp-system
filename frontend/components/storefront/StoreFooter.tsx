'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useStoreTheme } from './ThemeProvider'
import { fetchMenus, type MenuMap, type MenuItem } from '@/lib/storefront-nav'
import { Instagram, Facebook, Youtube, Mail, Phone, MessageCircle, MapPin } from 'lucide-react'

export function StoreFooter() {
  const { theme } = useStoreTheme()
  const s = theme?.settings
  const [menus, setMenus] = useState<MenuMap>({})

  useEffect(() => { fetchMenus().then(setMenus) }, [])

  const brand = s?.brand_name ?? 'Modestwear'
  const tagline = s?.brand_tagline ?? 'Curated modestwear for the modern Malaysian woman.'

  const shopItems: MenuItem[] = menus.footer_shop ?? [
    { id: -1, label: 'Baju Kurung',  href: '/shop/baju-kurung',    open_new: false, sort_order: 1 },
    { id: -2, label: 'Hijab',        href: '/shop/hijab',          open_new: false, sort_order: 2 },
    { id: -3, label: 'New Arrivals', href: '/shop/new-arrivals',   open_new: false, sort_order: 3 },
    { id: -4, label: 'All Products', href: '/shop',                open_new: false, sort_order: 4 },
  ]
  const helpItems: MenuItem[] = menus.footer_help ?? []
  const companyItems: MenuItem[] = menus.footer_company ?? []

  return (
    <footer className="border-t border-neutral-200" style={{ background: 'var(--brand-surface)' }}>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div>
          <div className="text-lg font-semibold" style={{ fontFamily: 'var(--brand-font-heading)', color: 'var(--brand-text)' }}>
            {brand}<span style={{ color: 'var(--brand-primary)' }}>.</span>
          </div>
          <p className="mt-2 text-sm" style={{ color: 'var(--brand-muted)' }}>{tagline}</p>
          {/* Social icons */}
          <div className="mt-4 flex gap-3 text-neutral-500">
            {s?.social_instagram && <a href={s.social_instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:text-pink-500"><Instagram className="h-4 w-4" /></a>}
            {s?.social_facebook && <a href={s.social_facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="hover:text-blue-600"><Facebook className="h-4 w-4" /></a>}
            {s?.social_youtube && <a href={s.social_youtube} target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="hover:text-red-600"><Youtube className="h-4 w-4" /></a>}
            {s?.social_tiktok && <a href={s.social_tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="hover:text-black">TT</a>}
          </div>
        </div>
        <FooterCol title="Shop" items={shopItems} />
        <FooterCol title="Help" items={helpItems.length > 0 ? helpItems : null}>
          {helpItems.length === 0 && (
            <ul className="space-y-2 text-sm" style={{ color: 'var(--brand-muted)' }}>
              <li>Shipping: RM8 West / RM18 East</li>
              <li>Free shipping over RM150</li>
              <li>COD &amp; Bank Transfer accepted</li>
            </ul>
          )}
        </FooterCol>
        <FooterCol title="Company" items={companyItems.length > 0 ? companyItems : null}>
          {companyItems.length === 0 && (
            <ul className="space-y-2 text-sm" style={{ color: 'var(--brand-muted)' }}>
              {s?.contact_phone && <li className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {s.contact_phone}</li>}
              {s?.contact_whatsapp && (
                <li className="inline-flex items-center gap-1">
                  <MessageCircle className="h-3.5 w-3.5" />
                  <a href={`https://wa.me/${s.contact_whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer">{s.contact_whatsapp}</a>
                </li>
              )}
              {s?.contact_email && <li className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> <a href={`mailto:${s.contact_email}`}>{s.contact_email}</a></li>}
              {s?.contact_address && <li className="inline-flex items-start gap-1"><MapPin className="h-3.5 w-3.5 mt-0.5" /> {s.contact_address}</li>}
            </ul>
          )}
        </FooterCol>
      </div>
      <div className="border-t border-neutral-200 py-4 text-center text-xs" style={{ color: 'var(--brand-muted)' }}>
        © {new Date().getFullYear()} {brand}. All rights reserved.
      </div>
    </footer>
  )
}

function FooterCol({ title, items, children }: { title: string; items: MenuItem[] | null; children?: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 text-sm font-semibold" style={{ color: 'var(--brand-text)' }}>{title}</div>
      {items ? (
        <ul className="space-y-2 text-sm" style={{ color: 'var(--brand-muted)' }}>
          {items.map((it) => (
            <li key={it.id}>
              <Link href={it.href} target={it.open_new ? '_blank' : undefined} className="hover:opacity-70">{it.label}</Link>
            </li>
          ))}
        </ul>
      ) : children}
    </div>
  )
}
