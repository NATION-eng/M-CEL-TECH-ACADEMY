import { useState } from 'react'
import { Star, Check, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { assignmentAPI } from '../../services/api'

export default function InstructorGrades() {
  const qc = useQueryClient()
  const [scores, setScores] = useState<Record<string,string>>({})
  const [feedbacks, setFeedbacks] = useState<Record<string,string>>({})
  const [selected, setSelected] = useState<string|null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['submissions'],
    queryFn: async () => {
      const res = await assignmentAPI.allSubmissions()
      return res.data.data
    },
  })

  const submissions: any[] = Array.isArray(data) ? data : (data?.submissions ?? [])

  const gradeMut = useMutation({
    mutationFn: (id: string) => assignmentAPI.grade(id, {
      score: Number(scores[id]),
      feedback: feedbacks[id] ?? '',
    }),
    onSuccess: (_, id) => {
      toast.success(`Graded: ${scores[id]}/100`)
      setSelected(null)
      qc.invalidateQueries({ queryKey: ['submissions'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to save grade'),
  })

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-bold text-white">Grade Submissions</h1>
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex items-center justify-center text-slate-500">
            <Loader2 size={22} className="animate-spin mr-2"/> Loading submissions...
          </div>
        ) : (
          <div className="tbl-wrap"><table className="tbl w-full">
            <thead><tr><th>Student</th><th>Assignment</th><th>Course</th><th>Submitted</th><th>Score</th><th></th></tr></thead>
            <tbody>
              {submissions.length === 0 && (
                <tr><td colSpan={6} className="py-10 text-center text-slate-500 text-sm">No submissions yet.</td></tr>
              )}
              {submissions.map(s => {
                const studentName = s.student ? `${s.student.firstName} ${s.student.lastName}` : 'â€”'
                const assignmentTitle = s.assignment?.title ?? 'â€”'
                const courseTitle = s.assignment?.course?.title ?? 'â€”'
                const submittedAt = s.submittedAt ? new Date(s.submittedAt).toLocaleDateString('en-GB') : 'â€”'
                return (
                  <>
                    <tr key={s._id}>
                      <td><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-400 text-xs font-bold">{studentName[0]}</div><span className="font-medium text-white">{studentName}</span></div></td>
                      <td className="text-slate-300 text-sm">{assignmentTitle}</td>
                      <td><span className="badge badge-indigo">{courseTitle}</span></td>
                      <td className="text-slate-500 text-sm">{submittedAt}</td>
                      <td>{s.score != null ? <span className="font-mono font-bold text-emerald-400">{s.score}/100</span> : <span className="badge badge-amber">Pending</span>}</td>
                      <td><button onClick={() => setSelected(s._id===selected?null:s._id)} className="btn-primary text-xs py-1.5 px-3"><Star size={11}/> Grade</button></td>
                    </tr>
                    {selected === s._id && (
                      <tr key={`${s._id}-grade`}>
                        <td colSpan={6} className="px-4 py-4 bg-ink-700/50">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div><label className="label">Score (out of 100)</label><input type="number" min={0} max={100} className="input" placeholder="85" value={scores[s._id]||''} onChange={e=>setScores(sc=>({...sc,[s._id]:e.target.value}))}/></div>
                            <div><label className="label">Feedback</label><textarea className="input h-20 resize-none" placeholder="Instructor feedback..." value={feedbacks[s._id]||''} onChange={e=>setFeedbacks(fb=>({...fb,[s._id]:e.target.value}))}/></div>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <button onClick={() => gradeMut.mutate(s._id)} disabled={gradeMut.isPending || !scores[s._id]} className="btn-primary text-sm">
                              {gradeMut.isPending ? <Loader2 size={14} className="animate-spin"/> : <><Check size={14}/> Submit Grade</>}
                            </button>
                            <button onClick={()=>setSelected(null)} className="btn-ghost text-sm">Cancel</button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table></div>
        )}
      </div>
    </div>
  )
}

