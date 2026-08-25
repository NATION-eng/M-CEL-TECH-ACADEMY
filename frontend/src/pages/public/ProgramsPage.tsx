import { Link } from 'react-router-dom'
import { CheckCircle2, ArrowRight, Code2, Sparkles, Bot, Palette, Clapperboard } from 'lucide-react'

const PROGRAMS = [
  { id:'software', icon: Code2, title:'Software Development', duration:'4–6 months', price:'₦80,000–₦250,000', mode:'Physical & Online', color:'from-blue-600 to-indigo-600',
    desc:'The most comprehensive software development track in Port Harcourt. Learn to build full-stack web applications from scratch.',
    badges:[
      { level:1, title:'Web Foundations', weeks:'6 weeks', topics:['HTML5 & CSS3','JavaScript ES6+','DOM Manipulation','Git & GitHub','Responsive Design'] },
      { level:2, title:'Frontend Development', weeks:'6 weeks', topics:['React.js','TypeScript','State Management','REST APIs','UI Component Design'] },
      { level:3, title:'Full Stack Development', weeks:'8 weeks', topics:['Node.js & Express','MongoDB','Authentication','Deployment','Capstone Project'] },
    ]},
  { id:'vibe', icon: Sparkles, title:'Vibe Coding', duration:'3–4 months', price:'₦80,000–₦150,000', mode:'Online',  color:'from-purple-600 to-pink-600',
    desc:'Build real products using AI-assisted development. The future of coding — master it now.',
    badges:[
      { level:1, title:'AI Coding Foundations', weeks:'4 weeks', topics:['Prompt Engineering','GitHub Copilot','AI Code Review','Cursor IDE','Build with AI'] },
      { level:2, title:'AI Workflow Engineering', weeks:'5 weeks', topics:['Agentic Coding','LLM APIs','Automation Scripts','AI-powered backends','Deployment'] },
      { level:3, title:'AI Product Engineering', weeks:'6 weeks', topics:['Full AI Products','Monetization','Product Strategy','Launch','Capstone'] },
    ]},
  { id:'ai', icon: Bot, title:'Artificial Intelligence', duration:'5–6 months', price:'₦150,000–₦250,000', mode:'Physical & Online', color:'from-cyan-600 to-blue-600',
    desc:'Understand the mathematics and engineering behind AI systems. Build real models, not just use them.',
    badges:[
      { level:1, title:'AI Fundamentals', weeks:'6 weeks', topics:['Python','Linear Algebra','Statistics','Data Analysis','Pandas & NumPy'] },
      { level:2, title:'ML Engineering', weeks:'8 weeks', topics:['Supervised Learning','Neural Networks','TensorFlow','Model Evaluation','Feature Engineering'] },
      { level:3, title:'AI Applications', weeks:'8 weeks', topics:['NLP','Computer Vision','MLOps','Deployment','Capstone AI Product'] },
    ]},
  { id:'design', icon: Palette, title:'Graphic Design', duration:'3–4 months', price:'₦60,000–₦100,000', mode:'Physical & Online', color:'from-pink-600 to-rose-600',
    desc:'Master visual communication for the digital age. From brand identity to UI design.',
    badges:[
      { level:1, title:'Design Principles', weeks:'4 weeks', topics:['Typography','Color Theory','Layout','Figma Basics','Design Thinking'] },
      { level:2, title:'Brand Identity', weeks:'5 weeks', topics:['Logo Design','Brand Systems','Mockups','Adobe Suite','Presentation Design'] },
      { level:3, title:'Digital Media', weeks:'5 weeks', topics:['Social Media Design','UI/UX Basics','Motion Design','Portfolio','Client Projects'] },
    ]},
  { id:'video', icon: Clapperboard, title:'Video Editing', duration:'2–3 months', price:'₦60,000–₦100,000', mode:'Physical & Online', color:'from-orange-600 to-amber-600',
    desc:'Professional post-production and content creation for digital platforms.',
    badges:[
      { level:1, title:'Edit Foundations', weeks:'4 weeks', topics:['DaVinci Resolve','Cut & Trim','Audio Sync','Transitions','Export Settings'] },
      { level:2, title:'Color & Sound', weeks:'4 weeks', topics:['Color Grading','Audio Mixing','Motion Graphics','Storytelling','YouTube/IG Formats'] },
      { level:3, title:'Content Production', weeks:'5 weeks', topics:['Production Planning','Brand Videos','Reels & Shorts','Client Work','Portfolio Reel'] },
    ]},
]

export default function ProgramsPage() {
  return (
    <div className="bg-ink-900 pt-20">
      <section className="section-pad">
        <div className="page-container">
          <div className="text-center mb-16">
            <div className="section-eyebrow justify-center">Training Programs</div>
            <h1 className="font-display text-4xl lg:text-5xl font-bold text-white mb-5">5 Tracks. All Job-Ready.</h1>
            <p className="text-slate-400 max-w-xl mx-auto text-lg">Every program follows the same badge-based structure — build skills level by level, prove mastery at each stage, earn a verifiable certificate.</p>
          </div>
          <div className="space-y-16">
            {PROGRAMS.map(p => (
              <div key={p.id} id={p.id} className="card overflow-hidden">
                <div className={`h-1 bg-gradient-to-r ${p.color}`}/>
                <div className="p-7 lg:p-10">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-8">
                    <div className="lg:w-72 flex-shrink-0">
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${p.color} flex items-center justify-center text-white mb-4`}>
                        <p.icon size={26}/>
                      </div>
                      <h2 className="font-display text-2xl font-bold text-white mb-3">{p.title}</h2>
                      <p className="text-slate-400 text-sm leading-relaxed mb-5">{p.desc}</p>
                      <div className="space-y-2 mb-6">
                        {[['Duration', p.duration],['Investment', p.price],['Delivery', p.mode]].map(([l,v]) => (
                          <div key={l} className="flex justify-between text-xs"><span className="text-slate-500">{l}</span><span className="text-slate-300 font-medium">{v}</span></div>
                        ))}
                      </div>
                      <Link to="/admissions" className="btn-primary w-full justify-center text-sm">Apply Now <ArrowRight size={14}/></Link>
                    </div>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                      {p.badges.map(b => (
                        <div key={b.level} className="bg-ink-700/50 rounded-xl p-5 border border-white/[0.06]">
                          <div className={`badge badge-indigo mb-3`}>Badge {b.level}</div>
                          <h3 className="font-display font-semibold text-white mb-1">{b.title}</h3>
                          <p className="text-xs text-slate-500 mb-4">{b.weeks}</p>
                          <ul className="space-y-1.5">
                            {b.topics.map(t => (
                              <li key={t} className="flex items-center gap-2 text-xs text-slate-400">
                                <CheckCircle2 size={11} className="text-emerald-500 flex-shrink-0"/>{t}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
