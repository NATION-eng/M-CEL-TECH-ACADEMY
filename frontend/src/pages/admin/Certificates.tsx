import { useState } from 'react'
import { Trophy, Plus, Shield, ShieldOff, Search, Download, Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { certificateAPI, userAPI, courseAPI, curriculumAPI } from '../../services/api'
import { useAuthStore } from '../../store/auth.store'

export default function AdminCertificates() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const [search, setSearch] = useState('')
  const [showIssue, setShowIssue] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [form, setForm] = useState({ studentSearch:'', studentId:'', courseId:'', badgeLevelId:'' })
  const [override, setOverride] = useState(false)
  const [overrideReason, setOverrideReason] = useState('')

  const handleDownload = async (id: string, certNumber: string) => {
    setDownloadingId(id)
    try {
      const res = await certificateAPI.downloadCertificate(id)
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `certificate-${certNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Could not download certificate. Please try again.')
    } finally {
      setDownloadingId(null)
    }
  }

  const { data, isLoading } = useQuery({
    queryKey: ['certificates'],
    queryFn: async () => {
      const res = await certificateAPI.all()
      return res.data.data
    },
  })

  const { data: studentsData } = useQuery({
    queryKey: ['studentSearch', form.studentSearch],
    enabled: showIssue && form.studentSearch.length > 1,
    queryFn: async () => {
      const res = await userAPI.all({ role: 'student', search: form.studentSearch })
      return res.data.data
    },
  })

  const { data: coursesData } = useQuery({
    queryKey: ['courses-for-cert'],
    enabled: showIssue,
    queryFn: async () => {
      const res = await courseAPI.getAll({ isPublished: true })
      return res.data.data
    },
  })

  const { data: badgesData } = useQuery({
    queryKey: ['badges-for-cert', form.courseId],
    enabled: showIssue && !!form.courseId,
    queryFn: async () => {
      const res = await curriculumAPI.getBadgeLevels(form.courseId)
      return res.data.data
    },
  })

  const { data: eligibility, isFetching: checkingEligibility } = useQuery({
    queryKey: ['cert-eligibility', form.studentId, form.courseId],
    enabled: showIssue && !!form.studentId && !!form.courseId,
    queryFn: async () => {
      const res = await certificateAPI.eligibility(form.courseId, form.studentId)
      return res.data.data
    },
  })

  const certs: any[] = Array.isArray(data) ? data : (data?.certificates ?? [])
  const searchStudents: any[] = Array.isArray(studentsData) ? studentsData : (studentsData?.users ?? [])
  const courses: any[] = Array.isArray(coursesData) ? coursesData : (coursesData?.courses ?? [])
  const badges: any[] = Array.isArray(badgesData) ? badgesData : (badgesData?.badgeLevels ?? [])

  const revokeM = useMutation({
    mutationFn: (id: string) => certificateAPI.revoke(id, 'Admin revocation'),
    onSuccess: () => { toast.success('Certificate revoked'); qc.invalidateQueries({ queryKey: ['certificates'] }) },
    onError: () => toast.error('Failed to revoke'),
  })

  const issueM = useMutation({
    mutationFn: () => certificateAPI.issue({
      studentId: form.studentId,
      courseId: form.courseId,
      badgeLevelId: form.badgeLevelId || undefined,
      override: override || undefined,
      overrideReason: override ? overrideReason : undefined,
    }),
    onSuccess: () => {
      toast.success('Certificate issued!')
      setShowIssue(false)
      setForm({ studentSearch:'', studentId:'', courseId:'', badgeLevelId:'' })
      setOverride(false); setOverrideReason('')
      qc.invalidateQueries({ queryKey: ['certificates'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to issue certificate'),
  })

  const filtered = certs.filter(c => {
    const studentName = c.student ? `${c.student.firstName} ${c.student.lastName}` : ''
    return (
      studentName.toLowerCase().includes(search.toLowerCase()) ||
      (c.certificateNumber ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (c.course?.title ?? '').toLowerCase().includes(search.toLowerCase())
    )
  })

  const totalActive = certs.filter(c => !c.isRevoked).length
  const totalRevoked = certs.filter(c => c.isRevoked).length
  const isSuperAdmin = user?.role === 'super_admin'
  const canIssue = form.studentId && form.courseId && (eligibility?.eligible || (isSuperAdmin && override && overrideReason.trim().length > 3))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-white">Certificates</h1>
        <button className="btn-primary text-sm" onClick={() => setShowIssue(true)}><Plus size={15}/> Issue Certificate</button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[{label:'Total Issued',val:certs.length,color:'text-white'},{label:'Active',val:totalActive,color:'text-emerald-400'},{label:'Revoked',val:totalRevoked,color:'text-red-400'}].map(s=>(
          <div key={s.label} className="stat-card"><div className={`font-display text-2xl font-bold ${s.color}`}>{s.val}</div><div className="stat-label">{s.label}</div></div>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"/>
        <input className="input pl-9" placeholder="Search certificates..." value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex items-center justify-center text-slate-500">
            <Loader2 size={22} className="animate-spin mr-2"/> Loading certificates...
          </div>
        ) : (
          <table className="tbl w-full">
            <thead><tr><th>Certificate #</th><th>Student</th><th>Course / Badge</th><th>Issued</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {filtered.map(c => {
                const studentName = c.student ? `${c.student.firstName} ${c.student.lastName}` : '—'
                return (
                  <tr key={c._id}>
                    <td><span className="font-mono text-xs text-brand-400">{c.certificateNumber}</span></td>
                    <td><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-amber-600/20 flex items-center justify-center text-amber-400 text-xs font-bold">{studentName[0]}</div><span className="text-sm font-medium text-white">{studentName}</span></div></td>
                    <td><div className="text-sm text-slate-300">{c.course?.title ?? '—'}</div><div className="text-xs text-slate-500">{c.badgeLevel?.title ?? c.badgeLevel ?? '—'}</div></td>
                    <td className="text-slate-400 text-sm">{new Date(c.issuedAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</td>
                    <td><span className={`badge ${c.isRevoked?'badge-red':'badge-green'}`}>{c.isRevoked?'revoked':'active'}</span></td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDownload(c._id, c.certificateNumber)} disabled={downloadingId === c._id} className="btn-ghost p-1.5 text-slate-400 hover:text-white">
                          {downloadingId === c._id ? <Loader2 size={13} className="animate-spin"/> : <Download size={13}/>}
                        </button>
                        <a href={`/verify/${c.certificateNumber}`} target="_blank" rel="noopener noreferrer" className="btn-ghost p-1.5 text-brand-400 hover:text-brand-300"><Shield size={13}/></a>
                        {!c.isRevoked && (
                          <button onClick={() => revokeM.mutate(c._id)} disabled={revokeM.isPending} className="btn-ghost p-1.5 text-red-400 hover:text-red-300"><ShieldOff size={13}/></button>
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
          <div className="py-10 text-center text-slate-500 text-sm">No certificates found.</div>
        )}
      </div>

      {showIssue && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="font-display text-lg font-bold text-white mb-5">Issue Certificate</h2>
            <div className="space-y-3">
              <div>
                <label className="label">Search Student</label>
                <input className="input" placeholder="Type student name..." value={form.studentSearch} onChange={e=>setForm({...form,studentSearch:e.target.value,studentId:''})}/>
                {searchStudents.length > 0 && !form.studentId && (
                  <div className="mt-1 card py-1 max-h-36 overflow-y-auto">
                    {searchStudents.map((s:any) => (
                      <button key={s._id} onClick={() => setForm(f => ({ ...f, studentId: s._id, studentSearch: `${s.firstName} ${s.lastName}` }))} className="w-full text-left px-3.5 py-2 text-xs text-slate-300 hover:bg-white/5">
                        {s.firstName} {s.lastName} — {s.email}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div><label className="label">Course</label>
                <select className="input" value={form.courseId} onChange={e=>setForm({...form,courseId:e.target.value,badgeLevelId:''})}>
                  <option value="">Select course</option>
                  {courses.map((c:any) => <option key={c._id} value={c._id}>{c.title}</option>)}
                </select>
              </div>
              <div><label className="label">Badge Level (optional)</label>
                <select className="input" value={form.badgeLevelId} onChange={e=>setForm({...form,badgeLevelId:e.target.value})} disabled={!form.courseId}>
                  <option value="">Whole course (no specific badge)</option>
                  {badges.map((b:any) => <option key={b._id} value={b._id}>{b.title}</option>)}
                </select>
              </div>

              {form.studentId && form.courseId && (
                <div className="rounded-xl border p-3 text-xs space-y-1.5" style={{ borderColor: checkingEligibility ? 'rgba(255,255,255,0.1)' : eligibility?.eligible ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)' }}>
                  {checkingEligibility ? (
                    <div className="flex items-center gap-2 text-slate-400"><Loader2 size={13} className="animate-spin"/> Checking eligibility...</div>
                  ) : eligibility?.eligible ? (
                    <div className="flex items-center gap-2 text-emerald-400 font-medium"><CheckCircle2 size={14}/> Student meets all requirements.</div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-amber-400 font-medium"><XCircle size={14}/> Not yet eligible</div>
                      <ul className="text-slate-400 list-disc list-inside space-y-0.5">
                        {(eligibility?.reasons ?? []).map((r: string, i: number) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {form.studentId && form.courseId && eligibility && !eligibility.eligible && isSuperAdmin && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 space-y-2">
                  <label className="flex items-center gap-2 text-xs text-red-300">
                    <input type="checkbox" checked={override} onChange={e=>setOverride(e.target.checked)}/>
                    Force-issue anyway (logged to audit trail)
                  </label>
                  {override && (
                    <textarea className="input h-16 resize-none text-xs" placeholder="Reason for override (required)..." value={overrideReason} onChange={e=>setOverrideReason(e.target.value)}/>
                  )}
                </div>
              )}

              {form.studentId && form.courseId && eligibility && !eligibility.eligible && !isSuperAdmin && (
                <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-400">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5"/> Only a super admin can force-issue a certificate to an ineligible student.
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-5">
              <button className="btn-primary flex-1 justify-center" onClick={() => issueM.mutate()} disabled={issueM.isPending || !canIssue}>
                {issueM.isPending ? <Loader2 size={15} className="animate-spin"/> : <><Trophy size={14}/> Issue Certificate</>}
              </button>
              <button className="btn-ghost" onClick={() => setShowIssue(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
