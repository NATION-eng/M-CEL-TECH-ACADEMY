import { Request } from 'express';
import { Document, Types } from 'mongoose';

// ─── Roles ────────────────────────────────────────────────────────────────
export type UserRole = 'student' | 'instructor' | 'admin' | 'super_admin';

export interface IUser extends Document {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  authProvider: 'local' | 'google';
  googleId?: string;
  role: UserRole;
  phone?: string;
  profilePicture?: string;
  isActive: boolean;
  isSuspended: boolean;
  failedLoginAttempts?: number;
  lockedUntil?: Date;
  refreshToken?: string;
  lastLogin?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
  fullName: string;
}

export interface IStudent extends Document {
  user: Types.ObjectId;
  studentId: string;
  bio?: string;
  skills: string[];
  githubUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  dateOfBirth?: Date;
  address?: string;
}

export interface IInstructor extends Document {
  user: Types.ObjectId;
  instructorId: string;
  bio?: string;
  specializations: string[];
  experience?: number;
  linkedinUrl?: string;
}

// ─── Curriculum ───────────────────────────────────────────────────────────
export interface ISchool extends Document {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  isActive: boolean;
  createdBy: Types.ObjectId;
}

export interface IDepartment extends Document {
  name: string;
  slug: string;
  school: Types.ObjectId;
  description?: string;
  isActive: boolean;
  createdBy: Types.ObjectId;
}

export type DeliveryMode = 'physical' | 'online' | 'hybrid';

export interface IClassScheduleSlot {
  dayOfWeek: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  startTime: string; // "14:00"
  endTime: string;   // "16:00"
  mode: 'physical' | 'online';
  location?: string;   // for physical sessions
  meetingLink?: string; // for online sessions
}

export interface ICourse extends Document {
  title: string;
  slug: string;
  department: Types.ObjectId;
  description: string;
  shortDescription: string;
  thumbnail?: string;
  price: number;
  depositAmount: number;
  depositPercentage: number;
  duration: string;
  deliveryMode: DeliveryMode;
  classSchedule: IClassScheduleSlot[];
  instructors: Types.ObjectId[];
  isPublished: boolean;
  isArchived: boolean;
  archivedAt?: Date;
  archivedBy?: Types.ObjectId;
  archiveReason?: string;
  tags: string[];
  whatYouLearn: string[];
  requirements: string[];
  createdBy: Types.ObjectId;
}

export interface IBadgeLevel extends Document {
  title: string;
  level: number;
  course: Types.ObjectId;
  description?: string;
  badgeIcon?: string;
  isActive: boolean;
  order: number;
}

export interface IModule extends Document {
  name: string;
  badgeLevel: Types.ObjectId;
  description?: string;
  order: number;
  isActive: boolean;
}

export interface IWeek extends Document {
  title: string;
  weekNumber: number;
  module: Types.ObjectId;
  description?: string;
  isActive: boolean;
}

export interface IDownload {
  name: string;
  url: string;
  type: string;
}

export interface ILesson extends Document {
  title: string;
  week: Types.ObjectId;
  order: number;
  description?: string;
  videoUrl?: string;
  videoDuration?: number;
  notes?: string;
  slides?: string;
  codeSnippets?: string;
  downloads: IDownload[];
  isPublished: boolean;
  isFree: boolean;
  createdBy: Types.ObjectId;
}

// ─── Assignments & Submissions ────────────────────────────────────────────
export type SubmissionType = 'file' | 'github' | 'portfolio' | 'liveUrl' | 'text';

export interface IAssignment extends Document {
  title: string;
  lesson?: Types.ObjectId;
  week?: Types.ObjectId;
  course: Types.ObjectId;
  description: string;
  instructions: string;
  dueDate: Date;
  maxScore: number;
  submissionTypes: SubmissionType[];
  resources: string[];
  isPublished: boolean;
  createdBy: Types.ObjectId;
}

export type SubmissionStatus = 'submitted' | 'graded' | 'returned' | 'late';

export interface ISubmission extends Document {
  assignment: Types.ObjectId;
  student: Types.ObjectId;
  submittedAt: Date;
  fileUrls: string[];
  githubUrl?: string;
  portfolioUrl?: string;
  liveUrl?: string;
  textContent?: string;
  score?: number;
  feedback?: string;
  status: SubmissionStatus;
  gradedBy?: Types.ObjectId;
  gradedAt?: Date;
}

// ─── Quizzes ──────────────────────────────────────────────────────────────
export type QuestionType = 'mcq' | 'true_false' | 'short_answer';

export interface IQuestion {
  _id?: Types.ObjectId;
  type: QuestionType;
  question: string;
  options?: string[];
  correctAnswer: string;
  points: number;
  explanation?: string;
}

export interface IQuiz extends Document {
  title: string;
  lesson?: Types.ObjectId;
  week?: Types.ObjectId;
  course: Types.ObjectId;
  description?: string;
  questions: IQuestion[];
  duration: number;
  passingScore: number;
  maxAttempts: number;
  isPublished: boolean;
  availableFrom?: Date;
  availableUntil?: Date;
  randomizeQuestions: boolean;
  createdBy: Types.ObjectId;
}

export interface IQuizAnswer {
  questionId: Types.ObjectId;
  answer: string;
  isCorrect: boolean;
  pointsEarned: number;
}

export interface IQuizAttempt extends Document {
  quiz: Types.ObjectId;
  student: Types.ObjectId;
  answers: IQuizAnswer[];
  score: number;
  totalPoints: number;
  percentage: number;
  passed: boolean;
  startedAt: Date;
  completedAt?: Date;
  timeSpent: number;
  attemptNumber: number;
}

// ─── Attendance ───────────────────────────────────────────────────────────
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface IAttendanceRecord {
  student: Types.ObjectId;
  status: AttendanceStatus;
  note?: string;
}

export interface IAttendance extends Document {
  course: Types.ObjectId;
  week?: Types.ObjectId;
  date: Date;
  session: string;
  instructor: Types.ObjectId;
  records: IAttendanceRecord[];
}

// ─── Certificates ─────────────────────────────────────────────────────────
export interface ICertificate extends Document {
  certificateNumber: string;
  student: Types.ObjectId;
  course: Types.ObjectId;
  badgeLevel?: Types.ObjectId;
  issuedAt: Date;
  expiresAt?: Date;
  pdfUrl?: string;
  qrCode: string;
  verificationUrl: string;
  isRevoked: boolean;
  revokedAt?: Date;
  revokedBy?: Types.ObjectId;
  revokeReason?: string;
  issuedBy: Types.ObjectId;
}

// ─── Payments ─────────────────────────────────────────────────────────────
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue' | 'failed' | 'refunded';
export type PaymentGateway = 'paystack' | 'flutterwave' | 'manual';

export interface ITransaction {
  ref: string;
  amount: number;
  gateway: PaymentGateway;
  gatewayRef: string;
  status: 'success' | 'failed' | 'pending';
  paidAt: Date;
  receiptUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface IPayment extends Document {
  paymentRef: string;
  student: Types.ObjectId;
  enrollment: Types.ObjectId;
  course: Types.ObjectId;
  totalAmount: number;
  depositAmount: number;
  amountPaid: number;
  balance: number;
  status: PaymentStatus;
  transactions: ITransaction[];
  dueDate?: Date;
  installmentDeadline?: Date;
  notes?: string;
}

// ─── Enrollment ───────────────────────────────────────────────────────────
export type EnrollmentStatus = 'pending' | 'active' | 'completed' | 'suspended' | 'dropped';

export interface IEnrollment extends Document {
  student: Types.ObjectId;
  course: Types.ObjectId;
  enrolledAt: Date;
  status: EnrollmentStatus;
  progress: number;
  currentBadge?: Types.ObjectId;
  completedLessons: Types.ObjectId[];
  completedWeeks: Types.ObjectId[];
  completedBadges: Types.ObjectId[];
  lastAccessedAt?: Date;
  completedAt?: Date;
  payment?: Types.ObjectId;
  cohort?: string;
  deliveryMode: 'physical' | 'online';
}

// ─── Projects ─────────────────────────────────────────────────────────────
export type ProjectType = 'personal' | 'team' | 'capstone';
export type ProjectStatus = 'in_progress' | 'completed' | 'under_review';

export interface IProject extends Document {
  title: string;
  description: string;
  type: ProjectType;
  student: Types.ObjectId;
  course?: Types.ObjectId;
  teamMembers?: Types.ObjectId[];
  githubUrl?: string;
  liveUrl?: string;
  thumbnailUrl?: string;
  technologies: string[];
  status: ProjectStatus;
  feedback?: string;
  grade?: number;
  reviewedBy?: Types.ObjectId;
}

// ─── Content ──────────────────────────────────────────────────────────────
export interface IAnnouncement extends Document {
  title: string;
  content: string;
  author: Types.ObjectId;
  targetRoles: UserRole[];
  targetCourses: Types.ObjectId[];
  isPinned: boolean;
  isPublished: boolean;
  publishedAt?: Date;
  scheduledFor?: Date;
  expiresAt?: Date;
  isArchived: boolean;
  archivedAt?: Date;
  archivedBy?: Types.ObjectId;
  archiveReason?: string;
}

export interface IEvent extends Document {
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  isOnline: boolean;
  meetingUrl?: string;
  thumbnail?: string;
  isPublished: boolean;
  registrationLink?: string;
  createdBy: Types.ObjectId;
}

export interface IBlogPost extends Document {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  thumbnail?: string;
  author: Types.ObjectId;
  tags: string[];
  category: string;
  isPublished: boolean;
  publishedAt?: Date;
  scheduledFor?: Date;
  views: number;
  readTime: number;
  isArchived: boolean;
  archivedAt?: Date;
  archivedBy?: Types.ObjectId;
  archiveReason?: string;
}

// ─── Notifications ────────────────────────────────────────────────────────
export type NotificationType =
  | 'assignment' | 'announcement' | 'payment' | 'certificate'
  | 'grade' | 'system' | 'reminder';

export interface INotification extends Document {
  recipient: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  readAt?: Date;
  metadata?: Record<string, unknown>;
}

// ─── Audit ────────────────────────────────────────────────────────────────
export interface IAuditLog extends Document {
  user?: Types.ObjectId;
  action: string;
  entity: string;
  entityId?: string;
  changes?: Record<string, unknown>;
  ipAddress: string;
  userAgent?: string;
  status: 'success' | 'failure';
  details?: string;
  createdAt: Date;
}

// ─── Resources ────────────────────────────────────────────────────────────
export type ResourceType = 'pdf' | 'word' | 'excel' | 'powerpoint' | 'image' | 'zip' | 'video' | 'audio' | 'youtube' | 'slide' | 'cheatsheet' | 'template' | 'sourcecode' | 'projectfile' | 'other';

export interface IResource extends Document {
  title: string;
  description?: string;
  type: ResourceType;
  url: string;
  fileSize?: number;
  publicId?: string;
  youtubeVideoId?: string;
  youtubeThumbnail?: string;
  lesson?: Types.ObjectId;
  course?: Types.ObjectId;
  week?: Types.ObjectId;
  isPublic: boolean;
  downloadCount: number;
  uploadedBy: Types.ObjectId;
}

// ─── Messaging ────────────────────────────────────────────────────────────
export interface IConversation extends Document {
  participants: Types.ObjectId[]; // always exactly 2 — direct messages only
  lastMessage?: Types.ObjectId;
  lastMessageAt?: Date;
  lastMessagePreview?: string;
  // "Delete conversation" hides it from that participant's list without
  // destroying the other participant's history — same pattern as most chat
  // apps ("delete for me" vs. an irreversible delete for both sides).
  hiddenFor: Types.ObjectId[];
  // Lightweight typing indicator: a participant PATCHes this forward a few
  // seconds at a time while composing; the other side's poll picks it up.
  // No websocket needed, at the cost of it being near-real-time rather than
  // instant.
  typingBy?: Types.ObjectId;
  typingUntil?: Date;
  isReported: boolean;
  reportedBy?: Types.ObjectId;
  reportReason?: string;
  reportedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMessage extends Document {
  conversation: Types.ObjectId;
  sender: Types.ObjectId;
  content: string;
  readBy: Types.ObjectId[]; // user IDs who have read this message
  createdAt: Date;
}

// ─── Express Extensions ───────────────────────────────────────────────────
export interface AuthRequest extends Request {
  user?: IUser;
}
