import { Users, BookOpen, CheckSquare, TrendingUp, Clock, Star, ArrowRight, AlertCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/auth.store'
import { useQuery } from '@tanstack/react-query'
import { dashboardAPI } from '../../services/api'

export default function InstructorDashboard() {
  const { user } = useAuthStore()

  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['instructorDashboard'],
    queryFn: async () => {
      const res = await dashboardAPI.instructor();
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

  const courses = dashboardData?.courses ?? [];
  const pendingGrading = dashboardData?.pendingGrading ?? [];

  const stats = [
    { label: 'Total Students', value: dashboardData?.totalStudents ?? 0, icon: Users, color: 'text-brand-400 bg-brand-600/15' },
    { label: 'Active Courses', value: courses.length, icon: BookOpen, color: 'text-cyan-400 bg-cyan-600/15' },
    { label: 'Pending Grades', value: pendingGrading.length, icon: CheckSquare, color: 'text-amber-400 bg-amber-600/15' },
    { label: 'Avg Progress', value: '51%', icon: TrendingUp, color: 'text-emerald-400 bg-emerald-600/15' }
  ];

  return (
    <div className="space-y-7">
      <div>
        <p className="text-slate-500 text-sm">Welcome back 👋</p>
        <h1 className="font-display text-2xl font-bold text-white mt-0.5">{user?.firstName} {user?.lastName}</h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <div className={`w-9 h-9 rounded-xl ${s.color} flex items-center justify-center`}><s.icon size={17}/></div>
            <div className="stat-num">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-white">My Courses</h2>
            <Link to="/instructor/courses" className="text-xs text-brand-400">View all →</Link>
          </div>
          {courses.length === 0 ? (
            <div className="card p-6 text-center text-slate-500 text-sm">
              No courses assigned yet.
            </div>
          ) : (
            courses.map((c: any) => (
              <div key={c._id} className="card-hover p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-white">{c.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Cohort 8</p>
                  </div>
                  <Link to="/instructor/courses" className="btn-primary text-xs py-1.5 px-3">Manage</Link>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="progress-track"><div className="progress-fill" style={{ width: '50%' }} /></div>
                  </div>
                  <span className="text-xs font-mono text-slate-400">50%</span>
                </div>
                <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500">
                  <Clock size={11}/> Active Course
                </div>
              </div>
            ))
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-semibold text-white">Pending Grades</h2>
            <Link to="/instructor/grades" className="text-xs text-brand-400">View all →</Link>
          </div>
          <div className="space-y-2">
            {pendingGrading.length === 0 ? (
              <div className="card p-4 text-center text-slate-500 text-sm">
                No pending grades.
              </div>
            ) : (
              pendingGrading.map((g: any) => {
                const sName = g.student ? `${g.student.firstName} ${g.student.lastName}` : 'Unknown Student';
                const assignmentTitle = g.assignment?.title || 'Assignment';
                const courseTitle = g.assignment?.course?.title || 'Course';
                const timeAgo = g.submittedAt
                  ? new Date(g.submittedAt).toLocaleDateString()
                  : 'N/A';
                return (
                  <div key={g._id} className="card p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-400 text-xs font-bold">
                        {sName[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{sName}</p>
                        <p className="text-xs text-slate-500">{assignmentTitle} · {courseTitle}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-slate-600">{timeAgo}</span>
                      <Link to="/instructor/grades" className="btn-primary text-xs py-1 px-2.5">
                        <Star size={11}/> Grade
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
