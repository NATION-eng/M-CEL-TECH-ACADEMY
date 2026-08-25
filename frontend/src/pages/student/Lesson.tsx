import { useEffect, useState } from 'react'
import { ChevronLeft, Download, FileText, Code2, Presentation, CheckCircle2, Play, Loader2 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { curriculumAPI, enrollmentAPI } from '../../services/api'
import toast from 'react-hot-toast'

interface LessonDownload { name: string; url?: string; size?: string; type?: string }
interface LessonData {
  title: string
  notes?: string
  videoUrl?: string
  codeSnippets?: string
  code?: string
  downloads?: LessonDownload[]
}

/** Handles both the long form (youtube.com/watch?v=ID) and the short form
 * (youtu.be/ID) that people actually paste when sharing links — the short
 * form previously wasn't converted to an embeddable URL at all, so it
 * would try to load youtu.be directly in an iframe, which YouTube blocks
 * (X-Frame-Options), leaving students with a blank video player. */
function toEmbedUrl(url: string): string {
  if (url.includes('youtube.com/watch?v=')) return url.replace('watch?v=', 'embed/')
  const shortMatch = url.match(/youtu\.be\/([\w-]+)/)
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`
  return url
}

const TABS = [['notes', 'Notes', FileText], ['slides', 'Slides', Presentation], ['code', 'Code', Code2], ['downloads', 'Downloads', Download]] as const

export default function StudentLesson() {
  const { courseId, lessonId } = useParams<{ courseId: string, lessonId: string }>()
  const [activeTab, setActiveTab] = useState<'notes' | 'slides' | 'code' | 'downloads'>('notes')
  const [marked, setMarked] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['studentLesson', lessonId],
    queryFn: async () => {
      if (!lessonId) throw new Error('No lesson ID provided')
      const res = await curriculumAPI.getLesson(lessonId)
      return res.data.data
    },
    enabled: !!lessonId,
  })

  // The lesson-content endpoint above only returns the lesson itself, not
  // whether *this* student has already completed it (that's tracked on
  // Enrollment.completedLessons, a separate collection entirely). Without
  // this, `marked` always started false, so revisiting an already-
  // completed lesson silently showed "Mark as Complete" again with no
  // indication you'd already done it.
  const { data: enrollments } = useQuery({
    queryKey: ['myEnrollments'],
    queryFn: async () => {
      const res = await enrollmentAPI.mine()
      const raw = res.data.data
      return Array.isArray(raw) ? raw : (raw?.enrollments ?? [])
    },
  })

  useEffect(() => {
    if (!enrollments || !courseId || !lessonId) return
    const enrollment = enrollments.find((e: any) => (e.course?._id ?? e.course) === courseId)
    const completedLessons: string[] = enrollment?.completedLessons ?? []
    if (completedLessons.includes(lessonId)) setMarked(true)
  }, [enrollments, courseId, lessonId])

  const progressMut = useMutation({
    mutationFn: async () => {
      if (!courseId || !lessonId) throw new Error('Missing course or lesson id')
      return enrollmentAPI.progress(courseId, { lessonId, completed: true })
    },
    onSuccess: () => {
      setMarked(true)
      toast.success('Lesson marked as complete!')
    },
    // Was previously marking the lesson complete in the UI even when this
    // request failed — the student would see "Completed!" while their
    // actual progress was never saved server-side, with no way to know
    // it hadn't worked. Show the real failure instead.
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Could not save your progress. Please try again.')
    },
  })

  const handleDownload = (d: LessonDownload) => {
    if (!d.url) {
      toast.error('This file is not available right now.')
      return
    }
    window.open(d.url, '_blank', 'noopener,noreferrer')
  }

  if (isLoading) {
    return (
      <div role="status" aria-label="Loading lesson" className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 animate-pulse rounded-lg bg-white/[0.06]" />
          <div className="space-y-1.5">
            <div className="h-2.5 w-24 animate-pulse rounded bg-white/[0.06]" />
            <div className="h-5 w-56 animate-pulse rounded bg-white/[0.06]" />
          </div>
        </div>
        <div className="aspect-video animate-pulse rounded-2xl bg-white/[0.06]" />
      </div>
    )
  }

  const lesson: LessonData = data || {
    title: 'Lesson details not found',
    notes: 'Please check back later.',
    videoUrl: '',
    codeSnippets: '',
    downloads: [],
  }

  const downloads = lesson.downloads ?? []
  const code = lesson.codeSnippets ?? lesson.code ?? '// No code snippets for this lesson.'

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link to="/student/courses" className="btn-ghost p-2" aria-label="Back to courses"><ChevronLeft size={17} /></Link>
        <div>
          <p className="text-xs text-slate-500">Lesson Material</p>
          <h1 className="font-display text-xl font-bold text-white">{lesson.title}</h1>
        </div>
        {marked && (
          <span className="badge badge-green ml-auto flex items-center gap-1">
            <CheckCircle2 size={11} /> Completed
          </span>
        )}
      </div>

      {/* Video */}
      <div className="card overflow-hidden">
        {lesson.videoUrl ? (
          <div className="aspect-video bg-ink-900">
            <iframe
              src={toEmbedUrl(lesson.videoUrl)}
              title={lesson.title}
              className="h-full w-full border-0"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="relative flex aspect-video items-center justify-center bg-ink-900">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full border border-brand-600/40 bg-brand-600/20">
                <Play size={24} className="ml-1 text-brand-400" />
              </div>
              <p className="text-sm text-slate-400">No video file attached to this lesson.</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="card overflow-hidden">
        <div role="tablist" className="flex overflow-x-auto border-b border-white/[0.07]">
          {TABS.map(([id, label, Icon]) => (
            <button key={id} role="tab" id={`tab-${id}`} aria-selected={activeTab === id} aria-controls={`panel-${id}`} onClick={() => setActiveTab(id)}
              className={`-mb-px flex flex-shrink-0 items-center gap-2 border-b-2 px-5 py-3.5 text-sm font-medium transition-colors ${activeTab === id ? 'border-brand-500 text-brand-400' : 'border-transparent text-slate-400 hover:text-white'}`}>
              <Icon size={14} />{label}
            </button>
          ))}
        </div>
        <div className="p-6">
          {activeTab === 'notes' && (
            <div role="tabpanel" id="panel-notes" aria-labelledby="tab-notes" className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
              {lesson.notes || 'No notes available for this lesson.'}
            </div>
          )}
          {activeTab === 'slides' && (
            <div role="tabpanel" id="panel-slides" aria-labelledby="tab-slides" className="flex aspect-video items-center justify-center rounded-xl bg-ink-700">
              <div className="text-center text-slate-500"><Presentation size={32} className="mx-auto mb-2" /><p className="text-sm">Slides will be displayed here</p></div>
            </div>
          )}
          {activeTab === 'code' && (
            <pre role="tabpanel" id="panel-code" aria-labelledby="tab-code" className="overflow-x-auto rounded-xl border border-white/[0.06] bg-[#060C1A] p-5 font-mono text-xs leading-relaxed text-emerald-300">{code}</pre>
          )}
          {activeTab === 'downloads' && (
            <div role="tabpanel" id="panel-downloads" aria-labelledby="tab-downloads" className="space-y-2">
              {downloads.length === 0 ? (
                <p className="text-sm text-slate-500">No downloads associated with this lesson.</p>
              ) : (
                downloads.map((d) => (
                  <div key={d.name} className="flex items-center justify-between rounded-xl bg-ink-700 p-4">
                    <div className="flex items-center gap-3"><FileText size={16} className="text-brand-400" /><span className="text-sm text-white">{d.name}</span><span className="text-xs text-slate-500">{d.size || ''}</span></div>
                    <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => handleDownload(d)}><Download size={13} /> Download</button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mark complete */}
      <div className="card flex items-center justify-between p-4">
        <p className="text-sm text-slate-400">{marked ? "You've completed this lesson." : 'Finished with this lesson?'}</p>
        <button onClick={() => progressMut.mutate()} disabled={progressMut.isPending || marked} className={`btn-primary py-2 text-sm ${marked ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}>
          {progressMut.isPending ? <Loader2 size={14} className="animate-spin" /> : marked ? <><CheckCircle2 size={14} /> Marked Complete</> : 'Mark as Complete'}
        </button>
      </div>
    </div>
  )
}
