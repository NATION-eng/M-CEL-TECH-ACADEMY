import { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, BookOpen, FileText, CheckSquare, Trophy, FolderOpen, CreditCard, User, LogOut, Menu, X, Brain, Layers, MessageSquare, Megaphone } from 'lucide-react'
import { useAuthStore } from '../../store/auth.store'
import { authAPI } from '../../services/api'
import toast from 'react-hot-toast'
import NotificationBell from '../NotificationBell'

const NAV = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/student/dashboard' },
  { icon: BookOpen, label: 'My Courses', to: '/student/courses' },
  { icon: FileText, label: 'Assignments', to: '/student/assignments' },
  { icon: Brain, label: 'Quizzes', to: '/student/quizzes' },
  { icon: FolderOpen, label: 'Resources', to: '/student/resources' },
  { icon: Layers, label: 'Projects', to: '/student/projects' },
  { icon: Megaphone, label: 'Announcements', to: '/student/announcements' },
  { icon: Trophy, label: 'Certificates', to: '/student/certificates' },
  { icon: MessageSquare, label: 'Messages', to: '/student/messages' },
  { icon: CreditCard, label: 'Payments', to: '/student/payments' },
  { icon: User, label: 'Profile', to: '/student/profile' },
]

export default function StudentLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const loc = useLocation()
  const nav = useNavigate()
  const { user, clearAuth } = useAuthStore()

  const handleLogout = async () => {
    try { await authAPI.logout() } catch {}
    clearAuth()
    nav('/login')
    toast.success('Logged out')
  }

  const Sidebar = () => (
    <aside className="w-60 bg-ink-800 border-r border-white/[0.07] flex flex-col h-full">
      <div className="p-5 border-b border-white/[0.07]">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-600 to-cyan-500 flex items-center justify-center font-display font-bold text-white text-xs">M</div>
          <div>
            <div className="font-display font-bold text-white text-xs leading-none">Masterview</div>
            <div className="font-mono text-[9px] text-slate-600 mt-0.5">Student Portal</div>
          </div>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-0.5">
          {NAV.map(({ icon: Icon, label, to }) => {
            const isActive = loc.pathname === to || (to !== '/student/dashboard' && loc.pathname.startsWith(to))
            return (
              <Link key={to} to={to} className={`sidebar-item ${isActive ? 'active' : ''}`}>
                <Icon size={16} className="flex-shrink-0" />
                <span>{label}</span>
              </Link>
            )
          })}
        </div>
      </div>
      <div className="p-3 border-t border-white/[0.07]">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-7 h-7 rounded-full bg-brand-600/30 flex items-center justify-center text-brand-400 text-xs font-bold">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-white truncate">{user?.firstName} {user?.lastName}</div>
            <div className="text-[10px] text-slate-500 truncate">{user?.email}</div>
          </div>
        </div>
        <button onClick={handleLogout} className="sidebar-item w-full text-red-400 hover:text-red-300 hover:bg-red-500/10">
          <LogOut size={15}/> Sign Out
        </button>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen bg-ink-900 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="flex-shrink-0"><Sidebar /></div>
          <div className="flex-1 bg-black/60" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-ink-800 border-b border-white/[0.07] flex items-center justify-between px-4 flex-shrink-0">
          <button className="lg:hidden btn-ghost p-1.5" onClick={() => setSidebarOpen(true)}><Menu size={18}/></button>
          <div className="hidden sm:block text-sm font-medium text-slate-400">
            {NAV.find(n => n.to === loc.pathname)?.label ?? 'Student Portal'}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <NotificationBell/>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-5 lg:p-7">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
