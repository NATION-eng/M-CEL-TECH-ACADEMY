import { BookOpen, FileText, CheckSquare, Trophy, TrendingUp, Clock, ArrowRight, Play, AlertCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/auth.store'
import { useQuery } from '@tanstack/react-query'
import { dashboardAPI } from '../../services/api'
import { Button, Badge, ProgressBar, EmptyState, StatCardSkeleton, CourseCardSkeleton, ListItemSkeleton } from '../../components/ui'

interface Enrollment {
  _id: string
  course?: { title?: string }
  currentBadge?: { title?: string }
  progress?: number
}
interface UpcomingAssignment {
  _id: string
  title?: string
  course?: { title?: string }
  dueDate?: string
}
interface RecentSubmission {
  _id: string
  assignment?: { title?: string; course?: { title?: string } }
  submittedAt?: string
  grade?: number
}
interface TodaySession {
  courseTitle: string
  startTime: string
  endTime: string
  mode: 'online' | 'physical'
  location?: string
  meetingLink?: string
}

export default function StudentDashboard() {
  const { user } = useAuthStore()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['studentDashboard'],
    queryFn: async () => {
      const res = await dashboardAPI.student()
      return res.data.data
    },
  })

  if (error) {
    return (
      <div className="card border-red-500/20 bg-red-600/5 p-5 text-center">
        <AlertCircle size={24} className="mx-auto mb-2 text-red-400" />
        <h3 className="font-semibold text-white">Failed to load dashboard data</h3>
        <p className="mt-1 text-sm text-slate-400">Please try refreshing the page or check your connection.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div role="status" aria-label="Loading dashboard" className="space-y-7">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="space-y-2">
            <div className="h-3.5 w-32 animate-pulse rounded bg-white/[0.06]" />
            <div className="h-7 w-48 animate-pulse rounded bg-white/[0.06]" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {Array.from({ length: 2 }).map((_, i) => <CourseCardSkeleton key={i} />)}
          </div>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <ListItemSkeleton key={i} />)}
          </div>
        </div>
      </div>
    )
  }

  const enrollments: Enrollment[] = dashboardData?.enrollments ?? []
  const upcomingAssignments: UpcomingAssignment[] = dashboardData?.upcomingAssignments ?? []
  const recentSubmissions: RecentSubmission[] = dashboardData?.recentSubmissions ?? []
  const todaysSessions: TodaySession[] = dashboardData?.todaysSessions ?? []

  const stats = [
    { label: 'Courses Enrolled', value: dashboardData?.coursesEnrolled ?? 0, icon: BookOpen, color: 'text-brand-400 bg-brand-600/15' },
    { label: 'Avg. Progress', value: `${dashboardData?.avgProgress ?? 0}%`, icon: TrendingUp, color: 'text-emerald-400 bg-emerald-600/15' },
    // Was `bg-brand-600/15` (indigo) paired with amber text — every other
    // card pairs matching text/background colors; this one didn't.
    { label: 'Assignments Due', value: upcomingAssignments.length, icon: FileText, color: 'text-amber-400 bg-amber-600/15' },
    { label: 'Certificates', value: dashboardData?.certificatesEarned ?? 0, icon: Trophy, color: 'text-cyan-400 bg-cyan-600/15' },
  ]

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm text-slate-500">{greeting} 👋</p>
          <h1 className="mt-0.5 font-display text-2xl font-bold text-white">{user?.firstName} {user?.lastName}</h1>
        </div>
        <Button to="/student/courses" className="self-start text-sm sm:self-auto">
          Continue Learning <ArrowRight size={15} />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${s.color}`}>
              <s.icon size={17} />
            </div>
            <div className="stat-num">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {todaysSessions.length > 0 && (
        <div className="card border-brand-600/30 p-5">
          <h2 className="mb-3 flex items-center gap-2 font-display font-semibold text-white">
            <Play size={15} className="text-brand-400" /> Today's Classes
          </h2>
          <div className="space-y-2">
            {todaysSessions.map((s, i) => {
              const [h, m] = s.startTime.split(':').map(Number)
              const [eh, em] = s.endTime.split(':').map(Number)
              const now = new Date()
              const start = new Date(); start.setHours(h, m, 0, 0)
              const end = new Date(); end.setHours(eh, em, 0, 0)
              const isLive = now >= start && now <= end
              return (
                <div key={i} className={`flex items-center justify-between rounded-lg p-3 ${isLive ? 'border border-emerald-500/25 bg-emerald-500/10' : 'bg-ink-700/40'}`}>
                  <div>
                    <p className="text-sm font-medium text-white">{s.courseTitle}</p>
                    <p className="text-xs text-slate-500">{s.startTime}–{s.endTime} · {s.mode === 'online' ? 'Online' : s.location || 'On-site'}</p>
                  </div>
                  {s.mode === 'online' && s.meetingLink ? (
                    <Button href={s.meetingLink} external variant={isLive ? 'primary' : 'ghost'} className="text-xs">
                      {isLive ? 'Join Now' : 'Meeting Link'}
                    </Button>
                  ) : isLive ? (
                    <Badge color="green">Happening now</Badge>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-white">My Courses</h2>
            <Link to="/student/courses" className="text-xs font-medium text-brand-400 hover:text-brand-300">View all →</Link>
          </div>
          {enrollments.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="You're not enrolled in any courses yet"
              description="Browse the programme catalog to get started."
              action={<Button to="/programs" variant="outline" className="text-xs">Browse Programmes</Button>}
            />
          ) : (
            enrollments.map((enrollment) => {
              const courseTitle = enrollment.course?.title || 'Unknown Course'
              const badgeTitle = enrollment.currentBadge?.title || 'Badge 1'
              const progress = enrollment.progress || 0
              return (
                <div key={enrollment._id} className="card-hover p-5">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-white">{courseTitle}</h3>
                      <Badge color="indigo">{badgeTitle}</Badge>
                    </div>
                    <span className="font-mono text-sm font-bold text-brand-400">{progress}%</span>
                  </div>
                  <ProgressBar value={progress} label={`${courseTitle} progress`} className="mb-4" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Clock size={12} /> Current Progress: {progress}%
                    </div>
                    <Link to="/student/courses" className="flex items-center gap-1.5 text-xs font-medium text-brand-400 hover:text-brand-300">
                      <Play size={11} /> Continue
                    </Link>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="space-y-5">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold text-white">Upcoming Assignments</h2>
              <Link to="/student/assignments" className="text-xs text-brand-400 hover:text-brand-300">View all →</Link>
            </div>
            <div className="space-y-2">
              {upcomingAssignments.length === 0 ? (
                <EmptyState compact title="No upcoming assignments." />
              ) : (
                upcomingAssignments.map((a) => {
                  const title = a.title || 'Assignment'
                  const cTitle = a.course?.title || 'Course'
                  const dateStr = a.dueDate
                    ? `Due ${new Date(a.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                    : 'No due date'
                  return (
                    <div key={a._id} className="card flex items-start gap-3 p-3.5">
                      <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-400" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium leading-snug text-white">{title}</p>
                        <p className="mt-0.5 text-[10px] text-slate-500">{cTitle} · <span className="text-slate-500">{dateStr}</span></p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div>
            <h2 className="mb-3 font-display text-sm font-semibold text-white">Recent Activity</h2>
            <div className="space-y-1">
              {recentSubmissions.length === 0 ? (
                <EmptyState compact title="No submissions yet." />
              ) : (
                recentSubmissions.map((s) => {
                  const assignmentTitle = s.assignment?.title || 'Assignment'
                  const courseTitle = s.assignment?.course?.title || 'Course'
                  const timeAgo = s.submittedAt ? new Date(s.submittedAt).toLocaleDateString() : 'N/A'
                  return (
                    <div key={s._id} className="flex items-start gap-3 border-b border-white/[0.05] py-2.5 last:border-0">
                      <CheckSquare size={13} className="mt-0.5 flex-shrink-0 text-emerald-400" />
                      <div>
                        <p className="text-xs leading-snug text-slate-300">Submitted: {assignmentTitle}</p>
                        <p className="mt-0.5 text-[10px] text-slate-600">{courseTitle} · {timeAgo} · Grade: {s.grade !== undefined ? `${s.grade}%` : 'Pending'}</p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
