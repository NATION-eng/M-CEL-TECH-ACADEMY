import { useState } from 'react'
import { Plus, Calendar, MapPin, Edit3, Trash2, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { eventAPI } from '../../services/api'
import { useConfirm } from '../../components/ConfirmDialog'

const emptyForm = { title:'', description:'', startDate:'', endDate:'', location:'', isOnline:false, registrationLink:'' }

export default function AdminEvents() {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const res = await eventAPI.all()
      return res.data.data
    },
  })

  const events: any[] = Array.isArray(data) ? data : (data?.events ?? [])

  const toDatetimeLocal = (iso?: string) => {
    if (!iso) return ''
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setShowAdd(true)
  }

  const openEdit = (ev: any) => {
    setEditingId(ev._id)
    setForm({
      title: ev.title ?? '',
      description: ev.description ?? '',
      startDate: toDatetimeLocal(ev.startDate),
      endDate: toDatetimeLocal(ev.endDate),
      location: ev.location ?? '',
      isOnline: !!ev.isOnline,
      registrationLink: ev.registrationLink ?? '',
    })
    setShowAdd(true)
  }

  const saveM = useMutation({
    mutationFn: () => {
      const payload = {
        title: form.title,
        description: form.description,
        startDate: form.startDate,
        endDate: form.endDate,
        location: form.location,
        isOnline: form.isOnline,
        registrationLink: form.registrationLink || undefined,
      }
      return editingId ? eventAPI.update(editingId, payload) : eventAPI.create(payload)
    },
    onSuccess: () => {
      toast.success(editingId ? 'Event updated!' : 'Event created!')
      setShowAdd(false)
      setEditingId(null)
      setForm(emptyForm)
      qc.invalidateQueries({ queryKey: ['events'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to save event. Please try again.'),
  })

  const deleteM = useMutation({
    mutationFn: (id: string) => eventAPI.remove(id),
    onSuccess: () => {
      toast.success('Event deleted')
      qc.invalidateQueries({ queryKey: ['events'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to delete event. Please try again.'),
  })

  const handleDelete = async (ev: any) => {
    const ok = await confirm({
      title: 'Delete this event?',
      message: `"${ev.title}" will be permanently deleted. This can't be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    })
    if (ok) deleteM.mutate(ev._id)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-white">Events</h1>
        <button className="btn-primary text-sm" onClick={openCreate}><Plus size={15}/> New Event</button>
      </div>

      {showAdd && (
        <div className="card p-6 border-brand-600/30">
          <h2 className="font-display font-semibold text-white mb-4">{editingId ? 'Edit Event' : 'Create Event'}</h2>
          <div className="space-y-3">
            <div><label className="label">Title</label><input className="input" placeholder="Event title..." value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></div>
            <div><label className="label">Description</label><textarea className="input h-20 resize-none" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Start Date & Time</label><input type="datetime-local" className="input" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})}/></div>
              <div><label className="label">End Date & Time</label><input type="datetime-local" className="input" value={form.endDate} onChange={e=>setForm({...form,endDate:e.target.value})}/></div>
            </div>
            <div>
              <label className="flex items-center gap-2 mb-2 cursor-pointer">
                <input type="checkbox" checked={form.isOnline} onChange={e=>setForm({...form,isOnline:e.target.checked})} className="rounded"/>
                <span className="text-sm text-slate-300">Online event</span>
              </label>
              <input className="input" placeholder={form.isOnline ? 'Meeting URL (Zoom, Google Meet...)' : 'Physical location...'} value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/>
            </div>
            <div><label className="label">Registration Link (optional)</label><input className="input" placeholder="https://..." value={form.registrationLink} onChange={e=>setForm({...form,registrationLink:e.target.value})}/></div>
          </div>
          <div className="flex gap-3 mt-5">
            <button
              className="btn-primary"
              onClick={() => saveM.mutate()}
              disabled={saveM.isPending || !form.title.trim() || !form.startDate || !form.endDate}
            >
              {saveM.isPending ? <Loader2 size={14} className="animate-spin"/> : <><Calendar size={14}/> {editingId ? 'Save Changes' : 'Create Event'}</>}
            </button>
            <button className="btn-ghost" onClick={() => { setShowAdd(false); setEditingId(null) }}>Cancel</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="py-16 flex items-center justify-center text-slate-500">
          <Loader2 size={22} className="animate-spin mr-2"/> Loading events...
        </div>
      ) : isError ? (
        <div className="py-12 text-center text-slate-500 text-sm">Couldn't load events. Please refresh the page.</div>
      ) : (
        <div className="space-y-3">
          {events.length === 0 && (
            <div className="py-12 text-center text-slate-500 text-sm">No events found.</div>
          )}
          {events.map(e => (
            <div key={e._id} className="card-hover p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`badge ${e.isOnline ? 'badge-indigo' : 'badge-cyan'}`}>{e.isOnline ? 'Online' : 'Physical'}</span>
                    <span className={`badge ${e.isPublished !== false ? 'badge-green' : 'badge-amber'}`}>{e.isPublished !== false ? 'Published' : 'Draft'}</span>
                  </div>
                  <h3 className="font-semibold text-white mb-1">{e.title}</h3>
                  <p className="text-sm text-slate-400 mb-3">{e.description}</p>
                  <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5"><Calendar size={11}/> {new Date(e.startDate).toLocaleString('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</span>
                    <span className="flex items-center gap-1.5"><MapPin size={11}/> {e.location}</span>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(e)} className="btn-ghost p-1.5" title="Edit event"><Edit3 size={13}/></button>
                  <button
                    onClick={() => handleDelete(e)}
                    disabled={deleteM.isPending}
                    className="btn-ghost p-1.5 text-red-400 hover:bg-red-500/10"
                    title="Delete event"
                  >
                    <Trash2 size={13}/>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
