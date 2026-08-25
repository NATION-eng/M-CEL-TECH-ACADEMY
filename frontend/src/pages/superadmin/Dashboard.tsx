import { Crown, Users, BookOpen, CreditCard, Shield, Activity, Globe, Loader2, AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { dashboardAPI, systemAPI } from '../../services/api'

export default function SuperAdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['adminDashboard'],
    queryFn: async () => {
      const res = await dashboardAPI.admin()
      return res.data.data
    },
  })

  const { data: statusData } = useQuery({
    queryKey: ['systemStatus'],
    queryFn: async () => (await systemAPI.status()).data.data,
    refetchInterval: 60_000,
  })

  const totalUsers = (data?.totalStudents ?? 0) + (data?.totalInstructors ?? 0) + 1
  const totalRevenue = data?.totalRevenue ?? 0
  const totalCourses = data?.totalCourses ?? 0

  const platformData = data?.monthlyGrowth ?? []

  if (isLoading) {
    return (
      <div className="py-20 flex items-center justify-center text-slate-500">
        <Loader2 size={24} className="animate-spin mr-2"/> Loading dashboard...
      </div>
    )
  }

  return (
    <div className="space-y-7">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center text-ink-900"><Crown size={18}/></div>
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Super Admin</h1>
          <p className="text-slate-500 text-sm">Full platform control & oversight</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label:'Total Users', value: totalUsers.toString(), delta:`${data?.totalStudents ?? 0} students`, icon:Users, color:'text-brand-400 bg-brand-600/15' },
          { label:'Total Revenue', value:`₦${(totalRevenue/1000).toFixed(0)}k`, delta:'All time', icon:CreditCard, color:'text-emerald-400 bg-emerald-600/15' },
          { label:'Active Courses', value: totalCourses.toString(), delta:'All programs', icon:BookOpen, color:'text-cyan-400 bg-cyan-600/15' },
          { label:'Instructors', value: (data?.totalInstructors ?? 0).toString(), delta:'Active staff', icon:Shield, color:'text-amber-400 bg-amber-600/15' },
        ].map(s=>(
          <div key={s.label} className="stat-card">
            <div className={`w-9 h-9 rounded-xl ${s.color} flex items-center justify-center`}><s.icon size={17}/></div>
            <div className="stat-num">{s.value}</div>
            <div className="stat-label">{s.label}</div>
            <div className="text-xs text-slate-500">{s.delta}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="font-display font-semibold text-white mb-4">Platform Growth</h2>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={platformData}>
              <defs>
                <linearGradient id="studGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{fill:'#64748b',fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis hide/>
              <Tooltip contentStyle={{background:'#0F1A2E',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'8px',color:'#f1f5f9',fontSize:12}}/>
              <Area type="monotone" dataKey="students" name="Students" stroke="#F59E0B" fill="url(#studGrad)" strokeWidth={2}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-3">
          <h2 className="font-display font-semibold text-white">Portal Access</h2>
          {[
            { label:'Admin Portal', desc:'Student, course & payment management', to:'/admin/dashboard', icon:Shield, color:'text-amber-400 bg-amber-600/15' },
            { label:'Instructor Portal', desc:'Course content & grading', to:'/instructor/dashboard', icon:BookOpen, color:'text-cyan-400 bg-cyan-600/15' },
            { label:'All Users', desc:'Manage every user on the platform', to:'/superadmin/users', icon:Users, color:'text-brand-400 bg-brand-600/15' },
            { label:'Platform Settings', desc:'Global configuration & system settings', to:'/superadmin/settings', icon:Activity, color:'text-emerald-400 bg-emerald-600/15' },
          ].map(item => (
            <Link key={item.label} to={item.to} className="flex items-center gap-3 p-4 card-hover rounded-xl">
              <div className={`w-9 h-9 rounded-xl ${item.color} flex items-center justify-center flex-shrink-0`}><item.icon size={16}/></div>
              <div><div className="text-sm font-medium text-white">{item.label}</div><div className="text-xs text-slate-500 mt-0.5">{item.desc}</div></div>
            </Link>
          ))}
        </div>
      </div>

      <div className={`card p-5 ${statusData?.allOperational === false ? 'bg-red-500/10 border-red-600/30' : 'bg-gradient-to-r from-brand-600/10 to-cyan-600/5 border-brand-600/20'}`}>
        <div className="flex items-start gap-3">
          {statusData?.allOperational === false ? (
            <AlertTriangle size={16} className="text-red-400 mt-0.5 flex-shrink-0"/>
          ) : (
            <Globe size={16} className="text-brand-400 mt-0.5 flex-shrink-0"/>
          )}
          <div className="flex-1">
            <p className="text-sm font-semibold text-white mb-1">
              {statusData ? (statusData.allOperational ? 'Platform Status: All Systems Operational' : 'Platform Status: Attention Needed') : 'Platform Status: Checking...'}
            </p>
            {statusData ? (
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                {statusData.services.map((s: any) => (
                  <span key={s.name} className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${s.status === 'operational' ? 'bg-emerald-400' : s.status === 'down' ? 'bg-red-400' : 'bg-slate-500'}`}/>
                    {s.name}: {s.status}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">Fetching live status...</p>
            )}
          </div>
          <div className="ml-auto flex-shrink-0">
            <div className={`w-2.5 h-2.5 rounded-full ${statusData?.allOperational ? 'bg-emerald-400 animate-pulse' : statusData ? 'bg-red-400 animate-pulse' : 'bg-slate-600'}`}/>
          </div>
        </div>
      </div>
    </div>
  )
}
