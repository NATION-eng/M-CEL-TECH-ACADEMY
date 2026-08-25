import { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, GraduationCap, BookOpen, Layers, Trophy, CreditCard, Megaphone, Calendar, FileText, ClipboardList, LogOut, Menu, Shield, MessageSquare, LucideIcon, BarChart3 } from 'lucide-react'
import NotificationBell from '../NotificationBell'
import { useAuthStore } from '../../store/auth.store'
import { authAPI } from '../../services/api'
import toast from 'react-hot-toast'

type NavItem =
  | { divider: true; label: string }
  | { divider?: false; icon: LucideIcon; label: string; to: string }

const NAV: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/admin/dashboard' },
  { label: 'PEOPLE', divider: true },
  { icon: Users, label: 'Students', to: '/admin/students' },
  { icon: GraduationCap, label: 'Instructors', to: '/admin/instructors' },
  { label: 'ACADEMICS', divider: true },
  { icon: BookOpen, label: 'Courses', to: '/admin/courses' },
  { icon: Layers, label: 'Curriculum', to: '/admin/curriculum' },
  { icon: Trophy, label: 'Certificates', to: '/admin/certificates' },
  { label: 'FINANCE', divider: true },
  { icon: CreditCard, label: 'Payments', to: '/admin/payments' },
  { label: 'CONTENT', divider: true },
  { icon: FileText, label: 'Content (Blog & Announcements)', to: '/admin/content' },
  { icon: Calendar, label: 'Events', to: '/admin/events' },
  { label: 'COMMUNICATION', divider: true },
  { icon: MessageSquare, label: 'Messages', to: '/admin/messages' },
  { label: 'SYSTEM', divider: true },
  { icon: BarChart3, label: 'Reports', to: '/admin/reports' },
  { icon: ClipboardList, label: 'Audit Logs', to: '/admin/audit-logs' },
]

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const loc = useLocation()
  const nav = useNavigate()
  const { user, clearAuth } = useAuthStore()

  const handleLogout = async () => {
    try { await authAPI.logout() } catch {}
    clearAuth(); nav('/login'); toast.success('Logged out')
  }

  const Sidebar = () => (
    <aside className="w-64 bg-ink-800 border-r border-white/[0.07] flex flex-col h-full">
      <div className="p-5 border-b border-white/[0.07]">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center font-display font-bold text-white text-xs">M</div>
          <div>
            <div className="font-display font-bold text-white text-xs leading-none">Masterview</div>
            <div className="font-mono text-[9px] text-slate-600 mt-0.5">Admin Portal</div>
          </div>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-0.5">
          {NAV.map((item, i) => {
            if (item.divider) {
              return (
                <div key={i} className="pt-4 pb-1 px-3">
                  <p className="text-[9px] font-semibold tracking-[0.15em] text-slate-600 uppercase">{item.label}</p>
                </div>
              )
            }
            const { icon: Icon, label, to } = item
            return (
              <Link key={to} to={to} className={`sidebar-item ${loc.pathname === to ? 'active' : ''}`}>
                <Icon size={15} className="flex-shrink-0" />
                <span className="text-[13px]">{label}</span>
              </Link>
            )
          })}
        </div>
      </div>
      <div className="p-3 border-t border-white/[0.07]">
        <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
          <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 text-xs font-bold">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-white truncate">{user?.firstName} {user?.lastName}</div>
            <div className="text-[10px] text-slate-500 capitalize">{user?.role?.replace('_', ' ')}</div>
          </div>
        </div>
        <button onClick={handleLogout} className="sidebar-item w-full text-red-400 hover:text-red-300 hover:bg-red-500/10 text-[13px]">
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen bg-ink-900 overflow-hidden">
      <div className="hidden lg:flex flex-col flex-shrink-0"><Sidebar /></div>
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="flex-shrink-0"><Sidebar /></div>
          <div className="flex-1 bg-black/60" onClick={() => setSidebarOpen(false)} />
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 bg-ink-800 border-b border-white/[0.07] flex items-center justify-between px-4 flex-shrink-0">
          <button className="lg:hidden btn-ghost p-1.5" onClick={() => setSidebarOpen(true)}><Menu size={18} /></button>
          <div className="hidden sm:flex items-center gap-2 text-sm font-medium text-slate-400">
            <Shield size={14} className="text-amber-500" /> Admin Portal
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <NotificationBell/>
            {user?.role === 'super_admin' && (
              <Link to="/superadmin/dashboard" className="badge badge-amber text-[10px]">Super Admin</Link>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-5 lg:p-7"><Outlet /></main>
      </div>
    </div>
  )
}
