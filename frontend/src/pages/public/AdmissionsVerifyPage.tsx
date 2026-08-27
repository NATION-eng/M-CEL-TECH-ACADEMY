import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, XCircle, Loader2, Mail } from 'lucide-react'
import { admissionsAPI } from '../../services/api'

type Status = 'checking' | 'success' | 'failed'

export default function AdmissionsVerifyPage() {
  const [params] = useSearchParams()
  const [status, setStatus] = useState<Status>('checking')
  const [email, setEmail] = useState<string | null>(null)
  const [message, setMessage] = useState('Confirming your payment...')

  useEffect(() => {
    const run = async () => {
      const reference = params.get('reference') ?? params.get('trxref')
      if (!reference) {
        setStatus('failed')
        setMessage('Missing payment reference.')
        return
      }
      try {
        const res = await admissionsAPI.verifyPayment(reference)
        setEmail(res.data?.data?.email ?? null)
        setStatus('success')
      } catch (err: unknown) {
        const msg = (err as {response?:{data?:{message?:string}}})?.response?.data?.message
          ?? 'We could not confirm this payment.'
        setMessage(msg)
        setStatus('failed')
      }
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen bg-ink-900 grid-bg flex items-center justify-center p-4">
      <div className="card max-w-sm w-full p-8 text-center">
        {status === 'checking' && (
          <>
            <Loader2 size={40} className="mx-auto text-brand-400 animate-spin mb-4" />
            <h1 className="font-display text-lg font-bold text-white mb-1">Confirming your deposit</h1>
            <p className="text-slate-400 text-sm">Please don't close this page — this only takes a moment.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 size={40} className="mx-auto text-emerald-400 mb-4" />
            <h1 className="font-display text-lg font-bold text-white mb-1">Welcome to M-CEL TECH ACADEMY!</h1>
            <p className="text-slate-400 text-sm mb-4">
              Your deposit is confirmed and your student account has been created{email ? ` for ${email}` : ''}.
            </p>
            <div className="bg-ink-700/50 rounded-xl p-4 mb-6 flex items-start gap-3 text-left">
              <Mail size={18} className="text-brand-400 shrink-0 mt-0.5" />
              <p className="text-sm text-slate-300">Check your email for a link to set your password — it expires in 48 hours.</p>
            </div>
            <Link to="/login" className="btn-primary w-full justify-center">Go to Sign In</Link>
          </>
        )}
        {status === 'failed' && (
          <>
            <XCircle size={40} className="mx-auto text-red-400 mb-4" />
            <h1 className="font-display text-lg font-bold text-white mb-1">We couldn't confirm this payment</h1>
            <p className="text-slate-400 text-sm mb-6">{message} If money left your account, contact us with your reference and we'll sort it out.</p>
            <Link to="/contact" className="btn-primary w-full justify-center">Contact Us</Link>
          </>
        )}
      </div>
    </div>
  )
}
