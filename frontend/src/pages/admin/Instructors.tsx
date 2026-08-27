import { useState } from 'react'
import { Plus, Search, MoreVertical, Trash2, UserX, UserCheck, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userAPI } from '../../services/api'

export default function AdminInstructors() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [openMenu, setOpenMenu] = useState<string|null>(null)
  const [form, setForm] = useState({ firstName:'', lastName:'', email:'', phone:'', specializations:'' })

  const { data, isLoading } = useQuery({
    queryKey: ['instructors', search],
    queryFn: async () => {
      const res = await userAPI.all({ role: 'instructor', search: search || undefined })
      return res.data.data
    },
  })

  const instructors: any[] = Array.isArray(data) ? data : (data?.users ?? [])

  const suspendMut = useMutation({
    mutationFn: (id: string) => userAPI.suspend(id),
    onSuccess: () => { toast.success('Instructor suspended'); qc.invalidateQueries({ queryKey: ['instructors'] }); setOpenMenu(null) },
    onError: () => toast.error('Failed to suspend'),
  })

  const activateMut = useMutation({
    mutationFn: (id: string) => userAPI.activate(id),
    onSuccess: () => { toast.success('Instructor reactivated'); qc.invalidateQueries({ queryKey: ['instructors'] }); setOpenMenu(null) },
    onError: () => toast.error('Failed to reactivate'),
  })

  const removeMut = useMutation({
    mutationFn: (id: string) => userAPI.remove(id),
    onSuccess: () => { toast.success('Instructor removed'); qc.invalidateQueries({ queryKey: ['instructors'] }); setOpenMenu(null) },
    onError: () => toast.error('Failed to remove'),
  })

  const addMut = useMutation({
    mutationFn: () => userAPI.create({ ...form, role: 'instructor' }),
    onSuccess: () => {
      toast.success('Instructor added â€” an invite email was sent so they can set their password.')
      setShowAdd(false)
      setForm({ firstName:'', lastName:'', email:'', phone:'', specializations:'' })
      qc.invalidateQueries({ queryKey: ['instructors'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to add instructor'),
  })

  const filtered = instructors.filter(i =>
    `${i.firstName} ${i.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    i.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Instructors</h1>
          <p className="text-sm text-slate-500 mt-1">Manage academy instructors, assign courses, and track faculty.</p>
        </div>
        <button className="btn-primary text-sm shrink-0 self-start sm:self-auto" onClick={() => setShowAdd(true)}>
          <Plus size={15}/> Add Instructor
        </button>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"/>
        <input className="input pl-9 max-w-sm" placeholder="Search instructors..." value={search} onChange={e => setSearch(e.target.value)}/>
      </div>

      {isLoading ? (
        <div className="py-16 flex items-center justify-center text-slate-500">
          <Loader2 size={22} className="animate-spin mr-2"/> Loading instructors...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.length === 0 && (
            <div className="col-span-2 py-12 text-center text-slate-500 text-sm">No instructors found.</div>
          )}
          {filtered.map(inst => {
            const name = `${inst.firstName} ${inst.lastName}`
            const specs: string[] = inst.specializations ?? []
            const courses = inst.courses ?? []
            return (
              <div key={inst._id} className="card-hover p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-600 to-brand-600 flex items-center justify-center text-white font-bold">{name[0]}</div>
                    <div>
                      <div className="font-semibold text-white">{name}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">{inst.instructorId ?? inst._id.slice(-8)}</div>
                    </div>
                  </div>
                  <div className="relative">
                    <button className="btn-ghost p-1.5" onClick={() => setOpenMenu(openMenu===inst._id?null:inst._id)}><MoreVertical size={15}/></button>
                    {openMenu === inst._id && (
                      <div className="absolute right-0 top-full mt-1 w-44 card py-1 shadow-2xl z-20">
                        {inst.status === 'active'
                          ? <button onClick={() => suspendMut.mutate(inst._id)} disabled={suspendMut.isPending} className="w-full text-left px-3.5 py-2 text-xs text-amber-400 hover:bg-amber-500/10 flex items-center gap-2"><UserX size={12}/> Suspend</button>
                          : <button onClick={() => activateMut.mutate(inst._id)} disabled={activateMut.isPending} className="w-full text-left px-3.5 py-2 text-xs text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2"><UserCheck size={12}/> Reactivate</button>
                        }
                        <button onClick={() => removeMut.mutate(inst._id)} disabled={removeMut.isPending} className="w-full text-left px-3.5 py-2 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2"><Trash2 size={12}/> Remove</button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-4 space-y-2.5 text-sm">
                  <div className="text-slate-500 text-xs">{inst.email}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {specs.map(s => <span key={s} className="badge badge-purple text-[10px]">{s}</span>)}
                    {specs.length === 0 && <span className="text-xs text-slate-600">No specializations</span>}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                    <div className="text-xs text-slate-500">{courses.length} course{courses.length!==1?'s':''}</div>
                    <span className={`badge ${inst.status === 'active' ? 'badge-green' : 'badge-red'}`}>{inst.status ?? 'active'}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card p-6 w-full max-w-md">
            <h2 className="font-display text-lg font-bold text-white mb-5">Add Instructor</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">First Name</label><input className="input" value={form.firstName} onChange={e=>setForm({...form,firstName:e.target.value})}/></div>
                <div><label className="label">Last Name</label><input className="input" value={form.lastName} onChange={e=>setForm({...form,lastName:e.target.value})}/></div>
              </div>
              <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></div>
              <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></div>
              <div><label className="label">Specializations (comma separated)</label><input className="input" placeholder="React, Node.js, MongoDB" value={form.specializations} onChange={e=>setForm({...form,specializations:e.target.value})}/></div>
            </div>
            <div className="flex flex-wrap gap-3 mt-5">
              <button className="btn-primary flex-1 justify-center" onClick={() => addMut.mutate()} disabled={addMut.isPending}>
                {addMut.isPending ? <Loader2 size={15} className="animate-spin"/> : 'Add Instructor'}
              </button>
              <button className="btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

