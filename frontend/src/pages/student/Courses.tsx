import { useState } from 'react'
import { ChevronRight, ChevronDown, Play, Lock, CheckCircle2, BookOpen } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { enrollmentAPI } from '../../services/api'
import { Button, Badge, ProgressBar, EmptyState, CourseCardSkeleton } from '../../components/ui'

interface Lesson {
  _id: string
  title: string
  completed?: boolean
  isLocked?: boolean
  duration?: string
}
interface Week {
  _id?: string
  num?: number
  title: string
  completed?: boolean
  lessons?: Lesson[]
}
interface ClassSlot {
  dayOfWeek: string
  startTime: string
  endTime: string
  mode: 'online' | 'physical'
  location?: string
}
interface Enrollment {
  _id: string
  progress?: number
  currentBadge?: { title?: string }
  badgeLevel?: { title?: string }
  course?: {
    _id?: string
    title?: string
    classSchedule?: ClassSlot[]
    weeks?: Week[]
  }
  weeks?: Week[]
}

export default function StudentCourses() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const { data, isLoading } = useQuery({
    queryKey: ['myEnrollments'],
    queryFn: async () => {
      const res = await enrollmentAPI.mine()
      return res.data.data
    },
  })

  const enrollments: Enrollment[] = Array.isArray(data) ? data : (data?.enrollments ?? [])

  if (isLoading) {
    return (
      <div role="status" aria-label="Loading courses" className="space-y-6">
        <div className="h-7 w-40 animate-pulse rounded bg-white/[0.06]" />
        <CourseCardSkeleton />
        <CourseCardSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-white">My Courses</h1>

      {enrollments.length === 0 && (
        <EmptyState
          icon={BookOpen}
          title="No enrollments yet"
          description="Browse our programs and enroll to get started."
          action={<Button to="/programs" className="text-sm">Browse Programs</Button>}
        />
      )}

      {enrollments.map((enrollment) => {
        const course = enrollment.course ?? {}
        const progress = enrollment.progress ?? 0
        const badge = enrollment.currentBadge ?? enrollment.badgeLevel
        const badgeTitle = badge?.title ?? 'Badge 1'
        const weeks = enrollment.weeks ?? course.weeks ?? []
        const courseTitle = course.title ?? '—'

        return (
          <div key={enrollment._id} className="card overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-blue-600 to-indigo-600" />
            <div className="p-6">
              <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="font-display text-lg font-bold text-white">{courseTitle}</h2>
                  <Badge color="indigo">{badgeTitle}</Badge>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-mono text-sm font-bold text-brand-400">{progress}%</div>
                    <div className="text-[10px] text-slate-500">complete</div>
                  </div>
                  <div className="w-20">
                    <ProgressBar value={progress} label={`${courseTitle} progress`} />
                  </div>
                </div>
              </div>

              {Array.isArray(course.classSchedule) && course.classSchedule.length > 0 && (
                <div className="mb-5 flex flex-wrap gap-2">
                  {course.classSchedule.map((slot, i) => (
                    <span key={i} className="badge badge-cyan text-[10px] normal-case">
                      {slot.dayOfWeek[0].toUpperCase() + slot.dayOfWeek.slice(1)} {slot.startTime}–{slot.endTime} · {slot.mode === 'online' ? 'Online' : slot.location || 'On-site'}
                    </span>
                  ))}
                </div>
              )}

              {weeks.length > 0 ? (
                <div className="space-y-2">
                  {weeks.map((week, idx) => {
                    const weekId = week._id ?? `w${idx}`
                    const lessons = week.lessons ?? []
                    const isExpanded = !!expanded[weekId]
                    return (
                      <div key={weekId} className="overflow-hidden rounded-xl border border-white/[0.07]">
                        <button
                          onClick={() => setExpanded((e) => ({ ...e, [weekId]: !e[weekId] }))}
                          aria-expanded={isExpanded}
                          aria-controls={`week-${weekId}-lessons`}
                          className="flex w-full items-center justify-between px-5 py-3.5 transition-colors hover:bg-white/[0.03]"
                        >
                          <div className="flex items-center gap-3">
                            {week.completed ? (
                              <CheckCircle2 size={16} className="text-emerald-400" />
                            ) : (
                              <div className="h-4 w-4 rounded-full border border-slate-600" />
                            )}
                            <span className="text-sm font-medium text-white">Week {week.num ?? idx + 1}: {week.title}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-500">{lessons.length} lessons</span>
                            {isExpanded ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
                          </div>
                        </button>
                        {isExpanded && lessons.length > 0 && (
                          <div id={`week-${weekId}-lessons`} className="divide-y divide-white/[0.05] border-t border-white/[0.07]">
                            {lessons.map((lesson) => (
                              <Link
                                key={lesson._id}
                                to={`/student/courses/${course._id}/lesson/${lesson._id}`}
                                className="group flex items-center gap-4 px-5 py-3 transition-colors hover:bg-white/[0.03]"
                              >
                                <div className="flex-shrink-0">
                                  {lesson.completed ? (
                                    <CheckCircle2 size={15} className="text-emerald-400" />
                                  ) : lesson.isLocked ? (
                                    <Lock size={13} className="text-slate-600" />
                                  ) : (
                                    <Play size={14} className="text-brand-400" />
                                  )}
                                </div>
                                <span className={`flex-1 text-sm ${lesson.completed ? 'text-slate-400 line-through' : 'text-slate-200 group-hover:text-white'}`}>
                                  {lesson.title}
                                </span>
                                <span className="text-xs text-slate-600">{lesson.duration ?? ''}</span>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Curriculum content will appear here once your instructor publishes lessons.</p>
              )}
            </div>
          </div>
        )
      })}

      <div className="card border-dashed p-8 text-center">
        <BookOpen size={32} className="mx-auto mb-3 text-slate-600" />
        <h3 className="mb-1 font-semibold text-white">Enroll in another program</h3>
        <p className="mb-4 text-sm text-slate-500">Expand your skills with a second track</p>
        <Button to="/programs" variant="outline" className="text-sm">Browse Programs</Button>
      </div>
    </div>
  )
}
