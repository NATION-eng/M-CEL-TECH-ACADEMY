import { Link, useParams } from 'react-router-dom'
import { Plus, Edit3, FileText, Brain, ArrowLeft, Loader2, Eye, EyeOff, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { assignmentAPI, quizAPI, courseAPI } from '../../services/api'

export default function InstructorCourseManage() {
  const { courseId } = useParams()
  const qc = useQueryClient()

  const { data: course } = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => (await courseAPI.getOne(courseId!)).data.data?.course,
    enabled: !!courseId,
  })

  const { data: assignmentData, isLoading: loadingAssignments } = useQuery({
    queryKey: ['courseAssignments', courseId],
    queryFn: async () => (await assignmentAPI.forCourse(courseId!)).data.data,
  })
  const assignments: any[] = Array.isArray(assignmentData) ? assignmentData : []

  const { data: quizData, isLoading: loadingQuizzes } = useQuery({
    queryKey: ['courseQuizzes', courseId],
    queryFn: async () => (await quizAPI.forCourse(courseId!)).data.data,
  })
  const quizzes: any[] = Array.isArray(quizData) ? quizData : []

  const toggleAssignmentPublish = useMutation({
    mutationFn: ({ id, isPublished }: { id: string; isPublished: boolean }) => assignmentAPI.update(id, { isPublished }),
    onSuccess: () => { toast.success('Updated'); qc.invalidateQueries({ queryKey: ['courseAssignments', courseId] }) },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to update.'),
  })

  const toggleQuizPublish = useMutation({
    mutationFn: ({ id, isPublished }: { id: string; isPublished: boolean }) => quizAPI.update(id, { isPublished }),
    onSuccess: () => { toast.success('Updated'); qc.invalidateQueries({ queryKey: ['courseQuizzes', courseId] }) },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to update.'),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/instructor/courses" className="btn-ghost p-2"><ArrowLeft size={17}/></Link>
        <div>
          <h1 className="font-display text-xl font-bold text-white">{course?.title ?? 'Course Content'}</h1>
          <p className="text-sm text-slate-500">Manage lessons, assignments, and quizzes for this course</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link to={`/instructor/courses/${courseId}/lessons/new`} className="btn-outline text-sm"><Plus size={14}/> New Lesson</Link>
        <Link to={`/instructor/courses/${courseId}/assignments/new`} className="btn-outline text-sm"><Plus size={14}/> New Assignment</Link>
        <Link to={`/instructor/courses/${courseId}/quizzes/new`} className="btn-outline text-sm"><Plus size={14}/> New Quiz</Link>
      </div>

      {/* Assignments */}
      <div className="card overflow-hidden">
        <h2 className="font-display font-semibold text-white p-5 pb-3 flex items-center gap-2"><FileText size={16}/> Assignments</h2>
        {loadingAssignments ? (
          <div className="py-8 flex items-center justify-center text-slate-500"><Loader2 size={18} className="animate-spin"/></div>
        ) : assignments.length === 0 ? (
          <div className="px-5 pb-5 text-sm text-slate-500">No assignments yet.</div>
        ) : (
          <table className="tbl w-full">
            <thead><tr><th>Title</th><th>Due</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {assignments.map(a => (
                <tr key={a._id}>
                  <td className="text-sm text-white">{a.title}</td>
                  <td className="text-sm text-slate-400">{a.dueDate ? new Date(a.dueDate).toLocaleDateString('en-GB') : '—'}</td>
                  <td><span className={`badge ${a.isPublished ? 'badge-green' : 'badge-amber'}`}>{a.isPublished ? 'Published' : 'Draft'}</span></td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => toggleAssignmentPublish.mutate({ id: a._id, isPublished: !a.isPublished })} className="btn-ghost p-1.5" title={a.isPublished ? 'Unpublish' : 'Publish'}>
                        {a.isPublished ? <EyeOff size={13}/> : <Eye size={13}/>}
                      </button>
                      <Link to={`/instructor/courses/${courseId}/assignments/${a._id}/edit`} className="btn-ghost p-1.5" title="Edit"><Edit3 size={13}/></Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Quizzes */}
      <div className="card overflow-hidden">
        <h2 className="font-display font-semibold text-white p-5 pb-3 flex items-center gap-2"><Brain size={16}/> Quizzes</h2>
        {loadingQuizzes ? (
          <div className="py-8 flex items-center justify-center text-slate-500"><Loader2 size={18} className="animate-spin"/></div>
        ) : quizzes.length === 0 ? (
          <div className="px-5 pb-5 text-sm text-slate-500">No quizzes yet.</div>
        ) : (
          <table className="tbl w-full">
            <thead><tr><th>Title</th><th>Questions</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {quizzes.map(q => (
                <tr key={q._id}>
                  <td className="text-sm text-white">{q.title}</td>
                  <td className="text-sm text-slate-400">{q.questions?.length ?? 0}</td>
                  <td><span className={`badge ${q.isPublished ? 'badge-green' : 'badge-amber'}`}>{q.isPublished ? 'Published' : 'Draft'}</span></td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => toggleQuizPublish.mutate({ id: q._id, isPublished: !q.isPublished })} className="btn-ghost p-1.5" title={q.isPublished ? 'Unpublish' : 'Publish'}>
                        {q.isPublished ? <EyeOff size={13}/> : <Eye size={13}/>}
                      </button>
                      <Link to={`/instructor/courses/${courseId}/quizzes/${q._id}/edit`} className="btn-ghost p-1.5" title="Edit"><Edit3 size={13}/></Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card p-5 flex items-center gap-3">
        <Users size={16} className="text-slate-500"/>
        <p className="text-sm text-slate-400">Lessons are organized by Badge Level → Module → Week. Use "New Lesson" above to build out the curriculum hierarchy.</p>
      </div>
    </div>
  )
}
