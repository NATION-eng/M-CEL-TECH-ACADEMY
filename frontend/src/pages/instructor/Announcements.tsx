import { useState } from 'react'
import { Plus, Pin, Trash2, Edit3, Megaphone, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { announcementAPI, courseAPI } from '../../services/api'
import { useAuthStore } from '../../store/auth.store'
import { useConfirm } from '../../components/ConfirmDialog'
import RichTextEditor from '../../components/RichTextEditor'
import { sanitizeHtml } from '../../utils/sanitizeHtml'

export default function InstructorAnnouncements() {
  const user = useAuthStore(s => s.user)
  const qc = useQueryClient()
  const confirm = useConfirm()
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ title:'', content:'', targetCourses: [] as string[], isPinned:false, expiresAt:'' })

  const { data: coursesData } = useQuery({
    queryKey: ['myCoursesForAnnouncements', user?._id],
    enabled: !!user,
    queryFn: async () => {
      const res = await courseAPI.getAll({ instructor: user?._id })
      const d = res.data.data
      return Array.isArray(d) ? d : (d?.courses ?? [])
    },
  })
  const courses: any[] = coursesData ?? []

  const { data, isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => (await announcementAPI.all()).data.data,
  })
  const allAnnouncements: any[] = Array.isArray(data) ? data : (data?.announcements ?? [])
  // Instructors only manage their own posts here — admin-wide announcements live in the Admin portal.
  const myAnnouncements = allAnnouncements.filter(a => (a.author?._id ?? a.author) === user?._id)

  const resetForm = () => setForm({ title:'', content:'', targetCourses:[], isPinned:false, expiresAt:'' })

  const createM = useMutation({
    mutationFn: () => announcementAPI.create({
      title: form.title, content: form.content, targetCourses: form.targetCourses,
      isPinned: form.isPinned, expiresAt: form.expiresAt || undefined,
    }),
    onSuccess: () => { toast.success('Announcement published!'); setShowAdd(false); resetForm(); qc.invalidateQueries({ queryKey: ['announcements'] }) },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to publish'),
  })

  const updateM = useMutation({
    mutationFn: () => announcementAPI.update(editingId!, {
      title: form.title, content: form.content, targetCourses: form.targetCourses,
      isPinned: form.isPinned, expiresAt: form.expiresAt || undefined,
    }),
    onSuccess: () => { toast.success('Announcement updated!'); setEditingId(null); resetForm(); qc.invalidateQueries({ queryKey: ['announcements'] }) },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to update'),
  })

  const deleteM = useMutation({
    mutationFn: (id: string) => announcementAPI.remove(id),
    onSuccess: () => { toast.success('Announcement deleted'); qc.invalidateQueries({ queryKey: ['announcements'] }) },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to delete'),
  })

  const openEdit = (a: any) => {
    setForm({
      title: a.title ?? '', content: a.content ?? '',
      targetCourses: (a.targetCourses ?? []).map((c: any) => c._id ?? c),
      isPinned: !!a.isPinned,
      expiresAt: a.expiresAt ? String(a.expiresAt).slice(0,10) : '',
    })
    setEditingId(a._id)
    setShowAdd(false)
  }

  const toggleCourse = (id: string) => setForm(f => ({ ...f, targetCourses: f.targetCourses.includes(id) ? f.targetCourses.filter(c=>c!==id) : [...f.targetCourses, id] }))

  const handleDelete = async (a: any) => {
    const ok = await confirm({ title: 'Delete this announcement?', message: `"${a.title}" will be permanently deleted.`, confirmLabel: 'Delete', danger: true })
    if (ok) deleteM.mutate(a._id)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-white">Announcements</h1>
        <button className="btn-primary text-sm" onClick={() => { resetForm(); setEditingId(null); setShowAdd(true) }}><Plus size={15}/> New Announcement</button>
      </div>
      <p className="text-sm text-slate-500 -mt-3">Announcements you post here go only to students enrolled in the course(s) you pick — not the whole academy.</p>

      {(showAdd || editingId) && (
        <div className="card p-6 border-brand-600/30">
          <h2 className="font-display font-semibold text-white mb-4">{editingId ? 'Edit Announcement' : 'New Announcement'}</h2>
          <div className="space-y-3">
            <div><label className="label">Title</label><input className="input" placeholder="Announcement title..." value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></div>
            <div><label className="label">Content</label><RichTextEditor value={form.content} onChange={html=>setForm({...form,content:html})} placeholder="Write your announcement..."/></div>
            <div>
              <label className="label">Send to (select your courses)</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {courses.length === 0 && <p className="text-xs text-slate-500">You don't have any assigned courses yet.</p>}
                {courses.map((c:any) => (
                  <button key={c._id} type="button" onClick={()=>toggleCourse(c._id)} className={`badge border cursor-pointer transition-all ${form.targetCourses.includes(c._id)?'badge-indigo border-brand-500/50':'text-slate-500 border-white/10 hover:border-white/20'}`}>{c.title}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Expires (optional)</label><input type="date" className="input" value={form.expiresAt} onChange={e=>setForm({...form,expiresAt:e.target.value})}/></div>
              <label className="flex items-center gap-2 cursor-pointer self-end pb-2.5">
                <input type="checkbox" checked={form.isPinned} onChange={e=>setForm({...form,isPinned:e.target.checked})} className="rounded"/>
                <span className="text-sm text-slate-300">Pin this announcement</span>
              </label>
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button className="btn-primary" onClick={() => editingId ? updateM.mutate() : createM.mutate()} disabled={createM.isPending || updateM.isPending || !form.title || !form.content || form.targetCourses.length===0}>
              {(createM.isPending || updateM.isPending) ? <Loader2 size={14} className="animate-spin"/> : <><Megaphone size={14}/> {editingId ? 'Save Changes' : 'Publish'}</>}
            </button>
            <button className="btn-ghost" onClick={() => { setShowAdd(false); setEditingId(null); resetForm() }}>Cancel</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="py-16 flex items-center justify-center text-slate-500"><Loader2 size={22} className="animate-spin mr-2"/> Loading announcements...</div>
      ) : (
        <div className="space-y-3">
          {myAnnouncements.length === 0 && <div className="py-12 text-center text-slate-500 text-sm">You haven't posted any announcements yet.</div>}
          {myAnnouncements.map(a => (
            <div key={a._id} className={`card-hover p-5 ${a.isPinned ? 'border-brand-600/30' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    {a.isPinned && <Pin size={12} className="text-brand-400 flex-shrink-0"/>}
                    <h3 className="font-semibold text-white">{a.title}</h3>
                  </div>
                  <div className="text-sm text-slate-400 leading-relaxed mb-3 ann-body" dangerouslySetInnerHTML={{ __html: sanitizeHtml(a.content) }} />
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                    <span>To:</span>
                    {(a.targetCourses ?? []).map((c: any) => <span key={c._id ?? c} className="badge badge-indigo text-[10px]">{c.title ?? 'Course'}</span>)}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(a)} className="btn-ghost p-1.5"><Edit3 size={13}/></button>
                  <button onClick={() => handleDelete(a)} disabled={deleteM.isPending} className="btn-ghost p-1.5 text-red-400 hover:bg-red-500/10"><Trash2 size={13}/></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
