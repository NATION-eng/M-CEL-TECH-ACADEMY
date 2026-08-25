import { Response } from 'express';
import Enrollment from '../models/Enrollment.model';
import Submission from '../models/Submission.model';
import Assignment from '../models/Assignment.model';
import Certificate from '../models/Certificate.model';
import Course from '../models/Course.model';
import User from '../models/User.model';
import Payment from '../models/Payment.model';
import Attendance from '../models/Attendance.model';
import { AuthRequest } from '../types';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { getMonthlyRevenue } from '../utils/monthlyRevenue';

export const getStudentDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user!._id;

    const enrollments = await Enrollment.find({ student: studentId })
      .populate('course', 'title thumbnail classSchedule deliveryMode')
      .populate('currentBadge', 'title level');

    // Today's live sessions, across all enrolled courses — this is what
    // powers the "join now" widget; without it, the class schedule set on a
    // Course was informational-only with no student-facing "what's on today"
    // view anywhere.
    const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    const today = dayNames[new Date().getDay()];
    const todaysSessions = enrollments.flatMap((e) => {
      const course = e.course as unknown as { _id: unknown; title: string; classSchedule?: { dayOfWeek: string; startTime: string; endTime: string; mode: string; location?: string; meetingLink?: string }[] };
      return (course.classSchedule ?? [])
        .filter((slot) => slot.dayOfWeek === today)
        .map((slot) => ({ courseId: course._id, courseTitle: course.title, ...slot }));
    }).sort((a, b) => a.startTime.localeCompare(b.startTime));

    const avgProgress = enrollments.length
      ? Math.round(enrollments.reduce((sum, e) => sum + e.progress, 0) / enrollments.length)
      : 0;

    const courseIds = enrollments.map((e) => e.course);
    const [pendingAssignments, certificateCount] = await Promise.all([
      Assignment.find({ course: { $in: courseIds }, dueDate: { $gte: new Date() }, isPublished: true })
        .populate('course', 'title')
        .sort({ dueDate: 1 })
        .limit(5),
      Certificate.countDocuments({ student: studentId, isRevoked: false }),
    ]);

    const recentSubmissions = await Submission.find({ student: studentId })
      .populate({
        path: 'assignment',
        select: 'title course',
        populate: { path: 'course', select: 'title' }
      })
      .sort({ submittedAt: -1 })
      .limit(5);

    sendSuccess(res, {
      enrollments,
      avgProgress,
      coursesEnrolled: enrollments.length,
      certificatesEarned: certificateCount,
      upcomingAssignments: pendingAssignments,
      recentSubmissions,
      todaysSessions,
    }, 'Student dashboard data fetched.');
  } catch {
    sendError(res, 'Could not fetch dashboard data.', 500);
  }
};

export const getInstructorDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const instructorId = req.user!._id;

    const courses = await Course.find({ instructors: instructorId }).select('title');
    const courseIds = courses.map((c) => c._id);

    const [studentCount, pendingGrading, recentAttendance] = await Promise.all([
      Enrollment.countDocuments({ course: { $in: courseIds }, status: 'active' }),
      Submission.find({ status: 'submitted' })
        .populate({
          path: 'assignment',
          select: 'title course',
          populate: { path: 'course', select: 'title' }
        })
        .populate('student', 'firstName lastName')
        .sort({ submittedAt: -1 })
        .limit(10),
      Attendance.find({ course: { $in: courseIds } }).sort({ date: -1 }).limit(5),
    ]);

    sendSuccess(res, {
      courses,
      totalStudents: studentCount,
      pendingGrading,
      recentAttendance,
    }, 'Instructor dashboard data fetched.');
  } catch {
    sendError(res, 'Could not fetch dashboard data.', 500);
  }
};

export const getAdminDashboard = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const [
      totalStudents, activeStudents, totalInstructors, totalRevenue,
      totalEnrollments, certificatesIssued, recentEnrollments, monthlyRevenue,
      totalCourses, studentGrowthRaw,
    ] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'student', isActive: true, isSuspended: false }),
      User.countDocuments({ role: 'instructor' }),
      Payment.aggregate([{ $group: { _id: null, total: { $sum: '$amountPaid' } } }]),
      Enrollment.countDocuments(),
      Certificate.countDocuments({ isRevoked: false }),
      Enrollment.find()
        .populate('student', 'firstName lastName')
        .populate('course', 'title')
        .sort({ enrolledAt: -1 })
        .limit(10),
      getMonthlyRevenue(6),
      Course.countDocuments({ isArchived: false }),
      // Real new-student-signups per month — this used to be a hardcoded
      // fake array on the Super Admin dashboard's "Platform Growth" chart.
      User.aggregate([
        { $match: { role: 'student', createdAt: { $gte: sixMonthsAgo } } },
        { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
    ]);

    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const growthByKey = new Map<string, number>(studentGrowthRaw.map((m) => [`${m._id.year}-${m._id.month}`, m.count] as const));
    const monthlyGrowth = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(sixMonthsAgo);
      d.setMonth(d.getMonth() + i);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      const revenueForMonth = monthlyRevenue[i]?.revenue ?? 0;
      return { month: monthNames[d.getMonth()], students: growthByKey.get(key) ?? 0, revenue: revenueForMonth };
    });

    sendSuccess(res, {
      totalStudents,
      activeStudents,
      totalInstructors,
      totalCourses,
      totalRevenue: totalRevenue[0]?.total || 0,
      totalEnrollments,
      certificatesIssued,
      recentEnrollments,
      monthlyRevenue,
      monthlyGrowth,
    }, 'Admin dashboard data fetched.');
  } catch {
    sendError(res, 'Could not fetch dashboard data.', 500);
  }
};
