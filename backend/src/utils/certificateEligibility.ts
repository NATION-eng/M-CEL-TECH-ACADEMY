import { Types } from 'mongoose';
import Enrollment from '../models/Enrollment.model';
import Payment from '../models/Payment.model';
import Attendance from '../models/Attendance.model';
import Assignment from '../models/Assignment.model';
import Submission from '../models/Submission.model';
import Quiz from '../models/Quiz.model';
import QuizAttempt from '../models/QuizAttempt.model';
import Project from '../models/Project.model';
import Course from '../models/Course.model';

const ATTENDANCE_THRESHOLD = 0.75; // 75% attendance required

export interface EligibilityBreakdown {
  eligible: boolean;
  reasons: string[]; // human-readable list of unmet requirements (empty if eligible)
  criteria: {
    enrolled: boolean;
    courseCompleted: boolean; // enrollment.status === 'completed' or progress >= 100
    progress: number;
    feesCleared: boolean; // no outstanding balance
    attendance: { rate: number; met: boolean; sessionsTracked: number };
    assignments: { total: number; submitted: number; met: boolean };
    quizzes: { total: number; passed: number; met: boolean };
    projects: { total: number; completed: number; met: boolean };
  };
}

/**
 * Single source of truth for "is this student eligible for a certificate in
 * this course". Used both to gate manual issuance (certificate.controller)
 * and to show students/admins a live progress breakdown before that point.
 *
 * Deliberately over-fetches into plain reads rather than one giant aggregate —
 * this runs on-demand (button click / admin lookup), not on every page load,
 * so clarity wins over shaving a few queries.
 */
export async function checkCertificateEligibility(
  studentId: string | Types.ObjectId,
  courseId: string | Types.ObjectId
): Promise<EligibilityBreakdown> {
  const reasons: string[] = [];

  const [enrollment, course] = await Promise.all([
    Enrollment.findOne({ student: studentId, course: courseId }),
    Course.findById(courseId),
  ]);

  if (!enrollment) {
    return {
      eligible: false,
      reasons: ['Student is not enrolled in this course.'],
      criteria: {
        enrolled: false, courseCompleted: false, progress: 0, feesCleared: false,
        attendance: { rate: 0, met: false, sessionsTracked: 0 },
        assignments: { total: 0, submitted: 0, met: false },
        quizzes: { total: 0, passed: 0, met: false },
        projects: { total: 0, completed: 0, met: false },
      },
    };
  }

  const courseCompleted = enrollment.status === 'completed' || enrollment.progress >= 100;
  if (!courseCompleted) reasons.push('Course has not been completed (progress under 100%).');

  // ── Fees ────────────────────────────────────────────────────────────────
  let feesCleared = true;
  if (course && course.price > 0) {
    const payment = await Payment.findOne({ student: studentId, enrollment: enrollment._id });
    feesCleared = !!payment && payment.status === 'paid';
    if (!feesCleared) reasons.push('Outstanding course fees have not been fully paid.');
  }

  // ── Attendance ──────────────────────────────────────────────────────────
  const attendanceSessions = await Attendance.find({ course: courseId, 'records.student': studentId });
  let present = 0;
  let tracked = 0;
  for (const session of attendanceSessions) {
    const record = session.records.find(r => String(r.student) === String(studentId));
    if (!record) continue;
    tracked += 1;
    if (record.status === 'present' || record.status === 'late' || record.status === 'excused') present += 1;
  }
  const attendanceRate = tracked > 0 ? present / tracked : 1; // no sessions tracked yet = nothing to fail on
  const attendanceMet = attendanceRate >= ATTENDANCE_THRESHOLD;
  if (tracked > 0 && !attendanceMet) {
    reasons.push(`Attendance is ${Math.round(attendanceRate * 100)}%, below the required ${ATTENDANCE_THRESHOLD * 100}%.`);
  }

  // ── Assignments ─────────────────────────────────────────────────────────
  const assignments = await Assignment.find({ course: courseId, isPublished: true }).select('_id');
  let assignmentsSubmitted = 0;
  if (assignments.length > 0) {
    const subs = await Submission.find({
      student: studentId,
      assignment: { $in: assignments.map(a => a._id) },
    }).select('assignment');
    assignmentsSubmitted = subs.length;
  }
  const assignmentsMet = assignmentsSubmitted >= assignments.length;
  if (!assignmentsMet) {
    reasons.push(`${assignments.length - assignmentsSubmitted} assignment(s) still not submitted.`);
  }

  // ── Quizzes ─────────────────────────────────────────────────────────────
  const quizzes = await Quiz.find({ course: courseId, isPublished: true }).select('_id');
  let quizzesPassed = 0;
  if (quizzes.length > 0) {
    const attempts = await QuizAttempt.find({
      student: studentId,
      quiz: { $in: quizzes.map(q => q._id) },
      passed: true,
    }).select('quiz');
    quizzesPassed = new Set(attempts.map(a => String(a.quiz))).size;
  }
  const quizzesMet = quizzesPassed >= quizzes.length;
  if (!quizzesMet) {
    reasons.push(`${quizzes.length - quizzesPassed} quiz(zes) not yet passed.`);
  }

  // ── Projects ────────────────────────────────────────────────────────────
  const projects = await Project.find({ course: courseId, student: studentId }).select('status');
  const projectsCompleted = projects.filter(p => p.status === 'completed').length;
  const projectsMet = projectsCompleted >= projects.length;
  if (!projectsMet) {
    reasons.push(`${projects.length - projectsCompleted} project(s) not yet completed.`);
  }

  const eligible = courseCompleted && feesCleared && attendanceMet && assignmentsMet && quizzesMet && projectsMet;

  return {
    eligible,
    reasons,
    criteria: {
      enrolled: true,
      courseCompleted,
      progress: enrollment.progress,
      feesCleared,
      attendance: { rate: attendanceRate, met: attendanceMet, sessionsTracked: tracked },
      assignments: { total: assignments.length, submitted: assignmentsSubmitted, met: assignmentsMet },
      quizzes: { total: quizzes.length, passed: quizzesPassed, met: quizzesMet },
      projects: { total: projects.length, completed: projectsCompleted, met: projectsMet },
    },
  };
}
