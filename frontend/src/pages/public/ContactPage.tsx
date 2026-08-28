import { useState } from 'react'
import { MapPin, Mail, Phone, MessageCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { SOCIAL_LINKS } from '../../config/socialLinks'
import { useMutation } from '@tanstack/react-query'
import { contactAPI } from '../../services/api'
import toast from 'react-hot-toast'

export default function ContactPage() {
  const [form, setForm] = useState({ name:'', email:'', subject:'', message:'' })
  const [sent, setSent] = useState(false)

  const sendMut = useMutation({
    mutationFn: () => contactAPI.send(form),
    onSuccess: () => setSent(true),
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to send. Please try again.'),
  })

  return (
    <div className="bg-ink-900 pt-20">
      <section className="section-pad">
        <div className="page-container max-w-5xl">
          <div className="section-eyebrow">Get in Touch</div>
          <h1 className="font-display text-4xl font-bold text-white mb-10">Contact Us</h1>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <div className="card p-8">
                {sent ? (
                  <div className="text-center py-6">
                    <CheckCircle2 size={48} className="text-emerald-400 mx-auto mb-4"/>
                    <h3 className="font-display text-xl font-bold text-white mb-2">Message Sent!</h3>
                    <p className="text-slate-400 text-sm">We'll get back to you within 24 hours.</p>
                  </div>
                ) : (
                  <form className="space-y-4" onSubmit={e => { e.preventDefault(); sendMut.mutate() }}>
                    <div><label className="label">Name</label><input className="input" placeholder="Your name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/></div>
                    <div><label className="label">Email</label><input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required/></div>
                    <div><label className="label">Subject</label><input className="input" placeholder="How can we help?" value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})} required/></div>
                    <div><label className="label">Message</label><textarea className="input h-28 resize-none" placeholder="Tell us more..." value={form.message} onChange={e=>setForm({...form,message:e.target.value})} required/></div>
                    <button type="submit" className="btn-primary w-full justify-center py-3" disabled={sendMut.isPending}>
                      {sendMut.isPending ? <Loader2 size={16} className="animate-spin"/> : 'Send Message'}
                    </button>
                  </form>
                )}
              </div>
            </div>
            <div className="space-y-5">
              <div className="card p-6">
                <h3 className="font-semibold text-white mb-4">Contact Information</h3>
                <div className="space-y-4">
                  <div className="flex gap-3 text-sm">
                    <MapPin size={16} className="text-brand-400 flex-shrink-0 mt-0.5"/>
                    <div>
                      <div className="text-slate-500 text-xs mb-0.5">Campus Address</div>
                      <div className="text-slate-300">2nd Floor, Salije Plaza, Ada George Road, Port Harcourt, Rivers State, Nigeria</div>
                    </div>
                  </div>

                  <a href={`tel:${SOCIAL_LINKS.phoneIntl}`} className="flex gap-3 text-sm group">
                    <Phone size={16} className="text-brand-400 flex-shrink-0 mt-0.5"/>
                    <div>
                      <div className="text-slate-500 text-xs mb-0.5">Phone Line</div>
                      <div className="text-slate-300 group-hover:text-brand-400 transition-colors">{SOCIAL_LINKS.phone}</div>
                    </div>
                  </a>

                  <a href={SOCIAL_LINKS.whatsapp} target="_blank" rel="noopener noreferrer" className="flex gap-3 text-sm group">
                    <MessageCircle size={16} className="text-emerald-400 flex-shrink-0 mt-0.5"/>
                    <div>
                      <div className="text-slate-500 text-xs mb-0.5">WhatsApp Advisor</div>
                      <div className="text-slate-300 group-hover:text-emerald-400 transition-colors">Chat live with an admissions advisor</div>
                    </div>
                  </a>
                </div>

                <div className="mt-6 pt-6 border-t border-white/[0.08]">
                  <h4 className="text-xs font-semibold text-white mb-3 uppercase tracking-wider">Department Emails</h4>
                  <div className="space-y-2.5">
                    <a href="mailto:contact@mceltech.com" className="flex items-center justify-between text-xs p-2 rounded-lg bg-ink-700/50 hover:bg-ink-700 text-slate-300 hover:text-white transition-colors">
                      <span className="text-slate-400">General Inquiries:</span>
                      <span className="font-mono text-brand-400">contact@mceltech.com</span>
                    </a>
                    <a href="mailto:training@mceltech.com" className="flex items-center justify-between text-xs p-2 rounded-lg bg-ink-700/50 hover:bg-ink-700 text-slate-300 hover:text-white transition-colors">
                      <span className="text-slate-400">Training & Admissions:</span>
                      <span className="font-mono text-brand-400">training@mceltech.com</span>
                    </a>
                    <a href="mailto:support@mceltech.com" className="flex items-center justify-between text-xs p-2 rounded-lg bg-ink-700/50 hover:bg-ink-700 text-slate-300 hover:text-white transition-colors">
                      <span className="text-slate-400">Technical Support:</span>
                      <span className="font-mono text-brand-400">support@mceltech.com</span>
                    </a>
                    <a href="mailto:customercare@mceltech.com" className="flex items-center justify-between text-xs p-2 rounded-lg bg-ink-700/50 hover:bg-ink-700 text-slate-300 hover:text-white transition-colors">
                      <span className="text-slate-400">Customer Care:</span>
                      <span className="font-mono text-brand-400">customercare@mceltech.com</span>
                    </a>
                    <a href="mailto:complain@mceltech.com" className="flex items-center justify-between text-xs p-2 rounded-lg bg-ink-700/50 hover:bg-ink-700 text-slate-300 hover:text-white transition-colors">
                      <span className="text-slate-400">Complaints & Grievances:</span>
                      <span className="font-mono text-brand-400">complain@mceltech.com</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
