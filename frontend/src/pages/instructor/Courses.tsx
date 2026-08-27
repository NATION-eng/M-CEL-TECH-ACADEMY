import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Video, FileText, Brain, Loader2, Edit3, Eye, EyeOff, Archive, Trash2, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { courseAPI } from '../../services/api'
import { useAuthStore } from '../../store/auth.store'
import { useConfirm } from '../../components/ConfirmDialog'
import { CourseFormFields, emptyCourseForm } from '../../components/CourseForm'

export default function InstructorCourses() {
  const user = useAuthStore(s => s.user)
  const qc = useQueryClient()
  const confirm = useConfirm()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyCourseForm)

  const { data: courseData, isLoading } = useQuery({
    queryKey: ['myCourses', user?._id],
    queryFn: async () => {
      const res = await courseAPI.getAll({ instructor: user?._id })
      return res.data.data
    },
    enabled: !!user,
  })

  const courses: any[] = Array.isArray(courseData) ? courseData : (courseData?.courses ?? [])
  const invalidate = () => qc.invalidateQueries({ queryKey: ['myCourses'] })

  const saveMut = useMutation({
    mutationFn: () => {
      const payload = {
        description: form.description, shortDescription: form.shortDescription,
        duration: form.duration, deliveryMode: form.deliveryMode, classSchedule: form.classSchedule,
        ...(editingId ? {} : { title: form.title, department: form.departmentId, price: +form.price || 0, depositPercentage: +form.depositPercentage }),
      }
      return editingId ? courseAPI.update(editingId, payload) : courseAPI.create(payload)
    },
    onSuccess: () => {
      toast.success(editingId ? 'Course updated!' : 'Course created! An admin will review pricing and publish it.')
      setShowForm(false); setEditingId(null); setForm(emptyCourseForm)
      invalidate()
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to save course.'),
  })

  const publishMut = useMutation({
    mutationFn: ({ id, isPublished }: { id: string; isPublished: boolean }) => courseAPI.update(id, { isPublished }),
    onSuccess: (_r, vars) => { toast.success(vars.isPublished ? 'Course published' : 'Course unpublished'); invalidate() },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to update course.'),
  })

  const restoreMut = useMutation({
    mutationFn: (id: string) => courseAPI.restore(id),
    onSuccess: () => { toast.success('Course restored'); invalidate() },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to restore course.'),
  })

  const archiveMut = useMutation({
    mutationFn: (id: string) => courseAPI.archive(id),
    onSuccess: (_res, id) => {
      invalidate()
      toast((t) => (
        <span className="flex items-center gap-3">
          Course archived.
          <button className="text-brand-400 font-medium hover:text-brand-300" onClick={() => { restoreMut.mutate(id); toast.dismiss(t.id) }}>Undo</button>
        </span>
      ))
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to archive course.'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => courseAPI.delete(id),
    onSuccess: () => { toast.success('Course deleted'); invalidate() },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to delete course. If students are enrolled, archive it instead.'),
  })

  const openCreate = () => { setEditingId(null); setForm(emptyCourseForm); setShowForm(true) }
  const openEdit = (c: any) => {
    setEditingId(c._id)
    setForm({
      title: c.title ?? '', departmentId: c.department?._id ?? '', price: String(c.price ?? ''),
      depositPercentage: String(c.depositPercentage ?? 60), deliveryMode: c.deliveryMode ?? 'hybrid',
      description: c.description ?? '', shortDescription: c.shortDescription ?? '', duration: c.duration ?? '',
      classSchedule: Array.isArray(c.classSchedule) ? c.classSchedule.map((s:any) => ({ dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime, mode: s.mode, location: s.location ?? '', meetingLink: s.meetingLink ?? '' })) : [],
    })
    setShowForm(true)
  }

  const handleDelete = async (c: any) => {
    const ok = await confirm({ title: 'Delete this course?', message: `"${c.title}" will be permanently deleted. This only works if no students are enrolled.`, confirmLabel: 'Delete', danger: true })
    if (ok) deleteMut.mutate(c._id)
  }
  const handleArchive = async (c: any) => {
    const ok = await confirm({ title: 'Archive this course?', message: `"${c.title}" will be archived and hidden from students.`, confirmLabel: 'Archive' })
    if (ok) archiveMut.mutate(c._id)
  }

  if (isLoading) {
    return <div className="py-16 flex items-center justify-center text-slate-500"><Loader2 size={22} className="animate-spin mr-2"/> Loading courses...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">My Courses</h1>
          <p className="text-sm text-slate-500 mt-1">Manage curriculum, modules, lessons, and assignments for your assigned tracks.</p>
        </div>
        {!showForm && <button className="btn-primary text-sm shrink-0 self-start sm:self-auto" onClick={openCreate}><Plus size={15}/> New Course</button>}
      </div>

      {showForm && (
        <div className="card p-5 sm:p-6 border-brand-600/30 space-y-4">
          <h2 className="font-display font-semibold text-white">{editingId ? 'Edit Course' : 'Create Course'}</h2>
          <CourseFormFields form={form} setForm={setForm} canEditPricing={!editingId}/>
          <div className="flex flex-wrap gap-3">
            <button className="btn-primary" onClick={()=>saveMut.mutate()} disabled={saveMut.isPending || (!editingId && (!form.title.trim() || !form.departmentId || !form.price))}>
              {saveMut.isPending ? <Loader2 size={14} className="animate-spin"/> : 'Save'}
            </button>
            <button className="btn-ghost" onClick={() => { setShowForm(false); setEditingId(null) }}>Cancel</button>
          </div>
        </div>
      )}

      {courses.length === 0 && !showForm && (
        <div className="card p-12 text-center text-slate-500 text-sm">No courses yet. Create one to get started.</div>
      )}
      {courses.map(course => (
        <div key={course._id} className="card overflow-hidden">
          <div className="p-5 border-b border-white/[0.07] flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="font-display text-lg font-semibold text-white">{course.title}</h2>
                <span className={`badge ${course.isPublished ? 'badge-green' : 'badge-amber'}`}>{course.isPublished ? 'Published' : 'Draft'}</span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1.5">
                <Users size={12}/> {course.enrolledCount ?? 0} students
                {course.deliveryMode ? ` · ${course.deliveryMode}` : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => openEdit(course)} className="btn-ghost text-xs"><Edit3 size={12}/> Edit</button>
              <button onClick={() => publishMut.mutate({ id: course._id, isPublished: !course.isPublished })} disabled={publishMut.isPending} className="btn-ghost text-xs">
                {course.isPublished ? <><EyeOff size={12}/> Unpublish</> : <><Eye size={12}/> Publish</>}
              </button>
              <button onClick={() => handleArchive(course)} className="btn-ghost text-xs"><Archive size={12}/> Archive</button>
              <button onClick={() => handleDelete(course)} className="btn-ghost text-xs text-red-400"><Trash2 size={12}/> Delete</button>
            </div>
          </div>
          <div className="p-5">
            <Link to={`/instructor/courses/${course._id}/manage`} className="btn-primary text-xs"><FileText size={12}/> Manage Content (Lessons, Assignments, Quizzes)</Link>
          </div>
        </div>
      ))}
    </div>
  )
}
