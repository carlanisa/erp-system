'use client'

import Link from 'next/link'
import {
  Globe, BookMarked, Truck, CreditCard, MessageSquare, ShoppingCart, Package, Gift, Layers, Sparkles,
  Palette, LayoutGrid,
} from 'lucide-react'

const MODULES = [
  {
    title: '🎨 Theme Editor',
    href:  '/storefront/editor',
    icon:  Palette,
    color: 'text-rose-600',
    bg:    'bg-rose-50',
    border:'border-rose-300',
    desc:  'Shopify-style visual editor — edit theme + sections with live preview side-by-side. The fastest way to redesign your store.',
  },
  {
    title: 'Theme Settings',
    href:  '/storefront/theme',
    icon:  Palette,
    color: 'text-amber-600',
    bg:    'bg-amber-50',
    border:'border-amber-100',
    desc:  'Colors, fonts, logo, contact + social — form-based brand editor',
  },
  {
    title: 'Homepage Sections',
    href:  '/storefront/sections',
    icon:  LayoutGrid,
    color: 'text-violet-600',
    bg:    'bg-violet-50',
    border:'border-violet-100',
    desc:  'Sections list (use Theme Editor for visual editing)',
  },
  {
    title: 'Website Orders',
    href:  '/sales/orders?source=online',
    icon:  ShoppingCart,
    color: 'text-emerald-600',
    bg:    'bg-emerald-50',
    border:'border-emerald-100',
    desc:  'All orders placed on the website — view inside Sales › Sales Orders (source = Online)',
  },
  {
    title: 'Coupons',
    href:  '/storefront/coupons',
    icon:  BookMarked,
    color: 'text-indigo-600',
    bg:    'bg-indigo-50',
    border:'border-indigo-100',
    desc:  'Create discount codes — percent off, fixed amount, or free shipping',
  },
  {
    title: 'Shipping Zones',
    href:  '/storefront/shipping-zones',
    icon:  Truck,
    color: 'text-amber-600',
    bg:    'bg-amber-50',
    border:'border-amber-100',
    desc:  'Country-based rates with weight tiers + courier API keys',
  },
  {
    title: 'Payment Methods',
    href:  '/storefront/payment-methods',
    icon:  CreditCard,
    color: 'text-rose-600',
    bg:    'bg-rose-50',
    border:'border-rose-100',
    desc:  'COD, Bank Transfer with WhatsApp, Stripe, PayPal, Billplz, ToyyibPay, custom manual methods',
  },
  {
    title: 'AI Chat Transcripts',
    href:  '/storefront/ai-transcripts',
    icon:  MessageSquare,
    color: 'text-violet-600',
    bg:    'bg-violet-50',
    border:'border-violet-100',
    desc:  'Customer conversations with the shopping concierge — see what they asked for',
  },
  {
    title: 'Bundles',
    href:  '/storefront/bundles',
    icon:  Gift,
    color: 'text-pink-600',
    bg:    'bg-pink-50',
    border:'border-pink-100',
    desc:  'Pre-set combos (Baju Kurung + Hijab + Brooch) with bundle pricing',
  },
  {
    title: 'Cross-sell Rules',
    href:  '/storefront/cross-sell',
    icon:  Layers,
    color: 'text-teal-600',
    bg:    'bg-teal-50',
    border:'border-teal-100',
    desc:  'When customer adds Baju Kurung → suggest Hijabs / Brooches automatically',
  },
  {
    title: 'Smart Vouchers',
    href:  '/storefront/vouchers',
    icon:  Sparkles,
    color: 'text-orange-600',
    bg:    'bg-orange-50',
    border:'border-orange-100',
    desc:  'Behavior-triggered: welcome ship, idle 5% off, exit-intent 10% off, free-ship nudge',
  },
  {
    title: 'Publish a Product',
    href:  '/inventory/products',
    icon:  Package,
    color: 'text-blue-600',
    bg:    'bg-blue-50',
    border:'border-blue-100',
    desc:  'Open any product and toggle "Publish to Website" to list it on the storefront',
  },
]

export default function StorefrontPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center">
          <Globe className="w-5 h-5 text-rose-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Storefront</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Customer-facing website — products, orders, coupons, shipping &amp; payments
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULES.map((m) => {
          const Icon = m.icon
          return (
            <Link
              key={m.title}
              href={m.href}
              className={`group rounded-xl border ${m.border} bg-white p-5 transition hover:shadow-md`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 ${m.bg} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${m.color}`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-800 group-hover:text-indigo-600">{m.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{m.desc}</p>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
