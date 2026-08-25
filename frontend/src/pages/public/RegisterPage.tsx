import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '../../store/auth.store'
import { authAPI } from '../../services/api'
import GoogleAuthButton from '../../components/GoogleAuthButton'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const [form, setForm] = useState({ firstName:'', lastName:'', email:'', phone:'', password:'', role:'student' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const nav = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true)
    try {
      const { data } = await authAPI.register(form)
      setAuth(data.data.user, data.data.accessToken, data.data.refreshToken, true)
      toast.success('Account created!')
      nav('/student/dashboard')
    } catch (err: unknown) {
      toast.error((err as {response?:{data?:{message?:string}}})?.response?.data?.message ?? 'Registration failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-ink-900 grid-bg flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-600 to-cyan-500 flex items-center justify-center font-display font-bold text-white">M</div>
            <span className="font-display font-bold text-white text-lg">Masterview</span>
          </Link>
          <h1 className="font-display text-2xl font-bold text-white mb-1">Create your account</h1>
          <p className="text-slate-500 text-sm">Start your digital transformation</p>
        </div>
        <div className="card p-7">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">First Name</label><input className="input" placeholder="Emeka" value={form.firstName} onChange={e => setForm({...form,firstName:e.target.value})} required/></div>
              <div><label className="label">Last Name</label><input className="input" placeholder="Okafor" value={form.lastName} onChange={e => setForm({...form,lastName:e.target.value})} required/></div>
            </div>
            <div><label className="label">Email</label><input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm({...form,email:e.target.value})} required/></div>
            <div><label className="label">Phone</label><input className="input" placeholder="08012345678" value={form.phone} onChange={e => setForm({...form,phone:e.target.value})}/></div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input className="input pr-10" type={showPw ? 'text' : 'password'} placeholder="Min. 8 characters" value={form.password} onChange={e => setForm({...form,password:e.target.value})} required minLength={8}/>
                <button type="button" onClick={() => setShowPw(p=>!p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
          <div className="mt-5">
            <GoogleAuthButton label="Or sign up with" />
          </div>
          <p className="text-center text-slate-500 text-sm mt-5">
            Already have an account? <Link to="/login" className="text-brand-400 hover:text-brand-300">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
