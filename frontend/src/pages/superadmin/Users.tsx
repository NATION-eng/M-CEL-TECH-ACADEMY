import { useState } from 'react'
import { Search, UserX, UserCheck, Trash2, MoreVertical, Loader2, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userAPI } from '../../services/api'
import { useAuthStore } from '../../store/auth.store'

const roleColors: Record<string,string> = { student:'badge-indigo', instructor:'badge-purple', admin:'badge-amber', super_admin:'text-yellow-400 bg-yellow-500/15 border-yellow-500/30 border' }

export default function SuperAdminUsers() {
  const qc = useQueryClient()
  const { user: currentUser } = useAuthStore()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [openMenu, setOpenMenu] = useState<string|null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ firstName:'', lastName:'', email:'', phone:'' })

  const { data, isLoading } = useQuery({
    queryKey: ['allUsers', search, roleFilter],
    queryFn: async () => {
      const res = await userAPI.all({ search: search || undefined, role: roleFilter !== 'all' ? roleFilter : undefined })
      return res.data.data
    },
  })

  const users: any[] = Array.isArray(data) ? data : (data?.users ?? [])

  const suspendMut = useMutation({
    mutationFn: (id: string) => userAPI.suspend(id),
    onSuccess: () => { toast.success('User suspended'); qc.invalidateQueries({ queryKey: ['allUsers'] }); setOpenMenu(null) },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to suspend'),
  })

  const activateMut = useMutation({
    mutationFn: (id: string) => userAPI.activate(id),
    onSuccess: () => { toast.success('User reactivated'); qc.invalidateQueries({ queryKey: ['allUsers'] }); setOpenMenu(null) },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to reactivate'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => userAPI.remove(id),
    onSuccess: () => { toast.success('User deleted'); qc.invalidateQueries({ queryKey: ['allUsers'] }); setOpenMenu(null) },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to delete'),
  })

  const addAdminMut = useMutation({
    mutationFn: () => userAPI.create({ ...form, role: 'admin' }),
    onSuccess: () => {
      toast.success('Admin added â€” an invite email was sent so they can set their password.')
      setShowAdd(false)
      setForm({ firstName:'', lastName:'', email:'', phone:'' })
      qc.invalidateQueries({ queryKey: ['allUsers'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to add admin'),
  })

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">All Users</h1>
          <p className="text-sm text-slate-500 mt-1">Super Admin directory: view, manage roles, suspend, or invite staff.</p>
        </div>
        <button className="btn-primary text-sm shrink-0 self-start sm:self-auto" onClick={() => setShowAdd(true)}><Plus size={15}/> Add Admin</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[{label:'Total',val:users.length},{label:'Students',val:users.filter(u=>u.role==='student').length},{label:'Instructors',val:users.filter(u=>u.role==='instructor').length},{label:'Admins',val:users.filter(u=>u.role==='admin'||u.role==='super_admin').length}].map(s=>(
          <div key={s.label} className="card p-3.5 text-center"><div className="font-display text-xl font-bold text-white">{s.val}</div><div className="text-xs text-slate-500 mt-0.5">{s.label}</div></div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"/>
          <input className="input pl-9" placeholder="Search users..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <select className="input sm:w-40" value={roleFilter} onChange={e=>setRoleFilter(e.target.value)}>
          <option value="all">All Roles</option>
          <option value="student">Students</option>
          <option value="instructor">Instructors</option>
          <option value="admin">Admins</option>
          <option value="super_admin">Super Admins</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex items-center justify-center text-slate-500">
            <Loader2 size={22} className="animate-spin mr-2"/> Loading users...
          </div>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl w-full">
            <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Joined</th><th></th></tr></thead>
            <tbody>
              {users.map(u => {
                const name = `${u.firstName} ${u.lastName}`
                return (
                  <tr key={u._id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-brand-600/20 flex items-center justify-center text-brand-400 text-xs font-bold">{name[0]}</div>
                        <div><div className="font-medium text-white text-sm">{name}</div><div className="text-xs text-slate-500">{u.email}</div></div>
                      </div>
                    </td>
                    <td><span className={`badge ${roleColors[u.role] ?? 'badge-indigo'}`}>{(u.role ?? '').replace('_',' ')}</span></td>
                    <td><span className={`badge ${u.status==='active'?'badge-green':'badge-red'}`}>{u.status}</span></td>
                    <td className="text-sm text-slate-500">{u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-GB') : 'â€”'}</td>
                    <td>
                      <div className="relative">
                        <button className="btn-ghost p-1.5" onClick={() => setOpenMenu(openMenu===u._id?null:u._id)}><MoreVertical size={15}/></button>
                        {openMenu === u._id && (
                          <div className="absolute right-0 top-full mt-1 w-44 card py-1 shadow-2xl z-20">
                            {u._id === currentUser?._id ? (
                              <p className="px-3.5 py-2 text-[11px] text-slate-500">This is your own account.</p>
                            ) : (
                              <>
                                {u.status==='active'
                                  ? <button onClick={()=>suspendMut.mutate(u._id)} disabled={suspendMut.isPending} className="w-full text-left px-3.5 py-2 text-xs text-amber-400 hover:bg-amber-500/10 flex items-center gap-2"><UserX size={12}/> Suspend</button>
                                  : <button onClick={()=>activateMut.mutate(u._id)} disabled={activateMut.isPending} className="w-full text-left px-3.5 py-2 text-xs text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2"><UserCheck size={12}/> Reactivate</button>}
                                {u.role !== 'super_admin' && (
                                  <button onClick={()=>deleteMut.mutate(u._id)} disabled={deleteMut.isPending} className="w-full text-left px-3.5 py-2 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2"><Trash2 size={12}/> Delete User</button>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {users.length === 0 && (
                <tr><td colSpan={5} className="py-10 text-center text-slate-500 text-sm">No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card p-6 w-full max-w-md">
            <h2 className="font-display text-lg font-bold text-white mb-1">Add Admin</h2>
            <p className="text-xs text-slate-500 mb-5">They'll get an email to set their own password.</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">First Name</label><input className="input" value={form.firstName} onChange={e=>setForm({...form,firstName:e.target.value})}/></div>
                <div><label className="label">Last Name</label><input className="input" value={form.lastName} onChange={e=>setForm({...form,lastName:e.target.value})}/></div>
              </div>
              <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></div>
              <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></div>
            </div>
            <div className="flex flex-wrap gap-3 mt-5">
              <button className="btn-primary flex-1 justify-center" onClick={() => addAdminMut.mutate()} disabled={addAdminMut.isPending || !form.firstName || !form.lastName || !form.email}>
                {addAdminMut.isPending ? <Loader2 size={15} className="animate-spin"/> : 'Add Admin'}
              </button>
              <button className="btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

