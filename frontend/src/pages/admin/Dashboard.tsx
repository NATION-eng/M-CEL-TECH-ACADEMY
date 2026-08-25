import { Users, BookOpen, CreditCard, Trophy, TrendingUp, AlertCircle, UserCheck, GraduationCap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { dashboardAPI } from '../../services/api'

export default function AdminDashboard() {
  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['adminDashboard'],
    queryFn: async () => {
      const res = await dashboardAPI.admin();
      return res.data.data;
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-5 border-red-500/20 bg-red-600/5 text-center">
        <AlertCircle size={24} className="text-red-400 mx-auto mb-2" />
        <h3 className="font-semibold text-white">Failed to load dashboard data</h3>
        <p className="text-sm text-slate-400 mt-1">Please try refreshing the page or check your connection.</p>
      </div>
    );
  }

  const stats = [
    { label:'Total Students', value: dashboardData?.totalStudents ?? 0, delta:'All registered accounts', icon:Users, color:'text-brand-400 bg-brand-600/15', deltaColor:'text-slate-500 text-xs' },
    { label:'Active Students', value: dashboardData?.activeStudents ?? 0, delta:'Currently active', icon:UserCheck, color:'text-emerald-400 bg-emerald-600/15', deltaColor:'text-slate-500 text-xs' },
    { label:'Instructors', value: dashboardData?.totalInstructors ?? 0, delta:'Active faculty', icon:GraduationCap, color:'text-purple-400 bg-purple-600/15', deltaColor:'text-slate-500 text-xs' },
    { label:'Certificates Issued', value: dashboardData?.certificatesIssued ?? 0, delta:'Active certificates', icon:Trophy, color:'text-amber-400 bg-amber-600/15', deltaColor:'text-slate-500 text-xs' },
  ];

  const recentEnrollments = dashboardData?.recentEnrollments ?? [];
  const revenueData = dashboardData?.monthlyRevenue ?? [];

  return (
    <div className="space-y-7">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Masterview Digital Innovation Academy</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <div className={`w-9 h-9 rounded-xl ${s.color} flex items-center justify-center`}><s.icon size={17}/></div>
            <div className="stat-num">{s.value}</div>
            <div className="stat-label">{s.label}</div>
            <div className={s.deltaColor}>{s.delta}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-display font-semibold text-white">Revenue Overview</h2>
              <p className="text-xs text-slate-500 mt-0.5">Last 6 months</p>
            </div>
            <div className="text-right">
              <div className="font-mono font-bold text-emerald-400 text-lg">
                ₦{(dashboardData?.totalRevenue ?? 0).toLocaleString()}
              </div>
              <div className="text-xs text-slate-500">All-time Revenue</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fill:'#64748b', fontSize:11 }} axisLine={false} tickLine={false}/>
              <YAxis hide/>
              <Tooltip formatter={(v: number) => [`₦${(v/1000).toFixed(0)}k`, 'Revenue']} contentStyle={{ background:'#0F1A2E', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', color:'#f1f5f9', fontSize:12 }}/>
              <Area type="monotone" dataKey="revenue" stroke="#4F46E5" fill="url(#revGrad)" strokeWidth={2}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Quick links */}
        <div className="space-y-3">
          <h2 className="font-display font-semibold text-white">Quick Actions</h2>
          {[
            { label:'Add New Student', to:'/admin/students', icon:Users, color:'text-brand-400' },
            { label:'Manage Courses', to:'/admin/courses', icon:BookOpen, color:'text-cyan-400' },
            { label:'Payment Overview', to:'/admin/payments', icon:CreditCard, color:'text-amber-400' },
            { label:'Issue Certificate', to:'/admin/certificates', icon:Trophy, color:'text-emerald-400' },
            { label:'Overdue Payments', to:'/admin/payments', icon:AlertCircle, color:'text-red-400' },
          ].map(a => (
            <Link key={a.label} to={a.to} className="flex items-center gap-3 p-3.5 card-hover rounded-xl cursor-pointer">
              <a.icon size={16} className={a.color}/>
              <span className="text-sm text-slate-300 hover:text-white transition-colors">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent enrollments */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-white/[0.07]">
          <h2 className="font-display font-semibold text-white">Recent Enrollments</h2>
          <Link to="/admin/students" className="text-xs text-brand-400">View all →</Link>
        </div>
        <table className="tbl w-full">
          <thead><tr><th>Student</th><th>Course</th><th>Date</th><th>Status</th></tr></thead>
          <tbody>
            {recentEnrollments.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-slate-500 py-6 text-sm">
                  No recent enrollments found.
                </td>
              </tr>
            ) : (
              recentEnrollments.map((e: any) => {
                const sName = e.student ? `${e.student.firstName} ${e.student.lastName}` : 'Unknown Student';
                const cTitle = e.course ? e.course.title : 'Unknown Course';
                const dateStr = e.enrolledAt 
                  ? new Date(e.enrolledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : 'N/A';
                const status = e.status || 'pending';

                return (
                  <tr key={e._id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-brand-600/20 flex items-center justify-center text-brand-400 text-xs font-bold">
                          {sName[0]}
                        </div>
                        <span className="font-medium text-white text-sm">{sName}</span>
                      </div>
                    </td>
                    <td><span className="badge badge-indigo">{cTitle}</span></td>
                    <td className="text-slate-500">{dateStr}</td>
                    <td><span className={`badge ${status==='active'?'badge-green':'badge-amber'}`}>{status}</span></td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
