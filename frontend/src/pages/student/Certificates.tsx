import { Trophy, Download, Shield, QrCode, Loader2, CheckCircle2, Circle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { certificateAPI, enrollmentAPI } from '../../services/api'
import { EmptyState, ListItemSkeleton } from '../../components/ui'
import { useEscapeKey } from '../../hooks/useEscapeKey'

interface Certificate {
  _id: string
  certificateNumber?: string
  badgeLevel?: { title?: string }
  title?: string
  course?: { title?: string; _id?: string } | string
  issuedAt?: string
  qrCode?: string
}

export default function StudentCertificates() {
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [qrCert, setQrCert] = useState<Certificate | null>(null)

  useEscapeKey(!!qrCert, () => setQrCert(null))

  const { data, isLoading } = useQuery({
    queryKey: ['myCertificates'],
    queryFn: async () => {
      const res = await certificateAPI.mine()
      return res.data.data
    },
  })

  const certs: Certificate[] = Array.isArray(data) ? data : (data?.certificates ?? [])

  const { data: enrollData } = useQuery({
    queryKey: ['myEnrollmentsForCerts'],
    queryFn: async () => (await enrollmentAPI.mine()).data.data,
  })
  const enrollments: any[] = Array.isArray(enrollData) ? enrollData : []
  const certifiedCourseIds = new Set(certs.map(c => (typeof c.course === 'object' ? c.course?._id : c.course)))
  const pendingCourses = enrollments.filter(e => e.course?._id && !certifiedCourseIds.has(e.course._id))

  const { data: eligibilityData } = useQuery({
    queryKey: ['certEligibility', pendingCourses.map(c => c.course._id).join(',')],
    queryFn: async () => {
      const results = await Promise.all(pendingCourses.map((e: any) => certificateAPI.eligibility(e.course._id)))
      return pendingCourses.map((e: any, i: number) => ({ course: e.course, ...results[i].data.data }))
    },
    enabled: pendingCourses.length > 0,
  })
  const eligibility: any[] = eligibilityData ?? []

  const handleDownload = async (id: string, certNumber: string) => {
    setDownloadingId(id)
    try {
      const res = await certificateAPI.downloadCertificate(id)
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `certificate-${certNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Could not download certificate. Please try again.')
    } finally {
      setDownloadingId(null)
    }
  }

  if (isLoading) {
    return (
      <div role="status" aria-label="Loading certificates" className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => <ListItemSkeleton key={i} />)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-white">Certificates</h1>

      {eligibility.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-slate-400">In Progress</h2>
          {eligibility.map((e: any) => (
            <div key={e.course._id} className="card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-white">{e.course.title}</h3>
                <span className={`badge ${e.eligible ? 'badge-green' : 'badge-amber'}`}>{e.eligible ? 'Eligible!' : 'Not yet eligible'}</span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {e.checks?.map((c: any) => (
                  <div key={c.label} className="flex items-start gap-2">
                    {c.met ? <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-400" /> : <Circle size={14} className="mt-0.5 shrink-0 text-slate-600" />}
                    <div>
                      <p className={`text-xs font-medium ${c.met ? 'text-slate-300' : 'text-slate-400'}`}>{c.label}</p>
                      <p className="text-[11px] text-slate-500">{c.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {certs.length === 0 ? (
        <EmptyState icon={Trophy} title="No certificates yet" description="Complete a badge level to earn your first certificate." />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {certs.map(cert => {
            const title = cert.badgeLevel?.title ?? cert.title ?? 'Certificate'
            const course = (typeof cert.course === 'object' ? cert.course?.title : undefined) ?? '—'
            const certNumber = cert.certificateNumber ?? '—'
            return (
              <div key={cert._id} className="card overflow-hidden">
                <div className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-ink-800 to-cyan-900 p-8 text-center">
                  <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(rgba(99,149,255,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(99,149,255,0.1) 1px,transparent 1px)', backgroundSize: '24px 24px' }} />
                  <Trophy size={36} className="relative z-10 mx-auto mb-3 text-amber-400" />
                  <p className="relative z-10 mb-1 text-xs text-slate-400">MASTERVIEW DIGITAL INNOVATION ACADEMY</p>
                  <h3 className="relative z-10 font-display text-xl font-bold text-white">{title}</h3>
                  <p className="relative z-10 mt-1 text-sm text-brand-300">{course}</p>
                </div>
                <div className="space-y-3 p-5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Certificate Number</span>
                    <span className="font-mono text-slate-300">{certNumber}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Issued</span>
                    <span className="text-slate-300">{cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</span>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => handleDownload(cert._id, certNumber)} disabled={downloadingId === cert._id} className="btn-primary flex-1 justify-center py-2 text-xs">
                      {downloadingId === cert._id ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} Download PDF
                    </button>
                    <a href={`/verify/${certNumber}`} target="_blank" rel="noopener noreferrer" className="btn-outline flex items-center gap-1.5 px-3 py-2 text-xs"><Shield size={12} /> Verify</a>
                    <button onClick={() => setQrCert(cert)} aria-label={`Show QR code for certificate ${certNumber}`} className="btn-ghost px-3 py-2 text-xs"><QrCode size={14} /></button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <div className="card border-brand-600/20 bg-brand-600/8 p-5">
        <div className="flex items-start gap-3">
          <Shield size={16} className="mt-0.5 flex-shrink-0 text-brand-400" />
          <div>
            <p className="mb-1 text-sm font-medium text-white">Certificates are publicly verifiable</p>
            <p className="text-xs text-slate-400">Each certificate has a unique QR code and verification URL. Employers can verify authenticity at <span className="text-brand-400">masterviewacademy.com/verify</span></p>
          </div>
        </div>
      </div>

      {qrCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="qr-modal-title" onClick={() => setQrCert(null)}>
          <div className="card max-w-xs p-6 text-center" onClick={e => e.stopPropagation()}>
            <h3 id="qr-modal-title" className="mb-3 font-display text-sm font-bold text-white">Scan to verify</h3>
            {qrCert.qrCode && <img src={qrCert.qrCode} alt="Certificate QR code" className="mx-auto h-48 w-48 rounded-lg bg-white p-2" />}
            <p className="mt-3 break-all font-mono text-xs text-slate-500">{qrCert.certificateNumber}</p>
            <button className="btn-ghost mt-4 text-xs" onClick={() => setQrCert(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
