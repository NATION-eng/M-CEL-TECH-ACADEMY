import { useState } from 'react'
import { Plus, Edit3, Trash2, Eye, FileText, Loader2, Search, Archive as ArchiveIcon, RotateCcw, Pin, Megaphone, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { blogAPI, announcementAPI, courseAPI } from '../../services/api'
import { useConfirm } from '../../components/ConfirmDialog'
import RichTextEditor from '../../components/RichTextEditor'

type Tab = 'blog' | 'announcements'
type StatusFilter = 'all' | 'draft' | 'scheduled' | 'published' | 'archived'

const emptyBlogForm = { title:'', excerpt:'', content:'', category:'Technology', isPublished:false, scheduledFor:'' }
const emptyAnnForm = { title:'', content:'', isPinned:false, isPublished:true, scheduledFor:'', targetCourses:[] as string[] }

export default function AdminContent() {
  const [tab, setTab] = useState<Tab>('blog')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const qc = useQueryClient()
  const confirm = useConfirm()

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [blogForm, setBlogForm] = useState(emptyBlogForm)
  const [annForm, setAnnForm] = useState(emptyAnnForm)

  const resetAndClose = () => {
    setShowForm(false); setEditingId(null)
    setBlogForm(emptyBlogForm); setAnnForm(emptyAnnForm)
  }

  const blogQuery = useQuery({
    queryKey: ['adminBlog', status, search, page],
    queryFn: async () => {
      const res = await blogAPI.all({ status, search: search || undefined, page, limit: 9 })
      return res.data
    },
    enabled: tab === 'blog',
  })

  const annQuery = useQuery({
    queryKey: ['adminAnnouncements', status, search, page],
    queryFn: async () => {
      const res = await announcementAPI.manage({ status, search: search || undefined, page, limit: 9 })
      return res.data
    },
    enabled: tab === 'announcements',
  })

  const { data: courseData } = useQuery({
    queryKey: ['coursesForTargeting'],
    queryFn: async () => (await courseAPI.getAll()).data.data,
    enabled: tab === 'announcements' && showForm,
  })
  const courses: any[] = Array.isArray(courseData) ? courseData : (courseData?.courses ?? [])

  const items: any[] = tab === 'blog' ? (blogQuery.data?.data ?? []) : (annQuery.data?.data ?? [])
  const pagination = tab === 'blog' ? blogQuery.data?.pagination : annQuery.data?.pagination
  const isLoading = tab === 'blog' ? blogQuery.isLoading : annQuery.isLoading

  const invalidate = () => qc.invalidateQueries({ queryKey: tab === 'blog' ? ['adminBlog'] : ['adminAnnouncements'] })

  const saveBlogMut = useMutation({
    mutationFn: () => {
      const payload = { ...blogForm, scheduledFor: blogForm.scheduledFor || undefined }
      return editingId ? blogAPI.update(editingId, payload) : blogAPI.create(payload)
    },
    onSuccess: () => { toast.success(editingId ? 'Post updated!' : 'Post saved!'); resetAndClose(); invalidate() },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to save post.'),
  })

  const saveAnnMut = useMutation({
    mutationFn: () => {
      const payload = { ...annForm, scheduledFor: annForm.scheduledFor || undefined }
      return editingId ? announcementAPI.update(editingId, payload) : announcementAPI.create(payload)
    },
    onSuccess: () => { toast.success(editingId ? 'Announcement updated!' : 'Announcement saved!'); resetAndClose(); invalidate() },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to save announcement.'),
  })

  const archiveMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      tab === 'blog' ? blogAPI.archive(id, reason) : announcementAPI.archive(id, reason),
    onSuccess: (_res, vars) => {
      invalidate()
      toast((t) => (
        <span className="flex items-center gap-3">
          Archived.
          <button
            className="text-brand-400 font-medium hover:text-brand-300"
            onClick={() => { restoreMut.mutate(vars.id); toast.dismiss(t.id) }}
          >
            Undo
          </button>
        </span>
      ))
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to archive.'),
  })

  const restoreMut = useMutation({
    mutationFn: (id: string) => tab === 'blog' ? blogAPI.restore(id) : announcementAPI.restore(id),
    onSuccess: () => { toast.success('Restored'); invalidate() },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to restore.'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => tab === 'blog' ? blogAPI.remove(id) : announcementAPI.remove(id),
    onSuccess: () => { toast.success('Permanently deleted'); invalidate() },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to delete.'),
  })

  const handleArchive = async (item: any) => {
    const reason = window.prompt('Reason for archiving (optional):') ?? undefined
    const ok = await confirm({ title: 'Archive this item?', message: `"${item.title}" will be moved to Archive. You can restore it anytime.`, confirmLabel: 'Archive' })
    if (ok) archiveMut.mutate({ id: item._id, reason: reason || undefined })
  }

  const handlePermanentDelete = async (item: any) => {
    const ok = await confirm({ title: 'Delete permanently?', message: `"${item.title}" will be permanently deleted. This cannot be undone.`, confirmLabel: 'Delete Forever', danger: true })
    if (ok) deleteMut.mutate(item._id)
  }

  const openCreate = () => { setEditingId(null); setBlogForm(emptyBlogForm); setAnnForm(emptyAnnForm); setShowForm(true) }
  const openEdit = (item: any) => {
    setEditingId(item._id)
    if (tab === 'blog') {
      setBlogForm({
        title: item.title ?? '', excerpt: item.excerpt ?? '', content: item.content ?? '',
        category: item.category ?? 'Technology', isPublished: !!item.isPublished,
        scheduledFor: item.scheduledFor ? item.scheduledFor.slice(0,16) : '',
      })
    } else {
      setAnnForm({
        title: item.title ?? '', content: item.content ?? '', isPinned: !!item.isPinned,
        isPublished: item.isPublished !== false, scheduledFor: item.scheduledFor ? item.scheduledFor.slice(0,16) : '',
        targetCourses: (item.targetCourses ?? []).map((c:any) => c._id ?? c),
      })
    }
    setShowForm(true)
  }

  const statusBadge = (item: any) => {
    if (item.isArchived) return <span className="badge badge-slate">Archived</span>
    if (!item.isPublished) return <span className="badge badge-amber">Draft</span>
    if (item.scheduledFor && new Date(item.scheduledFor) > new Date()) return <span className="badge badge-cyan">Scheduled</span>
    return <span className="badge badge-green">Published</span>
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Content Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage public blog articles and academy-wide announcements.</p>
        </div>
        {!showForm && <button className="btn-primary text-sm shrink-0 self-start sm:self-auto" onClick={openCreate}><Plus size={15}/> New {tab === 'blog' ? 'Post' : 'Announcement'}</button>}
      </div>

      <div className="flex gap-1 bg-ink-800/60 rounded-xl p-1 w-fit">
        {(['blog','announcements'] as Tab[]).map(t => (
          <button key={t} onClick={() => { setTab(t); setPage(1); setShowForm(false) }}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${tab===t ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            {t === 'blog' ? <><FileText size={13}/> Blog</> : <><Megaphone size={13}/> Announcements</>}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="card p-6 border-brand-600/30 space-y-4">
          <h2 className="font-display font-semibold text-white">{editingId ? 'Edit' : 'Create'} {tab === 'blog' ? 'Blog Post' : 'Announcement'}</h2>

          {tab === 'blog' ? (
            <div className="space-y-3">
              <div><label className="label">Title</label><input className="input" value={blogForm.title} onChange={e=>setBlogForm({...blogForm,title:e.target.value})}/></div>
              <div><label className="label">Excerpt</label><textarea className="input h-16 resize-none" value={blogForm.excerpt} onChange={e=>setBlogForm({...blogForm,excerpt:e.target.value})}/></div>
              <div><label className="label">Content</label><RichTextEditor value={blogForm.content} onChange={html=>setBlogForm({...blogForm,content:html})} placeholder="Write your post..."/></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="label">Category</label>
                  <select className="input" value={blogForm.category} onChange={e=>setBlogForm({...blogForm,category:e.target.value})}>
                    {['Technology','Career','Education','Announcements','Student Stories'].map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className="label">Schedule for (optional)</label><input type="datetime-local" className="input" value={blogForm.scheduledFor} onChange={e=>setBlogForm({...blogForm,scheduledFor:e.target.value})}/></div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={blogForm.isPublished} onChange={e=>setBlogForm({...blogForm,isPublished:e.target.checked})} className="rounded"/><span className="text-sm text-slate-300">Publish</span></label>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button className="btn-primary" onClick={()=>saveBlogMut.mutate()} disabled={saveBlogMut.isPending || !blogForm.title.trim() || !blogForm.excerpt.trim() || !blogForm.content.trim()}>
                  {saveBlogMut.isPending ? <Loader2 size={14} className="animate-spin"/> : <><FileText size={14}/> Save</>}
                </button>
                <button className="btn-ghost" onClick={resetAndClose}>Cancel</button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div><label className="label">Title</label><input className="input" value={annForm.title} onChange={e=>setAnnForm({...annForm,title:e.target.value})}/></div>
              <div><label className="label">Content</label><RichTextEditor value={annForm.content} onChange={html=>setAnnForm({...annForm,content:html})} placeholder="Write your announcement..."/></div>
              <div>
                <label className="label">Target Courses (leave empty for all)</label>
                <select multiple className="input h-24" value={annForm.targetCourses} onChange={e=>setAnnForm({...annForm,targetCourses:Array.from(e.target.selectedOptions, (o: HTMLOptionElement) => o.value)})}>
                  {courses.map((c:any)=><option key={c._id} value={c._id}>{c.title}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="label">Schedule for (optional)</label><input type="datetime-local" className="input" value={annForm.scheduledFor} onChange={e=>setAnnForm({...annForm,scheduledFor:e.target.value})}/></div>
                <div className="flex items-end pb-2"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={annForm.isPinned} onChange={e=>setAnnForm({...annForm,isPinned:e.target.checked})} className="rounded"/><span className="text-sm text-slate-300">Pin to top</span></label></div>
                <div className="flex items-end pb-2"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={annForm.isPublished} onChange={e=>setAnnForm({...annForm,isPublished:e.target.checked})} className="rounded"/><span className="text-sm text-slate-300">Publish (uncheck to save as draft)</span></label></div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button className="btn-primary" onClick={()=>saveAnnMut.mutate()} disabled={saveAnnMut.isPending || !annForm.title.trim() || !annForm.content.trim()}>
                  {saveAnnMut.isPending ? <Loader2 size={14} className="animate-spin"/> : <><Megaphone size={14}/> Save</>}
                </button>
                <button className="btn-ghost" onClick={resetAndClose}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"/>
          <input className="input pl-9" placeholder="Search..." value={search} onChange={e=>{setSearch(e.target.value); setPage(1)}}/>
        </div>
        <select className="input sm:w-44" value={status} onChange={e=>{setStatus(e.target.value as StatusFilter); setPage(1)}}>
          <option value="all">All (active)</option>
          <option value="draft">Drafts</option>
          <option value="scheduled">Scheduled</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex items-center justify-center text-slate-500"><Loader2 size={22} className="animate-spin mr-2"/> Loading...</div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">Nothing here yet.</div>
        ) : (
          <table className="tbl w-full">
            <thead><tr><th>Title</th><th>{tab==='blog'?'Category':'Targets'}</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {items.map(item => (
                <tr key={item._id}>
                  <td className="max-w-xs">
                    <div className="font-medium text-white text-sm truncate flex items-center gap-1.5">
                      {item.isPinned && <Pin size={11} className="text-amber-400 shrink-0"/>}
                      {item.title}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                      {item.scheduledFor && new Date(item.scheduledFor) > new Date() && <Clock size={10}/>}
                      {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('en-GB') : 'Not scheduled'}
                    </div>
                  </td>
                  <td className="text-sm text-slate-300">{tab === 'blog' ? item.category : (item.targetCourses?.length ? `${item.targetCourses.length} course(s)` : 'Everyone')}</td>
                  <td>{statusBadge(item)}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      {item.isArchived ? (
                        <>
                          <button onClick={() => restoreMut.mutate(item._id)} disabled={restoreMut.isPending} className="btn-ghost p-1.5 text-emerald-400" title="Restore"><RotateCcw size={13}/></button>
                          <button onClick={() => handlePermanentDelete(item)} className="btn-ghost p-1.5 text-red-400 hover:bg-red-500/10" title="Delete permanently"><Trash2 size={13}/></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => openEdit(item)} className="btn-ghost p-1.5" title="Edit"><Edit3 size={13}/></button>
                          {tab === 'blog' && item.isPublished && <a href={`/blog/${item.slug}`} target="_blank" rel="noopener noreferrer" className="btn-ghost p-1.5 text-brand-400" title="View live"><Eye size={13}/></a>}
                          <button onClick={() => handleArchive(item)} disabled={archiveMut.isPending} className="btn-ghost p-1.5 text-amber-400" title="Archive"><ArchiveIcon size={13}/></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button className="btn-ghost p-1.5" disabled={!pagination.hasPrev} onClick={() => setPage(p => p - 1)}><ChevronLeft size={15}/></button>
          <span className="text-sm text-slate-400">Page {pagination.page} of {pagination.pages}</span>
          <button className="btn-ghost p-1.5" disabled={!pagination.hasNext} onClick={() => setPage(p => p + 1)}><ChevronRight size={15}/></button>
        </div>
      )}
    </div>
  )
}

