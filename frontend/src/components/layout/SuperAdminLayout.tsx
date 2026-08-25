import { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, Settings, LogOut, Menu, Crown, ShieldCheck, MessageSquare, ClipboardList } from 'lucide-react'
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
  const handleLogout = async () => { try { await authAPI.logout() } catch {} clearAuth(); nav('/login'); toast.success('Logged out') }

  const Sidebar = () => (
    <aside className="w-60 bg-ink-800 border-r border-white/[0.07] flex flex-col h-full">
      <div className="p-5 border-b border-white/[0.07]">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center text-ink-900 text-xs"><Crown size={14}/></div>
          <div>
            <div className="font-display font-bold text-white text-xs leading-none">Masterview</div>
            <div className="font-mono text-[9px] text-yellow-600 mt-0.5">Super Admin</div>
          </div>
        </Link>
      </div>
      <div className="flex-1 p-3 space-y-0.5">
        {NAV.map(({ icon: Icon, label, to }) => (
          <Link key={to} to={to} className={`sidebar-item ${loc.pathname === to ? 'active' : ''}`}>
            <Icon size={15} className="flex-shrink-0"/><span className="text-[13px]">{label}</span>
          </Link>
        ))}
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
      <div className="hidden lg:flex flex-col flex-shrink-0"><Sidebar /></div>
      {sidebarOpen && <div className="lg:hidden fixed inset-0 z-50 flex"><div className="flex-shrink-0"><Sidebar /></div><div className="flex-1 bg-black/60" onClick={() => setSidebarOpen(false)}/></div>}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 bg-ink-800 border-b border-white/[0.07] flex items-center justify-between px-4 flex-shrink-0">
          <button className="lg:hidden btn-ghost p-1.5" onClick={() => setSidebarOpen(true)}><Menu size={18}/></button>
          <div className="flex items-center gap-2 text-sm text-slate-400"><Crown size={14} className="text-yellow-500"/> Super Admin Portal</div>
          <div className="ml-auto"><NotificationBell/></div>
        </header>
        <main className="flex-1 overflow-y-auto p-5 lg:p-7"><Outlet /></main>
      </div>
    </div>
  )
}
