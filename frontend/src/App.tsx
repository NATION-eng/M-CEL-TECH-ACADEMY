import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from './store/auth.store'

// Layouts stay eager — they're the app chrome, needed on every navigation
// within a portal, so lazy-loading them would just add flicker for no gain.
import PublicLayout from './components/layout/PublicLayout'
import StudentLayout from './components/layout/StudentLayout'
import InstructorLayout from './components/layout/InstructorLayout'
import AdminLayout from './components/layout/AdminLayout'
import SuperAdminLayout from './components/layout/SuperAdminLayout'
import PWAInstallBanner from './components/common/PWAInstallBanner'

// Every page below is lazy-loaded. Previously all ~48 pages across all four
// portals were bundled into a single ~965KB chunk, so a first-time visitor
// landing on the public homepage downloaded the entire student, instructor,
// admin, and super-admin portals before seeing anything. Splitting per-route
// means each portal (and each page within it) only loads when actually
// visited — the homepage now only pulls homepage code.

// Public pages
const HomePage = lazy(() => import('./pages/public/HomePage'))
const AboutPage = lazy(() => import('./pages/public/AboutPage'))
const ProgramsPage = lazy(() => import('./pages/public/ProgramsPage'))
const AdmissionsPage = lazy(() => import('./pages/public/AdmissionsPage'))
const AdmissionsVerifyPage = lazy(() => import('./pages/public/AdmissionsVerifyPage'))
const EventsPage = lazy(() => import('./pages/public/EventsPage'))
const BlogPage = lazy(() => import('./pages/public/BlogPage'))
const BlogPostPage = lazy(() => import('./pages/public/BlogPostPage'))
const ContactPage = lazy(() => import('./pages/public/ContactPage'))
const LoginPage = lazy(() => import('./pages/public/LoginPage'))
const RegisterPage = lazy(() => import('./pages/public/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('./pages/public/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/public/ResetPasswordPage'))
const VerifyCertPage = lazy(() => import('./pages/public/VerifyCertPage'))

// Student
const StudentDashboard = lazy(() => import('./pages/student/Dashboard'))
const StudentCourses = lazy(() => import('./pages/student/Courses'))
const StudentLesson = lazy(() => import('./pages/student/Lesson'))
const StudentAssignments = lazy(() => import('./pages/student/Assignments'))
const StudentQuizzes = lazy(() => import('./pages/student/Quizzes'))
const StudentProjects = lazy(() => import('./pages/student/Projects'))
const StudentAnnouncements = lazy(() => import('./pages/student/Announcements'))
const StudentCertificates = lazy(() => import('./pages/student/Certificates'))
const StudentResources = lazy(() => import('./pages/student/Resources'))
const StudentPayments = lazy(() => import('./pages/student/Payments'))
const PaymentLocked = lazy(() => import('./pages/student/PaymentLocked'))
const StudentProfile = lazy(() => import('./pages/student/Profile'))
const Messages = lazy(() => import('./pages/shared/Messages'))

// Instructor
const InstructorDashboard = lazy(() => import('./pages/instructor/Dashboard'))
const InstructorCourses = lazy(() => import('./pages/instructor/Courses'))
const InstructorResources = lazy(() => import('./pages/instructor/Resources'))
const InstructorAttendance = lazy(() => import('./pages/instructor/Attendance'))
const InstructorGrades = lazy(() => import('./pages/instructor/Grades'))
const InstructorStudents = lazy(() => import('./pages/instructor/Students'))
const InstructorProfile = lazy(() => import('./pages/instructor/Profile'))
const InstructorAnnouncements = lazy(() => import('./pages/instructor/Announcements'))
const InstructorProjects = lazy(() => import('./pages/instructor/Projects'))
const InstructorReports = lazy(() => import('./pages/instructor/Reports'))
const InstructorLessonEditor = lazy(() => import('./pages/instructor/LessonEditor'))
const InstructorAssignmentEditor = lazy(() => import('./pages/instructor/AssignmentEditor'))
const InstructorQuizEditor = lazy(() => import('./pages/instructor/QuizEditor'))
const InstructorCourseManage = lazy(() => import('./pages/instructor/CourseManage'))

// Admin
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'))
const AdminStudents = lazy(() => import('./pages/admin/Students'))
const AdminStudentDetail = lazy(() => import('./pages/admin/StudentDetail'))
const AdminInstructors = lazy(() => import('./pages/admin/Instructors'))
const AdminCourses = lazy(() => import('./pages/admin/Courses'))
const AdminCurriculum = lazy(() => import('./pages/admin/Curriculum'))
const AdminCertificates = lazy(() => import('./pages/admin/Certificates'))
const AdminPayments = lazy(() => import('./pages/admin/Payments'))
const AdminContent = lazy(() => import('./pages/admin/Content'))
const AdminEvents = lazy(() => import('./pages/admin/Events'))
const AdminAuditLogs = lazy(() => import('./pages/admin/AuditLogs'))
const AdminReports = lazy(() => import('./pages/admin/Reports'))

// Super Admin
const SuperAdminDashboard = lazy(() => import('./pages/superadmin/Dashboard'))
const SuperAdminUsers = lazy(() => import('./pages/superadmin/Users'))
const SuperAdminSettings = lazy(() => import('./pages/superadmin/Settings'))

const Guard = ({ children, roles }: { children: React.ReactNode; roles: string[] }) => {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!user || !roles.includes(user.role)) return <Navigate to="/unauthorized" replace />
  return <>{children}</>
}

const RoleRedirect = () => {
  const { user, isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  const map: Record<string, string> = { student:'/student/dashboard', instructor:'/instructor/dashboard', admin:'/admin/dashboard', super_admin:'/superadmin/dashboard' }
  return <Navigate to={map[user?.role ?? ''] ?? '/login'} replace />
}

// Small, centered spinner shown only during the brief gap while a route's
// JS chunk downloads — invisible on repeat visits once the chunk is cached.
const RouteFallback = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <Loader2 size={28} className="animate-spin text-brand-400" />
  </div>
)

// PaymentVerify.tsx exports two named components rather than a default —
// wrap each in its own lazy() using the shared module import so it's only
// fetched once despite two lazy() calls.
const PaystackVerifyPage = lazy(() => import('./pages/student/PaymentVerify').then(m => ({ default: m.PaystackVerifyPage })))
const FlutterwaveVerifyPage = lazy(() => import('./pages/student/PaymentVerify').then(m => ({ default: m.FlutterwaveVerifyPage })))

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/programs" element={<ProgramsPage />} />
        <Route path="/admissions" element={<AdmissionsPage />} />
        <Route path="/admissions/verify" element={<AdmissionsVerifyPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/:slug" element={<BlogPostPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/verify/:certNumber" element={<VerifyCertPage />} />
      </Route>

      <Route path="/login" element={<LoginPage />} />
      <Route path="/instructor/login" element={<LoginPage portal="instructor" />} />
      <Route path="/admin/login" element={<LoginPage portal="admin" />} />
      <Route path="/superadmin/login" element={<LoginPage portal="super_admin" />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      <Route path="/portal" element={<RoleRedirect />} />
      <Route path="/payment/verify" element={<Guard roles={['student','admin','super_admin']}><PaystackVerifyPage /></Guard>} />
      <Route path="/payment/flw-verify" element={<Guard roles={['student','admin','super_admin']}><FlutterwaveVerifyPage /></Guard>} />
      <Route path="/student/payment-locked" element={<Guard roles={['student']}><PaymentLocked /></Guard>} />

      <Route path="/student" element={<Guard roles={['student']}><StudentLayout /></Guard>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="courses" element={<StudentCourses />} />
        <Route path="courses/:courseId/lesson/:lessonId" element={<StudentLesson />} />
        <Route path="assignments" element={<StudentAssignments />} />
        <Route path="quizzes" element={<StudentQuizzes />} />
        <Route path="projects" element={<StudentProjects />} />
        <Route path="announcements" element={<StudentAnnouncements />} />
        <Route path="certificates" element={<StudentCertificates />} />
        <Route path="messages" element={<Messages />} />
        <Route path="resources" element={<StudentResources />} />
        <Route path="payments" element={<StudentPayments />} />
        <Route path="profile" element={<StudentProfile />} />
      </Route>

      <Route path="/instructor" element={<Guard roles={['instructor','admin','super_admin']}><InstructorLayout /></Guard>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<InstructorDashboard />} />
        <Route path="courses" element={<InstructorCourses />} />
        <Route path="resources" element={<InstructorResources />} />
        <Route path="courses/:courseId/lessons/new" element={<InstructorLessonEditor />} />
        <Route path="courses/:courseId/lessons/:lessonId/edit" element={<InstructorLessonEditor />} />
        <Route path="courses/:courseId/assignments/new" element={<InstructorAssignmentEditor />} />
        <Route path="courses/:courseId/assignments/:assignmentId/edit" element={<InstructorAssignmentEditor />} />
        <Route path="courses/:courseId/quizzes/new" element={<InstructorQuizEditor />} />
        <Route path="courses/:courseId/quizzes/:quizId/edit" element={<InstructorQuizEditor />} />
        <Route path="courses/:courseId/manage" element={<InstructorCourseManage />} />
        <Route path="attendance" element={<InstructorAttendance />} />
        <Route path="grades" element={<InstructorGrades />} />
        <Route path="students" element={<InstructorStudents />} />
        <Route path="profile" element={<InstructorProfile />} />
        <Route path="announcements" element={<InstructorAnnouncements />} />
        <Route path="projects" element={<InstructorProjects />} />
        <Route path="reports" element={<InstructorReports />} />
        <Route path="messages" element={<Messages />} />
      </Route>

      <Route path="/admin" element={<Guard roles={['admin','super_admin']}><AdminLayout /></Guard>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="students" element={<AdminStudents />} />
        <Route path="students/:id" element={<AdminStudentDetail />} />
        <Route path="instructors" element={<AdminInstructors />} />
        <Route path="courses" element={<AdminCourses />} />
        <Route path="curriculum" element={<AdminCurriculum />} />
        <Route path="certificates" element={<AdminCertificates />} />
        <Route path="payments" element={<AdminPayments />} />
        <Route path="announcements" element={<AdminContent />} />
        <Route path="events" element={<AdminEvents />} />
        <Route path="blog" element={<AdminContent />} />
        <Route path="content" element={<AdminContent />} />
        <Route path="audit-logs" element={<AdminAuditLogs />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="messages" element={<Messages />} />
      </Route>

      <Route path="/superadmin" element={<Guard roles={['super_admin']}><SuperAdminLayout /></Guard>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<SuperAdminDashboard />} />
        <Route path="users" element={<SuperAdminUsers />} />
        <Route path="settings" element={<SuperAdminSettings />} />
        <Route path="messages" element={<Messages />} />
      </Route>

      <Route path="/unauthorized" element={
        <div className="min-h-screen flex items-center justify-center bg-ink-900">
          <div className="text-center">
            <h2 className="text-2xl font-display font-bold text-white mb-2">Access Denied</h2>
            <p className="text-slate-400 mb-6">You don't have permission to view this page.</p>
            <a href="/" className="btn-primary">Back to Home</a>
          </div>
        </div>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    <PWAInstallBanner />
    </Suspense>
  )
}
