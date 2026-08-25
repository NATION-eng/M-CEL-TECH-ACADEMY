import { Response } from 'express';
import Course from '../models/Course.model';
import Enrollment from '../models/Enrollment.model';
import Attendance from '../models/Attendance.model';
import Assignment from '../models/Assignment.model';
import Submission from '../models/Submission.model';
import Quiz from '../models/Quiz.model';
import QuizAttempt from '../models/QuizAttempt.model';
import Payment from '../models/Payment.model';
import Certificate from '../models/Certificate.model';
import User from '../models/User.model';
import { AuthRequest } from '../types';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { getMonthlyRevenue } from '../utils/monthlyRevenue';

/**
 * Per-course summary for the instructor's own courses: enrollment, average
 * progress/attendance, assignment grading throughput, and quiz pass rate.
 * Deliberately built from the same models/relationships the certificate
 * eligibility engine already uses, rather than inventing a parallel set of
 * pre-aggregated stats that could drift out of sync with the real data.
 */
export const getInstructorReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const courses = await Course.find({ instructors: req.user!._id }).select('title');

    const report = await Promise.all(courses.map(async (course) => {
      const enrollments = await Enrollment.find({ course: course._id });
      const enrolledCount = enrollments.length;
      const avgProgress = enrolledCount
        ? Math.round(enrollments.reduce((sum, e) => sum + (e.progress || 0), 0) / enrolledCount)
        : 0;
      const completedCount = enrollments.filter(e => e.status === 'completed' || e.progress >= 100).length;

      // Attendance: average present-rate across all recorded sessions for this course.
      const sessions = await Attendance.find({ course: course._id });
      let presentTally = 0;
      let recordTally = 0;
      for (const session of sessions) {
        for (const rec of session.records) {
          recordTally += 1;
          if (rec.status === 'present' || rec.status === 'late' || rec.status === 'excused') presentTally += 1;
        }
      }
      const avgAttendance = recordTally > 0 ? Math.round((presentTally / recordTally) * 100) : null;

      // Assignments: how much grading is outstanding, and the average score once graded.
      const assignments = await Assignment.find({ course: course._id }).select('_id');
      const assignmentIds = assignments.map(a => a._id);
      const submissions = assignmentIds.length
        ? await Submission.find({ assignment: { $in: assignmentIds } })
        : [];
      const gradedSubmissions = submissions.filter(s => s.score != null);
      const pendingGrading = submissions.filter(s => s.score == null).length;
      const avgAssignmentScore = gradedSubmissions.length
        ? Math.round(gradedSubmissions.reduce((sum, s) => sum + (s.score || 0), 0) / gradedSubmissions.length)
        : null;

      // Quizzes: pass rate across all attempts (not unique students — an
      // instructor comparing attempt-level pass rate over time is standard).
      const quizzes = await Quiz.find({ course: course._id }).select('_id');
      const quizIds = quizzes.map(q => q._id);
      const attempts = quizIds.length
        ? await QuizAttempt.find({ quiz: { $in: quizIds }, completedAt: { $exists: true } })
        : [];
      const passRate = attempts.length
        ? Math.round((attempts.filter(a => a.passed).length / attempts.length) * 100)
        : null;

      return {
        courseId: course._id,
        courseTitle: course.title,
        enrolledCount,
        avgProgress,
        completedCount,
        avgAttendance,
        pendingGrading,
        avgAssignmentScore,
        quizAttempts: attempts.length,
        quizPassRate: passRate,
      };
    }));

    sendSuccess(res, report, 'Instructor report generated.');
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not generate report.', 500);
  }
};

/**
 * Platform-wide report for Admin/Super Admin: enrollment & revenue trend,
 * per-course performance, payment collection health, and instructor
 * leaderboard by active students. Built from the same underlying models as
 * everything else (no separately-maintained stats table to drift out of
 * sync).
 */
export const getAdminReport = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [courses, allEnrollments, allPayments, monthlyRevenue, instructors] = await Promise.all([
      Course.find({ isArchived: false }).select('title'),
      Enrollment.find().select('course status progress enrolledAt'),
      Payment.find().select('status totalAmount amountPaid balance'),
      getMonthlyRevenue(6),
      User.find({ role: 'instructor' }).select('firstName lastName'),
    ]);

    const courseStats = courses.map((course) => {
      const enrollments = allEnrollments.filter((e) => String(e.course) === String(course._id));
      const completed = enrollments.filter((e) => e.status === 'completed' || e.progress >= 100).length;
      return {
        courseId: course._id,
        courseTitle: course.title,
        enrolledCount: enrollments.length,
        completedCount: completed,
        completionRate: enrollments.length ? Math.round((completed / enrollments.length) * 100) : 0,
      };
    }).sort((a, b) => b.enrolledCount - a.enrolledCount);

    const totalCollected = allPayments.reduce((sum, p) => sum + (p.amountPaid ?? 0), 0);
    const totalOutstanding = allPayments.reduce((sum, p) => sum + (p.balance ?? 0), 0);
    const collectionRate = totalCollected + totalOutstanding > 0
      ? Math.round((totalCollected / (totalCollected + totalOutstanding)) * 100)
      : 0;
    const paymentStatusBreakdown = ['paid', 'partial', 'pending', 'overdue'].map((status) => ({
      status,
      count: allPayments.filter((p) => p.status === status).length,
    }));

    // Instructor leaderboard: active (non-completed) students across their courses.
    const instructorLeaderboard = await Promise.all(instructors.map(async (instructor) => {
      const theirCourses = await Course.find({ instructors: instructor._id }).select('_id');
      const courseIds = theirCourses.map((c) => c._id);
      const activeStudents = allEnrollments.filter(
        (e) => courseIds.some((id) => String(id) === String(e.course)) && e.status === 'active'
      ).length;
      return { instructorId: instructor._id, name: `${instructor.firstName} ${instructor.lastName}`, courseCount: theirCourses.length, activeStudents };
    }));
    instructorLeaderboard.sort((a, b) => b.activeStudents - a.activeStudents);

    const certificatesIssued = await Certificate.countDocuments({ isRevoked: false });

    sendSuccess(res, {
      courseStats,
      monthlyRevenue,
      collectionRate,
      totalCollected,
      totalOutstanding,
      paymentStatusBreakdown,
      instructorLeaderboard: instructorLeaderboard.slice(0, 10),
      certificatesIssued,
      totalEnrollments: allEnrollments.length,
    }, 'Admin report generated.');
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not generate report.', 500);
  }
};
