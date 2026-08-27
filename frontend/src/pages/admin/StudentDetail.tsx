import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Mail, Phone, Calendar, BookOpen, CreditCard, Loader2, UserX, UserCheck } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { userAPI, enrollmentAPI, paymentAPI } from '../../services/api'

export default function AdminStudentDetail() {
  const { id } = useParams()
  const qc = useQueryClient()

  const { data: user, isLoading } = useQuery({
    queryKey: ['userDetail', id],
    queryFn: async () => (await userAPI.one(id!)).data.data,
    enabled: !!id,
  })

  const { data: enrollData } = useQuery({
    queryKey: ['studentEnrollments', id],
    queryFn: async () => (await enrollmentAPI.all({ student: id })).data.data,
    enabled: !!id,
  })
  const enrollments: any[] = Array.isArray(enrollData) ? enrollData : []

  const { data: paymentData } = useQuery({
    queryKey: ['studentPayments', id],
    queryFn: async () => (await paymentAPI.all({ student: id })).data.data,
    enabled: !!id,
  })
  const payments: any[] = Array.isArray(paymentData) ? paymentData : []

  const suspendMut = useMutation({
    mutationFn: () => userAPI.suspend(id!),
    onSuccess: () => { toast.success('Student suspended'); qc.invalidateQueries({ queryKey: ['userDetail', id] }) },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to suspend.'),
  })
  const activateMut = useMutation({
    mutationFn: () => userAPI.activate(id!),
    onSuccess: () => { toast.success('Student reactivated'); qc.invalidateQueries({ queryKey: ['userDetail', id] }) },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to reactivate.'),
  })

  if (isLoading) {
    return <div className="py-16 flex items-center justify-center text-slate-500"><Loader2 size={22} className="animate-spin mr-2"/> Loading student...</div>
  }
  if (!user) {
    return <div className="card p-10 text-center text-slate-500 text-sm">Student not found.</div>
  }

  const isSuspended = user.isSuspended

  return (
    <div className="space-y-6">
      <Link to="/admin/students" className="btn-ghost text-sm inline-flex"><ArrowLeft size={14}/> Back to Students</Link>

      <div className="card p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4">
          <div className="w-14 h-14 rounded-full bg-brand-600/20 flex items-center justify-center text-brand-400 text-xl font-bold shrink-0">
            {user.firstName?.[0]}{user.lastName?.[0]}
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-xl font-bold text-white truncate">{user.firstName} {user.lastName}</h1>
            <div className="flex flex-wrap justify-center sm:justify-start gap-3 text-sm text-slate-500 mt-1">
              <span className="flex items-center gap-1.5"><Mail size={13}/> {user.email}</span>
              {user.phone && <span className="flex items-center gap-1.5"><Phone size={13}/> {user.phone}</span>}
              {user.createdAt && <span className="flex items-center gap-1.5"><Calendar size={13}/> Joined {new Date(user.createdAt).toLocaleDateString('en-GB')}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center sm:justify-end gap-2 shrink-0 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-white/[0.06]">
          <span className={`badge ${isSuspended ? 'badge-red' : 'badge-green'}`}>{isSuspended ? 'Suspended' : 'Active'}</span>
          {isSuspended ? (
            <button onClick={() => activateMut.mutate()} disabled={activateMut.isPending} className="btn-outline text-xs"><UserCheck size={13}/> Reactivate</button>
          ) : (
            <button onClick={() => suspendMut.mutate()} disabled={suspendMut.isPending} className="btn-outline text-xs text-amber-400"><UserX size={13}/> Suspend</button>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <h2 className="font-display font-semibold text-white p-5 pb-3 flex items-center gap-2"><BookOpen size={16}/> Enrollments</h2>
        {enrollments.length === 0 ? (
          <div className="px-5 pb-5 text-sm text-slate-500">No enrollments yet.</div>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl w-full">
              <thead><tr><th>Course</th><th>Status</th><th>Progress</th><th>Enrolled</th></tr></thead>
              <tbody>
                {enrollments.map((e: any) => (
                  <tr key={e._id}>
                    <td className="text-sm text-white">{e.course?.title ?? '—'}</td>
                    <td><span className={`badge ${e.status === 'active' ? 'badge-green' : e.status === 'completed' ? 'badge-indigo' : 'badge-amber'}`}>{e.status}</span></td>
                    <td className="text-sm text-slate-400">{e.progress ?? 0}%</td>
                    <td className="text-sm text-slate-500">{e.enrolledAt ? new Date(e.enrolledAt).toLocaleDateString('en-GB') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <h2 className="font-display font-semibold text-white p-5 pb-3 flex items-center gap-2"><CreditCard size={16}/> Payments</h2>
        {payments.length === 0 ? (
          <div className="px-5 pb-5 text-sm text-slate-500">No payment records yet.</div>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl w-full">
              <thead><tr><th>Course</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead>
              <tbody>
                {payments.map((p: any) => (
                  <tr key={p._id}>
                    <td className="text-sm text-white">{p.course?.title ?? '—'}</td>
                    <td className="text-sm font-mono text-emerald-400">₦{(p.amountPaid ?? 0).toLocaleString()}</td>
                    <td className="text-sm font-mono text-slate-400">₦{(p.balance ?? 0).toLocaleString()}</td>
                    <td><span className={`badge ${p.status === 'paid' ? 'badge-green' : p.status === 'overdue' ? 'badge-red' : 'badge-amber'}`}>{p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
