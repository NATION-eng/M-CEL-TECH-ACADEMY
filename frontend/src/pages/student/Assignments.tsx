import { useState, useRef } from 'react'
import { Upload, Github, Globe, Clock, CheckCircle2, AlertCircle, LucideIcon, Loader2, X, File as FileIcon, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { assignmentAPI } from '../../services/api'
import { EmptyState, ListItemSkeleton } from '../../components/ui'

interface StatusCfg { label: string; className: string; Icon: LucideIcon }
const statusConfig: Record<string, StatusCfg> = {
  pending:   { label: 'Pending',   className: 'badge-amber',  Icon: Clock },
  submitted: { label: 'Submitted', className: 'badge-indigo', Icon: CheckCircle2 },
  graded:    { label: 'Graded',    className: 'badge-green',  Icon: CheckCircle2 },
  returned:  { label: 'Returned',  className: 'badge-indigo', Icon: CheckCircle2 },
  late:      { label: 'Late',      className: 'badge-red',    Icon: AlertCircle },
}

interface Assignment {
  _id: string
  title: string
  description?: string
  status: string
  dueDate?: string
  maxScore: number
  score?: number
  feedback?: string
  submittedAt?: string
  course?: { title?: string }
  submissionTypes?: string[]
}

export default function StudentAssignments() {
  const qc = useQueryClient()
  const [selected, setSelected] = useState<string | null>(null)
  const [githubUrl, setGithubUrl] = useState('')
  const [liveUrl, setLiveUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['myAssignments'],
    queryFn: async () => (await assignmentAPI.mySubmissions()).data.data,
  })

  const assignments: Assignment[] = Array.isArray(data) ? data : []

  const resetForm = () => { setSelected(null); setGithubUrl(''); setLiveUrl(''); setNotes(''); setFiles([]) }

  const submitMut = useMutation({
    mutationFn: (assignmentId: string) => {
      const formData = new FormData()
      if (githubUrl) formData.append('githubUrl', githubUrl)
      if (liveUrl) formData.append('liveUrl', liveUrl)
      if (notes) formData.append('textContent', notes)
      files.forEach(f => formData.append('files', f))
      return assignmentAPI.submit(assignmentId, formData)
    },
    onSuccess: () => {
      toast.success('Assignment submitted!')
      resetForm()
      qc.invalidateQueries({ queryKey: ['myAssignments'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to submit assignment. Please try again.'),
  })

  const selectedAssignment = assignments.find(a => a._id === selected)
  const acceptsFile = !selectedAssignment?.submissionTypes?.length || selectedAssignment.submissionTypes.includes('file')
  const acceptsGithub = selectedAssignment?.submissionTypes?.includes('github')
  const acceptsLiveUrl = selectedAssignment?.submissionTypes?.includes('liveUrl') || selectedAssignment?.submissionTypes?.includes('portfolio')

  const handleFilesPicked = (picked: FileList | null) => {
    if (!picked) return
    const tooBig = Array.from(picked).find(f => f.size > 15 * 1024 * 1024)
    if (tooBig) { toast.error(`"${tooBig.name}" is over the 15MB limit.`); return }
    setFiles(prev => [...prev, ...Array.from(picked)])
  }
  const removeFile = (i: number) => setFiles(prev => prev.filter((_, idx) => idx !== i))

  const canSubmit = !submitMut.isPending && (
    (acceptsFile && files.length > 0) || (acceptsGithub && githubUrl.trim() !== '') || (acceptsLiveUrl && liveUrl.trim() !== '') || notes.trim() !== ''
  )

  if (isLoading) {
    return (
      <div role="status" aria-label="Loading assignments" className="space-y-6">
        <div className="h-7 w-40 animate-pulse rounded bg-white/[0.06]" />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <ListItemSkeleton key={i} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-white">Assignments</h1>

      {assignments.length === 0 && (
        <EmptyState icon={FileText} title="No assignments available yet" />
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {assignments.map(a => {
          const cfg = statusConfig[a.status] ?? statusConfig.pending
          const isOverdue = a.dueDate && new Date(a.dueDate) < new Date() && a.status === 'pending'
          return (
            <div key={a._id} className={`card-hover p-5 cursor-pointer ${selected === a._id ? 'border-brand-500/50' : ''}`} onClick={() => { setSelected(a._id === selected ? null : a._id); setFiles([]) }}>
              <div className="mb-3 flex items-start justify-between gap-3">
                <h3 className="font-semibold leading-snug text-white">{a.title}</h3>
                <span className={`badge ${cfg.className} flex-shrink-0`}>{cfg.label}</span>
              </div>
              <div className="mb-3 flex flex-wrap gap-3 text-xs text-slate-500">
                <span>{a.course?.title ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className={`flex items-center gap-1.5 ${isOverdue ? 'text-red-400' : 'text-slate-500'}`}>
                  <Clock size={11} /> Due: {a.dueDate ? new Date(a.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                </span>
                <span className="text-slate-500">{a.maxScore} pts</span>
              </div>
              {a.status === 'graded' && a.score != null && (
                <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3">
                  <span className="text-xs text-slate-500">Score</span>
                  <span className="font-mono font-bold text-emerald-400">{a.score}/{a.maxScore}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {selectedAssignment && ['pending', 'late'].includes(selectedAssignment.status) && (
        <div className="card p-6">
          <h2 className="mb-1 font-display text-lg font-semibold text-white">{selectedAssignment.title}</h2>
          <p className="mb-5 text-sm text-slate-400">{selectedAssignment.description}</p>
          <div className="space-y-4">
            {acceptsFile && (
              <div>
                <label className="label">Upload Files</label>
                <input ref={fileInputRef} type="file" multiple className="hidden" id="assignment-files" onChange={e => handleFilesPicked(e.target.files)} />
                <label htmlFor="assignment-files" className="block cursor-pointer rounded-xl border-2 border-dashed border-white/[0.1] p-8 text-center transition-colors hover:border-brand-500/40">
                  <Upload size={24} className="mx-auto mb-2 text-slate-500" />
                  <p className="text-sm text-slate-400">Click to choose files</p>
                  <p className="mt-1 text-xs text-slate-600">PDF, ZIP, images, docs — max 15MB each</p>
                </label>
                {files.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg bg-ink-700/40 px-3 py-2">
                        <span className="flex items-center gap-2 truncate text-xs text-slate-300"><FileIcon size={13} className="shrink-0" /> {f.name} <span className="text-slate-600">({(f.size / 1024 / 1024).toFixed(1)}MB)</span></span>
                        <button onClick={() => removeFile(i)} aria-label={`Remove ${f.name}`} className="shrink-0 text-slate-500 hover:text-red-400"><X size={13} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {acceptsGithub && (
              <div>
                <label className="label flex items-center gap-2"><Github size={14} /> GitHub Repository URL</label>
                <input className="input" placeholder="https://github.com/username/repo" value={githubUrl} onChange={e => setGithubUrl(e.target.value)} />
              </div>
            )}
            {acceptsLiveUrl && (
              <div>
                <label className="label flex items-center gap-2"><Globe size={14} /> Live URL</label>
                <input className="input" placeholder="https://your-project.vercel.app" value={liveUrl} onChange={e => setLiveUrl(e.target.value)} />
              </div>
            )}
            <div>
              <label className="label">Notes to Instructor (optional)</label>
              <textarea className="input h-20 resize-none" placeholder="Any notes about your submission..." value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            <div className="flex gap-3">
              {/* Was `selectedAssignment.assignmentId` — a field that never
                  existed on this object (everywhere else in this file uses
                  `_id`). Every submission attempt was silently sending
                  `undefined` as the assignment id and failing. */}
              <button className="btn-primary" onClick={() => submitMut.mutate(selectedAssignment._id)} disabled={!canSubmit}>
                {submitMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <><Upload size={14} /> Submit Assignment</>}
              </button>
              <button className="btn-ghost" onClick={resetForm}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {selectedAssignment && ['graded', 'returned'].includes(selectedAssignment.status) && (
        <div className="card p-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-white">{selectedAssignment.title} — Feedback</h2>
          <div className="mb-5 flex items-center gap-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <CheckCircle2 size={20} className="text-emerald-400" />
            <div>
              <div className="font-semibold text-emerald-400">Score: {selectedAssignment.score}/{selectedAssignment.maxScore}</div>
              <div className="mt-0.5 text-xs text-emerald-400/70">Submitted {selectedAssignment.submittedAt ? new Date(selectedAssignment.submittedAt).toLocaleDateString('en-GB') : ''}</div>
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-white">Instructor Feedback</p>
            <p className="text-sm leading-relaxed text-slate-400">{selectedAssignment.feedback ?? 'No feedback provided yet.'}</p>
          </div>
        </div>
      )}

      {selectedAssignment && selectedAssignment.status === 'submitted' && (
        <div className="card p-6 text-center">
          <CheckCircle2 size={28} className="mx-auto mb-2 text-brand-400" />
          <p className="text-sm text-slate-300">Submitted — waiting for your instructor to grade it.</p>
        </div>
      )}
    </div>
  )
}
