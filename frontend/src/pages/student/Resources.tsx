import { useState } from 'react'
import { FileText, Code2, Presentation, Download, Search, Loader2, Video, Music, Image as ImageIcon, Archive, ExternalLink } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { resourceAPI } from '../../services/api'
import { EmptyState, ListItemSkeleton } from '../../components/ui'

const typeLabels: Record<string,string> = {
  pdf:'PDF', word:'Word', excel:'Excel', powerpoint:'PowerPoint', image:'Image', zip:'ZIP',
  video:'Video', audio:'Audio', youtube:'YouTube', slide:'Slide', cheatsheet:'Cheat Sheet',
  sourcecode:'Source Code', template:'Template', projectfile:'Project File', other:'File',
}
const typeIcons: Record<string, typeof FileText> = {
  slide: Presentation, sourcecode: Code2, template: Code2,
  video: Video, audio: Music, image: ImageIcon, zip: Archive,
}
const colorMap: Record<string, string> = {
  pdf:'text-amber-400 bg-amber-500/10', word:'text-blue-400 bg-blue-500/10', excel:'text-emerald-400 bg-emerald-500/10',
  powerpoint:'text-orange-400 bg-orange-500/10', image:'text-purple-400 bg-purple-500/10', zip:'text-slate-400 bg-slate-500/10',
  video:'text-red-400 bg-red-500/10', audio:'text-pink-400 bg-pink-500/10', youtube:'text-red-400 bg-red-500/10',
  slide:'text-purple-400 bg-purple-500/10', cheatsheet:'text-blue-400 bg-blue-500/10', sourcecode:'text-emerald-400 bg-emerald-500/10',
  template:'text-brand-400 bg-brand-500/10',
}

export default function StudentResources() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const { data, isLoading } = useQuery({
    queryKey: ['myResources'],
    queryFn: async () => {
      const res = await resourceAPI.all()
      return res.data.data
    },
  })

  const allResources: any[] = Array.isArray(data) ? data : (data?.resources ?? [])

  const filtered = allResources.filter(r =>
    (filter === 'all' || r.type === filter) &&
    ((r.title ?? '').toLowerCase().includes(search.toLowerCase()) ||
     (r.course?.title ?? '').toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-bold text-white">Resources</h1>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"/>
          <input className="input pl-9" placeholder="Search resources..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <select className="input sm:w-44" value={filter} onChange={e=>setFilter(e.target.value)}>
          <option value="all">All Types</option>
          <option value="pdf">PDFs</option>
          <option value="word">Word Docs</option>
          <option value="excel">Excel Sheets</option>
          <option value="powerpoint">PowerPoint</option>
          <option value="image">Images</option>
          <option value="zip">ZIP Files</option>
          <option value="video">Videos</option>
          <option value="audio">Audio</option>
          <option value="youtube">YouTube</option>
        </select>
      </div>
      {isLoading ? (
        <div role="status" aria-label="Loading resources" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <ListItemSkeleton key={i} />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(r => {
              const Icon = typeIcons[r.type] ?? FileText
              const color = colorMap[r.type] ?? 'text-slate-400 bg-slate-500/10'
              return (
                <div key={r._id} className="card-hover p-4">
                  {r.type === 'youtube' ? (
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="block relative rounded-lg overflow-hidden mb-3 group">
                      <img src={r.youtubeThumbnail} alt={r.title} className="w-full aspect-video object-cover"/>
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <ExternalLink size={20} className="text-white"/>
                      </div>
                    </a>
                  ) : null}
                  <div className="flex items-start gap-3.5">
                    {r.type !== 'youtube' && (
                      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}><Icon size={17}/></div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-white leading-snug mb-1">{r.title}</h3>
                      <p className="text-[11px] text-slate-500">{r.course?.title ?? 'General'}{r.week?.title ? ` · ${r.week.title}` : ''}</p>
                      <div className="flex items-center justify-between mt-2.5">
                        <span className="badge badge-indigo text-[10px]">{typeLabels[r.type] ?? r.type}</span>
                        {r.type === 'youtube' ? (
                          <a href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] text-brand-400 hover:text-brand-300 font-medium">
                            <ExternalLink size={11}/> Watch
                          </a>
                        ) : (
                          <a href={`/api/v1/resources/${r._id}/download`} className="flex items-center gap-1 text-[11px] text-brand-400 hover:text-brand-300 font-medium">
                            <Download size={11}/> {r.fileSize ? `${(r.fileSize/1024/1024).toFixed(1)}MB` : 'Download'}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {filtered.length === 0 && (
            <EmptyState icon={FileText} title="No resources match your search" />
          )}
        </>
      )}
    </div>
  )
}
