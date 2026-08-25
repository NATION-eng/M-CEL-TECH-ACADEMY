import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Save, ArrowLeft, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useMutation, useQuery } from '@tanstack/react-query'
import { assignmentAPI } from '../../services/api'

export default function InstructorAssignmentEditor() {
  const nav = useNavigate()
  const { courseId, assignmentId } = useParams()
  const isEdit = !!assignmentId
  const [form, setForm] = useState({ title:'', description:'', instructions:'', dueDate:'', maxScore:'100', submissionTypes:['file'], isPublished:false })
  const toggleType = (t: string) => setForm(f => ({ ...f, submissionTypes: f.submissionTypes.includes(t) ? f.submissionTypes.filter(x=>x!==t) : [...f.submissionTypes, t] }))

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['assignment', assignmentId],
    queryFn: async () => (await assignmentAPI.one(assignmentId!)).data.data,
    enabled: isEdit,
  })

  useEffect(() => {
    if (!existing) return
    setForm({
      title: existing.title ?? '', description: existing.description ?? '', instructions: existing.instructions ?? '',
      dueDate: existing.dueDate ? new Date(existing.dueDate).toISOString().slice(0,16) : '',
      maxScore: String(existing.maxScore ?? 100),
      submissionTypes: existing.submissionTypes?.length ? existing.submissionTypes : ['file'],
      isPublished: !!existing.isPublished,
    })
  }, [existing])

  const saveMut = useMutation({
    mutationFn: () => {
      const payload = {
        title: form.title,
        description: form.description,
        instructions: form.instructions,
        dueDate: form.dueDate,
        maxScore: Number(form.maxScore),
        submissionTypes: form.submissionTypes,
        isPublished: form.isPublished,
        course: courseId,
      }
      return isEdit ? assignmentAPI.update(assignmentId!, payload) : assignmentAPI.create(payload)
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Assignment updated!' : 'Assignment saved!')
      nav('/instructor/courses')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to save assignment'),
  })

  if (isEdit && loadingExisting) {
    return <div className="py-16 flex items-center justify-center text-slate-500"><Loader2 size={22} className="animate-spin mr-2"/> Loading assignment...</div>
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3"><button onClick={()=>nav('/instructor/courses')} className="btn-ghost p-2"><ArrowLeft size={17}/></button><h1 className="font-display text-xl font-bold text-white">{isEdit ? 'Edit Assignment' : 'New Assignment'}</h1></div>
      <div className="card p-6 space-y-4">
        <div><label className="label">Title</label><input className="input" placeholder="Assignment title..." value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></div>
        <div><label className="label">Description</label><textarea className="input h-24 resize-none" placeholder="What should students do?" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></div>
        <div><label className="label">Detailed Instructions</label><textarea className="input h-32 resize-none" placeholder="Step by step instructions..." value={form.instructions} onChange={e=>setForm({...form,instructions:e.target.value})}/></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Due Date</label><input type="datetime-local" className="input" value={form.dueDate} onChange={e=>setForm({...form,dueDate:e.target.value})}/></div>
          <div><label className="label">Max Score</label><input type="number" className="input" value={form.maxScore} onChange={e=>setForm({...form,maxScore:e.target.value})}/></div>
        </div>
        <div>
          <label className="label">Accepted Submission Types</label>
          <div className="flex flex-wrap gap-2">
            {['file','github','portfolio','liveUrl','text'].map(t=>(
              <button key={t} type="button" onClick={()=>toggleType(t)} className={`badge capitalize border cursor-pointer transition-all ${form.submissionTypes.includes(t)?'badge-indigo border-brand-500/50':'text-slate-500 border-white/10 hover:border-white/20'}`}>{t}</button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.isPublished} onChange={e=>setForm({...form,isPublished:e.target.checked})} className="rounded"/><span className="text-sm text-slate-300">Publish immediately (visible to students)</span></label>
        <div className="flex gap-3 pt-2">
          <button className="btn-primary" onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !form.title}>
            {saveMut.isPending ? <Loader2 size={14} className="animate-spin"/> : <><Save size={14}/> {isEdit ? 'Save Changes' : 'Save Assignment'}</>}
          </button>
          <button className="btn-ghost" onClick={()=>nav('/instructor/courses')}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
