'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { clsx } from 'clsx'
import {
  LayoutDashboard, Package, Users, Target,
  FolderKanban, BarChart3, Settings,
  ChevronDown,
  Calendar,
  Briefcase, LogOut,
  BookMarked, Truck,
  ShoppingCart,
  MessageSquare, Bell, ListChecks, FileText,
  Globe,
} from 'lucide-react'

function ClaudeMark({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2.2c.35 0 .65.25.72.6l1.05 5.06a3.6 3.6 0 0 0 2.37 2.37l5.06 1.05c.35.07.6.37.6.72s-.25.65-.6.72l-5.06 1.05a3.6 3.6 0 0 0-2.37 2.37l-1.05 5.06c-.07.35-.37.6-.72.6s-.65-.25-.72-.6l-1.05-5.06a3.6 3.6 0 0 0-2.37-2.37L2.8 12.72a.74.74 0 0 1 0-1.44l5.06-1.05a3.6 3.6 0 0 0 2.37-2.37l1.05-5.06c.07-.35.37-.6.72-.6Z" />
    </svg>
  )
}
import { useAuthStore } from '@/lib/auth-store'
import { useRouter } from 'next/navigation'

type NavItem = {
  label: string
  href?: string
  icon: React.ElementType
  children?: { label: string; href: string; icon: React.ElementType }[]
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'General Ledger',
    href: '/accounting/general-ledger',
    icon: BookMarked,
  },
  {
    label: 'Suppliers',
    href: '/suppliers',
    icon: Truck,
  },
  {
    label: 'Sales',
    href: '/sales',
    icon: ShoppingCart,
  },
  {
    label: 'Inventory',
    href: '/inventory',
    icon: Package,
  },
  {
    label: 'HRM',
    href: '/hrm',
    icon: Users,
  },
  {
    label: 'CRM',
    href: '/crm',
    icon: Target,
  },
  {
    label: 'Projects',
    href: '/projects',
    icon: FolderKanban,
  },
  {
    label: 'Storefront',
    href: '/storefront/orders',
    icon: Globe,
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: BarChart3,
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()

  const [openGroups, setOpenGroups] = useState<string[]>(() => {
    return navItems
      .filter((item) => item.children?.some((c) => pathname.startsWith(c.href)))
      .map((item) => item.label)
  })

  function toggleGroup(label: string) {
    setOpenGroups((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    )
  }

  function handleLogout() {
    logout()
    router.push('/login')
  }

  return (
    <aside className="fixed inset-y-0 left-0 w-60 flex flex-col z-30" style={{ backgroundColor: 'var(--cream-100)', borderRight: '1px solid var(--cream-200)' }}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5" style={{ borderBottom: '1px solid var(--cream-200)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--accent)' }}>
          <ClaudeMark className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-sm truncate" style={{ color: 'var(--ink-900)' }}>ERP System</p>
          <p className="text-xs truncate" style={{ color: 'var(--ink-500)' }}>Cloud Business Suite</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = item.href ? pathname === item.href : false
          const isOpen = openGroups.includes(item.label)
          const hasActiveChild = item.children?.some((c) => pathname.startsWith(c.href))

          if (!item.children) {
            return (
              <Link
                key={item.label}
                href={item.href!}
                className={clsx('sidebar-link', isActive && 'active')}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </Link>
            )
          }

          return (
            <div key={item.label}>
              <button
                onClick={() => toggleGroup(item.label)}
                className={clsx(
                  'sidebar-link w-full justify-between',
                  hasActiveChild && 'text-white'
                )}
              >
                <span className="flex items-center gap-3">
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {item.label}
                </span>
                <ChevronDown
                  className={clsx('w-3.5 h-3.5 transition-transform', isOpen && 'rotate-180')}
                />
              </button>

              {isOpen && (
                <div className="mt-0.5 space-y-0.5">
                  {item.children.map((child) => {
                    const ChildIcon = child.icon
                    const childActive = pathname === child.href || pathname.startsWith(child.href + '/')
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={clsx('sidebar-submenu-link', childActive && 'active text-indigo-400')}
                      >
                        <ChildIcon className="w-3.5 h-3.5 flex-shrink-0" />
                        {child.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="p-3" style={{ borderTop: '1px solid var(--cream-200)' }}>
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--accent)' }}>
            <span className="text-white text-xs font-bold uppercase">
              {user?.name?.charAt(0) ?? 'U'}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium truncate" style={{ color: 'var(--ink-900)' }}>{user?.name ?? 'User'}</p>
            <p className="text-xs truncate" style={{ color: 'var(--ink-500)' }}>{user?.email ?? ''}</p>
          </div>
          <button
            onClick={handleLogout}
            className="transition-colors"
            style={{ color: 'var(--ink-500)' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#b3573a')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-500)')}
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
