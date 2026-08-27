import { useState } from 'react'
import { Plus, Edit3, Trash2, Eye, FileText, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { blogAPI } from '../../services/api'
import { useConfirm } from '../../components/ConfirmDialog'
import { formatRelativeTime } from '../../utils/formatRelativeTime'

const emptyForm = { title:'', excerpt:'', content:'', category:'Technology', isPublished:false }

export default function AdminBlog() {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['blog'],
    queryFn: async () => {
      const res = await blogAPI.all()
      return res.data.data
    },
  })

  const posts: any[] = Array.isArray(data) ? data : (data?.posts ?? [])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setShowAdd(true)
  }

  const openEdit = (post: any) => {
    setEditingId(post._id)
    setForm({
      title: post.title ?? '',
      excerpt: post.excerpt ?? '',
      content: post.content ?? '',
      category: post.category ?? 'Technology',
      isPublished: !!post.isPublished,
    })
    setShowAdd(true)
  }

  const saveM = useMutation({
    mutationFn: () => {
      const payload = {
        title: form.title,
        excerpt: form.excerpt,
        content: form.content,
        category: form.category,
        isPublished: form.isPublished,
      }
      return editingId ? blogAPI.update(editingId, payload) : blogAPI.create(payload)
    },
    onSuccess: () => {
      toast.success(editingId ? 'Post updated!' : 'Post saved!')
      setShowAdd(false)
      setEditingId(null)
      setForm(emptyForm)
      qc.invalidateQueries({ queryKey: ['blog'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to save post. Please try again.'),
  })

  const deleteM = useMutation({
    mutationFn: (id: string) => blogAPI.remove(id),
    onSuccess: () => {
      toast.success('Post deleted')
      qc.invalidateQueries({ queryKey: ['blog'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to delete post. Please try again.'),
  })

  const handleDelete = async (post: any) => {
    const ok = await confirm({
      title: 'Delete this post?',
      message: `"${post.title}" will be permanently deleted. This can't be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    })
    if (ok) deleteM.mutate(post._id)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Blog</h1>
          <p className="text-sm text-slate-500 mt-1">Publish articles, academy news, and student spotlights.</p>
        </div>
        <button className="btn-primary text-sm shrink-0 self-start sm:self-auto" onClick={openCreate}>
          <Plus size={15}/> New Post
        </button>
      </div>

      {showAdd && (
        <div className="card p-6 border-brand-600/30">
          <h2 className="font-display font-semibold text-white mb-4">{editingId ? 'Edit Blog Post' : 'Create Blog Post'}</h2>
          <div className="space-y-3">
            <div><label className="label">Title</label><input className="input" placeholder="Post title..." value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></div>
            <div><label className="label">Excerpt (shown in listings)</label><textarea className="input h-16 resize-none" placeholder="Brief summary..." value={form.excerpt} onChange={e=>setForm({...form,excerpt:e.target.value})}/></div>
            <div><label className="label">Content</label><textarea className="input h-48 resize-none" placeholder="Full post content (Markdown supported)..." value={form.content} onChange={e=>setForm({...form,content:e.target.value})}/></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Category</label>
                <select className="input" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
                  {['Technology','Career','Education','Announcements','Student Stories'].map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isPublished} onChange={e=>setForm({...form,isPublished:e.target.checked})} className="rounded"/>
                  <span className="text-sm text-slate-300">{editingId ? 'Published' : 'Publish immediately'}</span>
                </label>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-5">
            <button
              className="btn-primary"
              onClick={() => saveM.mutate()}
              disabled={saveM.isPending || !form.title.trim() || !form.excerpt.trim() || !form.content.trim()}
            >
              {saveM.isPending ? <Loader2 size={14} className="animate-spin"/> : <><FileText size={14}/> {editingId ? 'Save Changes' : 'Save Post'}</>}
            </button>
            <button className="btn-ghost" onClick={() => { setShowAdd(false); setEditingId(null) }}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex items-center justify-center text-slate-500">
            <Loader2 size={22} className="animate-spin mr-2"/> Loading posts...
          </div>
        ) : isError ? (
          <div className="py-12 text-center text-slate-500 text-sm">Couldn't load blog posts. Please refresh the page.</div>
        ) : (
          <table className="tbl w-full">
            <thead><tr><th>Title</th><th>Author</th><th>Category</th><th>Views</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {posts.map(p => (
                <tr key={p._id}>
                  <td className="max-w-xs"><div className="font-medium text-white text-sm truncate">{p.title}</div><div className="text-xs text-slate-500 mt-0.5 font-mono">{p.publishedAt ? formatRelativeTime(p.publishedAt) : 'Draft'}</div></td>
                  <td className="text-sm text-slate-300">{p.author?.firstName ?? 'Admin'}</td>
                  <td><span className="badge badge-indigo">{p.category}</span></td>
                  <td><span className="font-mono text-sm text-slate-400">{(p.views ?? 0).toLocaleString()}</span></td>
                  <td><span className={`badge ${p.isPublished?'badge-green':'badge-amber'}`}>{p.isPublished?'Published':'Draft'}</span></td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(p)} className="btn-ghost p-1.5" title="Edit post"><Edit3 size={13}/></button>
                      {p.isPublished && <a href={`/blog/${p.slug}`} target="_blank" rel="noopener noreferrer" className="btn-ghost p-1.5 text-brand-400" title="View live"><Eye size={13}/></a>}
                      <button
                        onClick={() => handleDelete(p)}
                        disabled={deleteM.isPending}
                        className="btn-ghost p-1.5 text-red-400 hover:bg-red-500/10"
                        title="Delete post"
                      >
                        <Trash2 size={13}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!isLoading && !isError && posts.length === 0 && (
          <div className="py-12 text-center text-slate-500 text-sm">No blog posts found.</div>
        )}
      </div>
    </div>
  )
}

