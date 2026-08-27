import { useState, useEffect, useCallback } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, Settings, LogOut, Menu, X, Crown, ShieldCheck, MessageSquare, ClipboardList } from 'lucide-react'
import NotificationBell from '../NotificationBell'
import { useAuthStore } from '../../store/auth.store'
import { authAPI } from '../../services/api'
import toast from 'react-hot-toast'

const NAV = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/superadmin/dashboard' },
  { icon: Users, label: 'All Users', to: '/superadmin/users' },
  { icon: ShieldCheck, label: 'Admin Portal', to: '/admin/dashboard' },
  { icon: ClipboardList, label: 'Audit Logs', to: '/admin/audit-logs' },
  { icon: MessageSquare, label: 'Messages', to: '/superadmin/messages' },
  { icon: Settings, label: 'Settings', to: '/superadmin/settings' },
]

export default function SuperAdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const loc = useLocation()
  const nav = useNavigate()
  const { user, clearAuth } = useAuthStore()

  const closeSidebar = useCallback(() => setSidebarOpen(false), [])

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
      const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeSidebar() }
      window.addEventListener('keydown', onKey)
      return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey) }
    } else {
      document.body.style.overflow = ''
    }
  }, [sidebarOpen, closeSidebar])

  useEffect(() => { closeSidebar() }, [loc.pathname, closeSidebar])

  const handleLogout = async () => {
    try { await authAPI.logout() } catch {}
    clearAuth(); nav('/login'); toast.success('Logged out')
  }

  const SidebarContent = () => (
    <aside className="w-64 sm:w-60 bg-ink-800 border-r border-white/[0.07] flex flex-col h-full">
      <div className="p-5 border-b border-white/[0.07] flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="h-8 px-1.5 bg-white rounded-lg flex items-center justify-center shrink-0 shadow-sm">
            <img src="/logo.png" alt="M-CEL TECH" className="h-5 w-auto object-contain" />
          </div>
          <div className="min-w-0">
            <div className="font-display font-bold text-white text-xs leading-none truncate">M-CEL TECH</div>
            <div className="font-mono text-[9px] text-yellow-500 mt-0.5">Super Admin</div>
          </div>
        </Link>
        <button className="lg:hidden btn-ghost p-1" onClick={closeSidebar} aria-label="Close menu"><X size={16}/></button>
      </div>
      <div className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ icon: Icon, label, to }) => {
          const isActive = loc.pathname === to || (to !== '/superadmin/dashboard' && loc.pathname.startsWith(to))
          return (
            <Link key={to} to={to} className={`sidebar-item ${isActive ? 'active' : ''}`}>
              <Icon size={15} className="flex-shrink-0"/><span className="text-[13px]">{label}</span>
            </Link>
          )
        })}
      </div>
      <div className="p-3 border-t border-white/[0.07]">
        <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
          <div className="w-7 h-7 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400 text-xs font-bold">{user?.firstName?.[0]}</div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-white truncate">{user?.firstName} {user?.lastName}</div>
            <div className="text-[10px] text-yellow-600">Super Admin</div>
          </div>
        </div>
        <button onClick={handleLogout} className="sidebar-item w-full text-red-400 hover:bg-red-500/10 text-[13px]"><LogOut size={14}/> Sign Out</button>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen bg-ink-900 overflow-hidden">
      <div className="hidden lg:flex flex-col flex-shrink-0"><SidebarContent /></div>
      {sidebarOpen && (
        <div className="sidebar-overlay lg:hidden" role="dialog" aria-modal="true">
          <div className="sidebar-drawer"><SidebarContent /></div>
          <div className="flex-1 bg-black/60" onClick={closeSidebar}/>
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 bg-ink-800 border-b border-white/[0.07] flex items-center justify-between px-4 flex-shrink-0">
          <button className="lg:hidden btn-ghost p-1.5" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><Menu size={18}/></button>
          <div className="flex items-center gap-2 text-sm text-slate-400"><Crown size={14} className="text-yellow-500"/> Super Admin Portal</div>
          <div className="ml-auto"><NotificationBell/></div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-7"><Outlet /></main>
      </div>
    </div>
  )
}
