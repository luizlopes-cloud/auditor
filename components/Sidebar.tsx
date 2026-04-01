'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Search, ClipboardList, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/auditar', label: 'Auditar', icon: Search },
  { href: '/laudos', label: 'Laudos', icon: ClipboardList },
  { href: '/catalog', label: 'Catálogo', icon: BookOpen },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-[220px] shrink-0 border-r border-border bg-white flex flex-col h-screen sticky top-0">
      <div className="px-5 py-4 border-b border-border">
        <Image src="/seazone-logo.svg" alt="Seazone" width={100} height={17} priority />
        <p className="text-[11px] font-semibold text-primary mt-2 tracking-widest uppercase">Auditor</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-blue-600' : 'text-slate-400')} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-slate-200">
        <p className="text-xs text-slate-400">v1.0 · Hackathon AI First</p>
      </div>
    </aside>
  )
}
