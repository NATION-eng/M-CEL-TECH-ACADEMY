import { useState } from 'react'
import { Plus, Loader2, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { curriculumAPI } from '../services/api'

export type ScheduleSlot = { dayOfWeek: string; startTime: string; endTime: string; mode: string; location: string; meetingLink: string }
export const emptySlot: ScheduleSlot = { dayOfWeek: 'monday', startTime: '10:00', endTime: '12:00', mode: 'physical', location: '', meetingLink: '' }
export const emptyCourseForm = { title:'', departmentId:'', price:'', depositPercentage:'60', deliveryMode:'hybrid', description:'', shortDescription:'', duration:'', classSchedule: [] as ScheduleSlot[] }
export type CourseFormState = typeof emptyCourseForm

/** School -> Department picker with inline quick-create, since Course.department is a required ref. */
function DepartmentPicker({ departmentId, onSelect }: { departmentId: string; onSelect: (id: string) => void }) {
  const qc = useQueryClient()
  const [schoolId, setSchoolId] = useState('')
  const [newSchoolName, setNewSchoolName] = useState('')
  const [newDeptName, setNewDeptName] = useState('')

  const { data: schools = [] } = useQuery({
    queryKey: ['schools'],
    queryFn: async () => {
      const res = await curriculumAPI.getSchools()
      const d = res.data.data
      return Array.isArray(d) ? d : (d?.schools ?? [])
    },
  })

  const { data: departments = [] } = useQuery({
    queryKey: ['departments', schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const res = await curriculumAPI.getDepartments(schoolId)
      const d = res.data.data
      return Array.isArray(d) ? d : (d?.departments ?? [])
    },
  })

  const createSchoolM = useMutation({
    mutationFn: () => curriculumAPI.createSchool({ name: newSchoolName }),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ['schools'] }); setSchoolId(res.data.data._id); setNewSchoolName('') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not create school'),
  })

  const createDeptM = useMutation({
    mutationFn: () => curriculumAPI.createDepartment({ name: newDeptName, school: schoolId }),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ['departments', schoolId] }); onSelect(res.data.data._id); setNewDeptName('') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not create department'),
  })

  return (
    <div className="space-y-3">
      <div>
        <label className="label">School</label>
        <select className="input" value={schoolId} onChange={e => { setSchoolId(e.target.value); onSelect('') }}>
          <option value="">Select school...</option>
          {schools.map((s:any) => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        <div className="flex gap-2 mt-2">
          <input className="input text-sm" placeholder="Or create new school..." value={newSchoolName} onChange={e=>setNewSchoolName(e.target.value)}/>
          <button type="button" className="btn-ghost text-xs shrink-0" disabled={!newSchoolName.trim() || createSchoolM.isPending} onClick={() => createSchoolM.mutate()}>
            {createSchoolM.isPending ? <Loader2 size={13} className="animate-spin"/> : <Plus size={13}/>}
          </button>
        </div>
      </div>
      {schoolId && (
        <div>
          <label className="label">Department</label>
          <select className="input" value={departmentId} onChange={e => onSelect(e.target.value)}>
            <option value="">Select department...</option>
            {departments.map((d:any) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
          <div className="flex gap-2 mt-2">
            <input className="input text-sm" placeholder="Or create new department..." value={newDeptName} onChange={e=>setNewDeptName(e.target.value)}/>
            <button type="button" className="btn-ghost text-xs shrink-0" disabled={!newDeptName.trim() || createDeptM.isPending} onClick={() => createDeptM.mutate()}>
              {createDeptM.isPending ? <Loader2 size={13} className="animate-spin"/> : <Plus size={13}/>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

interface CourseFormFieldsProps {
  form: CourseFormState
  setForm: (f: CourseFormState) => void
  /** Admins/super_admins can set title, department, and pricing. Instructors
   * editing a course they teach see those as read-only — pricing changes on
   * a course with real students enrolled is a business decision, not
   * something any assigned instructor should be able to do unilaterally. */
  canEditPricing?: boolean
}

export function CourseFormFields({ form, setForm, canEditPricing = true }: CourseFormFieldsProps) {
  const depositAmt = form.price ? Math.ceil((+form.price * +form.depositPercentage) / 100) : 0
  return (
    <div className="space-y-3">
      {canEditPricing ? (
        <>
          <div><label className="label">Course Title</label><input className="input" placeholder="e.g. Software Development" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></div>
          <DepartmentPicker departmentId={form.departmentId} onSelect={(id) => setForm({...form, departmentId: id})}/>
        </>
      ) : (
        <div className="bg-ink-700/40 rounded-lg p-3 text-xs text-slate-400">
          Title, department, and pricing are managed by an administrator. Contact admin to change these.
        </div>
      )}
      <div><label className="label">Short Description (shown in course cards)</label><input className="input" placeholder="One-line summary..." value={form.shortDescription} onChange={e=>setForm({...form,shortDescription:e.target.value})}/></div>
      <div><label className="label">Full Description</label><textarea className="input h-20 resize-none" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></div>
      {canEditPricing && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Course Fee (₦)</label><input type="number" className="input" placeholder="150000" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/></div>
            <div><label className="label">Deposit % (min 50%)</label><input type="number" min={50} max={100} className="input" value={form.depositPercentage} onChange={e=>setForm({...form,depositPercentage:e.target.value})}/></div>
          </div>
          {depositAmt > 0 && <p className="text-xs text-emerald-400">Minimum deposit: ₦{depositAmt.toLocaleString()}</p>}
        </>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Duration</label><input className="input" placeholder="e.g. 12 weeks" value={form.duration} onChange={e=>setForm({...form,duration:e.target.value})}/></div>
        <div><label className="label">Delivery Mode</label>
          <select className="input" value={form.deliveryMode} onChange={e=>setForm({...form,deliveryMode:e.target.value})}>
            <option value="hybrid">Physical + Online</option><option value="physical">Physical Only</option><option value="online">Online Only</option>
          </select>
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="label !mb-0">Class Schedule</label>
          <button type="button" className="btn-ghost text-xs py-1" onClick={() => setForm({...form, classSchedule: [...form.classSchedule, { ...emptySlot }]})}>
            <Plus size={12}/> Add Session
          </button>
        </div>
        {form.classSchedule.length === 0 && <p className="text-xs text-slate-500">No recurring sessions set yet.</p>}
        <div className="space-y-2">
          {form.classSchedule.map((slot, i) => (
            <div key={i} className="bg-ink-700/40 rounded-lg p-3 space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <select className="input text-xs py-1.5" value={slot.dayOfWeek} onChange={e => {
                  const next = [...form.classSchedule]; next[i] = { ...slot, dayOfWeek: e.target.value }; setForm({...form, classSchedule: next})
                }}>
                  {['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].map(d => <option key={d} value={d}>{d[0].toUpperCase()+d.slice(1)}</option>)}
                </select>
                <input type="time" className="input text-xs py-1.5" value={slot.startTime} onChange={e => {
                  const next = [...form.classSchedule]; next[i] = { ...slot, startTime: e.target.value }; setForm({...form, classSchedule: next})
                }}/>
                <input type="time" className="input text-xs py-1.5" value={slot.endTime} onChange={e => {
                  const next = [...form.classSchedule]; next[i] = { ...slot, endTime: e.target.value }; setForm({...form, classSchedule: next})
                }}/>
              </div>
              <div className="flex gap-2">
                <select className="input text-xs py-1.5 w-28 shrink-0" value={slot.mode} onChange={e => {
                  const next = [...form.classSchedule]; next[i] = { ...slot, mode: e.target.value }; setForm({...form, classSchedule: next})
                }}>
                  <option value="physical">Physical</option>
                  <option value="online">Online</option>
                </select>
                <input
                  className="input text-xs py-1.5 flex-1"
                  placeholder={slot.mode === 'online' ? 'Meeting link (Zoom, Meet...)' : 'Location'}
                  value={slot.mode === 'online' ? slot.meetingLink : slot.location}
                  onChange={e => {
                    const next = [...form.classSchedule]
                    next[i] = slot.mode === 'online' ? { ...slot, meetingLink: e.target.value } : { ...slot, location: e.target.value }
                    setForm({...form, classSchedule: next})
                  }}
                />
                <button type="button" className="btn-ghost text-xs px-2 text-red-400" onClick={() => setForm({...form, classSchedule: form.classSchedule.filter((_,idx) => idx!==i)})}>
                  <Trash2 size={13}/>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
