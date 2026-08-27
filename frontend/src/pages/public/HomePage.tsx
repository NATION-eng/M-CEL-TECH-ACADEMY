import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, ChevronDown, Star, Users, BookOpen, Trophy, Zap, Globe, Clock, Code2, Sparkles, Bot, Palette, Clapperboard, Compass } from 'lucide-react'
import { SOCIAL_LINKS } from '../../config/socialLinks'

// --- Typewriter hook ---
function useTypewriter(words: string[], speed = 80) {
  const [display, setDisplay] = useState('')
  const [wordIdx, setWordIdx] = useState(0)
  const [charIdx, setCharIdx] = useState(0)
  const [deleting, setDeleting] = useState(false)
  useEffect(() => {
    const word = words[wordIdx]
    const delay = deleting ? speed / 2 : speed
    const timer = setTimeout(() => {
      if (!deleting) {
        setDisplay(word.slice(0, charIdx + 1))
        if (charIdx + 1 === word.length) { setTimeout(() => setDeleting(true), 1800) }
        else setCharIdx(c => c + 1)
      } else {
        setDisplay(word.slice(0, charIdx - 1))
        if (charIdx === 0) { setDeleting(false); setWordIdx(i => (i + 1) % words.length) }
        else setCharIdx(c => c - 1)
      }
    }, delay)
    return () => clearTimeout(timer)
  }, [charIdx, deleting, wordIdx, words, speed])
  return display
}

// --- Terminal card ---
const CODE_LINES = [
  { t: 300,  color: '#64748b', text: '// Week 3 · Full Stack Development' },
  { t: 600,  color: '#818cf8', text: 'const app = express()' },
  { t: 900,  color: '#818cf8', text: "app.use(cors())" },
  { t: 1200, color: '#818cf8', text: "app.use(express.json())" },
  { t: 1500, color: '#64748b', text: '' },
  { t: 1800, color: '#34d399', text: "app.get('/students', auth, async (req, res) => {" },
  { t: 2100, color: '#f8fafc', text: "  const students = await Student.find()" },
  { t: 2400, color: '#f8fafc', text: "  res.json({ success: true, data: students })" },
  { t: 2700, color: '#34d399', text: '})'  },
  { t: 3000, color: '#64748b', text: '' },
  { t: 3300, color: '#38bdf8', text: "// Badge 3 unlocked: Full Stack Dev" },
]

function TerminalCard() {
  const [visible, setVisible] = useState<number[]>([])
  useEffect(() => {
    CODE_LINES.forEach(({ t }, i) => {
      setTimeout(() => setVisible(v => [...v, i]), t)
    })
  }, [])
  return (
    <div className="rounded-2xl bg-[#060C1A] border border-white/[0.1] shadow-2xl shadow-brand-600/10 overflow-hidden animate-float">
      <div className="flex items-center gap-1.5 px-4 py-3 bg-ink-800 border-b border-white/[0.07]">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/70"/>
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70"/>
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/70"/>
        <span className="ml-3 font-mono text-[10px] text-slate-500">server.js — Masterview Academy</span>
      </div>
      <div className="p-5 font-mono text-xs leading-6 min-h-[260px]">
        {CODE_LINES.map((line, i) => (
          <div key={i} className={`transition-all duration-300 ${visible.includes(i) ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`}>
            <span style={{ color: line.color }}>{line.text}&nbsp;</span>
            {i === CODE_LINES.length - 1 && visible.includes(i) && (
              <span className="inline-block w-1.5 h-4 bg-brand-400 animate-pulse ml-0.5 align-middle"/>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const PROGRAMS = [
  { icon: Code2, title:'Software Development', desc:'From zero to full-stack engineer in 3 badge levels.', badges:['Web Foundations','Frontend Dev','Full Stack Dev'], color:'from-blue-600 to-indigo-600' },
  { icon: Sparkles, title:'Vibe Coding', desc:'Build real products with AI-assisted development workflows.', badges:['AI Coding Foundations','AI Workflow Eng.','AI Product Eng.'], color:'from-purple-600 to-pink-600' },
  { icon: Bot, title:'Artificial Intelligence', desc:'Understand and build intelligent systems from the ground up.', badges:['AI Fundamentals','ML Engineering','AI Applications'], color:'from-cyan-600 to-blue-600' },
  { icon: Palette, title:'Graphic Design', desc:'Master visual communication, branding, and digital design.', badges:['Design Principles','Brand Identity','Digital Media'], color:'from-pink-600 to-rose-600' },
  { icon: Clapperboard, title:'Video Editing', desc:'Professional post-production and content creation skills.', badges:['Edit Foundations','Color & Sound','Content Production'], color:'from-orange-600 to-amber-600' },
]

const STATS = [
  { num:'500+', label:'Students Trained' },
  { num:'5', label:'Programs' },
  { num:'92%', label:'Job Placement Rate' },
  { num:'48', label:'Expert Instructors' },
]

const WHY = [
  { icon: Trophy, title:'Badge-Based Learning', desc:'Progress through structured badge levels that prove real competency at each stage.' },
  { icon: Users, title:'Expert Instructors', desc:'Learn from industry professionals with years of hands-on experience in their fields.' },
  { icon: Globe, title:'Physical & Online', desc:'Flexible delivery — attend our Port Harcourt campus or join fully online from anywhere.' },
  { icon: BookOpen, title:'Dynamic Curriculum', desc:'Always-current content updated by instructors in real-time, not outdated textbooks.' },
  { icon: Zap, title:'Capstone Projects', desc:'Build real portfolio projects that demonstrate skills to employers from day one.' },
  { icon: Clock, title:'Career Support', desc:'Interview prep, portfolio reviews, and job placement assistance after graduation.' },
]

const TESTIMONIALS = [
  { name:'Chukwuemeka Obi', role:'Frontend Dev @ Flutterwave', text:'Masterview\'s structured badge system forced me to actually master each level before moving on. That rigor is why I got hired.', rating: 5 },
  { name:'Adaeze Nwosu', role:'UI/UX Designer @ Paystack', text:'I went from knowing nothing about design to landing a role at one of Nigeria\'s top fintechs in 8 months. The instructors are genuinely world-class.', rating: 5 },
  { name:'Babatunde Adeyemi', role:'ML Engineer @ IrokoTV', text:'The AI track is no joke. Real hands-on projects, real feedback. I shipped my first ML model before I even graduated.', rating: 5 },
]

const COHORTS = [
  { program:'Software Development', start:'Feb 3, 2025', mode:'Physical + Online', spots:12, status:'open' },
  { program:'Vibe Coding', start:'Feb 10, 2025', mode:'Online', spots:8, status:'open' },
  { program:'Artificial Intelligence', start:'Mar 3, 2025', mode:'Physical', spots:15, status:'open' },
  { program:'Graphic Design', start:'Feb 17, 2025', mode:'Online', spots:20, status:'filling' },
  { program:'Video Editing', start:'Mar 10, 2025', mode:'Physical', spots:3, status:'filling' },
]

const FAQ = [
  { q:'Do I need prior experience to enroll?', a:'No prior experience required for Badge 1 of any track. We start from absolute zero and build up progressively.' },
  { q:'How long does each program take?', a:'Each badge takes approximately 4–6 weeks. A full 3-badge track takes around 4–6 months depending on pace.' },
  { q:'Can I pay in installments?', a:'Yes. We require a deposit of more than 50% of the course fee to unlock full access, with the balance payable before program completion.' },
  { q:'Is there a physical campus?', a:'Yes, we are based in Port Harcourt, Rivers State. We also offer a 100% online option for all programs.' },
  { q:'What happens after I complete a program?', a:'You receive a verifiable digital certificate, access to our alumni network, and dedicated career support including CV reviews and job referrals.' },
  { q:'Are the instructors active professionals?', a:'Every instructor at Masterview is currently working in their field. We do not hire instructors who only teach.' },
]

export default function HomePage() {
  const typed = useTypewriter(['Digital Professional.','Software Developer.','AI Engineer.','Product Designer.','Full Stack Dev.'])
  const [openFaq, setOpenFaq] = useState<number|null>(null)

  return (
    <div className="bg-ink-900">
      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center overflow-hidden grid-bg">
        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-brand-600/8 blur-[120px] pointer-events-none"/>
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-cyan-500/5 blur-[100px] pointer-events-none"/>

        <div className="page-container relative z-10 py-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left */}
            <div>
              <div className="inline-flex items-center gap-2 bg-brand-600/10 border border-brand-600/20 rounded-full px-3.5 py-1.5 mb-8">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
                <span className="font-mono text-xs text-brand-300">Cohort 8 now enrolling — Limited spots</span>
              </div>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-[56px] font-bold leading-[1.08] tracking-tight text-white mb-2">
                Become a Job-Ready
              </h1>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-[56px] font-bold leading-[1.08] tracking-tight mb-8">
                <span className="bg-gradient-to-r from-brand-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
                  {typed}<span className="animate-pulse">|</span>
                </span>
              </h1>

              <p className="text-slate-400 text-lg leading-relaxed max-w-lg mb-10">
                Masterview Digital Innovation Academy trains you in the exact skills Nigerian tech companies are hiring for — through structured badge levels, real projects, and industry mentorship.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-12">
                <Link to="/admissions" className="btn-accent text-base px-7 py-3.5">
                  Enroll Now <ArrowRight size={17}/>
                </Link>
                <Link to="/programs" className="btn-outline text-base px-7 py-3.5">
                  Explore Programs
                </Link>
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-3">
                {['Badge-based progression','Real project portfolio','Physical & online delivery','Job placement support'].map(f => (
                  <div key={f} className="flex items-center gap-2 text-sm text-slate-400">
                    <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0"/> {f}
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Terminal */}
            <div className="lg:block hidden">
              <TerminalCard />
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="border-y border-white/[0.06] bg-ink-800/50">
        <div className="page-container py-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {STATS.map(({ num, label }) => (
              <div key={label} className="text-center">
                <div className="font-display text-3xl lg:text-4xl font-bold text-white mb-1">{num}</div>
                <div className="text-sm text-slate-500">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROGRAMS ── */}
      <section className="section-pad">
        <div className="page-container">
          <div className="text-center mb-14">
            <div className="section-eyebrow justify-center">Training Tracks</div>
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-white mb-4">5 Programs. One Academy.</h2>
            <p className="text-slate-400 max-w-xl mx-auto">Every program is structured in badge levels with real projects, live instruction, and a verifiable certificate at completion.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {PROGRAMS.map((p) => (
              <div key={p.title} className="card-hover p-6 group">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${p.color} flex items-center justify-center text-white mb-5 group-hover:scale-110 transition-transform`}>
                  <p.icon size={20}/>
                </div>
                <h3 className="font-display text-lg font-semibold text-white mb-2">{p.title}</h3>
                <p className="text-sm text-slate-400 mb-5 leading-relaxed">{p.desc}</p>
                <div className="flex flex-col gap-1.5">
                  {p.badges.map((b, i) => (
                    <div key={b} className="flex items-center gap-2.5 text-xs text-slate-500">
                      <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${p.color} flex items-center justify-center text-white font-bold text-[9px]`}>{i+1}</div>
                      {b}
                    </div>
                  ))}
                </div>
                <Link to="/programs" className="inline-flex items-center gap-1 text-sm text-brand-400 hover:text-brand-300 mt-5 font-medium transition-colors">
                  Learn more <ArrowRight size={13}/>
                </Link>
              </div>
            ))}
            {/* CTA card */}
            <div className="card p-6 flex flex-col items-center justify-center text-center bg-gradient-to-br from-brand-600/15 to-cyan-600/10 border-brand-600/25">
              <div className="w-11 h-11 rounded-xl bg-brand-600/15 border border-brand-600/20 flex items-center justify-center text-brand-400 mb-4">
                <Compass size={20}/>
              </div>
              <h3 className="font-display text-lg font-semibold text-white mb-2">Not sure which to pick?</h3>
              <p className="text-sm text-slate-400 mb-5">Talk to our advisors and we'll match you to the right track for your goals.</p>
              <a href={SOCIAL_LINKS.whatsapp} target="_blank" rel="noopener noreferrer" className="btn-primary text-sm">Talk to an Advisor</a>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHY MASTERVIEW ── */}
      <section className="section-pad bg-ink-800/30">
        <div className="page-container">
          <div className="text-center mb-14">
            <div className="section-eyebrow justify-center">Why Choose Us</div>
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-white mb-4">Built for the job market,<br/>not just the classroom.</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {WHY.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card-hover p-6">
                <div className="w-10 h-10 rounded-xl bg-brand-600/15 border border-brand-600/20 flex items-center justify-center text-brand-400 mb-4">
                  <Icon size={18}/>
                </div>
                <h3 className="font-display text-base font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── UPCOMING COHORTS ── */}
      <section className="section-pad">
        <div className="page-container">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <div className="section-eyebrow">Enrollment</div>
              <h2 className="font-display text-2xl lg:text-3xl font-bold text-white">Upcoming Cohorts</h2>
            </div>
            <Link to="/admissions" className="btn-outline text-sm">View all cohorts</Link>
          </div>

          {/* Mobile Card Layout (< sm) */}
          <div className="space-y-3 sm:hidden">
            {COHORTS.map((c) => (
              <div key={c.program} className="card p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-white text-sm">{c.program}</h3>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                      <Clock size={12} className="text-slate-500"/>
                      Starts: <span className="text-slate-200 font-medium">{c.start}</span>
                    </p>
                  </div>
                  <span className={`badge shrink-0 text-[10px] ${c.mode.includes('Online') ? 'badge-indigo' : 'badge-cyan'}`}>
                    {c.mode}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.06]">
                  <span className={`badge text-[11px] ${c.status === 'filling' ? 'badge-amber' : 'badge-green'}`}>
                    {c.spots} spots left {c.status === 'filling' && '· Filling fast'}
                  </span>
                  <Link to="/admissions" className="btn-primary text-xs py-1.5 px-4 font-medium">
                    Apply Now
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Tablet & Desktop Table Layout (>= sm) */}
          <div className="hidden sm:block card overflow-hidden">
            <div className="tbl-wrap">
              <table className="tbl w-full">
                <thead>
                  <tr>
                    <th>Program</th>
                    <th>Start Date</th>
                    <th>Mode</th>
                    <th>Spots Left</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {COHORTS.map((c) => (
                    <tr key={c.program}>
                      <td className="font-medium text-white">{c.program}</td>
                      <td>{c.start}</td>
                      <td><span className={`badge ${c.mode.includes('Online') ? 'badge-indigo' : 'badge-cyan'}`}>{c.mode}</span></td>
                      <td>
                        <span className={`badge ${c.status === 'filling' ? 'badge-amber' : 'badge-green'}`}>
                          {c.spots} left {c.status === 'filling' && '— Filling fast'}
                        </span>
                      </td>
                      <td className="text-right"><Link to="/admissions" className="btn-primary text-xs py-1.5 px-3">Apply</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="section-pad bg-ink-800/30">
        <div className="page-container">
          <div className="text-center mb-14">
            <div className="section-eyebrow justify-center">Student Stories</div>
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-white mb-4">What our graduates say</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="card-hover p-7">
                <div className="flex gap-0.5 mb-5">
                  {Array.from({ length: t.rating }).map((_, i) => <Star key={i} size={13} className="text-accent-500 fill-accent-500"/>)}
                </div>
                <p className="text-slate-300 text-sm leading-relaxed mb-6 italic">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-600 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
                    {t.name[0]}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{t.name}</div>
                    <div className="text-xs text-slate-500">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="section-pad">
        <div className="page-container max-w-3xl">
          <div className="text-center mb-12">
            <div className="section-eyebrow justify-center">FAQ</div>
            <h2 className="font-display text-3xl font-bold text-white">Common Questions</h2>
          </div>
          <div className="space-y-2">
            {FAQ.map((f, i) => (
              <div key={i} className="card overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left"
                >
                  <span className="font-medium text-white text-sm">{f.q}</span>
                  <ChevronDown size={16} className={`text-slate-400 flex-shrink-0 ml-4 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`}/>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 text-sm text-slate-400 leading-relaxed border-t border-white/[0.06] pt-4">
                    {f.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="section-pad">
        <div className="page-container">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-brand-600 to-indigo-800 p-8 sm:p-12 lg:p-16 text-center">
            <div className="absolute inset-0 grid-bg opacity-30"/>
            <div className="relative z-10">
              <h2 className="font-display text-3xl lg:text-4xl font-bold text-white mb-4">Ready to start your tech career?</h2>
              <p className="text-indigo-200 max-w-lg mx-auto mb-8">Join hundreds of Nigerians who've transformed their careers with Masterview. Limited cohort spots available.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/admissions" className="btn-accent px-8 py-3.5 text-base">Apply Now — It's Free</Link>
                <a href={SOCIAL_LINKS.whatsapp} target="_blank" rel="noopener noreferrer" className="btn-outline border-white/30 text-white hover:bg-white/10 px-8 py-3.5 text-base">Talk to an Advisor</a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
