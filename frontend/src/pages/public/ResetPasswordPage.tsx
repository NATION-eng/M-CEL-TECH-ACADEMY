import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { authAPI } from '../../services/api'
import toast from 'react-hot-toast'

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>()
  const nav = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      toast.error("Passwords don't match.")
      return
    }
    if (!token) {
      toast.error('Invalid or missing reset link.')
      return
    }
    setLoading(true)
    try {
      await authAPI.resetPassword(token, password)
      setDone(true)
      toast.success('Password reset! You can now log in.')
      setTimeout(() => nav('/login'), 2000)
    } catch (err: unknown) {
      const msg = (err as {response?:{data?:{message?:string}}})?.response?.data?.message ?? 'This reset link is invalid or has expired.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-ink-900 grid-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-600 to-cyan-500 flex items-center justify-center font-display font-bold text-white">M</div>
            <span className="font-display font-bold text-white text-lg">Masterview</span>
          </Link>
          <h1 className="font-display text-2xl font-bold text-white mb-1">Set a new password</h1>
          <p className="text-slate-500 text-sm">Choose something you haven't used before</p>
        </div>
        <div className="card p-7">
          {done ? (
            <div className="text-center py-2">
              <CheckCircle2 size={36} className="mx-auto text-emerald-400 mb-3" />
              <p className="text-slate-300 text-sm">Your password has been reset. Redirecting to sign in...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">New Password</label>
                <div className="relative">
                  <input className="input pr-10" type={showPw ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
                  <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">At least 8 characters.</p>
              </div>
              <div>
                <label className="label">Confirm New Password</label>
                <input className="input" type={showPw ? 'text' : 'password'} placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={8} />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base">
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}
          <p className="text-center text-slate-500 text-sm mt-5">
            <Link to="/login" className="text-brand-400 hover:text-brand-300">Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
