import { useQuery } from '@tanstack/react-query'
import { Loader2, Users, TrendingUp, CalendarCheck, FileText, Brain, BarChart3 } from 'lucide-react'
import { reportAPI } from '../../services/api'

export default function InstructorReports() {
  const { data, isLoading } = useQuery({
    queryKey: ['instructorReport'],
    queryFn: async () => (await reportAPI.instructor()).data.data as any[],
  })
  const report = data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Reports</h1>
        <p className="text-slate-500 text-sm mt-1">Live numbers from your courses — enrollment, progress, attendance, and grading.</p>
      </div>

      {isLoading ? (
        <div className="py-16 flex items-center justify-center text-slate-500"><Loader2 size={22} className="animate-spin mr-2"/> Crunching the numbers...</div>
      ) : report.length === 0 ? (
        <div className="card p-12 text-center text-slate-500 text-sm">
          <BarChart3 size={28} className="mx-auto mb-2 text-slate-600"/>
          No courses assigned to you yet.
        </div>
      ) : (
        <div className="space-y-5">
          {report.map(r => (
            <div key={r.courseId} className="card p-6">
              <h2 className="font-display text-lg font-semibold text-white mb-5">{r.courseTitle}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <Stat icon={Users} label="Enrolled" value={r.enrolledCount} />
                <Stat icon={TrendingUp} label="Avg Progress" value={`${r.avgProgress}%`} />
                <Stat icon={CalendarCheck} label="Avg Attendance" value={r.avgAttendance != null ? `${r.avgAttendance}%` : '—'} />
                <Stat icon={FileText} label="Pending Grading" value={r.pendingGrading} warn={r.pendingGrading > 0} />
                <Stat icon={FileText} label="Avg Assignment Score" value={r.avgAssignmentScore != null ? `${r.avgAssignmentScore}/100` : '—'} />
                <Stat icon={Brain} label="Quiz Pass Rate" value={r.quizPassRate != null ? `${r.quizPassRate}%` : '—'} />
              </div>
              <div className="mt-4 pt-4 border-t border-white/[0.06] text-xs text-slate-500">
                {r.completedCount} of {r.enrolledCount} student{r.enrolledCount !== 1 ? 's' : ''} have completed this course.
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Stat({ icon: Icon, label, value, warn }: { icon: any; label: string; value: string | number; warn?: boolean }) {
  return (
    <div className="text-center">
      <div className={`w-9 h-9 rounded-lg mx-auto mb-2 flex items-center justify-center ${warn ? 'bg-amber-600/15 text-amber-400' : 'bg-brand-600/15 text-brand-400'}`}>
        <Icon size={16}/>
      </div>
      <div className={`font-display text-lg font-bold ${warn ? 'text-amber-400' : 'text-white'}`}>{value}</div>
      <div className="text-[10px] text-slate-500 mt-0.5">{label}</div>
    </div>
  )
}
