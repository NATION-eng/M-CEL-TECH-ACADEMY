import { useState } from 'react'
import { Search, Shield, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { auditAPI } from '../../services/api'

const actionColors: Record<string,string> = {
  LOGIN:'badge-green', LOGIN_FAILED:'badge-red', CERTIFICATE_ISSUED:'badge-amber',
  STUDENT_SUSPENDED:'badge-red', LESSON_CREATED:'badge-cyan', PAYMENT_MADE:'badge-green',
}

export default function AdminAuditLogs() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const { data, isLoading } = useQuery({
    queryKey: ['auditLogs', search, statusFilter],
    queryFn: async () => {
      const res = await auditAPI.logs({
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined
      })
      return res.data.data
    },
  })

  const logs: any[] = Array.isArray(data) ? data : (data?.logs ?? [])

  const filtered = logs.filter(l =>
    (statusFilter === 'all' || l.status === statusFilter) &&
    ((l.user?.email ?? l.user ?? '').toLowerCase().includes(search.toLowerCase()) ||
     (l.action ?? '').toLowerCase().includes(search.toLowerCase()) ||
     (l.entity ?? '').toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Shield size={20} className="text-brand-400"/>
        <h1 className="font-display text-2xl font-bold text-white">Audit Logs</h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[{label:'Total Events',val:logs.length,color:'text-white'},{label:'Failed',val:logs.filter(l=>l.status==='failure').length,color:'text-red-400'},{label:'Today',val:logs.filter(l => new Date(l.createdAt).toDateString() === new Date().toDateString()).length,color:'text-brand-400'}].map(s=>(
          <div key={s.label} className="stat-card"><div className={`font-display text-xl font-bold ${s.color}`}>{s.val}</div><div className="stat-label">{s.label}</div></div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"/>
          <input className="input pl-9" placeholder="Search logs..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <select className="input sm:w-36" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="success">Success</option>
          <option value="failure">Failure</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex items-center justify-center text-slate-500">
            <Loader2 size={22} className="animate-spin mr-2"/> Loading logs...
          </div>
        ) : (
          <div className="tbl-wrap"><table className="tbl w-full">
            <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Entity</th><th>IP Address</th><th>Status</th></tr></thead>
            <tbody>
              {filtered.map(log => (
                <tr key={log._id}>
                  <td className="font-mono text-xs text-slate-400 whitespace-nowrap">{new Date(log.createdAt).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</td>
                  <td className="text-sm text-slate-300 max-w-[180px] truncate">{log.user?.email ?? log.user ?? 'System'}</td>
                  <td><span className={`badge ${actionColors[log.action] ?? 'badge-indigo'} text-[10px]`}>{(log.action ?? '').replace(/_/g,' ')}</span></td>
                  <td><div className="text-sm text-slate-300">{log.entity}</div>{log.entityId && <div className="text-[10px] text-slate-600 font-mono">{log.entityId}</div>}</td>
                  <td className="font-mono text-xs text-slate-500">{log.ipAddress ?? 'â€”'}</td>
                  <td>
                    {log.status === 'success'
                      ? <CheckCircle2 size={14} className="text-emerald-400"/>
                      : <AlertCircle size={14} className="text-red-400"/>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
        {!isLoading && filtered.length === 0 && <div className="py-10 text-center text-slate-500 text-sm">No logs match your filters.</div>}
      </div>
    </div>
  )
}

