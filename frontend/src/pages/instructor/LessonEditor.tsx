import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Save, ArrowLeft, Loader2, Plus, Upload, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { curriculumAPI } from '../../services/api'

/**
 * Lessons live under Course -> BadgeLevel -> Module -> Week -> Lesson.
 * A lesson cannot be created without a `week`, so this picker walks the
 * instructor down the hierarchy, letting them pick an existing node or
 * quick-create one at each level, before the lesson form itself unlocks.
 */
function HierarchyPicker({ courseId, weekId, onWeekSelected }: { courseId: string; weekId: string | null; onWeekSelected: (id: string) => void }) {
  const qc = useQueryClient()
  const [badgeLevelId, setBadgeLevelId] = useState('')
  const [moduleId, setModuleId] = useState('')
  const [newBadgeTitle, setNewBadgeTitle] = useState('')
  const [newModuleName, setNewModuleName] = useState('')
  const [newWeekTitle, setNewWeekTitle] = useState('')

  const { data: badgeLevels = [] } = useQuery({
    queryKey: ['badgeLevels', courseId],
    queryFn: async () => {
      const res = await curriculumAPI.getBadgeLevels(courseId)
      const d = res.data.data
      return Array.isArray(d) ? d : (d?.badgeLevels ?? [])
    },
  })

  const { data: modules = [] } = useQuery({
    queryKey: ['modules', badgeLevelId],
    enabled: !!badgeLevelId,
    queryFn: async () => {
      const res = await curriculumAPI.getModules(badgeLevelId)
      const d = res.data.data
      return Array.isArray(d) ? d : (d?.modules ?? [])
    },
  })

  const { data: weeks = [] } = useQuery({
    queryKey: ['weeks', moduleId],
    enabled: !!moduleId,
    queryFn: async () => {
      const res = await curriculumAPI.getWeeks(moduleId)
      const d = res.data.data
      return Array.isArray(d) ? d : (d?.weeks ?? [])
    },
  })

  const createBadgeM = useMutation({
    mutationFn: () => curriculumAPI.createBadgeLevel({ title: newBadgeTitle, level: badgeLevels.length + 1, course: courseId }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['badgeLevels', courseId] })
      setBadgeLevelId(res.data.data._id)
      setNewBadgeTitle('')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not create badge level'),
  })

  const createModuleM = useMutation({
    mutationFn: () => curriculumAPI.createModule({ name: newModuleName, badgeLevel: badgeLevelId }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['modules', badgeLevelId] })
      setModuleId(res.data.data._id)
      setNewModuleName('')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not create module'),
  })

  const createWeekM = useMutation({
    mutationFn: () => curriculumAPI.createWeek({ title: newWeekTitle, module: moduleId }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['weeks', moduleId] })
      onWeekSelected(res.data.data._id)
      setNewWeekTitle('')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not create week'),
  })

  return (
    <div className="card p-5 space-y-4">
      <h2 className="font-display text-sm font-bold text-white">Where does this lesson go?</h2>

      <div>
        <label className="label">Badge Level</label>
        <select className="input" value={badgeLevelId} onChange={e => { setBadgeLevelId(e.target.value); setModuleId(''); onWeekSelected('') }}>
          <option value="">Select badge level...</option>
          {badgeLevels.map((b: any) => <option key={b._id} value={b._id}>{b.title}</option>)}
        </select>
        <div className="flex gap-2 mt-2">
          <input className="input text-sm" placeholder="Or create new badge level..." value={newBadgeTitle} onChange={e => setNewBadgeTitle(e.target.value)}/>
          <button className="btn-ghost text-xs shrink-0" disabled={!newBadgeTitle.trim() || createBadgeM.isPending} onClick={() => createBadgeM.mutate()}>
            {createBadgeM.isPending ? <Loader2 size={13} className="animate-spin"/> : <Plus size={13}/>}
          </button>
        </div>
      </div>

      {badgeLevelId && (
        <div>
          <label className="label">Module</label>
          <select className="input" value={moduleId} onChange={e => { setModuleId(e.target.value); onWeekSelected('') }}>
            <option value="">Select module...</option>
            {modules.map((m: any) => <option key={m._id} value={m._id}>{m.name}</option>)}
          </select>
          <div className="flex gap-2 mt-2">
            <input className="input text-sm" placeholder="Or create new module..." value={newModuleName} onChange={e => setNewModuleName(e.target.value)}/>
            <button className="btn-ghost text-xs shrink-0" disabled={!newModuleName.trim() || createModuleM.isPending} onClick={() => createModuleM.mutate()}>
              {createModuleM.isPending ? <Loader2 size={13} className="animate-spin"/> : <Plus size={13}/>}
            </button>
          </div>
        </div>
      )}

      {moduleId && (
        <div>
          <label className="label">Week</label>
          <select className="input" value={weekId ?? ''} onChange={e => onWeekSelected(e.target.value)}>
            <option value="">Select week...</option>
            {weeks.map((w: any) => <option key={w._id} value={w._id}>{w.title}</option>)}
          </select>
          <div className="flex gap-2 mt-2">
            <input className="input text-sm" placeholder="Or create new week..." value={newWeekTitle} onChange={e => setNewWeekTitle(e.target.value)}/>
            <button className="btn-ghost text-xs shrink-0" disabled={!newWeekTitle.trim() || createWeekM.isPending} onClick={() => createWeekM.mutate()}>
              {createWeekM.isPending ? <Loader2 size={13} className="animate-spin"/> : <Plus size={13}/>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function InstructorLessonEditor() {
  const nav = useNavigate()
  const { courseId, lessonId } = useParams()
  const isEdit = !!lessonId
  const [weekId, setWeekId] = useState<string | null>(null)
  const [form, setForm] = useState({ title:'', videoUrl:'', notes:'', codeSnippets:'', isFree:false, isPublished:false })
  const [materials, setMaterials] = useState<File[]>([])
  const [loaded, setLoaded] = useState(!isEdit)

  useQuery({
    queryKey: ['lesson', lessonId],
    enabled: isEdit,
    queryFn: async () => {
      const res = await curriculumAPI.getLesson(lessonId!)
      const lesson = res.data.data
      setWeekId(typeof lesson.week === 'string' ? lesson.week : lesson.week?._id ?? null)
      setForm({
        title: lesson.title ?? '',
        videoUrl: lesson.videoUrl ?? '',
        notes: lesson.notes ?? '',
        codeSnippets: lesson.codeSnippets ?? '',
        isFree: !!lesson.isFree,
        isPublished: !!lesson.isPublished,
      })
      setLoaded(true)
      return lesson
    },
  })

  const uploadMaterials = async (id: string) => {
    for (const file of materials) {
      const fd = new FormData()
      fd.append('file', file)
      try {
        await curriculumAPI.addLessonDownload(id, fd)
      } catch {
        toast.error(`Could not upload ${file.name}`)
      }
    }
  }

  const saveMut = useMutation({
    mutationFn: () => {
      const payload = {
        title: form.title,
        week: weekId,
        videoUrl: form.videoUrl,
        notes: form.notes,
        codeSnippets: form.codeSnippets,
        isFree: form.isFree,
        isPublished: form.isPublished,
      }
      return isEdit ? curriculumAPI.updateLesson(lessonId!, payload) : curriculumAPI.createLesson(payload)
    },
    onSuccess: async (res) => {
      const id = isEdit ? lessonId! : res.data.data._id
      if (materials.length > 0) await uploadMaterials(id)
      toast.success(isEdit ? 'Lesson updated!' : 'Lesson saved!')
      nav('/instructor/courses')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to save lesson'),
  })

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setMaterials(prev => [...prev, ...Array.from(e.target.files!)])
  }

  if (!loaded) {
    return <div className="py-16 flex items-center justify-center text-slate-500"><Loader2 size={22} className="animate-spin mr-2"/> Loading lesson...</div>
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <button onClick={()=>nav('/instructor/courses')} className="btn-ghost p-2"><ArrowLeft size={17}/></button>
        <h1 className="font-display text-xl font-bold text-white">{isEdit ? 'Edit Lesson' : 'New Lesson'}</h1>
      </div>

      {courseId && !isEdit && <HierarchyPicker courseId={courseId} weekId={weekId} onWeekSelected={(id) => setWeekId(id || null)} />}

      <div className={`card p-6 space-y-4 ${!weekId ? 'opacity-50 pointer-events-none' : ''}`}>
        {!weekId && <p className="text-xs text-amber-400">Pick a week above before filling in the lesson.</p>}
        <div><label className="label">Lesson Title</label><input className="input" placeholder="e.g. Introduction to React Hooks" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></div>
        <div><label className="label">Video URL (YouTube or direct link)</label><input className="input" placeholder="https://youtube.com/watch?v=..." value={form.videoUrl} onChange={e=>setForm({...form,videoUrl:e.target.value})}/></div>
        <div><label className="label">Lesson Notes (Markdown supported)</label><textarea className="input h-48 resize-none font-mono text-sm" placeholder={`## Introduction

Write your lesson notes here...`} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
        <div><label className="label">Code Snippets</label><textarea className="input h-32 resize-none font-mono text-sm" placeholder="// Paste code examples here..." value={form.codeSnippets} onChange={e=>setForm({...form,codeSnippets:e.target.value})}/></div>

        <div>
          <label className="label">Course Materials (PDFs, slides, source files)</label>
          <label className="btn-ghost text-xs cursor-pointer inline-flex">
            <Upload size={13}/> Add files
            <input type="file" multiple className="hidden" onChange={handleFilePick}/>
          </label>
          {materials.length > 0 && (
            <ul className="mt-2 space-y-1">
              {materials.map((f, i) => (
                <li key={i} className="flex items-center justify-between text-xs text-slate-400 bg-white/5 rounded px-2.5 py-1.5">
                  <span className="truncate">{f.name}</span>
                  <button onClick={() => setMaterials(m => m.filter((_, idx) => idx !== i))} className="text-slate-500 hover:text-red-400"><X size={12}/></button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.isFree} onChange={e=>setForm({...form,isFree:e.target.checked})} className="rounded"/><span className="text-sm text-slate-300">Free preview lesson</span></label>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.isPublished} onChange={e=>setForm({...form,isPublished:e.target.checked})} className="rounded"/><span className="text-sm text-slate-300">Publish immediately</span></label>
        </div>
        <div className="flex gap-3 pt-2">
          <button className="btn-primary" onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !form.title || !weekId}>
            {saveMut.isPending ? <Loader2 size={14} className="animate-spin"/> : <><Save size={14}/> {isEdit ? 'Update Lesson' : 'Save Lesson'}</>}
          </button>
          <button className="btn-ghost" onClick={()=>nav('/instructor/courses')}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
