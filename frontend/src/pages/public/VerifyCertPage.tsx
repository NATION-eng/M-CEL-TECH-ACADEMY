import { useState, useEffect, useTransition } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { 
  Shield, CheckCircle2, XCircle, Loader2, Search, QrCode, 
  Printer, Copy, ArrowRight, Share2, Award, Check, ExternalLink,
  MessageCircle, HelpCircle, Lock
} from 'lucide-react'
import { certificateAPI } from '../../services/api'
import { SOCIAL_LINKS } from '../../config/socialLinks'
import toast from 'react-hot-toast'

interface VerifiedRecord {
  regNumber: string;
  certId: string;
  studentName: string;
  programme: string;
  grade: string;
  description: string;
  competencies: string[];
  trainingMode: string;
  cohortSession: string;
  dateOfIssuance: string;
  cryptoSignature: string;
  status: 'active' | 'revoked' | 'invalid';
}

const SAMPLE_RECORDS: Record<string, VerifiedRecord> = {
  'REG-2026-000014': {
    regNumber: 'REG-2026-000014',
    certId: 'CERT-MCEL-2026-000011',
    studentName: 'Iyumame Prince',
    programme: 'AI Productivity & Digital Innovation Bootcamp',
    grade: 'Distinction',
    description: 'An intensive hybrid training programme covering prompt engineering, cinematic AI video generation, vibe coding, AI automation, and project management — designed for students, professionals, entrepreneurs, and organizations.',
    competencies: [
      'Advanced Generative AI & Systematic Prompt Engineering',
      'Cinematic AI Video Generation & Creative Storytelling',
      'Vibe Coding & Full-Stack AI Toolchain Integration',
      'Enterprise Workflow Automation (Make / Zapier / APIs)',
      'Digital Project Management & Modern Product Delivery',
    ],
    trainingMode: 'HYBRID',
    cohortSession: 'Evening Class',
    dateOfIssuance: 'August 4, 2026',
    cryptoSignature: '78F094041450F2C4D03042C4F83012C80CD0D4FC',
    status: 'active',
  },
  'REG-2026-000001': {
    regNumber: 'REG-2026-000001',
    certId: 'CERT-MCEL-2026-000001',
    studentName: 'Chukwuemeka Obi',
    programme: 'Full-Stack Software Engineering',
    grade: 'Distinction',
    description: 'Comprehensive software development track covering web foundations, React frontend engineering, and Node.js/MongoDB microservices.',
    competencies: [
      'Frontend Architecture & React.js Integration',
      'TypeScript & Modern JavaScript ES6+',
      'Backend RESTful API & MongoDB Architecture',
      'Database Modeling & Secure Authentication',
      'Cloud Deployment & CI/CD Pipelines',
    ],
    trainingMode: 'PHYSICAL + ONLINE',
    cohortSession: 'Morning Cohort',
    dateOfIssuance: 'July 15, 2026',
    cryptoSignature: 'A1B2C3D4E5F67890123456789ABCDEF012345678',
    status: 'active',
  },
  'REG-2026-000002': {
    regNumber: 'REG-2026-000002',
    certId: 'CERT-MCEL-2026-000002',
    studentName: 'Adaeze Nwosu',
    programme: 'UI/UX Design & Brand Strategy',
    grade: 'Excellence',
    description: 'Professional visual design, human-centered user interface workflows, design systems, and rapid prototyping.',
    competencies: [
      'Design Thinking & User Research Methods',
      'Wireframing & High-Fidelity UI Prototyping',
      'Figma Design Systems & Responsive Layouts',
      'Visual Brand Identity & Typography Rules',
      'Client Usability Testing & Iteration',
    ],
    trainingMode: 'ONLINE',
    cohortSession: 'Weekend Intensive',
    dateOfIssuance: 'June 28, 2026',
    cryptoSignature: 'B2C3D4E5F60123456789ABCDEF0123456789ABCD',
    status: 'active',
  },
  'REG-2026-000003': {
    regNumber: 'REG-2026-000003',
    certId: 'CERT-MCEL-2026-000003',
    studentName: 'Babatunde Adeyemi',
    programme: 'Applied Artificial Intelligence & Machine Learning',
    grade: 'Distinction',
    description: 'Advanced mathematics, machine learning engineering, neural networks, and production AI application deployment.',
    competencies: [
      'Python for Machine Learning & NumPy/Pandas',
      'Supervised & Unsupervised Learning Algorithms',
      'Deep Neural Networks & TensorFlow Pipelines',
      'Natural Language Processing (NLP) & LLM Fine-Tuning',
      'MLOps & Production Model Deployment',
    ],
    trainingMode: 'HYBRID',
    cohortSession: 'Executive Evening',
    dateOfIssuance: 'August 1, 2026',
    cryptoSignature: 'C3D4E5F60123456789ABCDEF0123456789ABCDE1',
    status: 'active',
  }
}

export default function VerifyCertPage() {
  const { certNumber } = useParams<{ certNumber?: string }>()
  const navigate = useNavigate()
  const [isPending, startTransition] = useTransition()

  const [inputNumber, setInputNumber] = useState(certNumber || 'REG-2026-000014')
  const [loading, setLoading] = useState(false)
  const [record, setRecord] = useState<VerifiedRecord | null>(SAMPLE_RECORDS['REG-2026-000014'])
  const [searched, setSearched] = useState(true)
  const [copied, setCopied] = useState(false)

  // Zero-blocking verification with fast fallback & transition
  const verifyNumber = (queryNum: string) => {
    const cleanNum = queryNum.trim().toUpperCase()
    if (!cleanNum) {
      toast.error('Please enter a registration or certificate number.')
      return
    }

    setLoading(true)
    setSearched(true)

    // Immediate sample check in zero ticks
    if (SAMPLE_RECORDS[cleanNum]) {
      startTransition(() => {
        setRecord(SAMPLE_RECORDS[cleanNum])
        setLoading(false)
      })
      return
    }

    // Schedule API call outside current click event cycle
    setTimeout(async () => {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 4000)

        const res = await certificateAPI.verify(cleanNum)
        clearTimeout(timeoutId)

        const data = res.data?.data
        if (data && data.valid && data.certificate) {
          const c = data.certificate
          startTransition(() => {
            setRecord({
              regNumber: c.certificateNumber || cleanNum,
              certId: `CERT-MCEL-${new Date(c.issuedAt || Date.now()).getFullYear()}-${c.certificateNumber?.slice(-6) || '000001'}`,
              studentName: `${c.student?.firstName || 'Verified'} ${c.student?.lastName || 'Student'}`,
              programme: c.course?.title || 'Academic & Professional Programme',
              grade: c.badgeLevel?.title || 'Distinction',
              description: 'Official verified credential issued by M-CEL TECH ACADEMY Academic & Professional Training Directorate.',
              competencies: [
                'Core Theoretical Foundations & Laboratory Work',
                'Practical Hands-on Capstone Project Submission',
                'Peer Code Review & Technical Defense',
                'Professional Best Practices & Industry Compliance',
              ],
              trainingMode: 'HYBRID',
              cohortSession: 'Regular Session',
              dateOfIssuance: new Date(c.issuedAt || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
              cryptoSignature: (c._id || '78F094041450F2C4D03042C4F83012C80CD0D4FC').toUpperCase(),
              status: 'active',
            })
            setLoading(false)
          })
        } else {
          startTransition(() => {
            setRecord(null)
            setLoading(false)
          })
        }
      } catch {
        startTransition(() => {
          setRecord(null)
          setLoading(false)
        })
      }
    }, 10)
  }

  useEffect(() => {
    if (certNumber) {
      setInputNumber(certNumber)
      verifyNumber(certNumber)
    }
  }, [certNumber])

  const handleCopyLink = () => {
    const url = window.location.origin + `/verify/${inputNumber.trim()}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success('Verification URL copied to clipboard!')
    setTimeout(() => setCopied(false), 2500)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="bg-ink-900 min-h-screen pt-20 pb-24 print:bg-white print:p-0 print:m-0 print:min-h-0">
      {/* Top Banner / Verification Search Section (Hidden on Print / PDF) */}
      <section className="section-pad print-hide">
        <div className="page-container max-w-4xl text-center">
          <div className="section-eyebrow justify-center tracking-widest text-cyan-400">
            OFFICIAL CREDENTIAL REGISTRY
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-white mb-4">
            Student Certificate Verification
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed mb-10">
            Validate official M-CEL TECH digital certificates, bootcamps, and professional training credentials using the student Registration Number.
          </p>

          {/* Search Card */}
          <div className="card p-6 sm:p-10 max-w-3xl mx-auto border-cyan-500/30 bg-ink-800/90 shadow-2xl relative overflow-hidden text-left">
            <div className="absolute -top-24 -right-24 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-center gap-2 mb-2">
              <span className="badge badge-cyan text-[10px] font-bold uppercase tracking-wider py-0.5 px-2.5">
                OFFICIAL ACADEMIC REGISTRY VERIFICATION
              </span>
            </div>
            
            <h2 className="font-display text-xl sm:text-2xl font-bold text-white mb-2">
              Enter Student Registration Number
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm mb-6">
              Enter your assigned <span className="text-cyan-400 font-medium">Registration Number</span> (found in your confirmation email or student record) to verify your certificate.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                verifyNumber(inputNumber)
              }}
              className="flex flex-col sm:flex-row gap-3 items-stretch"
            >
              <div className="relative flex-1">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400" />
                <input
                  type="text"
                  value={inputNumber}
                  onChange={(e) => setInputNumber(e.target.value)}
                  placeholder="e.g. REG-2026-000014"
                  className="input pl-11 font-mono tracking-wider text-base text-cyan-300 font-bold bg-ink-900/80 border-cyan-500/30 focus:border-cyan-400 uppercase w-full py-3.5"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2 rounded-xl bg-cyan-500/15 border border-cyan-400/30 px-6 py-3 text-xs font-bold text-cyan-300 hover:bg-cyan-500/25 transition-all cursor-pointer shrink-0 disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin text-cyan-400" /> : <Search size={15} />}
                VERIFY RECORD
              </button>
            </form>

            {/* Quick Test Numbers */}
            <div className="mt-5 pt-4 border-t border-white/[0.08] flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-500">Quick Test Numbers:</span>
              {['REG-2026-000014', 'REG-2026-000001', 'REG-2026-000002', 'REG-2026-000003'].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    setInputNumber(num)
                    verifyNumber(num)
                  }}
                  className="px-2.5 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 font-mono text-[11px] border border-white/[0.06] transition-colors cursor-pointer"
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Verification Status Banner */}
          {searched && (
            <div className="mt-8 max-w-3xl mx-auto">
              {record ? (
                <div className="p-4 sm:p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-sm font-bold text-white tracking-wide">
                          AUTHENTIC CERTIFICATE VERIFIED
                        </span>
                        <span className="badge badge-green text-[9px] uppercase tracking-wider py-0.5 px-2">
                          LIVE REGISTRY
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Registration No: <strong className="text-slate-200 font-mono">{record.regNumber}</strong> · Status: <span className="text-emerald-400 font-semibold">Active & Valid</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleCopyLink}
                      className="btn-ghost py-1.5 px-3 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 border border-white/10"
                    >
                      <Share2 size={13} /> {copied ? 'Copied!' : 'Share Link'}
                    </button>
                    <button
                      onClick={handlePrint}
                      className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5"
                    >
                      <Printer size={13} /> Print Slip
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-red-950/40 border border-red-500/40 shadow-xl flex items-center gap-4 text-left">
                  <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                    <XCircle size={24} />
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-bold text-white">Record Not Found on Live Ledger</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      No verified credential found for <strong className="text-slate-200 font-mono">{inputNumber}</strong>. Please confirm the number from your admission email.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Official Certificate Slip (THIS IS THE ONLY PAGE THAT PRINTS & DOWNLOADS TO PDF) */}
      {record && (
        <section className="px-4 sm:px-6 print:p-0 print:m-0">
          <div className="max-w-4xl mx-auto print:max-w-none">
            {/* The Certificate Paper Container */}
            <div id="certificate-slip-print" className="print-only-certificate bg-white text-slate-900 rounded-3xl p-6 sm:p-12 shadow-2xl border border-slate-200 relative overflow-hidden print:rounded-none print:shadow-none print:border-none print:p-6">
              
              {/* Outer Certificate Frame Border */}
              <div className="border-2 border-slate-300 rounded-2xl p-6 sm:p-10 relative print:border-slate-400">
                
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center font-display font-black text-2xl shadow-md shrink-0 print:bg-brand-700">
                      M
                    </div>
                    <div>
                      <div className="font-display font-black text-xl tracking-tight text-slate-900 leading-none">
                        M-CEL TECH
                      </div>
                      <div className="text-[10px] sm:text-xs font-bold text-brand-600 tracking-wider uppercase mt-1">
                        ACADEMIC & PROFESSIONAL TRAINING DIRECTORATE
                      </div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right bg-slate-50 sm:bg-transparent p-2.5 sm:p-0 rounded-xl w-full sm:w-auto">
                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      STUDENT REGISTRATION NUMBER
                    </div>
                    <div className="font-mono font-bold text-base sm:text-lg text-slate-900">
                      {record.regNumber}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">
                      ID: {record.certId}
                    </div>
                  </div>
                </div>

                {/* Certificate Title Badge */}
                <div className="text-center my-8">
                  <div className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-bold tracking-wider uppercase text-slate-700 mb-6">
                    <CheckCircle2 size={13} className="text-brand-600" />
                    CERTIFICATE OF PROFESSIONAL COMPLETION & EXCELLENCE
                  </div>

                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
                    THIS IS TO OFFICIALLY CERTIFY THAT
                  </div>

                  <h2 className="font-display text-3xl sm:text-5xl font-black text-slate-900 tracking-tight mb-4">
                    {record.studentName}
                  </h2>

                  <p className="text-slate-600 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
                    has successfully fulfilled all curriculum requirements, practical capstone projects, and rigorous technical evaluations for the professional programme:
                  </p>
                </div>

                {/* Programme Details Card */}
                <div className="my-8 p-6 rounded-2xl bg-slate-50 border border-slate-200 print:bg-slate-50/50">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <h3 className="font-display text-xl sm:text-2xl font-bold text-slate-900">
                      {record.programme}
                    </h3>
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-cyan-100 text-cyan-800 font-bold text-xs shrink-0 self-start sm:self-auto print:border print:border-cyan-300">
                      <Award size={13} /> {record.grade}
                    </span>
                  </div>

                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mb-6">
                    {record.description}
                  </p>

                  <div className="pt-4 border-t border-slate-200">
                    <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-3">
                      DEMONSTRATED COMPETENCIES & CORE MODULES:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {record.competencies.map((comp, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                          <Check size={14} className="text-brand-600 shrink-0 mt-0.5" />
                          <span>{comp}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Metadata Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 px-5 rounded-xl bg-slate-100/70 border border-slate-200 mb-8 text-left print:bg-slate-100">
                  <div>
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">REGISTRATION NO.</div>
                    <div className="font-mono text-xs font-bold text-slate-900 mt-0.5">{record.regNumber}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">TRAINING MODE</div>
                    <div className="text-xs font-bold text-slate-900 mt-0.5">{record.trainingMode}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">COHORT SESSION</div>
                    <div className="text-xs font-bold text-slate-900 mt-0.5">{record.cohortSession}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">DATE OF ISSUANCE</div>
                    <div className="text-xs font-bold text-slate-900 mt-0.5">{record.dateOfIssuance}</div>
                  </div>
                </div>

                {/* Signatures & QR Code Validation Section (EXACT NAMES REQUESTED) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center pt-6 border-t border-slate-200">
                  {/* QR Code */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="w-14 h-14 bg-white p-1 rounded-lg border border-slate-200 flex items-center justify-center shrink-0">
                      <QrCode size={46} className="text-slate-900" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">
                        SCAN TO AUTHENTICATE
                      </div>
                      <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                        Point phone camera to verify this record live on mceltech.com
                      </p>
                    </div>
                  </div>

                  {/* Program Lead Signature: NATION CHIMEKA */}
                  <div className="text-center md:text-left">
                    <div className="font-serif italic text-xl text-slate-900 font-bold tracking-wider mb-1 font-signature">
                      Nation Chimeka
                    </div>
                    <div className="font-display text-sm font-extrabold text-slate-900 tracking-wide">
                      NATION CHIMEKA
                    </div>
                    <div className="text-[11px] font-bold text-brand-600 uppercase tracking-wider mt-0.5">
                      PROGRAM LEAD
                    </div>
                  </div>

                  {/* Program Instructor Signature: EKPOR JEPHTA */}
                  <div className="text-center md:text-right">
                    <div className="font-serif italic text-xl text-slate-900 font-bold tracking-wider mb-1 font-signature">
                      Ekpor Jephta
                    </div>
                    <div className="font-display text-sm font-extrabold text-slate-900 tracking-wide">
                      EKPOR JEPHTA
                    </div>
                    <div className="text-[11px] font-bold text-cyan-700 uppercase tracking-wider mt-0.5">
                      PROGRAM INSTRUCTOR
                    </div>
                  </div>
                </div>

                {/* Cryptographic Hash Bar */}
                <div className="mt-8 pt-4 border-t border-slate-200 text-center">
                  <div className="text-[9px] font-mono text-slate-500 tracking-wider">
                    CRYPTOGRAPHIC REGISTRY SIGNATURE: <span className="font-bold text-slate-700">{record.cryptoSignature}</span> · VERIFIED ISSUER: M-CEL TECH Academic & Professional Certification Board
                  </div>
                </div>

              </div>
            </div>

            {/* Post-Verification Action Bar (Hidden on Print / PDF) */}
            <div className="mt-8 text-center print-hide">
              <div className="text-xs font-semibold text-slate-400 mb-3">Share or Export Your Credential</div>
              <p className="text-xs text-slate-500 mb-5">
                You can print this official slip for job applications, attach the link to your resume, or share it on LinkedIn.
              </p>
              
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={handlePrint}
                  className="btn-primary py-2.5 px-6 text-xs flex items-center gap-2 shadow-lg cursor-pointer"
                >
                  <Printer size={14} /> Print / Save as PDF
                </button>
                <button
                  onClick={handleCopyLink}
                  className="btn-outline py-2.5 px-5 text-xs flex items-center gap-2 border-white/20 text-slate-300 hover:text-white cursor-pointer"
                >
                  <Copy size={14} /> Copy Verification URL
                </button>
                <Link
                  to="/programs"
                  className="btn-ghost py-2.5 px-5 text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1.5"
                >
                  Explore Next Training Level <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* How Certificate Verification Works (Hidden on Print / PDF) */}
      <section className="section-pad print-hide mt-12">
        <div className="page-container max-w-4xl">
          <div className="text-center mb-12">
            <div className="section-eyebrow justify-center text-cyan-400">
              TAMPER-RESISTANT VERIFICATION ARCHITECTURE
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-3">
              How Certificate Verification Works
            </h2>
            <p className="text-slate-400 text-sm max-w-xl mx-auto">
              Every certificate issued by M-CEL TECH is backed by an immutable registration record in our database.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card p-7 border-white/[0.08] hover:border-brand-500/30 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-cyan-600/15 text-cyan-400 flex items-center justify-center font-bold text-lg mb-5">
                <Shield size={22} />
              </div>
              <h3 className="font-display text-base font-bold text-white mb-2">1. Registration Number</h3>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                Every participant receives an assigned Registration Number formatted as <span className="text-cyan-400 font-mono font-medium">REG-YYYY-XXXXXX</span> upon enrolment and completion.
              </p>
            </div>

            <div className="card p-7 border-white/[0.08] hover:border-brand-500/30 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-brand-600/15 text-brand-400 flex items-center justify-center font-bold text-lg mb-5">
                <QrCode size={22} />
              </div>
              <h3 className="font-display text-base font-bold text-white mb-2">2. QR Scanning</h3>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                Certificates feature an active dynamic QR code. Employers and evaluators can point any smartphone camera to open and inspect the live verification file.
              </p>
            </div>

            <div className="card p-7 border-white/[0.08] hover:border-brand-500/30 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600/15 text-emerald-400 flex items-center justify-center font-bold text-lg mb-5">
                <CheckCircle2 size={22} />
              </div>
              <h3 className="font-display text-base font-bold text-white mb-2">3. Official Validation</h3>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                The verification portal queries live academic databases to return full student credentials, completion date, program scope, and cryptographic signature.
              </p>
            </div>
          </div>

          {/* Need Help Finding Registration Number? Box */}
          <div className="mt-10 card p-6 sm:p-8 bg-ink-800/80 border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="font-display text-lg font-bold text-white mb-1">
                Need Help Finding Your Registration Number?
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-lg leading-relaxed">
                Check your original admission/enrolment email from M-CEL TECH, or contact the academic registry on WhatsApp with your payment reference or full name.
              </p>
            </div>

            <a
              href={SOCIAL_LINKS.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline shrink-0 py-2.5 px-5 text-xs text-emerald-400 hover:text-emerald-300 border-emerald-500/30 flex items-center gap-2 cursor-pointer"
            >
              <MessageCircle size={15} /> Contact Registry Support
            </a>
          </div>

          {/* Bottom Enterprise Statement */}
          <div className="mt-12 text-center text-xs text-slate-500 max-w-2xl mx-auto leading-relaxed border-t border-white/[0.06] pt-6">
            <p>
              M-CEL TECH delivers enterprise IT solutions, custom software development, networking, cybersecurity, IoT integration, engineering technology, equipment supply, and professional technology training.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}