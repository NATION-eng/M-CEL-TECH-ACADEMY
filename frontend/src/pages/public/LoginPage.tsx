import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, GraduationCap, Presentation, Shield, Crown } from 'lucide-react'
import { useAuthStore } from '../../store/auth.store'
import { authAPI } from '../../services/api'
import GoogleAuthButton from '../../components/GoogleAuthButton'
import toast from 'react-hot-toast'

type Portal = 'student' | 'instructor' | 'admin' | 'super_admin'

const ROLE_LABEL: Record<Portal, string> = { student: 'Student', instructor: 'Instructor', admin: 'Admin', super_admin: 'Super Admin' }
const ROLE_ICON: Record<Portal, typeof GraduationCap> = { student: GraduationCap, instructor: Presentation, admin: Shield, super_admin: Crown }
const ROLE_DASHBOARD: Record<Portal, string> = { student: '/student/dashboard', instructor: '/instructor/dashboard', admin: '/admin/dashboard', super_admin: '/superadmin/dashboard' }

interface LoginPageProps {
  /** When set, this page only accepts accounts with exactly this role — a
   * correct password for the wrong portal is rejected with a clear message
   * rather than silently redirecting somewhere the visitor didn't ask for.
   * Omitted for the general /login (students / anyone with no dedicated
   * portal login memorized), which accepts any role and redirects by it. */
  portal?: Portal
}

export default function LoginPage({ portal }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const nav = useNavigate()

  const Icon = portal ? ROLE_ICON[portal] : GraduationCap
  const label = portal ? ROLE_LABEL[portal] : null

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await authAPI.login(email, password, rememberMe)
      const role: Portal = data.data.user.role

      if (portal && role !== portal && !(portal === 'admin' && role === 'super_admin')) {
        toast.error(`This account isn't registered as ${label === 'Admin' ? 'an' : 'a'} ${label}. Use the ${ROLE_LABEL[role] ?? 'correct'} portal to sign in.`)
        setLoading(false)
        return
      }

      setAuth(data.data.user, data.data.accessToken, data.data.refreshToken, rememberMe)
      toast.success('Welcome back!')
      nav(ROLE_DASHBOARD[role] ?? '/')
    } catch (err: unknown) {
      const msg = (err as {response?:{data?:{message?:string}}})?.response?.data?.message ?? 'Login failed'
      toast.error(msg)
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-ink-900 grid-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-600 to-cyan-500 flex items-center justify-center font-display font-bold text-white">M</div>
            <span className="font-display font-bold text-white text-lg">Masterview</span>
          </Link>
          {label && (
            <div className="inline-flex items-center gap-1.5 badge badge-indigo mb-3"><Icon size={12}/> {label} Portal</div>
          )}
          <h1 className="font-display text-2xl font-bold text-white mb-1">Welcome back</h1>
          <p className="text-slate-500 text-sm">{label ? `Sign in to your ${label.toLowerCase()} account` : 'Sign in to your portal'}</p>
        </div>
        <div className="card p-7">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required/>
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input className="input pr-10" type={showPw ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required/>
                <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="rounded"/>
                  <span className="text-xs text-slate-400">Remember me</span>
                </label>
                <Link to="/forgot-password" className="text-xs text-brand-400 hover:text-brand-300">Forgot password?</Link>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          {!portal && (
            <div className="mt-5">
              <GoogleAuthButton label="Or sign in with" />
            </div>
          )}
          {!portal ? (
            <p className="text-center text-slate-500 text-sm mt-5">
              Don't have an account? <Link to="/register" className="text-brand-400 hover:text-brand-300">Register</Link>
            </p>
          ) : (
            <p className="text-center text-slate-500 text-sm mt-5">
              <Link to="/login" className="text-brand-400 hover:text-brand-300">Student login</Link>
            </p>
          )}
        </div>
        {portal !== 'super_admin' && (
          <p className="text-center text-slate-600 text-xs mt-6 space-x-3">
            {portal !== 'instructor' && <Link to="/instructor/login" className="hover:text-slate-400">Instructor Login</Link>}
            {portal !== 'admin' && <Link to="/admin/login" className="hover:text-slate-400">Admin Login</Link>}
          </p>
        )}
      </div>
    </div>
  )
}
