'use client'

import { usePathname, useRouter } from 'next/navigation'
import { PhoneCall, FileText, Wrench, CalendarDays, Receipt, LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import VoxaroLogo from './VoxaroLogo'

const NAV = [
  { href: '/leads',      label: 'Leads',       icon: PhoneCall },
  { href: '/angebote',   label: 'Angebote',    icon: FileText },
  { href: '/',           label: 'Aufträge',    icon: Wrench },
  { href: '/kalender',   label: 'Kalender',    icon: CalendarDays },
  { href: '/rechnungen', label: 'Rechnungen',  icon: Receipt },
]

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  if (href === '/angebote') return pathname === '/angebote' || pathname.startsWith('/angebote/')
  return pathname.startsWith(href)
}

export default function DashboardNav() {
  const pathname = usePathname()
  const router   = useRouter()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <nav className="sticky top-0 z-20 bg-zinc-900 border-b border-zinc-800">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
        <div className="shrink-0">
          <VoxaroLogo size="sm" />
        </div>

        {/* Nav tabs — scrollbar-none für sauberes Mobile-Scrollen */}
        <div className="flex-1 flex items-center gap-0.5 overflow-x-auto scrollbar-none min-w-0">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href)
            return (
              <button
                key={href}
                onClick={() => router.push(href)}
                className={[
                  'flex items-center gap-1.5 whitespace-nowrap text-xs font-medium px-3 py-1.5 rounded-lg transition-colors shrink-0',
                  active
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                    : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 border border-transparent',
                ].join(' ')}
              >
                <Icon size={12} />
                {label}
              </button>
            )
          })}
        </div>

        <button
          onClick={handleLogout}
          className="shrink-0 p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
          title="Abmelden"
        >
          <LogOut size={15} />
        </button>
      </div>
    </nav>
  )
}
