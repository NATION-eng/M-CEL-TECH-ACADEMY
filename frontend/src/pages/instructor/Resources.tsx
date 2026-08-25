import { useState, useRef } from 'react'
import { Upload, Youtube, FileText, Video, Trash2, Loader2, ExternalLink, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { resourceAPI, courseAPI } from '../../services/api'
import { useAuthStore } from '../../store/auth.store'
import { useConfirm } from '../../components/ConfirmDialog'

const MEDIA_EXTENSIONS = ['.mp4', '.webm', '.mov', '.mp3', '.wav', '.ogg']

export default function InstructorResources() {
  const user = useAuthStore(s => s.user)
  const qc = useQueryClient()
  const confirm = useConfirm()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [courseId, setCourseId] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [progress, setProgress] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)

  const { data: courseData } = useQuery({
    queryKey: ['myCourses', user?._id],
    queryFn: async () => {
      const res = await courseAPI.getAll({ instructor: user?._id })
      return res.data.data
    },
    enabled: !!user,
  })
  const courses: any[] = Array.isArray(courseData) ? courseData : (courseData?.courses ?? [])

  const { data: resourceData, isLoading } = useQuery({
    queryKey: ['instructorResources', courseId],
    queryFn: async () => {
      const res = await resourceAPI.all(courseId ? { course: courseId } : undefined)
      return res.data.data
    },
  })
  const resources: any[] = Array.isArray(resourceData) ? resourceData : (resourceData?.resources ?? [])

  const resetForm = () => { setTitle(''); setDescription(''); setProgress(null) }

  const handleFileUpload = async (file: File) => {
    if (!title.trim()) { toast.error('Give the resource a title first.'); return }
    const isMedia = MEDIA_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext))
    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', title)
    formData.append('description', description)
    if (courseId) formData.append('course', courseId)

    setUploading(true)
    setProgress(0)
    try {
      const uploadFn = isMedia ? resourceAPI.uploadMedia : resourceAPI.uploadDocument
      await uploadFn(formData, (pct) => setProgress(pct))
      toast.success('Resource uploaded!')
      resetForm()
      qc.invalidateQueries({ queryKey: ['instructorResources'] })
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const youtubeMut = useMutation({
    mutationFn: () => resourceAPI.addYoutube({ url: youtubeUrl, description, course: courseId || undefined }),
    onSuccess: () => {
      toast.success('YouTube video added!')
      setYoutubeUrl(''); setDescription('')
      qc.invalidateQueries({ queryKey: ['instructorResources'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not add YouTube video. Check the URL and try again.'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => resourceAPI.remove(id),
    onSuccess: () => { toast.success('Resource deleted'); qc.invalidateQueries({ queryKey: ['instructorResources'] }) },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to delete resource.'),
  })

  const handleDelete = async (r: any) => {
    const ok = await confirm({ title: 'Delete this resource?', message: `"${r.title}" will be permanently removed.`, confirmLabel: 'Delete', danger: true })
    if (ok) deleteMut.mutate(r._id)
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-white">Course Resources</h1>

      <div className="card p-6 space-y-4">
        <h2 className="font-display font-semibold text-white">Upload a Resource</h2>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Title</label><input className="input" placeholder="e.g. Week 3 Slides" value={title} onChange={e=>setTitle(e.target.value)}/></div>
          <div><label className="label">Course</label>
            <select className="input" value={courseId} onChange={e=>setCourseId(e.target.value)}>
              <option value="">General (no course)</option>
              {courses.map((c:any) => <option key={c._id} value={c._id}>{c.title}</option>)}
            </select>
          </div>
        </div>
        <div><label className="label">Description (optional)</label><input className="input" value={description} onChange={e=>setDescription(e.target.value)}/></div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input ref={fileInputRef} type="file" className="hidden" id="resource-file"
              onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])}/>
            <label htmlFor="resource-file" className={`btn-outline w-full justify-center cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
              <Upload size={15}/> Upload File (PDF, Word, Excel, PPT, Image, ZIP, Video, Audio)
            </label>
          </div>
        </div>
        {progress !== null && (
          <div>
            <div className="progress-track"><div className="progress-fill" style={{width:`${progress}%`}}/></div>
            <p className="text-xs text-slate-500 mt-1">{progress}% uploaded</p>
          </div>
        )}
        <p className="text-xs text-slate-500">Documents/images up to 15MB. Video/audio up to 500MB.</p>

        <div className="border-t border-white/[0.06] pt-4">
          <label className="label">Or add a YouTube link</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Youtube size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-red-400"/>
              <input className="input pl-9" placeholder="https://youtube.com/watch?v=..." value={youtubeUrl} onChange={e=>setYoutubeUrl(e.target.value)}/>
            </div>
            <button className="btn-primary shrink-0" disabled={!youtubeUrl.trim() || youtubeMut.isPending} onClick={() => youtubeMut.mutate()}>
              {youtubeMut.isPending ? <Loader2 size={15} className="animate-spin"/> : 'Add'}
            </button>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <h2 className="font-display font-semibold text-white p-5 pb-0">Uploaded Resources</h2>
        {isLoading ? (
          <div className="py-12 flex items-center justify-center text-slate-500"><Loader2 size={20} className="animate-spin mr-2"/> Loading...</div>
        ) : resources.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">No resources uploaded yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
            {resources.map(r => (
              <div key={r._id} className="card-hover p-4">
                {r.type === 'youtube' ? (
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="block relative rounded-lg overflow-hidden mb-3 group">
                    <img src={r.youtubeThumbnail} alt={r.title} className="w-full aspect-video object-cover"/>
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <ExternalLink size={20} className="text-white"/>
                    </div>
                  </a>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-brand-600/15 flex items-center justify-center mb-3">
                    {r.type === 'video' || r.type === 'audio' ? <Video size={17} className="text-brand-400"/> : <FileText size={17} className="text-brand-400"/>}
                  </div>
                )}
                <h3 className="text-sm font-medium text-white leading-snug mb-1">{r.title}</h3>
                <p className="text-[11px] text-slate-500 mb-2">{r.description || 'No description'}</p>
                <div className="flex items-center justify-between">
                  <span className="badge badge-indigo text-[10px] uppercase">{r.type}</span>
                  <div className="flex items-center gap-1">
                    {r.type !== 'youtube' && (
                      <a href={`/api/v1/resources/${r._id}/download`} className="btn-ghost p-1.5"><Download size={13}/></a>
                    )}
                    <button onClick={() => handleDelete(r)} disabled={deleteMut.isPending} className="btn-ghost p-1.5 text-red-400 hover:bg-red-500/10"><Trash2 size={13}/></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
