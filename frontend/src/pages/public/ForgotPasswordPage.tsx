import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, CheckCircle2 } from 'lucide-react'
import { authAPI } from '../../services/api'
import toast from 'react-hot-toast'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authAPI.forgotPassword(email)
      // Backend intentionally returns the same generic message whether or not
      // the account exists, to avoid leaking which emails are registered.
      setSent(true)
    } catch (err: unknown) {
      const msg = (err as {response?:{data?:{message?:string}}})?.response?.data?.message ?? 'Something went wrong. Please try again.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-ink-900 grid-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="h-10 px-2.5 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/10">
              <img src="/logo.png" alt="M-CEL TECH" className="h-7 w-auto object-contain" />
            </div>
            <div className="text-left">
              <div className="font-display font-bold text-white text-base leading-none tracking-tight">M-CEL TECH</div>
              <div className="font-mono text-[9px] text-brand-400 font-semibold tracking-wider uppercase mt-0.5">ACADEMY</div>
            </div>
          </Link>
          <h1 className="font-display text-2xl font-bold text-white mb-1">Reset your password</h1>
          <p className="text-slate-500 text-sm">We'll email you a link to get back in</p>
        </div>
        <div className="card p-7">
          {sent ? (
            <div className="text-center py-2">
              <CheckCircle2 size={36} className="mx-auto text-emerald-400 mb-3" />
              <p className="text-slate-300 text-sm mb-1">If an account exists for <strong className="text-white">{email}</strong>, we've sent a password reset link.</p>
              <p className="text-slate-500 text-xs">Check your inbox (and spam folder). The link expires in 30 minutes.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Email</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input className="input pl-9" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base">
                {loading ? 'Sending...' : 'Send Reset Link'}
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
