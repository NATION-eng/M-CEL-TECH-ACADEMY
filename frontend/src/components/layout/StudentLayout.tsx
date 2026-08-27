import { useState, useEffect, useCallback } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, BookOpen, FileText, Trophy, FolderOpen, CreditCard, User, LogOut, Menu, X, Brain, Layers, MessageSquare, Megaphone } from 'lucide-react'
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
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-600 to-cyan-500 flex items-center justify-center font-display font-bold text-white text-xs">M</div>
          <div>
            <div className="font-display font-bold text-white text-xs leading-none">Masterview</div>
            <div className="font-mono text-[9px] text-slate-600 mt-0.5">Student Portal</div>
          </div>
        </Link>
        <button className="lg:hidden btn-ghost p-1" onClick={closeSidebar} aria-label="Close menu"><X size={16} /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-0.5">
          {NAV.map(({ icon: Icon, label, to }) => {
            const isActive = loc.pathname === to || (to !== '/student/dashboard' && loc.pathname.startsWith(to))
            return (
              <Link key={to} to={to} className={`sidebar-item ${isActive ? 'active' : ''}`}>
                <Icon size={16} className="flex-shrink-0" /><span>{label}</span>
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
      <div className="hidden lg:flex flex-col flex-shrink-0"><SidebarContent /></div>
      {sidebarOpen && (
        <div className="sidebar-overlay lg:hidden" role="dialog" aria-modal="true">
          <div className="sidebar-drawer"><SidebarContent /></div>
          <div className="flex-1 bg-black/60" onClick={closeSidebar} />
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 bg-ink-800 border-b border-white/[0.07] flex items-center justify-between px-4 flex-shrink-0">
          <button className="lg:hidden btn-ghost p-1.5" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><Menu size={18}/></button>
          <div className="hidden sm:block text-sm font-medium text-slate-400">
            {NAV.find(n => loc.pathname === n.to || (n.to !== '/student/dashboard' && loc.pathname.startsWith(n.to)))?.label ?? 'Student Portal'}
          </div>
          <div className="flex items-center gap-2 ml-auto"><NotificationBell/></div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-7"><Outlet /></main>
      </div>
    </div>
  )
}
