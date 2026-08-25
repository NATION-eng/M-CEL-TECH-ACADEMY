import { useEffect, useState } from 'react'
import { AlertTriangle, Loader2, LogOut } from 'lucide-react'
import { useQuery, useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { paymentAPI } from '../../services/api'
import { useAuthStore } from '../../store/auth.store'

interface LockInfo {
  message: string
  balance: number
  totalAmount: number
  amountPaid: number
  dueDate: string
}

/**
 * Rendered outside the normal StudentLayout/nav — deliberately has no way to
 * reach the dashboard, courses, assignments, etc. The only ways out are
 * paying the balance (which lifts the lock server-side, see
 * paymentGate.middleware.ts) or logging out.
 */
export default function PaymentLockedPage() {
  const [lockInfo, setLockInfo] = useState<LockInfo | null>(null)
  const clearAuth = useAuthStore(s => s.clearAuth)

  useEffect(() => {
    const stored = sessionStorage.getItem('paymentLockInfo')
    if (stored) {
      try { setLockInfo(JSON.parse(stored)) } catch { /* ignore */ }
    }
  }, [])

  // Always re-check current payment status on load — the stored info could be
  // stale (e.g. they paid in another tab), and my-payments is always reachable.
  const { data, isLoading } = useQuery({
    queryKey: ['my-payments-lock-check'],
    queryFn: async () => (await paymentAPI.mine()).data.data,
    refetchInterval: 15000,
  })

  const overduePayment = Array.isArray(data)
    ? data.find((p: any) => {
        const deadline = p.installmentDeadline ?? p.dueDate
        return p.balance > 0 && deadline && new Date(deadline) < new Date()
      })
    : null

  // Balance cleared (or deadline extended by a fresh payment) — send them back in.
  useEffect(() => {
    if (!isLoading && data && !overduePayment) {
      sessionStorage.removeItem('paymentLockInfo')
      window.location.href = '/student/dashboard'
    }
  }, [isLoading, data, overduePayment])

  const paystackMut = useMutation({
    mutationFn: (d: { enrollmentId: string; amount: number }) => paymentAPI.initPaystack(d),
    onSuccess: (res) => {
      const url = res.data?.data?.authorizationUrl
      if (url) window.location.href = url
      else toast.error('Could not start checkout. Please try again.')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Payment initialization failed. Please try again.'),
  })

  const info = overduePayment ?? lockInfo

  return (
    <div className="min-h-screen bg-ink-900 grid-bg flex items-center justify-center p-4">
      <div className="card max-w-md w-full p-8 text-center">
        <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400">
          <AlertTriangle size={28} />
        </div>
        <h1 className="font-display text-xl font-bold text-white mb-2">Payment Overdue</h1>
        <p className="text-slate-400 text-sm mb-6">
          Your payment deadline has passed, so your account is temporarily restricted to this page.
          Clear your balance below to instantly restore full access.
        </p>

        {isLoading && !lockInfo ? (
          <div className="flex items-center justify-center gap-2 text-slate-500 py-4">
            <Loader2 size={18} className="animate-spin" /> Checking your account...
          </div>
        ) : info ? (
          <div className="bg-ink-700/50 rounded-xl p-4 mb-6 text-left space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Outstanding balance</span>
              <span className="text-white font-semibold">₦{(info.balance ?? 0).toLocaleString()}</span>
            </div>
            {'dueDate' in info && info.dueDate && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Was due</span>
                <span className="text-red-400">{new Date(info.dueDate).toLocaleDateString('en-GB')}</span>
              </div>
            )}
          </div>
        ) : null}

        {overduePayment && (
          overduePayment.enrollment ? (
            <button
              className="btn-primary w-full justify-center py-3 mb-3"
              disabled={paystackMut.isPending}
              onClick={() => paystackMut.mutate({
                enrollmentId: overduePayment.enrollment,
                amount: overduePayment.balance,
              })}
            >
              {paystackMut.isPending
                ? <Loader2 size={16} className="animate-spin" />
                : `Pay ₦${overduePayment.balance.toLocaleString()} Now`}
            </button>
          ) : (
            // Was `overduePayment.enrollment ?? overduePayment._id` — if
            // enrollment was ever unpopulated this would silently send the
            // payment's own id as the enrollment id to Paystack. On the
            // one screen that fully locks a student out of their account,
            // failing loudly is much better than guessing.
            <p className="text-xs text-red-400 mb-3">
              Something's off with this payment record. Please contact the academy directly to clear your balance.
            </p>
          )
        )}

        <button
          className="btn-ghost w-full justify-center text-sm"
          onClick={() => { clearAuth(); window.location.href = '/login' }}
        >
          <LogOut size={14} /> Log Out
        </button>

        <p className="text-xs text-slate-600 mt-5">
          Already paid? This page rechecks automatically every 15 seconds — or refresh to check now.
        </p>
      </div>
    </div>
  )
}
