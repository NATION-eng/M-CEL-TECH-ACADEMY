import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Shield, CheckCircle2, XCircle, Loader } from 'lucide-react'
import { certificateAPI } from '../../services/api'

export default function VerifyCertPage() {
  const { certNumber } = useParams<{ certNumber: string }>()
  const [status, setStatus] = useState<'loading'|'valid'|'invalid'|'revoked'>('loading')
  const [cert, setCert] = useState<Record<string,unknown>|null>(null)

  useEffect(() => {
    if (!certNumber) return
    certificateAPI.verify(certNumber)
      .then(({ data }) => {
        setCert(data.data.certificate)
        setStatus(data.data.valid ? 'valid' : 'revoked')
      })
      .catch(() => setStatus('invalid'))
  }, [certNumber])

  return (
    <div className="min-h-screen bg-ink-900 grid-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center p-2.5 bg-white rounded-2xl shadow-lg mb-5">
          <img src="/logo.png" alt="M-CEL TECH ACADEMY" className="h-10 w-auto object-contain" />
        </div>
        <h1 className="font-display text-2xl font-bold text-white mb-6">Certificate Verification</h1>
        <div className="card p-8">
          {status === 'loading' && <><Loader size={32} className="animate-spin text-brand-400 mx-auto mb-3"/><p className="text-slate-400">Verifying certificate...</p></>}
          {status === 'valid' && cert && (
            <>
              <CheckCircle2 size={48} className="text-emerald-400 mx-auto mb-4"/>
              <h2 className="font-display text-xl font-bold text-white mb-1">Valid Certificate</h2>
              <p className="text-slate-400 text-sm mb-6">This certificate is authentic and has not been revoked.</p>
              <div className="space-y-2 text-sm text-left">
                <div className="flex justify-between py-2 border-b border-white/[0.06]"><span className="text-slate-500">Certificate #</span><span className="text-white font-mono text-xs">{certNumber}</span></div>
                <div className="flex justify-between py-2"><span className="text-slate-500">Status</span><span className="badge badge-green">Active</span></div>
              </div>
            </>
          )}
          {status === 'revoked' && <><XCircle size={48} className="text-red-400 mx-auto mb-4"/><h2 className="font-display text-xl font-bold text-white mb-2">Certificate Revoked</h2><p className="text-slate-400 text-sm">This certificate has been revoked by the academy.</p></>}
          {status === 'invalid' && <><XCircle size={48} className="text-red-400 mx-auto mb-4"/><h2 className="font-display text-xl font-bold text-white mb-2">Not Found</h2><p className="text-slate-400 text-sm">No certificate found with this number. Check the certificate and try again.</p></>}
        </div>
        <p className="text-slate-600 text-xs mt-4">Powered by M-CEL TECH ACADEMY</p>
      </div>
    </div>
  )
}
