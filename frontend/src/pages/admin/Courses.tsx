import { useState } from 'react'
import { Plus, BookOpen, Users, Edit3, Archive, MoreVertical, Loader2, Eye, EyeOff, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { courseAPI } from '../../services/api'
import { CourseFormFields, emptyCourseForm as emptyForm } from '../../components/CourseForm'
import { useConfirm } from '../../components/ConfirmDialog'

export default function AdminCourses() {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [openMenu, setOpenMenu] = useState<string|null>(null)
  const [form, setForm] = useState(emptyForm)
  const [tab, setTab] = useState<'active'|'archived'>('active')

  const { data, isLoading } = useQuery({
    queryKey: ['courses', tab],
    queryFn: async () => {
      const res = await courseAPI.getAll(tab === 'archived' ? { status: 'archived' } : undefined)
      return res.data.data
    },
  })

  const courses: any[] = Array.isArray(data) ? data : (data?.courses ?? [])

  const restoreMut = useMutation({
    mutationFn: (id: string) => courseAPI.restore(id),
    onSuccess: () => { toast.success('Course restored'); qc.invalidateQueries({ queryKey: ['courses'] }) },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to restore'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => courseAPI.delete(id),
    onSuccess: () => { toast.success('Course permanently deleted'); qc.invalidateQueries({ queryKey: ['courses'] }) },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to delete. If students are enrolled, it cannot be permanently deleted.'),
  })

  const archiveMut = useMutation({
    mutationFn: (id: string) => courseAPI.archive(id),
    onSuccess: (_res, id) => {
      qc.invalidateQueries({ queryKey: ['courses'] })
      setOpenMenu(null)
      toast((t) => (
        <span className="flex items-center gap-3">
          Course archived.
          <button className="text-brand-400 font-medium hover:text-brand-300" onClick={() => { restoreMut.mutate(id); toast.dismiss(t.id) }}>Undo</button>
        </span>
      ))
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to archive'),
  })

  const publishMut = useMutation({
    mutationFn: ({ id, isPublished }: { id: string; isPublished: boolean }) => courseAPI.update(id, { isPublished }),
    onSuccess: (_r, vars) => { toast.success(vars.isPublished ? 'Course published' : 'Course unpublished'); qc.invalidateQueries({ queryKey: ['courses'] }); setOpenMenu(null) },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to update course'),
  })

  const toPayload = () => ({
    title: form.title,
    description: form.description,
    shortDescription: form.shortDescription || form.description.slice(0, 140),
    department: form.departmentId,
    price: Number(form.price),
    depositPercentage: Number(form.depositPercentage),
    duration: form.duration || 'TBD',
    deliveryMode: form.deliveryMode,
    classSchedule: form.classSchedule,
  })

  const createMut = useMutation({
    mutationFn: () => courseAPI.create(toPayload()),
    onSuccess: () => {
      toast.success('Course created!')
      setShowAdd(false)
      setForm(emptyForm)
      qc.invalidateQueries({ queryKey: ['courses'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to create course'),
  })

  const updateMut = useMutation({
    mutationFn: () => courseAPI.update(editingId!, toPayload()),
    onSuccess: () => {
      toast.success('Course updated!')
      setEditingId(null)
      setForm(emptyForm)
      qc.invalidateQueries({ queryKey: ['courses'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to update course'),
  })

  const openEdit = (c: any) => {
    setForm({
      title: c.title ?? '',
      departmentId: typeof c.department === 'string' ? c.department : c.department?._id ?? '',
      price: String(c.price ?? ''),
      depositPercentage: String(c.depositPercentage ?? 60),
      deliveryMode: c.deliveryMode ?? 'hybrid',
      description: c.description ?? '',
      shortDescription: c.shortDescription ?? '',
      duration: c.duration ?? '',
      classSchedule: Array.isArray(c.classSchedule) ? c.classSchedule.map((s:any) => ({ dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime, mode: s.mode, location: s.location ?? '', meetingLink: s.meetingLink ?? '' })) : [],
    })
    setEditingId(c._id)
    setOpenMenu(null)
  }

  const statusOf = (c: any) => c.isArchived ? 'archived' : c.isPublished ? 'published' : 'draft'

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-white">Courses</h1>
        <button className="btn-primary text-sm" onClick={() => { setForm(emptyForm); setShowAdd(true) }}><Plus size={15}/> Add Course</button>
      </div>

      <div className="flex gap-1 bg-ink-800/60 rounded-xl p-1 w-fit">
        {(['active','archived'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${tab===t ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            {t}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="py-16 flex items-center justify-center text-slate-500">
          <Loader2 size={22} className="animate-spin mr-2"/> Loading courses...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {courses.length === 0 && (
            <div className="col-span-3 py-12 text-center text-slate-500 text-sm">No courses found.</div>
          )}
          {courses.map(c => {
            const status = statusOf(c)
            return (
              <div key={c._id} className="card-hover p-5 relative">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-600/15 flex items-center justify-center flex-shrink-0"><BookOpen size={17} className="text-brand-400"/></div>
                  <div className="relative">
                    <button className="btn-ghost p-1.5" onClick={() => setOpenMenu(openMenu===c._id?null:c._id)}><MoreVertical size={15}/></button>
                    {openMenu === c._id && (
                      <div className="absolute right-0 top-full mt-1 w-44 card py-1 shadow-2xl z-20">
                        {c.isArchived ? (
                          <>
                            <button onClick={() => { restoreMut.mutate(c._id); setOpenMenu(null) }} disabled={restoreMut.isPending} className="w-full text-left px-3.5 py-2 text-xs text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2"><Archive size={12}/> Restore</button>
                            <button
                              onClick={async () => {
                                setOpenMenu(null)
                                const ok = await confirm({ title: 'Delete permanently?', message: `"${c.title}" will be permanently deleted. This cannot be undone.`, confirmLabel: 'Delete Forever', danger: true })
                                if (ok) deleteMut.mutate(c._id)
                              }}
                              disabled={deleteMut.isPending}
                              className="w-full text-left px-3.5 py-2 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                            ><Trash2 size={12}/> Delete Forever</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => openEdit(c)} className="w-full text-left px-3.5 py-2 text-xs text-slate-300 hover:bg-white/5 flex items-center gap-2"><Edit3 size={12}/> Edit Course</button>
                            {c.isPublished
                              ? <button onClick={() => publishMut.mutate({ id: c._id, isPublished: false })} disabled={publishMut.isPending} className="w-full text-left px-3.5 py-2 text-xs text-amber-400 hover:bg-amber-500/10 flex items-center gap-2"><EyeOff size={12}/> Unpublish</button>
                              : <button onClick={() => publishMut.mutate({ id: c._id, isPublished: true })} disabled={publishMut.isPending} className="w-full text-left px-3.5 py-2 text-xs text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2"><Eye size={12}/> Publish</button>
                            }
                            <button onClick={() => archiveMut.mutate(c._id)} disabled={archiveMut.isPending} className="w-full text-left px-3.5 py-2 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2"><Archive size={12}/> Archive</button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <h3 className="font-display font-semibold text-white mb-1">{c.title}</h3>
                {c.isArchived && (
                  <p className="text-[11px] text-amber-400/80 mb-2">
                    Archived {c.archivedAt ? new Date(c.archivedAt).toLocaleDateString('en-GB') : ''}
                    {c.archivedBy ? ` by ${c.archivedBy.firstName} ${c.archivedBy.lastName}` : ''}
                    {c.archiveReason ? ` — "${c.archiveReason}"` : ''}
                  </p>
                )}
                <p className="text-xs text-slate-500 mb-3">{c.department?.name ?? '—'}</p>
                <div className="space-y-2 text-xs mb-4">
                  <div className="flex justify-between"><span className="text-slate-500">Price</span><span className="font-mono font-medium text-white">₦{(c.price ?? 0).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Min. Deposit</span><span className="font-mono text-emerald-400">₦{(c.depositAmount ?? 0).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Enrolled</span><span className="text-white flex items-center gap-1"><Users size={10}/> {c.enrolledCount ?? 0}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Mode</span><span className={`badge text-[10px] ${c.deliveryMode==='online'?'badge-indigo':c.deliveryMode==='physical'?'badge-cyan':'badge-purple'}`}>{c.deliveryMode ?? 'hybrid'}</span></div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                  <div className="flex flex-wrap gap-1">
                    {(c.instructors ?? []).slice(0,2).map((i: any) => <span key={i._id ?? i} className="text-[10px] text-slate-500">{i.firstName ?? i}</span>)}
                  </div>
                  <span className={`badge text-[10px] ${status==='published'?'badge-green':status==='archived'?'badge-red':'badge-amber'}`}>{status}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {(showAdd || editingId) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="card p-6 w-full max-w-lg my-4">
            <h2 className="font-display text-lg font-bold text-white mb-5">{editingId ? 'Edit Course' : 'Add New Course'}</h2>
            <CourseFormFields form={form} setForm={setForm}/>
            <div className="flex gap-3 mt-5">
              <button
                className="btn-primary flex-1 justify-center"
                onClick={() => editingId ? updateMut.mutate() : createMut.mutate()}
                disabled={createMut.isPending || updateMut.isPending || !form.title || !form.departmentId || !form.price}
              >
                {(createMut.isPending || updateMut.isPending) ? <Loader2 size={15} className="animate-spin"/> : (editingId ? 'Save Changes' : 'Create Course')}
              </button>
              <button className="btn-ghost" onClick={() => { setShowAdd(false); setEditingId(null); setForm(emptyForm) }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
