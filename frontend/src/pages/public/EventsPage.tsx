import { Calendar, MapPin, ExternalLink, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { eventAPI } from '../../services/api'

export default function EventsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['publicEvents'],
    queryFn: async () => {
      const res = await eventAPI.all()
      return res.data.data
    },
  })

  const events: any[] = Array.isArray(data) ? data : (data?.events ?? [])

  return (
    <div className="bg-ink-900 pt-20">
      <section className="section-pad">
        <div className="page-container max-w-4xl">
          <div className="section-eyebrow">Events & Workshops</div>
          <h1 className="font-display text-4xl font-bold text-white mb-10">Upcoming Events</h1>
          {isLoading ? (
            <div className="py-16 flex items-center justify-center text-slate-500">
              <Loader2 size={22} className="animate-spin mr-2"/> Loading events...
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-sm">No upcoming events scheduled yet.</div>
          ) : (
            <div className="space-y-4">
              {events.map(e => {
                const dateStr = e.date ? new Date(e.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBD'
                return (
                  <div key={e._id || e.title} className="card-hover p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap gap-2 mb-2">
                          <span className={`badge ${e.type === 'Online' ? 'badge-indigo' : 'badge-cyan'}`}>{e.type ?? 'Online'}</span>
                        </div>
                        <h3 className="font-display text-lg font-semibold text-white mb-2">{e.title}</h3>
                        <p className="text-sm text-slate-400 mb-3">{e.description ?? e.desc ?? ''}</p>
                        <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                          <span className="flex items-center gap-1.5"><Calendar size={12}/> {dateStr}</span>
                          <span className="flex items-center gap-1.5"><MapPin size={12}/> {e.location ?? 'Online'}</span>
                        </div>
                      </div>
                      <button className="btn-outline text-xs py-2 px-4 flex-shrink-0 flex items-center gap-1.5">Register <ExternalLink size={12}/></button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
