import { useState } from 'react'
import { Search, Download, TrendingUp, AlertCircle, CheckCircle2, Clock, Loader2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { paymentAPI } from '../../services/api'

const statusBadge: Record<string,string> = { paid:'badge-green', partial:'badge-amber', pending:'badge-indigo', overdue:'badge-red', failed:'badge-red', refunded:'badge-cyan' }

export default function AdminPayments() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await paymentAPI.exportCsv({ search: search || undefined, status: statusFilter !== 'all' ? statusFilter : undefined })
      const blob = new Blob([res.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `payments-export-${new Date().toISOString().slice(0,10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error('Could not export payments. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const { data: paymentsData, isLoading: loadingPayments } = useQuery({
    queryKey: ['payments', search, statusFilter],
    queryFn: async () => {
      const res = await paymentAPI.all({ search: search || undefined, status: statusFilter !== 'all' ? statusFilter : undefined })
      return res.data.data
    },
  })

  const { data: summaryData } = useQuery({
    queryKey: ['financialSummary'],
    queryFn: async () => {
      const res = await paymentAPI.summary()
      return res.data.data
    },
  })

  const payments: any[] = Array.isArray(paymentsData) ? paymentsData : (paymentsData?.payments ?? [])

  const totalRevenue = summaryData?.totalRevenue ?? payments.reduce((a, p) => a + (p.amount ?? 0), 0)
  const totalOutstanding = summaryData?.totalOutstanding ?? payments.reduce((a, p) => a + (p.balance ?? 0), 0)
  const overdueCount = summaryData?.overdueCount ?? payments.filter(p => p.status === 'overdue').length
  const fullyPaidCount = summaryData?.fullyPaidCount ?? payments.filter(p => p.status === 'paid').length

  const monthlyRevenue = (summaryData?.monthlyRevenue ?? []).map((m: any) => ({ month: m.month, amount: Math.round(m.revenue / 1000) }))

  const filtered = payments

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-bold text-white">Payments & Finance</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label:'Total Revenue', value:`₦${((totalRevenue ?? 0)/1000).toFixed(0)}k`, icon:TrendingUp, color:'text-emerald-400 bg-emerald-600/15' },
          { label:'Outstanding', value:`₦${((totalOutstanding ?? 0)/1000).toFixed(0)}k`, icon:Clock, color:'text-amber-400 bg-amber-600/15' },
          { label:'Overdue Students', value:(overdueCount ?? 0).toString(), icon:AlertCircle, color:'text-red-400 bg-red-600/15' },
          { label:'Fully Paid', value:(fullyPaidCount ?? 0).toString(), icon:CheckCircle2, color:'text-cyan-400 bg-cyan-600/15' },
        ].map(s=>(
          <div key={s.label} className="stat-card">
            <div className={`w-9 h-9 rounded-xl ${s.color} flex items-center justify-center`}><s.icon size={17}/></div>
            <div className="stat-num">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div className="card p-5">
        <h2 className="font-display font-semibold text-white mb-4">Monthly Revenue (₦ thousands)</h2>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={monthlyRevenue}>
            <XAxis dataKey="month" tick={{fill:'#64748b',fontSize:11}} axisLine={false} tickLine={false}/>
            <YAxis hide/>
            <Tooltip formatter={(v:number)=>[`₦${v}k`,'Revenue']} contentStyle={{background:'#0F1A2E',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'8px',color:'#f1f5f9',fontSize:12}}/>
            <Bar dataKey="amount" fill="#4F46E5" radius={[4,4,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"/>
          <input className="input pl-9" placeholder="Search students..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <select className="input sm:w-40" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="paid">Fully Paid</option>
          <option value="partial">Partial</option>
          <option value="overdue">Overdue</option>
          <option value="pending">Pending</option>
        </select>
        <button onClick={handleExport} disabled={exporting} className="btn-outline text-sm flex items-center gap-2">
          {exporting ? <Loader2 size={14} className="animate-spin"/> : <Download size={14}/>} Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loadingPayments ? (
          <div className="py-16 flex items-center justify-center text-slate-500">
            <Loader2 size={22} className="animate-spin mr-2"/> Loading payments...
          </div>
        ) : (
          <table className="tbl w-full">
            <thead><tr><th>Student</th><th>Course</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th>Last Payment</th></tr></thead>
            <tbody>
              {filtered.map(p => {
                const studentName = p.student ? `${p.student.firstName} ${p.student.lastName}` : p.studentName ?? '—'
                const courseName = p.course?.title ?? p.courseName ?? '—'
                const total = p.totalFee ?? p.total ?? 0
                const paid = p.amountPaid ?? p.paid ?? p.amount ?? 0
                const balance = p.balance ?? (total - paid)
                const status = p.status ?? 'pending'
                const lastPayment = p.lastPaymentDate ?? p.updatedAt ?? null
                return (
                  <tr key={p._id}>
                    <td><span className="font-medium text-white text-sm">{studentName}</span></td>
                    <td><span className="text-sm text-slate-300">{courseName}</span></td>
                    <td><span className="font-mono text-sm text-slate-300">₦{total.toLocaleString()}</span></td>
                    <td><span className="font-mono text-sm text-emerald-400">₦{paid.toLocaleString()}</span></td>
                    <td><span className={`font-mono text-sm ${balance>0?'text-amber-400':'text-slate-500'}`}>{balance>0?`₦${balance.toLocaleString()}`:'—'}</span></td>
                    <td><span className={`badge ${statusBadge[status] ?? 'badge-indigo'}`}>{status}</span></td>
                    <td className="text-slate-500 text-sm">{lastPayment ? new Date(lastPayment).toLocaleDateString('en-GB') : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {!loadingPayments && filtered.length === 0 && (
          <div className="py-10 text-center text-slate-500 text-sm">No payment records found.</div>
        )}
      </div>
    </div>
  )
}
