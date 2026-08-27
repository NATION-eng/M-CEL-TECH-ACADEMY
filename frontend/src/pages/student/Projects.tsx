import { useState } from 'react'
import { Plus, Github, Globe, Star, Users, Layers, LucideIcon, Loader2, FolderGit2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectAPI } from '../../services/api'
import { EmptyState, ListItemSkeleton } from '../../components/ui'

interface TypeCfg { label:string; color:string; Icon: LucideIcon }
const typeConfig: Record<string, TypeCfg> = {
  personal: { label:'Personal', color:'badge-indigo', Icon: Star },
  team:     { label:'Team',     color:'badge-purple', Icon: Users },
  capstone: { label:'Capstone', color:'badge-amber',  Icon: Layers },
}
const statusColor: Record<string,string> = { completed:'badge-green', in_progress:'badge-indigo', under_review:'badge-amber' }

export default function StudentProjects() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title:'', description:'', type:'personal', githubUrl:'', liveUrl:'', technologies:'' })

  const { data, isLoading } = useQuery({
    queryKey: ['myProjects'],
    queryFn: async () => {
      const res = await projectAPI.mine()
      return res.data.data
    },
  })

  const projects: any[] = Array.isArray(data) ? data : (data?.projects ?? [])

  const saveMut = useMutation({
    mutationFn: () => projectAPI.create({
      title: form.title,
      description: form.description,
      type: form.type,
      githubUrl: form.githubUrl || undefined,
      liveUrl: form.liveUrl || undefined,
      technologies: form.technologies.split(',').map(t => t.trim()).filter(Boolean),
    }),
    onSuccess: () => {
      toast.success('Project saved!')
      setShowForm(false)
      setForm({ title:'', description:'', type:'personal', githubUrl:'', liveUrl:'', technologies:'' })
      qc.invalidateQueries({ queryKey: ['myProjects'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to save project'),
  })

  if (isLoading) {
    return (
      <div role="status" aria-label="Loading projects" className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => <ListItemSkeleton key={i} />)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Projects</h1>
          <p className="text-sm text-slate-500 mt-0.5">Build and submit your portfolio projects, personal builds, and capstones.</p>
        </div>
        <button className="btn-primary text-sm shrink-0 self-start sm:self-auto" onClick={() => setShowForm(true)}><Plus size={15}/> Add Project</button>
      </div>

      {showForm && (
        <div className="card p-5 sm:p-6">
          <h2 className="font-display font-semibold text-white mb-5">Add New Project</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">Project Title</label><input className="input" placeholder="My Awesome Project" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></div>
            <div>
              <label className="label">Type</label>
              <select className="input" value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>
                <option value="personal">Personal</option>
                <option value="team">Team</option>
                <option value="capstone">Capstone</option>
              </select>
              {form.type === 'team' && (
                <p className="text-[11px] text-slate-500 mt-1">
                  Team projects can be submitted individually or linked to teammates by your instructor.
                </p>
              )}
            </div>
            <div className="sm:col-span-2"><label className="label">Description</label><textarea className="input h-20 resize-none" placeholder="What does this project do?" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></div>
            <div><label className="label flex items-center gap-1.5"><Github size={13}/> GitHub URL</label><input className="input" placeholder="https://github.com/..." value={form.githubUrl} onChange={e=>setForm({...form,githubUrl:e.target.value})}/></div>
            <div><label className="label flex items-center gap-1.5"><Globe size={13}/> Live URL</label><input className="input" placeholder="https://..." value={form.liveUrl} onChange={e=>setForm({...form,liveUrl:e.target.value})}/></div>
            <div className="sm:col-span-2"><label className="label">Technologies (comma separated)</label><input className="input" placeholder="React, Node.js, MongoDB" value={form.technologies} onChange={e=>setForm({...form,technologies:e.target.value})}/></div>
          </div>
          <div className="flex flex-wrap gap-3 mt-5">
            <button className="btn-primary text-sm" onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !form.title}>
              {saveMut.isPending ? <Loader2 size={14} className="animate-spin"/> : 'Save Project'}
            </button>
            <button className="btn-ghost text-sm" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {projects.length === 0 && !showForm && (
        <EmptyState icon={FolderGit2} title="No projects yet" description="Add your first project above." />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {projects.map(p => {
          const type = p.type ?? 'personal'
          const typeCfg = typeConfig[type] ?? typeConfig.personal
          const status = p.status ?? 'in_progress'
          const tech: string[] = p.technologies ?? p.tech ?? []
          return (
            <div key={p._id} className="card-hover p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-semibold text-white mb-1.5">{p.title}</h3>
                  <div className="flex gap-2">
                    <span className={`badge ${typeCfg.color} flex items-center gap-1`}>
                      <typeCfg.Icon size={10}/> {typeCfg.label}
                    </span>
                    <span className={`badge ${statusColor[status] ?? 'badge-indigo'}`}>{status.replace(/_/g,' ')}</span>
                  </div>
                </div>
                {p.grade != null && (
                  <div className="text-right">
                    <div className="font-mono font-bold text-emerald-400">{p.grade}%</div>
                    <div className="text-[10px] text-slate-500">Grade</div>
                  </div>
                )}
              </div>
              <p className="text-sm text-slate-400 mb-4">{p.description}</p>
              {p.feedback && (
                <div className="mb-4 p-3 bg-brand-500/[0.06] border border-brand-500/20 rounded-lg">
                  <p className="text-[10px] font-semibold text-brand-400 uppercase tracking-wide mb-1">Instructor Feedback</p>
                  <p className="text-xs text-slate-300 leading-relaxed">{p.feedback}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {tech.map(t => <span key={t} className="badge badge-indigo text-[10px]">{t}</span>)}
              </div>
              <div className="flex gap-2">
                {p.githubUrl && <a href={p.githubUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1"><Github size={12}/> Code</a>}
                {p.liveUrl && <a href={p.liveUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1"><Globe size={12}/> Live</a>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

