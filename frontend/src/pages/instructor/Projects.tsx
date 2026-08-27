import { useState } from 'react'
import { Github, ExternalLink, Star, Check, Loader2, FolderOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectAPI, courseAPI } from '../../services/api'
import { useAuthStore } from '../../store/auth.store'

const statusBadge: Record<string,string> = { in_progress: 'badge-amber', under_review: 'badge-indigo', completed: 'badge-green' }
const statusLabel: Record<string,string> = { in_progress: 'In Progress', under_review: 'Under Review', completed: 'Reviewed' }

export default function InstructorProjects() {
  const user = useAuthStore(s => s.user)
  const qc = useQueryClient()
  const [courseId, setCourseId] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const [grade, setGrade] = useState('')

  const { data: coursesData } = useQuery({
    queryKey: ['myCoursesForProjects', user?._id],
    enabled: !!user,
    queryFn: async () => {
      const res = await courseAPI.getAll({ instructor: user?._id })
      const d = res.data.data
      return Array.isArray(d) ? d : (d?.courses ?? [])
    },
  })
  const courses: any[] = coursesData ?? []

  const { data, isLoading } = useQuery({
    queryKey: ['instructorProjects', courseId],
    queryFn: async () => {
      const res = await projectAPI.all(courseId ? { course: courseId } : undefined)
      return res.data.data
    },
  })
  const projects: any[] = Array.isArray(data) ? data : (data?.projects ?? [])

  const reviewM = useMutation({
    mutationFn: (id: string) => projectAPI.review(id, { feedback, grade: grade ? Number(grade) : undefined, status: 'completed' }),
    onSuccess: () => {
      toast.success('Project reviewed!')
      setSelected(null); setFeedback(''); setGrade('')
      qc.invalidateQueries({ queryKey: ['instructorProjects'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to save review'),
  })

  const openReview = (p: any) => {
    setSelected(p._id === selected ? null : p._id)
    setFeedback(p.feedback ?? '')
    setGrade(p.grade != null ? String(p.grade) : '')
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Student Projects</h1>
          <p className="text-sm text-slate-500 mt-0.5">Review capstone submissions, provide feedback, and assign grades.</p>
        </div>
        <select className="input w-full sm:w-64 shrink-0" value={courseId} onChange={e=>setCourseId(e.target.value)}>
          <option value="">All my courses</option>
          {courses.map((c:any) => <option key={c._id} value={c._id}>{c.title}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="py-16 flex items-center justify-center text-slate-500"><Loader2 size={22} className="animate-spin mr-2"/> Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="card p-12 text-center text-slate-500 text-sm">
          <FolderOpen size={28} className="mx-auto mb-2 text-slate-600"/>
          No projects submitted yet.
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map(p => {
            const studentName = p.student ? `${p.student.firstName} ${p.student.lastName}` : '—'
            return (
              <div key={p._id} className="card overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="font-display font-semibold text-white">{p.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{studentName} · {p.course?.title ?? '—'} · <span className="capitalize">{p.type}</span></p>
                    </div>
                    <span className={`badge ${statusBadge[p.status] ?? 'badge-amber'}`}>{statusLabel[p.status] ?? p.status}</span>
                  </div>
                  <p className="text-sm text-slate-400 mb-3">{p.description}</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {(p.technologies ?? []).map((t: string) => <span key={t} className="badge badge-purple text-[10px]">{t}</span>)}
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    {p.githubUrl && <a href={p.githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-slate-400 hover:text-white"><Github size={12}/> Code</a>}
                    {p.liveUrl && <a href={p.liveUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-brand-400 hover:text-brand-300"><ExternalLink size={12}/> Live Demo</a>}
                    {p.grade != null && <span className="text-emerald-400 font-mono font-bold">Grade: {p.grade}/100</span>}
                  </div>
                  <button onClick={() => openReview(p)} className="btn-primary text-xs py-1.5 px-3 mt-3"><Star size={11}/> {p.status === 'completed' ? 'Update Review' : 'Review'}</button>
                </div>
                {selected === p._id && (
                  <div className="px-5 py-4 bg-ink-700/50 border-t border-white/[0.06]">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><label className="label">Grade (out of 100)</label><input type="number" min={0} max={100} className="input" value={grade} onChange={e=>setGrade(e.target.value)}/></div>
                      <div><label className="label">Feedback</label><textarea className="input h-20 resize-none" placeholder="Feedback for the student..." value={feedback} onChange={e=>setFeedback(e.target.value)}/></div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => reviewM.mutate(p._id)} disabled={reviewM.isPending} className="btn-primary text-sm">
                        {reviewM.isPending ? <Loader2 size={14} className="animate-spin"/> : <><Check size={14}/> Submit Review</>}
                      </button>
                      <button onClick={()=>setSelected(null)} className="btn-ghost text-sm">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
