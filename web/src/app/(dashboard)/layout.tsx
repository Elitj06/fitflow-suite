'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Calendar,
  QrCode,
  Coins,
  Users,
  Bot,
  CreditCard,
  Settings,
  Menu,
  X,
  Zap,
  LogOut,
  ChevronDown,
  Bell,
  Search,
  BarChart3,
  Gift,
  Megaphone,
  Building2,
  Dumbbell,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  {
    label: 'Dashboard',
    href: '/trainer',
    icon: LayoutDashboard,
  },
  {
    label: 'Agenda',
    href: '/schedule',
    icon: Calendar,
  },
  {
    label: 'Alunos',
    href: '/trainer/students',
    icon: Users,
  },
  {
    label: 'Check-in',
    href: '/checkin',
    icon: QrCode,
  },
  {
    label: 'FitCoins',
    href: '/coins',
    icon: Coins,
  },
  {
    label: 'Recompensas',
    href: '/coins/rewards',
    icon: Gift,
  },
  {
    label: 'Analytics',
    href: '/trainer/analytics',
    icon: BarChart3,
  },
  { type: 'divider' as const, label: 'Comunicacao' },
  {
    label: 'FitBot IA',
    href: '/chatbot',
    icon: Bot,
    badge: 'PRO',
  },
  {
    label: 'Avisos',
    href: '/trainer/announcements',
    icon: Megaphone,
  },
  { type: 'divider' as const, label: 'Configuracoes' },
  {
    label: 'Cobrancas',
    href: '/billing',
    icon: CreditCard,
  },
  {
    label: 'Integracoes',
    href: '/admin/integrations',
    icon: Settings,
    badge: 'NOVO',
  },
  {
    label: 'Unidades',
    href: '/admin/branches',
    icon: Building2,
  },
  {
    label: 'Serviços',
    href: '/admin/services',
    icon: Dumbbell,
  },
  {
    label: 'Configuracoes',
    href: '/admin',
    icon: Settings,
  },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userProfile, setUserProfile] = useState<{ fullName: string; role: string } | null>(null)

  useEffect(() => {
    const loadProfile = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('user_id', user.id)
          .single()
        if (profile) {
          setUserProfile({ fullName: profile.full_name, role: profile.role })
        }
      }
    }
    loadProfile()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const initials = userProfile?.fullName
    ? userProfile.fullName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  const displayName = userProfile?.fullName || 'Carregando...'
  const displayRole =
    userProfile?.role === 'ADMIN'
      ? 'Admin'
      : userProfile?.role === 'TRAINER'
      ? 'Trainer'
      : 'Aluno'

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-200 bg-white transition-transform lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-gray-100 px-6">
          <Link href="/trainer" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-display text-lg font-bold text-gray-900">
              Fit<span className="text-brand-600">Flow</span>
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden rounded-lg p-1 hover:bg-gray-100"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {navItems.map((item, i) => {
              if ('type' in item && item.type === 'divider') {
                return (
                  <li key={i} className="pt-4 pb-1 px-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      {item.label}
                    </span>
                  </li>
                )
              }

              const isActive =
                pathname === item.href ||
                (item.href !== '/trainer' && pathname?.startsWith(item.href!))
              const Icon = 'icon' in item ? item.icon : LayoutDashboard

              return (
                <li key={item.href}>
                  <Link
                    href={item.href!}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                      isActive
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-[18px] w-[18px]',
                        isActive ? 'text-brand-600' : 'text-gray-400'
                      )}
                    />
                    {item.label}
                    {'badge' in item && item.badge && (
                      <span className="ml-auto rounded-md bg-brand-100 px-1.5 py-0.5 text-[10px] font-bold text-brand-700">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* User */}
        <div className="border-t border-gray-100 p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-gray-100 transition-colors group"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
              {initials}
            </div>
            <div className="flex-1 text-left">
              <div className="font-medium text-gray-900 text-sm">{displayName}</div>
              <div className="text-xs text-gray-500">{displayRole}</div>
            </div>
            <LogOut className="h-4 w-4 text-gray-400 group-hover:text-red-500 transition-colors" />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden rounded-lg p-2 hover:bg-gray-100"
            >
              <Menu className="h-5 w-5 text-gray-600" />
            </button>
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar alunos, aulas..."
                className="h-9 w-64 rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-4 text-sm text-gray-700 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative rounded-lg p-2 hover:bg-gray-100 transition-colors">
              <Bell className="h-5 w-5 text-gray-600" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-danger" />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
