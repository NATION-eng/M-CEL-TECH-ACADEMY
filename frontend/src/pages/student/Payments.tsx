import { CreditCard, Download, CheckCircle2, Clock, AlertCircle, LucideIcon, Loader2 } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useQuery, useMutation } from '@tanstack/react-query'
import { paymentAPI, settingsAPI } from '../../services/api'
import { EmptyState, ProgressBar, ListItemSkeleton } from '../../components/ui'

interface StatusConfig { label: string; color: string; Icon: LucideIcon }
const statusConfig: Record<string, StatusConfig> = {
  paid:    { label: 'Fully Paid', color: 'badge-green',  Icon: CheckCircle2 },
  partial: { label: 'Partial',    color: 'badge-amber',  Icon: Clock },
  pending: { label: 'Pending',    color: 'badge-indigo', Icon: Clock },
  overdue: { label: 'Overdue',    color: 'badge-red',    Icon: AlertCircle },
}

interface Transaction { ref?: string; reference?: string; _id?: string; amount?: number; date?: string; gateway?: string }
interface Payment {
  _id: string
  status?: string
  totalFee?: number
  totalAmount?: number
  amount?: number
  amountPaid?: number
  paid?: number
  balance?: number
  course?: { title?: string }
  courseName?: string
  enrollment?: string
  transactions?: Transaction[]
}

export default function StudentPayments() {
  const [downloadingRef, setDownloadingRef] = useState<string | null>(null)

  const { data: publicSettings } = useQuery({
    queryKey: ['publicSettings'],
    queryFn: async () => (await settingsAPI.public()).data.data,
    staleTime: 5 * 60 * 1000,
  })
  const paystackEnabled = publicSettings?.payment?.paystackEnabled ?? true
  const flutterwaveEnabled = publicSettings?.payment?.flutterwaveEnabled ?? true

  const { data, isLoading } = useQuery({
    queryKey: ['myPayments'],
    queryFn: async () => {
      const res = await paymentAPI.mine()
      return res.data.data
    },
  })

  const payments: Payment[] = Array.isArray(data) ? data : (data?.payments ?? [])

  const paystackMut = useMutation({
    mutationFn: (d: { enrollmentId: string; amount: number }) => paymentAPI.initPaystack(d),
    onSuccess: (res) => {
      const url = res.data?.data?.authorizationUrl
      if (url) window.location.href = url
      else toast.error('Could not start Paystack checkout. Please try again.')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Payment initialization failed. Please try again.'),
  })

  const downloadReceipt = async (paymentId: string, txRef: string) => {
    setDownloadingRef(txRef)
    try {
      const res = await paymentAPI.downloadReceipt(paymentId, txRef)
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `receipt-${txRef}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Could not download receipt. Please try again.')
    } finally {
      setDownloadingRef(null)
    }
  }

  const flutterwaveMut = useMutation({
    mutationFn: (d: { enrollmentId: string; amount: number }) => paymentAPI.initFlutterwave(d),
    onSuccess: (res) => {
      const url = res.data?.data?.paymentLink
      if (url) window.location.href = url
      else toast.error('Could not start Flutterwave checkout. Please try again.')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Payment initialization failed. Please try again.'),
  })

  if (isLoading) {
    return (
      <div role="status" aria-label="Loading payments" className="space-y-6">
        <div className="h-7 w-32 animate-pulse rounded bg-white/[0.06]" />
        <ListItemSkeleton />
        <ListItemSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-white">Payments</h1>

      {payments.length === 0 && (
        <EmptyState icon={CreditCard} title="No payment records found" />
      )}

      {payments.map(p => {
        const status = p.status ?? 'pending'
        const cfg = statusConfig[status] ?? statusConfig.pending
        const totalAmount = p.totalFee ?? p.totalAmount ?? p.amount ?? 0
        const amountPaid = p.amountPaid ?? p.paid ?? 0
        const balance = p.balance ?? (totalAmount - amountPaid)
        const pct = totalAmount > 0 ? Math.round((amountPaid / totalAmount) * 100) : 0
        const courseName = p.course?.title ?? p.courseName ?? '—'
        const transactions = p.transactions ?? []
        // `p.enrollment` should always be populated (it's a required field
        // on Payment) — this used to silently fall back to `p._id` (the
        // *payment's* own id, not the enrollment's) if it was ever
        // missing, which would send the wrong id to the payment-init
        // endpoint. Better to block the action with a clear error than
        // guess and risk attaching a payment to the wrong enrollment.
        const enrollmentId = p.enrollment
        const canPay = balance > 0 && !!enrollmentId

        return (
          <div key={p._id} className="card overflow-hidden">
            <div className="border-b border-white/[0.07] p-6">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-display font-semibold text-white">{courseName}</h3>
                  <span className={`badge ${cfg.color} mt-1.5 flex w-fit items-center gap-1`}>
                    <cfg.Icon size={11} /> {cfg.label}
                  </span>
                </div>
                <div className="text-right">
                  <div className="font-mono text-lg font-bold text-white">₦{amountPaid.toLocaleString()}</div>
                  <div className="text-xs text-slate-500">of ₦{totalAmount.toLocaleString()}</div>
                </div>
              </div>
              <ProgressBar value={pct} label={`${courseName} payment progress`} className="mb-1.5" />
              <div className="flex justify-between text-xs text-slate-500">
                <span>{pct}% paid</span>
                {balance > 0 && <span className="font-medium text-amber-400">Balance: ₦{balance.toLocaleString()}</span>}
              </div>
            </div>
            {balance > 0 && (
              <div className="border-b border-white/[0.07] bg-ink-700/50 p-5">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-sm font-medium text-white">Outstanding Balance</p>
                    <p className="mt-0.5 text-xs text-slate-500">Due before program completion</p>
                  </div>
                  <div className="flex gap-2">
                    {!enrollmentId ? (
                      <p className="text-xs text-red-400">Something's off with this payment record — contact the academy to pay this balance.</p>
                    ) : (
                      <>
                        {paystackEnabled && (
                          <button className="btn-primary py-2 text-sm"
                            onClick={() => paystackMut.mutate({ enrollmentId, amount: balance })}
                            disabled={!canPay || paystackMut.isPending}>
                            {paystackMut.isPending ? <Loader2 size={14} className="animate-spin" /> : `Pay ₦${balance.toLocaleString()} via Paystack`}
                          </button>
                        )}
                        {flutterwaveEnabled && (
                          <button
                            className="btn-outline py-2 text-sm"
                            onClick={() => flutterwaveMut.mutate({ enrollmentId, amount: balance })}
                            disabled={!canPay || flutterwaveMut.isPending}
                          >
                            {flutterwaveMut.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Flutterwave'}
                          </button>
                        )}
                        {!paystackEnabled && !flutterwaveEnabled && (
                          <p className="text-xs text-amber-400">Online payments are temporarily unavailable. Please contact the academy to pay.</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
            <div className="p-5">
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Transaction History</h4>
              {transactions.length === 0 ? (
                <p className="text-sm text-slate-600">No transactions yet.</p>
              ) : (
                <div className="space-y-2">
                  {transactions.map((t) => (
                    <div key={t.ref ?? t._id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 size={14} className="text-emerald-400" />
                        <div>
                          <div className="font-medium text-white">₦{(t.amount ?? 0).toLocaleString()}</div>
                          <div className="text-xs text-slate-500">{t.date ? new Date(t.date).toLocaleDateString('en-GB') : '—'} · via {t.gateway ?? 'Paystack'}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-600">{t.ref ?? t.reference ?? ''}</span>
                        <button
                          className="btn-ghost p-1.5 text-xs"
                          title="Download receipt"
                          aria-label={`Download receipt for ${t.ref ?? t.reference ?? 'transaction'}`}
                          disabled={downloadingRef === t.ref}
                          onClick={() => t.ref && downloadReceipt(p._id, t.ref)}
                        >
                          {downloadingRef === t.ref ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
