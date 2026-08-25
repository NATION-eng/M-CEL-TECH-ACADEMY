import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Plus, MoreVertical, UserX, UserCheck, Trash2, Eye, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userAPI, courseAPI, enrollmentAPI } from '../../services/api'

const paymentBadge: Record<string,string> = { paid:'badge-green', partial:'badge-amber', pending:'badge-indigo', overdue:'badge-red' }
const statusBadge: Record<string,string> = { active:'badge-green', suspended:'badge-red', dropped:'badge-amber' }

export default function AdminStudents() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [openMenu, setOpenMenu] = useState<string|null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newStudent, setNewStudent] = useState({ firstName:'', lastName:'', email:'', phone:'', course:'' })

  const { data: coursesData } = useQuery({
    queryKey: ['coursesForAddStudent'],
    enabled: showAddModal,
    queryFn: async () => {
      const res = await courseAPI.getAll({ isPublished: true })
      const d = res.data.data
      return Array.isArray(d) ? d : (d?.courses ?? [])
    },
  })
  const courses: any[] = coursesData ?? []

  const { data, isLoading } = useQuery({
    queryKey: ['students', search, statusFilter],
    queryFn: async () => {
      const res = await userAPI.all({ role: 'student', search: search || undefined, status: statusFilter !== 'all' ? statusFilter : undefined })
      return res.data.data
    },
  })

  const students: any[] = Array.isArray(data) ? data : (data?.users ?? [])

  const suspendMut = useMutation({
    mutationFn: (id: string) => userAPI.suspend(id),
    onSuccess: () => { toast.success('Student suspended'); qc.invalidateQueries({ queryKey: ['students'] }); setOpenMenu(null) },
    onError: () => toast.error('Failed to suspend'),
  })

  const activateMut = useMutation({
    mutationFn: (id: string) => userAPI.activate(id),
    onSuccess: () => { toast.success('Student reactivated'); qc.invalidateQueries({ queryKey: ['students'] }); setOpenMenu(null) },
    onError: () => toast.error('Failed to reactivate'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => userAPI.remove(id),
    onSuccess: () => { toast.success('Student deleted'); qc.invalidateQueries({ queryKey: ['students'] }); setOpenMenu(null) },
    onError: () => toast.error('Failed to delete'),
  })

  const addMut = useMutation({
    mutationFn: async () => {
      const { firstName, lastName, email, phone, course } = newStudent
      const res = await userAPI.create({ firstName, lastName, email, phone, role: 'student' })
      const createdUser = res.data.data
      if (course) {
        try {
          await enrollmentAPI.enroll({ course, studentId: createdUser._id })
        } catch {
          toast.error('Account created, but enrollment failed — enroll them manually from the course page.')
        }
      }
      return createdUser
    },
    onSuccess: () => { toast.success('Student added — an invite email was sent so they can set their password.'); setShowAddModal(false); setNewStudent({ firstName:'', lastName:'', email:'', phone:'', course:'' }); qc.invalidateQueries({ queryKey: ['students'] }) },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to add student'),
  })

  const filtered = students.filter(s =>
    (statusFilter === 'all' || s.status === statusFilter) &&
    (`${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()) || (s.studentId ?? '').includes(search) || s.email.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-white">Students</h1>
        <button className="btn-primary text-sm self-start" onClick={() => setShowAddModal(true)}><Plus size={15}/> Add Student</button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"/>
          <input className="input pl-9" placeholder="Search by name, ID or email..." value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <select className="input sm:w-40" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="dropped">Dropped</option>
        </select>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[{ label:'Total', val: students.length, color:'text-white' },{ label:'Active', val: students.filter(s=>s.status==='active').length, color:'text-emerald-400' },{ label:'Suspended', val: students.filter(s=>s.status==='suspended').length, color:'text-red-400' },{ label:'Overdue Payment', val: students.filter(s=>s.paymentStatus==='overdue').length, color:'text-amber-400' }].map(s => (
          <div key={s.label} className="card p-3.5 text-center">
            <div className={`font-display text-xl font-bold ${s.color}`}>{s.val}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex items-center justify-center text-slate-500">
            <Loader2 size={22} className="animate-spin mr-2"/> Loading students...
          </div>
        ) : (
          <table className="tbl w-full">
            <thead>
              <tr>
                <th>Student</th>
                <th>Course</th>
                <th>Progress</th>
                <th>Payment</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const name = `${s.firstName} ${s.lastName}`
                const course = s.enrollments?.[0]?.course?.title ?? s.course ?? '—'
                const progress = s.enrollments?.[0]?.progress ?? 0
                const payment = s.paymentStatus ?? 'pending'
                return (
                  <tr key={s._id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-brand-600/20 flex items-center justify-center text-brand-400 text-xs font-bold flex-shrink-0">{name[0]}</div>
                        <div>
                          <div className="font-medium text-white text-sm">{name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{s.studentId ?? s._id.slice(-6)} · {s.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="text-sm text-slate-300">{course}</div>
                      <div className="text-[10px] text-slate-500">{s.enrollments?.[0]?.currentBadge?.title ?? ''}</div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-16 progress-track"><div className="progress-fill" style={{width:`${progress}%`}}/></div>
                        <span className="text-xs font-mono text-slate-400">{progress}%</span>
                      </div>
                    </td>
                    <td><span className={`badge ${paymentBadge[payment] ?? 'badge-indigo'}`}>{payment}</span></td>
                    <td><span className={`badge ${statusBadge[s.status] ?? 'badge-amber'}`}>{s.status}</span></td>
                    <td>
                      <div className="relative">
                        <button className="btn-ghost p-1.5" onClick={() => setOpenMenu(openMenu === s._id ? null : s._id)}><MoreVertical size={15}/></button>
                        {openMenu === s._id && (
                          <div className="absolute right-0 top-full mt-1 w-44 card py-1 shadow-2xl shadow-black/50 z-20">
                            <Link to={`/admin/students/${s._id}`} className="w-full text-left px-3.5 py-2 text-xs text-slate-300 hover:bg-white/5 flex items-center gap-2"><Eye size={12}/> View Profile</Link>
                            {s.status === 'active'
                              ? <button onClick={() => suspendMut.mutate(s._id)} disabled={suspendMut.isPending} className="w-full text-left px-3.5 py-2 text-xs text-amber-400 hover:bg-amber-500/10 flex items-center gap-2"><UserX size={12}/> Suspend</button>
                              : <button onClick={() => activateMut.mutate(s._id)} disabled={activateMut.isPending} className="w-full text-left px-3.5 py-2 text-xs text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2"><UserCheck size={12}/> Reactivate</button>
                            }
                            <button onClick={() => deleteMut.mutate(s._id)} disabled={deleteMut.isPending} className="w-full text-left px-3.5 py-2 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2"><Trash2 size={12}/> Delete</button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="py-12 text-center text-slate-500 text-sm">No students match your search.</div>
        )}
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card p-6 w-full max-w-md">
            <h2 className="font-display text-lg font-bold text-white mb-5">Add New Student</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">First Name</label><input className="input" placeholder="Emeka" value={newStudent.firstName} onChange={e=>setNewStudent({...newStudent,firstName:e.target.value})}/></div>
                <div><label className="label">Last Name</label><input className="input" placeholder="Obi" value={newStudent.lastName} onChange={e=>setNewStudent({...newStudent,lastName:e.target.value})}/></div>
              </div>
              <div><label className="label">Email</label><input className="input" type="email" placeholder="student@example.com" value={newStudent.email} onChange={e=>setNewStudent({...newStudent,email:e.target.value})}/></div>
              <div><label className="label">Phone</label><input className="input" placeholder="08012345678" value={newStudent.phone} onChange={e=>setNewStudent({...newStudent,phone:e.target.value})}/></div>
              <div>
                <label className="label">Program (optional — enrolls them immediately)</label>
                <select className="input" value={newStudent.course} onChange={e=>setNewStudent({...newStudent,course:e.target.value})}>
                  <option value="">No program yet</option>
                  {courses.map((c: any) => <option key={c._id} value={c._id}>{c.title}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button className="btn-primary flex-1 justify-center" onClick={() => addMut.mutate()} disabled={addMut.isPending}>
                {addMut.isPending ? <Loader2 size={15} className="animate-spin"/> : 'Add Student'}
              </button>
              <button className="btn-ghost" onClick={() => setShowAddModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
