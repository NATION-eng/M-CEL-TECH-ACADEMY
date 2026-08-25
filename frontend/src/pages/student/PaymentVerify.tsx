import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { paymentAPI } from '../../services/api'

type Status = 'checking' | 'success' | 'failed'

/**
 * Landing page the gateway redirects the browser to after checkout.
 * This calls the client-side verify endpoint, which independently re-checks
 * the transaction status with the gateway's own server before crediting
 * anything (see payment.controller.ts) — it never trusts the redirect's query
 * string alone. The async webhook calls the same idempotent ledger update, so
 * whichever path lands first wins and the other is a safe no-op.
 */
function usePaymentVerification(gateway: 'paystack' | 'flutterwave') {
  const [params] = useSearchParams()
  const [status, setStatus] = useState<Status>('checking')
  const [message, setMessage] = useState('Confirming your payment...')

  useEffect(() => {
    const run = async () => {
      try {
        if (gateway === 'paystack') {
          const reference = params.get('reference') ?? params.get('trxref')
          if (!reference) throw new Error('Missing payment reference.')
          const res = await paymentAPI.verifyPaystack(reference)
          setMessage(`Payment confirmed — ₦${(res.data?.data?.amountPaid ?? 0).toLocaleString()} received.`)
        } else {
          const flwStatus = params.get('status')
          const transactionId = params.get('transaction_id')
          if (flwStatus !== 'successful' || !transactionId) throw new Error('Payment was not completed.')
          const res = await paymentAPI.verifyFlutterwave(transactionId)
          setMessage(`Payment confirmed — ₦${(res.data?.data?.amountPaid ?? 0).toLocaleString()} received.`)
        }
        setStatus('success')
      } catch (err: unknown) {
        const msg = (err as {response?:{data?:{message?:string}}})?.response?.data?.message
          ?? (err instanceof Error ? err.message : 'We could not confirm this payment.')
        setMessage(msg)
        setStatus('failed')
      }
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { status, message }
}

function VerifyLayout({ gateway }: { gateway: 'paystack' | 'flutterwave' }) {
  const { status, message } = usePaymentVerification(gateway)

  return (
    <div className="min-h-screen bg-ink-900 grid-bg flex items-center justify-center p-4">
      <div className="card max-w-sm w-full p-8 text-center">
        {status === 'checking' && (
          <>
            <Loader2 size={40} className="mx-auto text-brand-400 animate-spin mb-4" />
            <h1 className="font-display text-lg font-bold text-white mb-1">Confirming payment</h1>
            <p className="text-slate-400 text-sm">Please don't close this page — this only takes a moment.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 size={40} className="mx-auto text-emerald-400 mb-4" />
            <h1 className="font-display text-lg font-bold text-white mb-1">Payment successful!</h1>
            <p className="text-slate-400 text-sm mb-6">{message}</p>
            <Link to="/student/payments" className="btn-primary w-full justify-center">View Billing History</Link>
          </>
        )}
        {status === 'failed' && (
          <>
            <XCircle size={40} className="mx-auto text-red-400 mb-4" />
            <h1 className="font-display text-lg font-bold text-white mb-1">We couldn't confirm this payment</h1>
            <p className="text-slate-400 text-sm mb-6">{message} If money left your account, it will still be applied automatically once we hear back from the payment provider — check your billing history in a few minutes.</p>
            <Link to="/student/payments" className="btn-primary w-full justify-center">Go to Billing History</Link>
          </>
        )}
      </div>
    </div>
  )
}

export function PaystackVerifyPage() {
  return <VerifyLayout gateway="paystack" />
}

export function FlutterwaveVerifyPage() {
  return <VerifyLayout gateway="flutterwave" />
}
