import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Clock, Loader2 } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { admissionsAPI } from '../../services/api'
import { SOCIAL_LINKS } from '../../config/socialLinks'
import toast from 'react-hot-toast'

const STEPS = [
  { num:'01', title:'Choose a Program', desc:'Browse our 5 training tracks and select the one aligned with your career goals.' },
  { num:'02', title:'Submit Application', desc:'Fill out a short application form. No prior experience required for entry-level badges.' },
  { num:'03', title:'Pay Your Deposit', desc:'You are taken straight to secure checkout — no waiting on a review step.' },
  { num:'04', title:'Account Created Instantly', desc:'The moment your deposit clears, your student account is created and emailed to you.' },
  { num:'05', title:'Start Learning', desc:'Set your password, log in, and join your cohort.' },
]

export default function AdmissionsPage() {
  const [form, setForm] = useState({ name:'', email:'', phone:'', program:'', mode:'', message:'' })
  const [redirecting, setRedirecting] = useState(false)

  const applyMut = useMutation({
    mutationFn: () => admissionsAPI.apply(form),
    onSuccess: async (res) => {
      const applicationRef = res.data?.data?.applicationRef
      if (!applicationRef) { toast.error('Something went wrong starting payment. Please try again.'); return }
      setRedirecting(true)
      try {
        const payRes = await admissionsAPI.initializePayment(applicationRef)
        const url = payRes.data?.data?.authorizationUrl
        if (url) { window.location.href = url; return }
        toast.error('Could not start payment. Please contact us to complete your application.')
      } catch (e: any) {
        toast.error(e?.response?.data?.message ?? 'Could not start payment. Please contact us to complete your application.')
      } finally {
        setRedirecting(false)
      }
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to submit application. Please try again.'),
  })
  const busy = applyMut.isPending || redirecting

  return (
    <div className="bg-ink-900 pt-20">
      <section className="section-pad">
        <div className="page-container max-w-5xl">
          <div className="text-center mb-14">
            <div className="section-eyebrow justify-center">Admissions</div>
            <h1 className="font-display text-4xl lg:text-5xl font-bold text-white mb-5">Apply to Masterview</h1>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">Limited cohort spots. No experience required. Just ambition and commitment.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-16">
            {STEPS.map(s => (
              <div key={s.num} className="card p-5 text-center">
                <div className="font-mono text-xs text-brand-400 mb-2">{s.num}</div>
                <div className="font-semibold text-white text-sm mb-2">{s.title}</div>
                <div className="text-xs text-slate-500 leading-relaxed">{s.desc}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Form */}
            <div className="card p-8">
              <h2 className="font-display text-xl font-bold text-white mb-6">Application Form</h2>
              <form className="space-y-4" onSubmit={e => { e.preventDefault(); applyMut.mutate() }}>
                  <div>
                    <label className="label">Full Name</label>
                    <input className="input" placeholder="Emeka Okonkwo" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Email</label>
                      <input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required/>
                    </div>
                    <div>
                      <label className="label">Phone</label>
                      <input className="input" placeholder="08012345678" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} required/>
                    </div>
                  </div>
                  <div>
                    <label className="label">Program of Interest</label>
                    <select className="input" value={form.program} onChange={e=>setForm({...form,program:e.target.value})} required>
                      <option value="">Select a program</option>
                      {['Software Development','Vibe Coding','Artificial Intelligence','Graphic Design','Video Editing'].map(p=><option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Preferred Mode</label>
                    <select className="input" value={form.mode} onChange={e=>setForm({...form,mode:e.target.value})} required>
                      <option value="">Select mode</option>
                      <option>Physical (Port Harcourt)</option>
                      <option>Online</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Tell us about yourself (optional)</label>
                    <textarea className="input h-20 resize-none" placeholder="Your background, goals, why Masterview..." value={form.message} onChange={e=>setForm({...form,message:e.target.value})}/>
                  </div>
                  <button type="submit" className="btn-accent w-full justify-center py-3 text-base" disabled={busy}>
                    {busy ? <><Loader2 size={16} className="animate-spin"/> {redirecting ? 'Redirecting to payment...' : 'Submitting...'}</> : <>Continue to Payment <ArrowRight size={16}/></>}
                  </button>
                  <p className="text-xs text-slate-500 text-center">You'll be taken straight to secure checkout for your deposit — no waiting on a review step.</p>
              </form>
            </div>

            {/* Info */}
            <div className="space-y-5">
              <div className="card p-6">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2"><Clock size={16} className="text-brand-400"/> Upcoming Cohort Dates</h3>
                <div className="space-y-3">
                  {[['Software Development','Feb 3, 2025'],['Vibe Coding','Feb 10, 2025'],['AI','Mar 3, 2025'],['Graphic Design','Feb 17, 2025'],['Video Editing','Mar 10, 2025']].map(([p,d])=>(
                    <div key={p} className="flex justify-between text-sm">
                      <span className="text-slate-400">{p}</span>
                      <span className="text-white font-medium">{d}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card p-6">
                <h3 className="font-semibold text-white mb-3">Payment Plans</h3>
                <div className="space-y-3">
                  {[['Basic','₦80,000','₦50,000 deposit'],['Intermediate','₦150,000','₦90,000 deposit'],['Advanced','₦250,000','₦150,000 deposit']].map(([t,fee,dep])=>(
                    <div key={t} className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">{t}</span>
                      <div className="text-right"><div className="text-white font-mono font-medium">{fee}</div><div className="text-xs text-emerald-400">{dep}</div></div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-3 border-t border-white/[0.06] pt-3">Full access unlocked once deposit is received. Balance due before program completion.</p>
              </div>
              <div className="card p-6 bg-brand-600/10 border-brand-600/20">
                <p className="text-sm text-brand-300 font-medium mb-1">Need help deciding?</p>
                <p className="text-xs text-slate-400 mb-3">Talk to an advisor before you apply. Completely free, no pressure.</p>
                <a href={SOCIAL_LINKS.whatsapp} target="_blank" rel="noopener noreferrer" className="btn-primary text-xs py-2">Chat with an Advisor</a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
