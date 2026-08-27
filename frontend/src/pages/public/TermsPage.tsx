import { Link } from 'react-router-dom'
import { Scale, BookOpen, Award, CreditCard, AlertTriangle, ArrowLeft } from 'lucide-react'
import { SOCIAL_LINKS } from '../../config/socialLinks'

export default function TermsPage() {
  const lastUpdated = 'August 27, 2026'

  return (
    <div className="bg-ink-900 pt-20">
      <section className="section-pad">
        <div className="page-container max-w-4xl">
          <Link to="/" className="btn-ghost mb-8 inline-flex items-center gap-2 text-sm">
            <ArrowLeft size={16}/> Back to Home
          </Link>

          <div className="section-eyebrow">Terms & Conditions</div>
          <h1 className="font-display text-4xl lg:text-5xl font-bold text-white mb-3">Terms of Use</h1>
          <p className="text-slate-400 text-sm mb-10">Last updated: {lastUpdated} · M-CEL TECH ACADEMY</p>

          <div className="space-y-8 text-slate-300 leading-relaxed text-sm">
            {/* 1. Agreement to Terms */}
            <div className="card p-6 sm:p-8 space-y-4 border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-600/20 text-brand-400 flex items-center justify-center">
                  <Scale size={20}/>
                </div>
                <h2 className="font-display text-xl font-bold text-white">1. Agreement to Terms</h2>
              </div>
              <p>
                By accessing or registering for any training track, workshop, or portal service provided by <strong>M-CEL TECH ACADEMY</strong>, you agree to be bound by these Terms of Use and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing our platforms.
              </p>
            </div>

            {/* 2. Admissions, Tuition & Payment Policy */}
            <div className="card p-6 sm:p-8 space-y-4 border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
                  <CreditCard size={20}/>
                </div>
                <h2 className="font-display text-xl font-bold text-white">2. Admissions, Tuition & Installments</h2>
              </div>
              <ul className="list-disc list-inside space-y-2 text-slate-400 pl-2">
                <li><strong className="text-slate-200">Deposit Requirement:</strong> A minimum deposit (as specified on the course enrollment checkout) is required to secure cohort placement and unlock curriculum access.</li>
                <li><strong className="text-slate-200">Balance Deadlines:</strong> For installment payment plans, outstanding tuition balances must be cleared prior to final badge project reviews and certificate issuance.</li>
                <li><strong className="text-slate-200">Refund Policy:</strong> Tuition deposits and fee payments are generally non-refundable once cohort classes and curriculum resources have been accessed. Deferral to a subsequent cohort may be granted upon written review by administration.</li>
              </ul>
            </div>

            {/* 3. Academic Integrity & Code of Conduct */}
            <div className="card p-6 sm:p-8 space-y-4 border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center">
                  <BookOpen size={20}/>
                </div>
                <h2 className="font-display text-xl font-bold text-white">3. Academic Integrity & Code of Conduct</h2>
              </div>
              <p>Students and participants are expected to maintain the highest standards of professional conduct:</p>
              <ul className="list-disc list-inside space-y-2 text-slate-400 pl-2">
                <li>All assignments, quizzes, and capstone projects submitted for badge grading must represent the student's own work or proper attribution of collaborative team builds.</li>
                <li>Harassment, hate speech, plagiarism, or unauthorized disruption of digital classrooms and live sessions will result in immediate suspension.</li>
              </ul>
            </div>

            {/* 4. Certification & Credential Verification */}
            <div className="card p-6 sm:p-8 space-y-4 border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center">
                  <Award size={20}/>
                </div>
                <h2 className="font-display text-xl font-bold text-white">4. Certification & Verification</h2>
              </div>
              <p>
                Digital certificates issued by <strong>M-CEL TECH ACADEMY</strong> are cryptographically tracked and registered on our public verification ledger. The academy reserves the right to revoke or void any certificate if it is determined that credentials were obtained through fraud, impersonation, or academic misconduct.
              </p>
            </div>

            {/* 5. Intellectual Property */}
            <div className="card p-6 sm:p-8 space-y-4 border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
                  <Scale size={20}/>
                </div>
                <h2 className="font-display text-xl font-bold text-white">5. Intellectual Property</h2>
              </div>
              <p>
                All academy curriculum, lecture materials, proprietary frameworks, and code challenges remain the intellectual property of M-CEL TECH ACADEMY. Students retain 100% intellectual property rights and ownership over original capstone software, design portfolios, and projects built during their enrollment.
              </p>
            </div>

            {/* 6. Disputes & Grievances */}
            <div className="card p-6 sm:p-8 space-y-4 border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-600/20 text-rose-400 flex items-center justify-center">
                  <AlertTriangle size={20}/>
                </div>
                <h2 className="font-display text-xl font-bold text-white">6. Grievances & Contact</h2>
              </div>
              <p>
                If you have questions, disputes, or complaints regarding these Terms of Use or academy operations, please submit your inquiry to our administrative resolution board:
              </p>
              <div className="p-4 rounded-xl bg-ink-700/60 border border-white/[0.06] space-y-1.5 text-xs font-mono">
                <div>Complaints: <a href="mailto:complain@mceltech.com" className="text-brand-400 hover:underline">complain@mceltech.com</a></div>
                <div>General: <a href="mailto:contact@mceltech.com" className="text-brand-400 hover:underline">contact@mceltech.com</a></div>
                <div>Phone: <a href={`tel:${SOCIAL_LINKS.phoneIntl}`} className="text-slate-300 hover:underline">{SOCIAL_LINKS.phone}</a></div>
                <div>Address: 24 Ada George Road, Port Harcourt, Rivers State, Nigeria</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}