import { useState, useEffect } from 'react'
import { User, Github, Linkedin, Globe, Camera, Save, Loader2 } from 'lucide-react'
import { useAuthStore } from '../../store/auth.store'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { userAPI, authAPI } from '../../services/api'
import toast from 'react-hot-toast'

export default function StudentProfile() {
  const { user, setAuth, accessToken, refreshToken } = useAuthStore()
  const qc = useQueryClient()
  const [form, setForm] = useState({
    phone: user?.phone || '',
    bio: '',
    skills: '',
    githubUrl: '',
    linkedinUrl: '',
    portfolioUrl: '',
  })

  // The auth store only ever holds the bare User document (name/email/phone/role) —
  // bio/skills/links live on the separate Student sub-profile, so they have to be
  // fetched here rather than assumed to already be on `user`.
  const { data: me, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await authAPI.me()).data.data,
  })

  useEffect(() => {
    if (!me) return
    const profile = me.profile ?? {}
    setForm({
      phone: me.user?.phone ?? '',
      bio: profile.bio ?? '',
      skills: Array.isArray(profile.skills) ? profile.skills.join(', ') : (profile.skills ?? ''),
      githubUrl: profile.githubUrl ?? '',
      linkedinUrl: profile.linkedinUrl ?? '',
      portfolioUrl: profile.portfolioUrl ?? '',
    })
  }, [me])

  const saveMut = useMutation({
    mutationFn: () => userAPI.update(user!._id, {
      phone: form.phone,
      bio: form.bio,
      skills: form.skills.split(',').map((s: string) => s.trim()).filter(Boolean),
      githubUrl: form.githubUrl || undefined,
      linkedinUrl: form.linkedinUrl || undefined,
      portfolioUrl: form.portfolioUrl || undefined,
    }),
    onSuccess: (res) => {
      const updatedUser = res.data.data?.user ?? res.data.data
      if (updatedUser && accessToken && refreshToken) {
        setAuth(updatedUser, accessToken, refreshToken)
      }
      qc.invalidateQueries({ queryKey: ['me'] })
      toast.success('Profile updated!')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to save profile'),
  })

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="font-display text-2xl font-bold text-white">Profile</h1>
      <div className="card p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 sm:gap-5 mb-6 pb-6 border-b border-white/[0.07]">
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-600 to-cyan-500 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-brand-900/30">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <button
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-ink-800 border border-white/15 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              title="Avatar upload is coming soon"
              aria-label="Avatar upload is coming soon"
              onClick={() => toast('Avatar upload is coming soon.')}
            >
              <Camera size={13}/>
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h2 className="font-display text-xl font-bold text-white truncate">{user?.firstName} {user?.lastName}</h2>
              <span className="badge badge-indigo w-fit mx-auto sm:mx-0 capitalize">{user?.role ?? 'Student'}</span>
            </div>
            <p className="text-slate-400 text-sm mt-1 truncate">{user?.email}</p>
          </div>
        </div>
        {isLoading ? (
          <div className="py-10 flex items-center justify-center text-slate-500"><Loader2 size={18} className="animate-spin mr-2"/> Loading profile...</div>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="label">First Name</label><input className="input" value={user?.firstName ?? ''} disabled title="Contact an administrator to change your name" style={{opacity:0.6}}/></div>
          <div><label className="label">Last Name</label><input className="input" value={user?.lastName ?? ''} disabled title="Contact an administrator to change your name" style={{opacity:0.6}}/></div>
          <div><label className="label">Email</label><input className="input" type="email" value={user?.email ?? ''} disabled title="Email cannot be changed" style={{opacity:0.6}}/></div>
          <div><label className="label">Phone</label><input className="input" placeholder="08012345678" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></div>
          <div className="sm:col-span-2"><label className="label">Bio</label><textarea className="input h-20 resize-none" placeholder="Tell us about yourself..." value={form.bio} onChange={e=>setForm({...form,bio:e.target.value})}/></div>
          <div className="sm:col-span-2"><label className="label">Skills (comma separated)</label><input className="input" placeholder="React, Node.js, MongoDB" value={form.skills} onChange={e=>setForm({...form,skills:e.target.value})}/></div>
          <div><label className="label flex items-center gap-1.5"><Github size={13}/> GitHub URL</label><input className="input" placeholder="https://github.com/..." value={form.githubUrl} onChange={e=>setForm({...form,githubUrl:e.target.value})}/></div>
          <div><label className="label flex items-center gap-1.5"><Linkedin size={13}/> LinkedIn URL</label><input className="input" placeholder="https://linkedin.com/in/..." value={form.linkedinUrl} onChange={e=>setForm({...form,linkedinUrl:e.target.value})}/></div>
          <div className="sm:col-span-2"><label className="label flex items-center gap-1.5"><Globe size={13}/> Portfolio URL</label><input className="input" placeholder="https://yourportfolio.com" value={form.portfolioUrl} onChange={e=>setForm({...form,portfolioUrl:e.target.value})}/></div>
        </div>
        )}
        <div className="flex justify-end mt-5 pt-5 border-t border-white/[0.07]">
          <button className="btn-primary w-full sm:w-auto justify-center" onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !user || isLoading}>
            {saveMut.isPending ? <Loader2 size={14} className="animate-spin"/> : <><Save size={14}/> Save Changes</>}
          </button>
        </div>
      </div>
    </div>
  )
}
