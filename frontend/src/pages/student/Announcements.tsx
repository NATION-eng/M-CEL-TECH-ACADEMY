import { Pin, Megaphone } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { announcementAPI } from '../../services/api'
import { sanitizeHtml } from '../../utils/sanitizeHtml'
import { EmptyState, ListItemSkeleton } from '../../components/ui'

export default function StudentAnnouncements() {
  const { data, isLoading } = useQuery({
    queryKey: ['myAnnouncements'],
    queryFn: async () => (await announcementAPI.all()).data.data,
  })
  const announcements: any[] = Array.isArray(data) ? data : []

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-bold text-white">Announcements</h1>
      {isLoading ? (
        <div role="status" aria-label="Loading announcements" className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <ListItemSkeleton key={i} />)}
        </div>
      ) : announcements.length === 0 ? (
        <EmptyState icon={Megaphone} title="No announcements right now" />
      ) : (
        <div className="space-y-3">
          {announcements.map(a => (
            <div key={a._id} className={`card p-5 ${a.isPinned ? 'border-amber-500/30' : ''}`}>
              <div className="flex items-center gap-2 mb-2">
                {a.isPinned && <span className="badge badge-amber"><Pin size={10}/> Pinned</span>}
                {a.targetCourses?.length > 0 && <span className="badge badge-indigo">{a.targetCourses.map((c:any)=>c.title).join(', ')}</span>}
                <span className="text-xs text-slate-500 ml-auto">{new Date(a.publishedAt ?? a.createdAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</span>
              </div>
              <h3 className="font-semibold text-white mb-1.5">{a.title}</h3>
              <div className="text-sm text-slate-400 leading-relaxed ann-body" dangerouslySetInnerHTML={{ __html: sanitizeHtml(a.content) }} />
              <p className="text-xs text-slate-600 mt-2">— {a.author?.firstName} {a.author?.lastName}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
