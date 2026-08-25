import { useState } from 'react'
import { Save, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useQuery, useMutation } from '@tanstack/react-query'
import { courseAPI, enrollmentAPI, attendanceAPI } from '../../services/api'
import { useAuthStore } from '../../store/auth.store'

type Status = 'present'|'absent'|'late'|'excused'
const STATUS: Status[] = ['present','absent','late','excused']
const statusColors: Record<Status,string> = {
  present:'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  absent:'bg-red-500/15 text-red-400 border-red-500/30',
  late:'bg-amber-500/15 text-amber-400 border-amber-500/30',
  excused:'bg-slate-500/15 text-slate-400 border-slate-500/30'
}

export default function InstructorAttendance() {
  const user = useAuthStore(s => s.user)
  const [courseId, setCourseId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0,10))
  const [session, setSession] = useState('Morning Session')
  const [attendance, setAttendance] = useState<Record<string,Status>>({})

  const { data: coursesData } = useQuery({
    queryKey: ['myCoursesForAttendance', user?._id],
    enabled: !!user,
    queryFn: async () => {
      const res = await courseAPI.getAll({ instructor: user?._id })
      const d = res.data.data
      return Array.isArray(d) ? d : (d?.courses ?? [])
    },
  })
  const courses: any[] = coursesData ?? []

  const { data, isLoading } = useQuery({
    queryKey: ['courseRoster', courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const res = await enrollmentAPI.all({ course: courseId, status: 'active' })
      const d = res.data.data
      const enrollments: any[] = Array.isArray(d) ? d : (d?.enrollments ?? [])
      const students = enrollments.map(e => e.student).filter(Boolean)
      const init: Record<string,Status> = {}
      students.forEach((s: any) => { init[s._id] = 'present' })
      setAttendance(init)
      return students
    },
  })

  const students: any[] = data ?? []

  const saveMut = useMutation({
    mutationFn: () => attendanceAPI.mark({
      course: courseId,
      date,
      session,
      records: Object.entries(attendance).map(([student, status]) => ({ student, status })),
    }),
    onSuccess: () => toast.success('Attendance saved!'),
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to save attendance'),
  })

  const summary = STATUS.map(s => ({ status:s, count:Object.values(attendance).filter(v=>v===s).length }))

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="font-display text-2xl font-bold text-white">Mark Attendance</h1>
      <div className="card p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <div>
            <label className="label">Course</label>
            <select className="input" value={courseId} onChange={e=>setCourseId(e.target.value)}>
              <option value="">Select course...</option>
              {courses.map((c:any) => <option key={c._id} value={c._id}>{c.title}</option>)}
            </select>
          </div>
          <div><label className="label">Date</label><input type="date" className="input" value={date} onChange={e=>setDate(e.target.value)}/></div>
          <div><label className="label">Session</label><input className="input" value={session} onChange={e=>setSession(e.target.value)}/></div>
        </div>

        {!courseId ? (
          <div className="py-10 text-center text-slate-500 text-sm">Select a course to load its student roster.</div>
        ) : (
          <>
            <div className="flex gap-2 flex-wrap mb-5">
              {summary.map(s => (
                <div key={s.status} className={`badge border ${statusColors[s.status]}`}>{s.status}: {s.count}</div>
              ))}
            </div>
            {isLoading ? (
              <div className="py-12 flex items-center justify-center text-slate-500">
                <Loader2 size={20} className="animate-spin mr-2"/> Loading roster...
              </div>
            ) : students.length === 0 ? (
              <div className="py-10 text-center text-slate-500 text-sm">No active students enrolled in this course yet.</div>
            ) : (
              <div className="space-y-2">
                {students.map(student => {
                  const name = `${student.firstName} ${student.lastName}`
                  return (
                    <div key={student._id} className="flex items-center justify-between p-3.5 bg-ink-700/50 rounded-xl border border-white/[0.05]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-600/20 flex items-center justify-center text-brand-400 text-xs font-bold">{name[0]}</div>
                        <div><p className="text-sm font-medium text-white">{name}</p><p className="text-xs text-slate-500 font-mono">{student.studentId ?? student._id.slice(-6)}</p></div>
                      </div>
                      <div className="flex gap-1">
                        {STATUS.map(s => (
                          <button key={s} onClick={() => setAttendance(a=>({...a,[student._id]:s}))}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize border transition-all ${attendance[student._id]===s ? statusColors[s] : 'text-slate-600 border-white/[0.06] hover:border-white/20'}`}>
                            {s[0].toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <div className="flex justify-end mt-5">
              <button className="btn-primary" onClick={() => saveMut.mutate()} disabled={saveMut.isPending || students.length === 0}>
                {saveMut.isPending ? <Loader2 size={15} className="animate-spin"/> : <><Save size={15}/> Save Attendance</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
