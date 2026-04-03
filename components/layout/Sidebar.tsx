'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, BookOpen, Calendar, ShoppingCart, Settings,
  PanelLeftClose, PanelLeftOpen, Flower, LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/catalog',   label: 'Catalog',   icon: Flower },
  { href: '/templates', label: 'Templates', icon: BookOpen },
  { href: '/events',    label: 'Events',    icon: Calendar },
  { href: '/orders',    label: 'Orders',    icon: ShoppingCart },
]

interface SidebarProps {
  studioName?: string
  userEmail?: string
  collapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
}

export function Sidebar({ userEmail, collapsed, onCollapsedChange }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (!error) router.push('/auth/login')
  }

  return (
    <motion.nav
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ type: 'spring', stiffness: 400, damping: 40 }}
      className="fixed left-0 top-0 h-full bg-white border-r border-[#E8E0D8] flex flex-col z-40 overflow-hidden"
    >
      {/* Logo area */}
      <div className={cn('border-b border-[#E8E0D8] px-4 py-4', collapsed ? 'flex flex-col items-center gap-2' : 'flex items-center gap-3')}>
        <div className="w-8 h-8 rounded-lg bg-[#2D5016] flex items-center justify-center flex-shrink-0">
          <Flower className="w-4 h-4 text-white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="flex-1 overflow-hidden"
            >
              <p className="font-semibold text-[#2D5016] text-base leading-tight whitespace-nowrap">Petal</p>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => onCollapsedChange(!collapsed)}
          className="flex-shrink-0 p-1 rounded-md text-[#A89880] hover:text-[#4A3F35] hover:bg-[#F5F1EC] transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed
            ? <PanelLeftOpen className="w-4 h-4" />
            : <PanelLeftClose className="w-4 h-4" />
          }
        </button>
      </div>

      {/* Nav items */}
      <div className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-1.5 text-[14px] font-base transition-colors group',
                active
                  ? 'bg-[#2D5016]/5 text-[#2D5016] font-semibold'
                  : 'text-[#A89880] hover:bg-[#F5F1EC] hover:text-[#4A3F35]'
              )}
            >
              <Icon
                className={cn(
                  'flex-shrink-0 transition-colors',
                  collapsed ? 'w-5 h-5 mx-auto' : 'w-4 h-4',
                  active ? 'text-[#2D5016]' : 'text-[#A89880] group-hover:text-[#4A3F35]'
                )}
              />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                    className="whitespace-nowrap"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          )
        })}
      </div>

      {/* Bottom: settings + sign out */}
      <div className="px-2 pb-3 space-y-0.5 border-t border-[#E8E0D8] pt-3">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            pathname.startsWith('/settings')
              ? 'bg-[#2D5016]/10 text-[#2D5016]'
              : 'text-[#A89880] hover:bg-[#F5F1EC] hover:text-[#4A3F35]'
          )}
        >
          <Settings className={cn('flex-shrink-0', collapsed ? 'w-5 h-5 mx-auto' : 'w-4 h-4')} />
          {!collapsed && <span className="whitespace-nowrap">Settings</span>}
        </Link>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 rounded-md px-3 py-1.5 text-sm font-medium text-[#A89880] hover:bg-[#F5F1EC] hover:text-[#C0392B] transition-colors"
        >
          <LogOut className={cn('flex-shrink-0', collapsed ? 'w-5 h-5 mx-auto' : 'w-4 h-4')} />
          {!collapsed && <span className="whitespace-nowrap">Sign out</span>}
        </button>
      </div>
    </motion.nav>
  )
}
