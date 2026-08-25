import { useState } from 'react'
import { Plus, Pin, Trash2, Edit3, Megaphone, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { announcementAPI } from '../../services/api'
import { useConfirm } from '../../components/ConfirmDialog'

export default function AdminAnnouncements() {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ title:'', content:'', targetRoles:['student'] as string[], isPinned:false, expiresAt:'' })

  const { data, isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const res = await announcementAPI.all()
      return res.data.data
    },
  })

  const announcements: any[] = Array.isArray(data) ? data : (data?.announcements ?? [])

  const createM = useMutation({
    mutationFn: () => announcementAPI.create({
      title: form.title,
      content: form.content,
      targetRoles: form.targetRoles,
      isPinned: form.isPinned,
      expiresAt: form.expiresAt || undefined,
    }),
    onSuccess: () => {
      toast.success('Announcement published!')
      setShowAdd(false)
      setForm({ title:'', content:'', targetRoles:['student'], isPinned:false, expiresAt:'' })
      qc.invalidateQueries({ queryKey: ['announcements'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to publish'),
  })

  const updateM = useMutation({
    mutationFn: () => announcementAPI.update(editingId!, {
      title: form.title,
      content: form.content,
      targetRoles: form.targetRoles,
      isPinned: form.isPinned,
      expiresAt: form.expiresAt || undefined,
    }),
    onSuccess: () => {
      toast.success('Announcement updated!')
      setEditingId(null)
      setForm({ title:'', content:'', targetRoles:['student'], isPinned:false, expiresAt:'' })
      qc.invalidateQueries({ queryKey: ['announcements'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to update announcement'),
  })

  const openEdit = (a: any) => {
    setForm({
      title: a.title ?? '',
      content: a.content ?? '',
      targetRoles: a.targetRoles ?? ['student'],
      isPinned: !!a.isPinned,
      expiresAt: a.expiresAt ? String(a.expiresAt).slice(0,10) : '',
    })
    setEditingId(a._id)
    setShowAdd(false)
  }

  const deleteM = useMutation({
    mutationFn: (id: string) => announcementAPI.remove(id),
    onSuccess: () => { toast.success('Announcement deleted'); qc.invalidateQueries({ queryKey: ['announcements'] }) },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to delete announcement. Please try again.'),
  })

  const handleDelete = async (a: any) => {
    const ok = await confirm({
      title: 'Delete this announcement?',
      message: `"${a.title}" will be permanently deleted. This can't be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    })
    if (ok) deleteM.mutate(a._id)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-white">Announcements</h1>
        <button className="btn-primary text-sm" onClick={() => setShowAdd(true)}><Plus size={15}/> New Announcement</button>
      </div>

      {(showAdd || editingId) && (
        <div className="card p-6 border-brand-600/30">
          <h2 className="font-display font-semibold text-white mb-4">{editingId ? 'Edit Announcement' : 'New Announcement'}</h2>
          <div className="space-y-3">
            <div><label className="label">Title</label><input className="input" placeholder="Announcement title..." value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></div>
            <div><label className="label">Content</label><textarea className="input h-28 resize-none" placeholder="Write your announcement..." value={form.content} onChange={e=>setForm({...form,content:e.target.value})}/></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Target Audience</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {['student','instructor','admin'].map(role => (
                    <label key={role} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox"
                        checked={form.targetRoles.includes(role)}
                        onChange={e => setForm(f => ({ ...f, targetRoles: e.target.checked ? [...f.targetRoles,role] : f.targetRoles.filter(r=>r!==role) }))}
                        className="rounded"/>
                      <span className="text-sm text-slate-300 capitalize">{role}s</span>
                    </label>
                  ))}
                </div>
              </div>
              <div><label className="label">Expires (optional)</label><input type="date" className="input" value={form.expiresAt} onChange={e=>setForm({...form,expiresAt:e.target.value})}/></div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isPinned} onChange={e=>setForm({...form,isPinned:e.target.checked})} className="rounded"/>
              <span className="text-sm text-slate-300">Pin this announcement</span>
            </label>
          </div>
          <div className="flex gap-3 mt-5">
            <button className="btn-primary" onClick={() => editingId ? updateM.mutate() : createM.mutate()} disabled={createM.isPending || updateM.isPending}>
              {(createM.isPending || updateM.isPending) ? <Loader2 size={14} className="animate-spin"/> : <><Megaphone size={14}/> {editingId ? 'Save Changes' : 'Publish'}</>}
            </button>
            <button className="btn-ghost" onClick={() => { setShowAdd(false); setEditingId(null); setForm({ title:'', content:'', targetRoles:['student'], isPinned:false, expiresAt:'' }) }}>Cancel</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="py-16 flex items-center justify-center text-slate-500">
          <Loader2 size={22} className="animate-spin mr-2"/> Loading announcements...
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.length === 0 && (
            <div className="py-12 text-center text-slate-500 text-sm">No announcements yet.</div>
          )}
          {announcements.map(a => (
            <div key={a._id} className={`card-hover p-5 ${a.isPinned ? 'border-brand-600/30' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    {a.isPinned && <Pin size={12} className="text-brand-400 flex-shrink-0"/>}
                    <h3 className="font-semibold text-white">{a.title}</h3>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed mb-3">{a.content}</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span>By {a.author?.firstName ?? 'Admin'} {a.author?.lastName ?? ''}</span>
                    <span>·</span>
                    <span>{new Date(a.publishedAt ?? a.createdAt).toLocaleDateString('en-GB')}</span>
                    {a.expiresAt && <span>· Expires {new Date(a.expiresAt).toLocaleDateString('en-GB')}</span>}
                    <span>·</span>
                    {(a.targetRoles ?? []).map((r: string) => <span key={r} className={`badge text-[10px] ${r==='student'?'badge-indigo':r==='instructor'?'badge-purple':'badge-amber'}`}>{r}s</span>)}
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
