import { BarChart3, TrendingUp, Users, Award, Loader2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { reportAPI } from '../../services/api'

export default function AdminReports() {
  const { data, isLoading } = useQuery({
    queryKey: ['adminReport'],
    queryFn: async () => (await reportAPI.admin()).data.data,
  })

  if (isLoading) {
    return <div className="py-16 flex items-center justify-center text-slate-500"><Loader2 size={22} className="animate-spin mr-2"/> Loading report...</div>
  }

  const courseStats: any[] = data?.courseStats ?? []
  const monthlyRevenue: any[] = data?.monthlyRevenue ?? []
  const instructorLeaderboard: any[] = data?.instructorLeaderboard ?? []
  const paymentStatusBreakdown: any[] = data?.paymentStatusBreakdown ?? []

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-white">Reports &amp; Analytics</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="w-9 h-9 rounded-xl bg-brand-600/15 flex items-center justify-center"><Users size={17} className="text-brand-400"/></div>
          <div className="stat-num">{data?.totalEnrollments ?? 0}</div>
          <div className="stat-label">Total Enrollments</div>
        </div>
        <div className="stat-card">
          <div className="w-9 h-9 rounded-xl bg-emerald-600/15 flex items-center justify-center"><TrendingUp size={17} className="text-emerald-400"/></div>
          <div className="stat-num">{data?.collectionRate ?? 0}%</div>
          <div className="stat-label">Collection Rate</div>
        </div>
        <div className="stat-card">
          <div className="w-9 h-9 rounded-xl bg-amber-600/15 flex items-center justify-center"><Award size={17} className="text-amber-400"/></div>
          <div className="stat-num">{data?.certificatesIssued ?? 0}</div>
          <div className="stat-label">Certificates Issued</div>
        </div>
        <div className="stat-card">
          <div className="w-9 h-9 rounded-xl bg-cyan-600/15 flex items-center justify-center"><BarChart3 size={17} className="text-cyan-400"/></div>
          <div className="stat-num">₦{Math.round((data?.totalOutstanding ?? 0)/1000).toLocaleString()}k</div>
          <div className="stat-label">Outstanding Balance</div>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-display font-semibold text-white mb-4">Revenue Trend (6 months)</h2>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={monthlyRevenue}>
            <XAxis dataKey="month" tick={{fill:'#64748b',fontSize:11}} axisLine={false} tickLine={false}/>
            <YAxis hide/>
            <Tooltip formatter={(v:number)=>[`₦${v.toLocaleString()}`,'Revenue']} contentStyle={{background:'#0F1A2E',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'8px',color:'#f1f5f9',fontSize:12}}/>
            <Bar dataKey="revenue" fill="#4F46E5" radius={[4,4,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card overflow-hidden">
          <h2 className="font-display font-semibold text-white p-5 pb-3">Course Performance</h2>
          {courseStats.length === 0 ? (
            <div className="px-5 pb-5 text-sm text-slate-500">No courses yet.</div>
          ) : (
            <table className="tbl w-full">
              <thead><tr><th>Course</th><th>Enrolled</th><th>Completion</th></tr></thead>
              <tbody>
                {courseStats.map(c => (
                  <tr key={c.courseId}>
                    <td className="text-sm text-white">{c.courseTitle}</td>
                    <td className="text-sm text-slate-400">{c.enrolledCount}</td>
                    <td className="text-sm font-mono text-emerald-400">{c.completionRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card overflow-hidden">
          <h2 className="font-display font-semibold text-white p-5 pb-3">Instructor Leaderboard</h2>
          {instructorLeaderboard.length === 0 ? (
            <div className="px-5 pb-5 text-sm text-slate-500">No instructors yet.</div>
          ) : (
            <table className="tbl w-full">
              <thead><tr><th>Instructor</th><th>Courses</th><th>Active Students</th></tr></thead>
              <tbody>
                {instructorLeaderboard.map((i: any) => (
                  <tr key={i.instructorId}>
                    <td className="text-sm text-white">{i.name}</td>
                    <td className="text-sm text-slate-400">{i.courseCount}</td>
                    <td className="text-sm font-mono text-brand-400">{i.activeStudents}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-display font-semibold text-white mb-4">Payment Status Breakdown</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {paymentStatusBreakdown.map((p: any) => (
            <div key={p.status} className="bg-ink-700/40 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold font-mono text-white">{p.count}</div>
              <div className="text-xs text-slate-500 capitalize mt-1">{p.status}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
