import axios from 'axios'
import { useAuthStore } from '../store/auth.store'

const api = axios.create({ baseURL: '/api/v1', headers: { 'Content-Type': 'application/json' }, timeout: 30000 })

api.interceptors.request.use(cfg => {
  const t = useAuthStore.getState().accessToken
  if (t) cfg.headers.Authorization = `Bearer ${t}`
  return cfg
})

api.interceptors.response.use(r => r, async err => {
  const orig = err?.config || {}
  const url = orig.url || ''
  const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/refresh') || url.includes('/auth/forgot-password') || url.includes('/auth/reset-password')

  if (err.response?.status === 402 && err.response?.data?.paymentRequired) {
    // Overdue balance — hard-lock the UI to the payment screen. Store the
    // detail so the lockout page can render it without another round trip.
    sessionStorage.setItem('paymentLockInfo', JSON.stringify(err.response.data))
    if (window.location.pathname !== '/student/payment-locked') {
      window.location.href = '/student/payment-locked'
    }
    return Promise.reject(err)
  }

  if (err.response?.status === 401 && !orig._retry && !isAuthEndpoint) {
    orig._retry = true
    const rt = useAuthStore.getState().refreshToken
    if (!rt) {
      if (useAuthStore.getState().isAuthenticated) {
        useAuthStore.getState().clearAuth()
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login'
        }
      }
      return Promise.reject(err)
    }
    try {
      const { data } = await axios.post('/api/v1/auth/refresh', { refreshToken: rt })
      const { accessToken, refreshToken } = data.data
      useAuthStore.getState().setAuth(useAuthStore.getState().user!, accessToken, refreshToken)
      orig.headers.Authorization = `Bearer ${accessToken}`
      return api(orig)
    } catch {
      useAuthStore.getState().clearAuth()
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }
  }
  return Promise.reject(err)
})

export const authAPI = {
  register: (d: Record<string,string>) => api.post('/auth/register', d),
  login: (email: string, password: string, rememberMe?: boolean) => api.post('/auth/login', { email, password, rememberMe }),
  google: (credential: string) => api.post('/auth/google', { credential }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  changePassword: (d: Record<string,string>) => api.patch('/auth/change-password', d),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) => api.post('/auth/reset-password', { token, newPassword }),
}
export const courseAPI = {
  getAll: (p?: Record<string,unknown>) => api.get('/courses', { params: p }),
  getOne: (id: string) => api.get(`/courses/${id}`),
  create: (d: unknown) => api.post('/courses', d),
  update: (id: string, d: unknown) => api.put(`/courses/${id}`, d),
  archive: (id: string, reason?: string) => api.patch(`/courses/${id}/archive`, { reason }),
  restore: (id: string) => api.patch(`/courses/${id}/restore`),
  delete: (id: string) => api.delete(`/courses/${id}`),
}
export const curriculumAPI = {
  getSchools: () => api.get('/schools'),
  createSchool: (d: unknown) => api.post('/schools', d),
  getDepartments: (sid?: string) => api.get('/departments', { params: { school: sid } }),
  createDepartment: (d: unknown) => api.post('/departments', d),
  getBadgeLevels: (cid: string) => api.get('/badge-levels', { params: { course: cid } }),
  createBadgeLevel: (d: unknown) => api.post('/badge-levels', d),
  getModules: (bid: string) => api.get('/modules', { params: { badgeLevel: bid } }),
  createModule: (d: unknown) => api.post('/modules', d),
  getWeeks: (mid: string) => api.get('/weeks', { params: { module: mid } }),
  createWeek: (d: unknown) => api.post('/weeks', d),
  getLessons: (wid: string) => api.get('/lessons', { params: { week: wid } }),
  getLesson: (id: string) => api.get(`/lessons/${id}`),
  createLesson: (d: unknown) => api.post('/lessons', d),
  updateLesson: (id: string, d: unknown) => api.put(`/lessons/${id}`, d),
  addLessonDownload: (id: string, fd: FormData) => api.post(`/lessons/${id}/downloads`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
}
export const enrollmentAPI = {
  enroll: (d: unknown) => api.post('/enrollments', d),
  mine: () => api.get('/enrollments/my-enrollments'),
  one: (id: string) => api.get(`/enrollments/${id}`),
  progress: (id: string, d: unknown) => api.patch(`/enrollments/${id}/progress`, d),
  all: (p?: Record<string,unknown>) => api.get('/enrollments', { params: p }),
}
export const assignmentAPI = {
  forCourse: (cid: string) => api.get('/assignments', { params: { course: cid } }),
  one: (id: string) => api.get(`/assignments/${id}`),
  create: (d: unknown) => api.post('/assignments', d),
  update: (id: string, d: unknown) => api.put(`/assignments/${id}`, d),
  submit: (id: string, d: FormData) => api.post(`/submissions/${id}`, d, { headers: { 'Content-Type': 'multipart/form-data' } }),
  grade: (id: string, d: unknown) => api.patch(`/submissions/${id}/grade`, d),
  mySubmissions: () => api.get('/submissions/my-submissions'),
  allSubmissions: (p?: Record<string,unknown>) => api.get('/submissions', { params: p }),
}
export const quizAPI = {
  forCourse: (cid: string) => api.get('/quizzes', { params: { course: cid } }),
  one: (id: string) => api.get(`/quizzes/${id}`),
  create: (d: unknown) => api.post('/quizzes', d),
  update: (id: string, d: unknown) => api.put(`/quizzes/${id}`, d),
  attempt: (id: string) => api.post(`/quizzes/${id}/attempt`),
  submit: (aid: string, d: unknown) => api.post(`/quizzes/attempts/${aid}/submit`, d),
  myAttempts: () => api.get('/quizzes/my-attempts'),
}
export const attendanceAPI = {
  mark: (d: unknown) => api.post('/attendance', d),
  forCourse: (cid: string) => api.get('/attendance', { params: { course: cid } }),
  mine: () => api.get('/attendance/my-attendance'),
  report: (cid: string) => api.get(`/attendance/report/${cid}`),
}
export const certificateAPI = {
  mine: () => api.get('/certificates/my-certificates'),
  issue: (d: unknown) => api.post('/certificates', d),
  eligibility: (courseId: string, studentId?: string) => api.get(`/certificates/eligibility/${courseId}`, { params: studentId ? { studentId } : undefined }),
  verify: (n: string) => api.get(`/certificates/verify/${n}`),
  revoke: (id: string, reason: string) => api.patch(`/certificates/${id}/revoke`, { reason }),
  all: () => api.get('/certificates'),
  downloadCertificate: (id: string) => api.get(`/certificates/${id}/download`, { responseType: 'blob' }),
}
export const paymentAPI = {
  initPaystack: (d: unknown) => api.post('/payments/paystack/initialize', d),
  verifyPaystack: (ref: string) => api.get(`/payments/paystack/verify/${ref}`),
  initFlutterwave: (d: unknown) => api.post('/payments/flutterwave/initialize', d),
  verifyFlutterwave: (transactionId: string) => api.get(`/payments/flutterwave/verify/${transactionId}`),
  mine: () => api.get('/payments/my-payments'),
  all: (p?: Record<string,unknown>) => api.get('/payments', { params: p }),
  summary: () => api.get('/payments/financial-summary'),
  exportCsv: (params?: Record<string,unknown>) => api.get('/payments/export', { params, responseType: 'blob' }),
  // Built for use as an <a href> / window.open target — auth header is attached
  // via axios elsewhere, but a direct link needs the token appended for the
  // browser's native download, so callers should use downloadReceipt() instead.
  receiptUrl: (paymentId: string, txRef: string) => `/api/v1/payments/${paymentId}/receipt/${txRef}`,
  downloadReceipt: (paymentId: string, txRef: string) =>
    api.get(`/payments/${paymentId}/receipt/${txRef}`, { responseType: 'blob' }),
}
export const userAPI = {
  all: (p?: Record<string,unknown>) => api.get('/users', { params: p }),
  one: (id: string) => api.get(`/users/${id}`),
  create: (d: unknown) => api.post('/users', d),
  update: (id: string, d: unknown) => api.put(`/users/${id}`, d),
  suspend: (id: string) => api.patch(`/users/${id}/suspend`),
  activate: (id: string) => api.patch(`/users/${id}/activate`),
  remove: (id: string) => api.delete(`/users/${id}`),
}
export const announcementAPI = {
  all: () => api.get('/announcements'),
  manage: (p?: Record<string,unknown>) => api.get('/announcements/manage', { params: p }),
  create: (d: unknown) => api.post('/announcements', d),
  update: (id: string, d: unknown) => api.put(`/announcements/${id}`, d),
  archive: (id: string, reason?: string) => api.patch(`/announcements/${id}/archive`, { reason }),
  restore: (id: string) => api.patch(`/announcements/${id}/restore`),
  remove: (id: string) => api.delete(`/announcements/${id}`),
}
export const eventAPI = {
  all: (p?: Record<string,unknown>) => api.get('/events', { params: p }),
  one: (id: string) => api.get(`/events/${id}`),
  create: (d: unknown) => api.post('/events', d),
  update: (id: string, d: unknown) => api.put(`/events/${id}`, d),
  remove: (id: string) => api.delete(`/events/${id}`),
}
export const blogAPI = {
  all: (p?: Record<string,unknown>) => api.get('/blog', { params: p }),
  one: (slug: string) => api.get(`/blog/${slug}`),
  create: (d: unknown) => api.post('/blog', d),
  update: (id: string, d: unknown) => api.put(`/blog/${id}`, d),
  archive: (id: string, reason?: string) => api.patch(`/blog/${id}/archive`, { reason }),
  restore: (id: string) => api.patch(`/blog/${id}/restore`),
  remove: (id: string) => api.delete(`/blog/${id}`),
}
export const projectAPI = {
  mine: () => api.get('/projects/my-projects'),
  create: (d: unknown) => api.post('/projects', d),
  update: (id: string, d: unknown) => api.put(`/projects/${id}`, d),
  all: (p?: Record<string,unknown>) => api.get('/projects', { params: p }),
  review: (id: string, d: unknown) => api.patch(`/projects/${id}/review`, d),
}
export const reportAPI = {
  instructor: () => api.get('/reports/instructor'),
  admin: () => api.get('/reports/admin'),
}
export const notificationAPI = {
  mine: () => api.get('/notifications'),
  read: (id: string) => api.patch(`/notifications/${id}/read`),
  readAll: () => api.patch('/notifications/mark-all-read'),
  remove: (id: string) => api.delete(`/notifications/${id}`),
}
export const messagingAPI = {
  contacts: (search?: string) => api.get('/messages/contacts', { params: search ? { search } : undefined }),
  conversations: (search?: string) => api.get('/messages/conversations', { params: search ? { search } : undefined }),
  startConversation: (recipientId: string) => api.post('/messages/conversations', { recipientId }),
  messages: (conversationId: string) => api.get(`/messages/conversations/${conversationId}/messages`),
  send: (conversationId: string, content: string) => api.post(`/messages/conversations/${conversationId}/messages`, { content }),
  setTyping: (conversationId: string) => api.patch(`/messages/conversations/${conversationId}/typing`),
  deleteConversation: (conversationId: string) => api.delete(`/messages/conversations/${conversationId}`),
  reportConversation: (conversationId: string, reason: string) => api.post(`/messages/conversations/${conversationId}/report`, { reason }),
  deleteMessage: (messageId: string) => api.delete(`/messages/messages/${messageId}`),
}
export const resourceAPI = {
  all: (p?: Record<string,unknown>) => api.get('/resources', { params: p }),
  uploadDocument: (formData: FormData, onProgress?: (pct: number) => void) =>
    api.post('/resources', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => onProgress && e.total ? onProgress(Math.round((e.loaded * 100) / e.total)) : undefined,
    }),
  uploadMedia: (formData: FormData, onProgress?: (pct: number) => void) =>
    api.post('/resources/media', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => onProgress && e.total ? onProgress(Math.round((e.loaded * 100) / e.total)) : undefined,
    }),
  addYoutube: (d: { url: string; title?: string; description?: string; course?: string; week?: string; lesson?: string; isPublic?: boolean }) =>
    api.post('/resources/youtube', d),
  uploadInlineImage: (formData: FormData) =>
    api.post('/resources/inline-image', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  download: (id: string) => api.get(`/resources/${id}/download`),
  remove: (id: string) => api.delete(`/resources/${id}`),
}

export const systemAPI = {
  status: () => api.get('/system/status'),
}

export const dashboardAPI = {
  student: () => api.get('/dashboard/student'),
  instructor: () => api.get('/dashboard/instructor'),
  admin: () => api.get('/dashboard/admin'),
}
export const auditAPI = { logs: (p?: Record<string,unknown>) => api.get('/audit', { params: p }) }

export const contactAPI = {
  send: (d: unknown) => api.post('/contact', d),
}

export const admissionsAPI = {
  apply: (d: unknown) => api.post('/admissions', d),
  initializePayment: (applicationRef: string) => api.post(`/admissions/${applicationRef}/pay/initialize`),
  verifyPayment: (reference: string) => api.get(`/admissions/verify/${reference}`),
}

export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (d: unknown) => api.put('/settings', d),
  public: () => api.get('/settings/public'),
}

export default api
