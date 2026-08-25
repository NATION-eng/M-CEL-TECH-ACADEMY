import { Search, Loader2 } from 'lucide-react'
import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { courseAPI, enrollmentAPI, attendanceAPI } from '../../services/api'
import { useAuthStore } from '../../store/auth.store'

export default function InstructorStudents() {
  const user = useAuthStore(s => s.user)
  const [courseId, setCourseId] = useState('')
  const [search, setSearch] = useState('')

  const { data: coursesData } = useQuery({
    queryKey: ['myCoursesForRoster', user?._id],
    enabled: !!user,
    queryFn: async () => {
      const res = await courseAPI.getAll({ instructor: user?._id })
      const d = res.data.data
      return Array.isArray(d) ? d : (d?.courses ?? [])
    },
  })
  const courses: any[] = coursesData ?? []

  // Default to the instructor's first course once loaded, so the page isn't empty on arrival.
  useEffect(() => {
    if (!courseId && courses.length > 0) setCourseId(courses[0]._id)
  }, [courses, courseId])

  const { data: enrollData, isLoading: loadingRoster } = useQuery({
    queryKey: ['roster', courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const res = await enrollmentAPI.all({ course: courseId })
      const d = res.data.data
      return Array.isArray(d) ? d : (d?.enrollments ?? [])
    },
  })
  const enrollments: any[] = enrollData ?? []

  const { data: attendanceData } = useQuery({
    queryKey: ['courseAttendance', courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const res = await attendanceAPI.forCourse(courseId)
      return res.data.data as any[]
    },
  })
  const sessions: any[] = attendanceData ?? []

  // Attendance rate per student, computed from actual session records rather than a fake field.
  const attendanceRates = useMemo(() => {
    const rates: Record<string, number> = {}
    const byStudent: Record<string, { present: number; total: number }> = {}
    for (const session of sessions) {
      for (const rec of session.records ?? []) {
        const sid = typeof rec.student === 'string' ? rec.student : rec.student?._id
        if (!sid) continue
        byStudent[sid] ??= { present: 0, total: 0 }
        byStudent[sid].total += 1
        if (rec.status === 'present' || rec.status === 'late' || rec.status === 'excused') byStudent[sid].present += 1
      }
    }
    for (const [sid, v] of Object.entries(byStudent)) rates[sid] = v.total > 0 ? Math.round((v.present / v.total) * 100) : 100
    return rates
  }, [sessions])

  const filtered = enrollments.filter(e => {
    const s = e.student
    if (!s) return false
    return `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()) || (s.email ?? '').toLowerCase().includes(search.toLowerCase())
  })

  const isLoading = loadingRoster

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-2xl font-bold text-white">Students</h1>
        <div className="flex gap-2">
          <select className="input w-56" value={courseId} onChange={e=>setCourseId(e.target.value)}>
            <option value="">Select course...</option>
            {courses.map((c:any) => <option key={c._id} value={c._id}>{c.title}</option>)}
          </select>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
            <input className="input pl-9 w-56" placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
        </div>
      </div>
      <div className="card overflow-hidden">
        {!courseId ? (
          <div className="py-16 text-center text-slate-500 text-sm">Select a course to see your roster.</div>
        ) : isLoading ? (
          <div className="py-16 flex items-center justify-center text-slate-500">
            <Loader2 size={22} className="animate-spin mr-2"/> Loading students...
          </div>
        ) : (
          <table className="tbl w-full">
            <thead><tr><th>Student</th><th>Progress</th><th>Attendance</th><th>Status</th></tr></thead>
            <tbody>
              {filtered.map(e => {
                const s = e.student
                const name = `${s.firstName} ${s.lastName}`
                const progress = e.progress ?? 0
                const attendance = attendanceRates[s._id] ?? 100
                const atRisk = progress < 40 || attendance < 70
                return (
                  <tr key={e._id}>
                    <td><div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-full bg-brand-600/20 flex items-center justify-center text-brand-400 text-xs font-bold">{name[0]}</div><div><div className="font-medium text-white text-sm">{name}</div><div className="text-xs text-slate-500">{s.email}</div></div></div></td>
                    <td><div className="flex items-center gap-2"><div className="w-20 progress-track"><div className="progress-fill" style={{width:`${progress}%`}}/></div><span className="text-xs font-mono text-slate-400">{progress}%</span></div></td>
                    <td><span className={`font-mono text-sm ${attendance < 70 ? 'text-red-400' : attendance < 85 ? 'text-amber-400' : 'text-emerald-400'}`}>{attendance}%</span></td>
                    <td><span className={`badge ${atRisk?'badge-red':'badge-green'}`}>{atRisk?'At Risk':'Active'}</span></td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="py-10 text-center text-slate-500 text-sm">No students found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
