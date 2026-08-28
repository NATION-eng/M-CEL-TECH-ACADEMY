import { Link } from 'react-router-dom'
import { Shield, Lock, Eye, FileText, CheckCircle2, ArrowLeft } from 'lucide-react'
import { SOCIAL_LINKS } from '../../config/socialLinks'

export default function PrivacyPolicyPage() {
  const lastUpdated = 'August 27, 2026'

  return (
    <div className="bg-ink-900 pt-20">
      <section className="section-pad">
        <div className="page-container max-w-4xl">
          <Link to="/" className="btn-ghost mb-8 inline-flex items-center gap-2 text-sm">
            <ArrowLeft size={16}/> Back to Home
          </Link>

          <div className="section-eyebrow">Legal & Data Protection</div>
          <h1 className="font-display text-4xl lg:text-5xl font-bold text-white mb-3">Privacy Policy</h1>
          <p className="text-slate-400 text-sm mb-10">Last updated: {lastUpdated} · M-CEL TECH ACADEMY</p>

          <div className="space-y-8 text-slate-300 leading-relaxed text-sm">
            {/* Intro */}
            <div className="card p-6 sm:p-8 space-y-4 border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-600/20 text-brand-400 flex items-center justify-center">
                  <Shield size={20}/>
                </div>
                <h2 className="font-display text-xl font-bold text-white">1. Introduction</h2>
              </div>
              <p>
                At <strong>M-CEL TECH ACADEMY</strong>, we are committed to protecting the privacy and security of our students, applicants, instructors, and website visitors. This Privacy Policy outlines our practices regarding the collection, use, disclosure, and protection of your personal information in compliance with the <strong>Nigeria Data Protection Act (NDPA)</strong> and international data privacy standards.
              </p>
            </div>

            {/* Information We Collect */}
            <div className="card p-6 sm:p-8 space-y-4 border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center">
                  <Eye size={20}/>
                </div>
                <h2 className="font-display text-xl font-bold text-white">2. Information We Collect</h2>
              </div>
              <p>We collect information you provide directly to us when creating an account, enrolling in a training cohort, submitting assignments, or contacting support:</p>
              <ul className="list-disc list-inside space-y-2 text-slate-400 pl-2">
                <li><strong className="text-slate-200">Personal Identification:</strong> Full name, email address, phone number, residential/state location.</li>
                <li><strong className="text-slate-200">Academic & Project Records:</strong> Course progress, quiz results, project submissions, grades, and certificate issuance records.</li>
                <li><strong className="text-slate-200">Payment Metadata:</strong> Transaction references, amounts paid, and payment timestamps (note: credit card details are processed directly and securely by accredited gateways Paystack and Flutterwave; we never store your full card number or PIN).</li>
                <li><strong className="text-slate-200">Communications:</strong> Inquiries sent to our department emails, feedback submissions, and WhatsApp advisor chat logs.</li>
              </ul>
            </div>

            {/* How We Use Your Data */}
            <div className="card p-6 sm:p-8 space-y-4 border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 size={20}/>
                </div>
                <h2 className="font-display text-xl font-bold text-white">3. How We Use Your Information</h2>
              </div>
              <ul className="list-disc list-inside space-y-2 text-slate-400 pl-2">
                <li>To provide, administer, and personalize our training programs and learning management portal.</li>
                <li>To generate and cryptographically sign verifiable completion certificates.</li>
                <li>To process tuition installments, verify payment references, and issue automated digital receipts.</li>
                <li>To send important announcements, cohort schedule adjustments, and security notices.</li>
                <li>To provide career mentoring, job placement referrals, and alumni networking support.</li>
              </ul>
            </div>

            {/* Data Protection & Security */}
            <div className="card p-6 sm:p-8 space-y-4 border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center">
                  <Lock size={20}/>
                </div>
                <h2 className="font-display text-xl font-bold text-white">4. Data Security & Retention</h2>
              </div>
              <p>
                We employ industry-standard encryption protocols (TLS/HTTPS in transit and AES encryption at rest) to safeguard your data. Access to student records is restricted to authorized academy faculty and administrative staff. We retain your academic and certificate verification records permanently so future employers can authenticate your credentials.
              </p>
            </div>

            {/* Your Rights & Contact */}
            <div className="card p-6 sm:p-8 space-y-4 border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
                  <FileText size={20}/>
                </div>
                <h2 className="font-display text-xl font-bold text-white">5. Your Privacy Rights & Inquiries</h2>
              </div>
              <p>
                You have the right to review, update, or request the correction of your personal data stored in our portal. If you have questions regarding this Privacy Policy or wish to exercise your privacy rights, please reach out to our data compliance team:
              </p>
              <div className="p-4 rounded-xl bg-ink-700/60 border border-white/[0.06] space-y-1.5 text-xs font-mono">
                <div>Email: <a href="mailto:customercare@mceltech.com" className="text-brand-400 hover:underline">customercare@mceltech.com</a> / <a href="mailto:contact@mceltech.com" className="text-brand-400 hover:underline">contact@mceltech.com</a></div>
                <div>Phone: <a href={`tel:${SOCIAL_LINKS.phoneIntl}`} className="text-slate-300 hover:underline">{SOCIAL_LINKS.phone}</a></div>
                <div>Address: 2nd Floor, Salije Plaza, Ada George Road, Port Harcourt, Rivers State, Nigeria</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}