import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronDown, Plus, School, Layers, BookOpen, Calendar, Loader2, LucideIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { curriculumAPI, courseAPI } from '../../services/api'

type NodeType = 'school'|'department'|'badge'|'module'|'week'

// Node types and the endpoint/payload needed to create a child of each.
// 'course' is deliberately excluded â€” courses need price/description/etc,
// which this quick-add tree can't collect, so "add course" just links to
// the full Courses page instead of faking a bare-name create here.
const CREATE_CONFIG: Record<NodeType, { label: string; create: (name: string, parentId: string, extra?: any) => Promise<any> }> = {
  school: { label: 'School', create: (name) => curriculumAPI.createSchool({ name }) },
  department: { label: 'Department', create: (name, parentId) => curriculumAPI.createDepartment({ name, school: parentId }) },
  badge: { label: 'Badge Level', create: (name, parentId, extra) => curriculumAPI.createBadgeLevel({ title: name, level: (extra?.count ?? 0) + 1, course: parentId }) },
  module: { label: 'Module', create: (name, parentId) => curriculumAPI.createModule({ name, badgeLevel: parentId }) },
  week: { label: 'Week', create: (name, parentId) => curriculumAPI.createWeek({ title: name, module: parentId }) },
}

function unwrap(res: any, key: string) {
  const d = res.data.data
  return Array.isArray(d) ? d : (d?.[key] ?? [])
}

interface RowProps {
  icon: LucideIcon
  iconColor: string
  name: string
  addType?: NodeType
  badge?: string
  hasChildren: boolean
  expanded: boolean
  onToggle: () => void
  onAdd?: () => void
  children?: React.ReactNode
}

function Row({ icon: Icon, iconColor, name, badge, hasChildren, expanded, onToggle, onAdd, children }: RowProps) {
  return (
    <div>
      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/[0.03] group cursor-pointer" onClick={onToggle}>
        <div className="flex items-center gap-2.5 min-w-0">
          {hasChildren
            ? (expanded ? <ChevronDown size={13} className="text-slate-500 flex-shrink-0"/> : <ChevronRight size={13} className="text-slate-500 flex-shrink-0"/>)
            : <div className="w-3.5"/>}
          <div className={`w-6 h-6 rounded-md ${iconColor} flex items-center justify-center flex-shrink-0`}>
            <Icon size={12} />
          </div>
          <span className="text-sm text-slate-200 truncate">{name}</span>
          {badge && <span className="badge badge-indigo text-[9px] flex-shrink-0">{badge}</span>}
        </div>
        {onAdd && (
          <button
            onClick={e => { e.stopPropagation(); onAdd() }}
            className="opacity-0 group-hover:opacity-100 btn-ghost p-1 text-slate-500 hover:text-brand-400 transition-opacity"
          >
            <Plus size={13}/>
          </button>
        )}
      </div>
      {expanded && children != null && (
        <div className="ml-5 border-l border-white/[0.06] pl-2">{children}</div>
      )}
    </div>
  )
}

function WeekRow({ week }: { week: any }) {
  const { data: lessons } = useQuery({
    queryKey: ['lessonsCount', week._id],
    queryFn: async () => unwrap(await curriculumAPI.getLessons(week._id), 'lessons'),
  })
  return (
    <Row icon={Calendar} iconColor="bg-slate-600/30 text-slate-400" name={`Week ${week.weekNumber}: ${week.title}`} badge={`${lessons?.length ?? 0} lessons`} hasChildren={false} expanded={false} onToggle={()=>{}}/>
  )
}

function ModuleRow({ mod, expanded, onToggle, setShowAdd }: { mod: any; expanded: boolean; onToggle: () => void; setShowAdd: (v: {type:NodeType;parentId:string;extra?:any}) => void }) {
  const { data: weeks, isLoading } = useQuery({
    queryKey: ['weeks', mod._id],
    enabled: expanded,
    queryFn: async () => unwrap(await curriculumAPI.getWeeks(mod._id), 'weeks'),
  })
  return (
    <Row icon={Layers} iconColor="bg-indigo-600/20 text-indigo-400" name={mod.name} addType="week" hasChildren onAdd={() => setShowAdd({type:'week',parentId:mod._id})} expanded={expanded} onToggle={onToggle}>
      {isLoading ? <div className="py-2 px-3 text-xs text-slate-500 flex items-center gap-2"><Loader2 size={11} className="animate-spin"/> Loading...</div> :
        (weeks ?? []).map((w: any) => <WeekRow key={w._id} week={w}/>)}
      {weeks?.length === 0 && <div className="py-2 px-3 text-xs text-slate-600">No weeks yet.</div>}
    </Row>
  )
}

function BadgeRow({ badgeLevel, expanded, onToggle, setShowAdd }: { badgeLevel: any; expanded: boolean; onToggle: () => void; setShowAdd: (v: {type:NodeType;parentId:string;extra?:any}) => void }) {
  const [openModules, setOpenModules] = useState<Record<string,boolean>>({})
  const { data: modules, isLoading } = useQuery({
    queryKey: ['modules', badgeLevel._id],
    enabled: expanded,
    queryFn: async () => unwrap(await curriculumAPI.getModules(badgeLevel._id), 'modules'),
  })
  return (
    <Row icon={Layers} iconColor="bg-amber-600/20 text-amber-400" name={`Badge ${badgeLevel.level}: ${badgeLevel.title}`} badge={`Level ${badgeLevel.level}`} addType="module" hasChildren onAdd={() => setShowAdd({type:'module',parentId:badgeLevel._id})} expanded={expanded} onToggle={onToggle}>
      {isLoading ? <div className="py-2 px-3 text-xs text-slate-500 flex items-center gap-2"><Loader2 size={11} className="animate-spin"/> Loading...</div> :
        (modules ?? []).map((m: any) => (
          <ModuleRow key={m._id} mod={m} expanded={!!openModules[m._id]} onToggle={() => setOpenModules(o=>({...o,[m._id]:!o[m._id]}))} setShowAdd={setShowAdd}/>
        ))}
      {modules?.length === 0 && <div className="py-2 px-3 text-xs text-slate-600">No modules yet.</div>}
    </Row>
  )
}

function CourseRow({ course, expanded, onToggle, setShowAdd }: { course: any; expanded: boolean; onToggle: () => void; setShowAdd: (v: {type:NodeType;parentId:string;extra?:any}) => void }) {
  const [openBadges, setOpenBadges] = useState<Record<string,boolean>>({})
  const { data: badges, isLoading } = useQuery({
    queryKey: ['badgeLevels', course._id],
    enabled: expanded,
    queryFn: async () => unwrap(await curriculumAPI.getBadgeLevels(course._id), 'badgeLevels'),
  })
  return (
    <Row icon={BookOpen} iconColor="bg-purple-600/20 text-purple-400" name={course.title} addType="badge" hasChildren onAdd={() => setShowAdd({type:'badge',parentId:course._id, extra:{count:(badges ?? []).length}})} expanded={expanded} onToggle={onToggle}>
      {isLoading ? <div className="py-2 px-3 text-xs text-slate-500 flex items-center gap-2"><Loader2 size={11} className="animate-spin"/> Loading...</div> :
        (badges ?? []).map((b: any) => (
          <BadgeRow key={b._id} badgeLevel={b} expanded={!!openBadges[b._id]} onToggle={() => setOpenBadges(o=>({...o,[b._id]:!o[b._id]}))} setShowAdd={setShowAdd}/>
        ))}
      {badges?.length === 0 && <div className="py-2 px-3 text-xs text-slate-600">No badge levels yet.</div>}
    </Row>
  )
}

function DepartmentRow({ dept, expanded, onToggle, onAddCourse, setShowAdd }: { dept: any; expanded: boolean; onToggle: () => void; onAddCourse: () => void; setShowAdd: (v: {type:NodeType;parentId:string;extra?:any}) => void }) {
  const { data: courses, isLoading } = useQuery({
    queryKey: ['coursesByDept', dept._id],
    enabled: expanded,
    queryFn: async () => unwrap(await courseAPI.getAll({ department: dept._id }), 'courses'),
  })
  return (
    <Row icon={Layers} iconColor="bg-cyan-600/20 text-cyan-400" name={dept.name} hasChildren onAdd={onAddCourse} expanded={expanded} onToggle={onToggle}>
      {isLoading ? <div className="py-2 px-3 text-xs text-slate-500 flex items-center gap-2"><Loader2 size={11} className="animate-spin"/> Loading...</div> :
        (courses ?? []).map((c: any) => (
          <CourseRowWrapper key={c._id} course={c} setShowAdd={setShowAdd}/>
        ))}
      {courses?.length === 0 && <div className="py-2 px-3 text-xs text-slate-600">No courses in this department yet.</div>}
    </Row>
  )
}

// Small wrapper so each course row gets its own independent expand/collapse
// state without violating hooks rules inside DepartmentRow's .map().
function CourseRowWrapper({ course, setShowAdd }: { course: any; setShowAdd: (v: {type:NodeType;parentId:string;extra?:any}) => void }) {
  const [open, setOpen] = useState(false)
  return <CourseRow course={course} expanded={open} onToggle={() => setOpen(o=>!o)} setShowAdd={setShowAdd}/>
}

export default function AdminCurriculum() {
  const nav = useNavigate()
  const qc = useQueryClient()
  const [openSchools, setOpenSchools] = useState<Record<string,boolean>>({})
  const [openDepts, setOpenDepts] = useState<Record<string,boolean>>({})
  const [showAdd, setShowAdd] = useState<{type:NodeType;parentId:string;extra?:any}|null>(null)
  const [addName, setAddName] = useState('')

  const { data: schools, isLoading } = useQuery({
    queryKey: ['schools'],
    queryFn: async () => unwrap(await curriculumAPI.getSchools(), 'schools'),
  })

  const addMut = useMutation({
    mutationFn: () => CREATE_CONFIG[showAdd!.type].create(addName, showAdd!.parentId, showAdd!.extra),
    onSuccess: () => {
      toast.success(`${CREATE_CONFIG[showAdd!.type].label} added!`)
      qc.invalidateQueries() // hierarchy spans many query keys â€” simplest correct option here
      setShowAdd(null)
      setAddName('')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to add'),
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Curriculum Management</h1>
          <p className="text-slate-500 text-sm mt-1">Live from the database â€” expand a node to load its children</p>
        </div>
        <button className="btn-primary text-sm" onClick={() => setShowAdd({type:'school',parentId:'root'})}><Plus size={15}/> Add School</button>
      </div>

      <div className="card p-4">
        <p className="text-xs text-slate-500 mb-4 font-mono">// Hover any item and click + to add a child node. Courses need full details â€” use the Courses page.</p>
        {isLoading ? (
          <div className="py-10 flex items-center justify-center text-slate-500"><Loader2 size={18} className="animate-spin mr-2"/> Loading schools...</div>
        ) : (
          <div className="space-y-0.5">
            {(schools ?? []).map((school: any) => (
              <Row
                key={school._id} icon={School} iconColor="bg-brand-600/20 text-brand-400" name={school.name}
                addType="department" hasChildren
                expanded={!!openSchools[school._id]}
                onToggle={() => setOpenSchools(o=>({...o,[school._id]:!o[school._id]}))}
                onAdd={() => setShowAdd({type:'department',parentId:school._id})}
              >
                <DeptListForSchool schoolId={school._id} expanded={!!openSchools[school._id]} openDepts={openDepts} setOpenDepts={setOpenDepts} setShowAdd={setShowAdd} nav={nav}/>
              </Row>
            ))}
            {(schools ?? []).length === 0 && <div className="py-10 text-center text-slate-500 text-sm">No schools yet â€” add one to get started.</div>}
          </div>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card p-6 w-full max-w-sm">
            <h2 className="font-display font-bold text-white mb-4">Add {CREATE_CONFIG[showAdd.type].label}</h2>
            <div><label className="label">Name</label><input className="input" placeholder={`Enter name...`} value={addName} onChange={e=>setAddName(e.target.value)} autoFocus/></div>
            <div className="flex flex-wrap gap-3 mt-5">
              <button className="btn-primary flex-1 justify-center" disabled={!addName.trim() || addMut.isPending} onClick={() => addMut.mutate()}>
                {addMut.isPending ? <Loader2 size={14} className="animate-spin"/> : 'Add'}
              </button>
              <button className="btn-ghost" onClick={() => { setShowAdd(null); setAddName('') }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DeptListForSchool({ schoolId, expanded, openDepts, setOpenDepts, setShowAdd, nav }: any) {
  const { data: departments, isLoading } = useQuery({
    queryKey: ['departments', schoolId],
    enabled: expanded,
    queryFn: async () => unwrap(await curriculumAPI.getDepartments(schoolId), 'departments'),
  })
  if (isLoading) return <div className="py-2 px-3 text-xs text-slate-500 flex items-center gap-2"><Loader2 size={11} className="animate-spin"/> Loading...</div>
  if ((departments ?? []).length === 0) return <div className="py-2 px-3 text-xs text-slate-600">No departments yet.</div>
  return (
    <>
      {departments.map((dept: any) => (
        <DepartmentRow
          key={dept._id} dept={dept}
          expanded={!!openDepts[dept._id]}
          onToggle={() => setOpenDepts((o: any) => ({...o,[dept._id]:!o[dept._id]}))}
          onAddCourse={() => nav('/admin/courses')}
          setShowAdd={setShowAdd}
        />
      ))}
    </>
  )
}

