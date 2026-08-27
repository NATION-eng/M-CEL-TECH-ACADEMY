import { useState, useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, ChevronDown, LogIn, Twitter, Instagram, Facebook, Linkedin, Youtube, Mail, Phone, MessageCircle } from 'lucide-react'
import { useAuthStore } from '../../store/auth.store'
import { SOCIAL_LINKS } from '../../config/socialLinks'

const NAV = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
  { label: 'Programs', to: '/programs', sub: [
    { label: 'Software Development', to: '/programs#software' },
    { label: 'Vibe Coding', to: '/programs#vibe' },
    { label: 'Artificial Intelligence', to: '/programs#ai' },
    { label: 'Graphic Design', to: '/programs#design' },
    { label: 'Video Editing', to: '/programs#video' },
  ]},
  { label: 'Admissions', to: '/admissions' },
  { label: 'Events', to: '/events' },
  { label: 'Blog', to: '/blog' },
  { label: 'Contact', to: '/contact' },
]

export default function PublicLayout() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [progOpen, setProgOpen] = useState(false)
  const loc = useLocation()
  const nav = useNavigate()
  const { isAuthenticated, user } = useAuthStore()

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  // Close menus on route change
  useEffect(() => { setOpen(false); setProgOpen(false) }, [loc.pathname])

  // Lock body scroll when mobile menu is open; ESC closes both dropdowns
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); setProgOpen(false) } }
      window.addEventListener('keydown', onKey)
      return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey) }
    } else {
      document.body.style.overflow = ''
    }
  }, [open])

  const portalPath = user ? `/${user.role === 'super_admin' ? 'superadmin' : user.role}/dashboard` : '/portal'

  return (
    <div className="min-h-screen bg-ink-900 flex flex-col">
      {/* HEADER */}
      <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-ink-900/95 backdrop-blur-xl border-b border-white/[0.06]' : 'bg-transparent'}`}>
        <div className="page-container">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="h-9 px-2 bg-white rounded-lg flex items-center justify-center shadow-md group-hover:shadow-brand-500/20 transition-all">
                <img src="/logo.png" alt="M-CEL TECH" className="h-6 w-auto object-contain" />
              </div>
              <div>
                <div className="font-display font-bold text-white text-[14px] leading-none tracking-tight">M-CEL TECH</div>
                <div className="font-mono text-[9px] text-brand-400 font-semibold leading-none mt-0.5 tracking-wider uppercase">ACADEMY</div>
              </div>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-0.5">
              {NAV.map(link => link.sub ? (
                <div key={link.label} className="relative">
                  <button onClick={() => setProgOpen(p => !p)} className="btn-ghost flex items-center gap-1">
                    {link.label} <ChevronDown size={13} className={`transition-transform duration-200 ${progOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {progOpen && (
                    <div className="absolute top-full left-0 mt-2 w-60 card py-1.5 shadow-2xl shadow-black/50 z-50">
                      {link.sub.map(s => (
                        <Link key={s.label} to={s.to} className="block px-4 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors">{s.label}</Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link key={link.label} to={link.to} className={`btn-ghost ${loc.pathname === link.to ? 'text-white bg-white/[0.05]' : ''}`}>{link.label}</Link>
              ))}
            </nav>

            {/* CTA */}
            <div className="hidden lg:flex items-center gap-2">
              {isAuthenticated ? (
                <button onClick={() => nav(portalPath)} className="btn-primary">Portal →</button>
              ) : (
                <>
                  <Link to="/login" className="btn-ghost"><LogIn size={15}/> Sign In</Link>
                  <Link to="/admissions" className="btn-accent">Enroll Now</Link>
                </>
              )}
            </div>

            <button className="lg:hidden btn-ghost p-2" onClick={() => setOpen(o => !o)}>
              {open ? <X size={18}/> : <Menu size={18}/>}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="lg:hidden bg-ink-800 border-t border-white/[0.06] px-4 py-3">
            {NAV.map(l => <Link key={l.label} to={l.to} className="block py-2.5 px-2 text-slate-300 hover:text-white text-sm font-medium">{l.label}</Link>)}
            <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-white/[0.06]">
              {isAuthenticated
                ? <Link to={portalPath} className="btn-primary text-center">Go to Portal</Link>
                : <><Link to="/login" className="btn-outline text-center">Sign In</Link><Link to="/admissions" className="btn-accent text-center">Enroll Now</Link></>}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 pt-16"><Outlet /></main>

      {/* FOOTER */}
      <footer className="bg-ink-900 border-t border-white/[0.06]">
        <div className="page-container py-14">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 sm:gap-10 mb-12">
            <div className="col-span-2 sm:col-span-3 lg:col-span-2">
              <Link to="/" className="flex items-center gap-2.5 mb-4 w-fit">
                <div className="h-9 px-2 bg-white rounded-lg flex items-center justify-center shadow-md">
                  <img src="/logo.png" alt="M-CEL TECH" className="h-6 w-auto object-contain" />
                </div>
                <div>
                  <span className="font-display font-bold text-white text-base tracking-tight block leading-none">M-CEL TECH</span>
                  <span className="font-mono text-[9px] text-brand-400 font-semibold tracking-wider uppercase">ACADEMY</span>
                </div>
              </Link>
              <p className="text-slate-500 text-sm leading-relaxed max-w-xs">Transforming ambitious minds into job-ready digital professionals through world-class technology training.</p>
              <div className="flex gap-2 mt-5">
                {[
                  { Icon: Twitter, href: SOCIAL_LINKS.x, label: 'X (Twitter)' },
                  { Icon: Instagram, href: SOCIAL_LINKS.instagram, label: 'Instagram' },
                  { Icon: Facebook, href: SOCIAL_LINKS.facebook, label: 'Facebook' },
                  { Icon: Linkedin, href: SOCIAL_LINKS.linkedin, label: 'LinkedIn' },
                  { Icon: Youtube, href: SOCIAL_LINKS.youtube, label: 'YouTube' },
                ].map(({ Icon, href, label }) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="w-8 h-8 rounded-lg bg-white/[0.05] hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                    <Icon size={15}/>
                  </a>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-white mb-4 uppercase tracking-wider">Programs</h4>
              <ul className="space-y-2">
                {['Software Development','Vibe Coding','Artificial Intelligence','Graphic Design','Video Editing'].map(p => (
                  <li key={p}><Link to="/programs" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">{p}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-white mb-4 uppercase tracking-wider">Academy</h4>
              <ul className="space-y-2">
                {[['About Us','/about'],['Admissions','/admissions'],['Events','/events'],['Blog','/blog'],['Contact','/contact'],['Verify Certificate','/verify']].map(([l,h]) => (
                  <li key={l}><Link to={h} className="text-sm text-slate-500 hover:text-slate-300 transition-colors">{l}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-white mb-4 uppercase tracking-wider">Contact</h4>
              <ul className="space-y-2.5">
                <li><a href={`mailto:${SOCIAL_LINKS.email}`} className="text-sm text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-2"><Mail size={13} className="shrink-0"/> {SOCIAL_LINKS.email}</a></li>
                <li><a href={`tel:${SOCIAL_LINKS.phoneIntl}`} className="text-sm text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-2"><Phone size={13} className="shrink-0"/> {SOCIAL_LINKS.phone}</a></li>
                <li><a href={SOCIAL_LINKS.whatsapp} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-500/80 hover:text-emerald-400 transition-colors flex items-center gap-2"><MessageCircle size={13} className="shrink-0"/> Chat on WhatsApp</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/[0.06] pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-slate-600 text-xs">© {new Date().getFullYear()} M-CEL TECH ACADEMY. All rights reserved.</p>
            <div className="flex gap-5">
              {['Privacy Policy','Terms of Use'].map(l => <a key={l} href="#" className="text-slate-600 hover:text-slate-400 text-xs transition-colors">{l}</a>)}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
