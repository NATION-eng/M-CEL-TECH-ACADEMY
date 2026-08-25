import { Link } from 'react-router-dom'
import { ArrowRight, Target, Eye, Heart } from 'lucide-react'

const TEAM = [
  { name:'Dr. Emeka Okafor', role:'Founder & CEO', bg:'from-brand-600 to-cyan-600' },
  { name:'Ngozi Adeleke', role:'Head of Curriculum', bg:'from-purple-600 to-brand-600' },
  { name:'Tunde Balogun', role:'Lead Instructor', bg:'from-cyan-600 to-blue-600' },
  { name:'Amaka Eze', role:'Student Success Lead', bg:'from-pink-600 to-rose-600' },
]

export default function AboutPage() {
  return (
    <div className="bg-ink-900 pt-20">
      <section className="section-pad">
        <div className="page-container max-w-4xl">
          <div className="section-eyebrow">Our Story</div>
          <h1 className="font-display text-4xl lg:text-5xl font-bold text-white mb-6">We exist to close the digital skills gap in Nigeria.</h1>
          <p className="text-slate-400 text-lg leading-relaxed mb-6">Masterview Digital Innovation Academy was founded with one belief: talented Nigerians deserve world-class technology education, taught by people who are actually in the industry.</p>
          <p className="text-slate-400 leading-relaxed">We built the academy we wished existed — with a structured badge-based curriculum, real projects at every level, and instructors who are active professionals, not career teachers. The result is a graduate who is genuinely job-ready, not just certificate-ready.</p>
        </div>
      </section>

      <section className="section-pad bg-ink-800/30">
        <div className="page-container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Target, title: 'Our Mission', color: 'text-brand-400 bg-brand-600/15', text: 'To produce the most job-ready digital professionals in Nigeria through structured, project-based technology training.' },
              { icon: Eye, title: 'Our Vision', color: 'text-cyan-400 bg-cyan-600/15', text: 'To become Africa\'s leading technology training academy, with campuses in every major Nigerian city and a thriving online platform.' },
              { icon: Heart, title: 'Our Values', color: 'text-rose-400 bg-rose-600/15', text: 'Excellence, Integrity, Real-world relevance, Community. We don\'t cut corners on quality — ever.' },
            ].map(({ icon: Icon, title, color, text }) => (
              <div key={title} className="card-hover p-7">
                <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-4`}><Icon size={18}/></div>
                <h3 className="font-display text-lg font-semibold text-white mb-3">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-pad">
        <div className="page-container">
          <div className="text-center mb-12">
            <div className="section-eyebrow justify-center">The Team</div>
            <h2 className="font-display text-3xl font-bold text-white">Built by practitioners</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {TEAM.map(t => (
              <div key={t.name} className="card-hover p-6 text-center">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${t.bg} flex items-center justify-center text-white font-bold text-xl mx-auto mb-4`}>{t.name[0]}</div>
                <div className="font-semibold text-white text-sm">{t.name}</div>
                <div className="text-xs text-slate-500 mt-1">{t.role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-pad bg-ink-800/30">
        <div className="page-container text-center">
          <h2 className="font-display text-3xl font-bold text-white mb-4">Join the Masterview family</h2>
          <p className="text-slate-400 mb-8 max-w-md mx-auto">500+ graduates. Growing community. Real careers. Your journey starts with one application.</p>
          <Link to="/admissions" className="btn-accent px-8 py-3.5 text-base">Apply Now <ArrowRight size={16}/></Link>
        </div>
      </section>
    </div>
  )
}
