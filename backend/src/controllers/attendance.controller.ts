import { Response } from 'express';
import Attendance from '../models/Attendance.model';
import { AuthRequest, AttendanceStatus } from '../types';
import { sendSuccess, sendError } from '../utils/apiResponse';

export const markAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { course, week, date, session, records } = req.body;
    if (!course || !date || !session || !records?.length) {
      sendError(res, 'Course, date, session, and student records are required.', 400);
      return;
    }

    // Upsert: re-marking the same course/date/session overwrites the previous record set,
    // so instructors can correct mistakes without creating duplicate attendance entries.
    const attendance = await Attendance.findOneAndUpdate(
      { course, date: new Date(date), session },
      { course, week, date: new Date(date), session, instructor: req.user!._id, records },
      { new: true, upsert: true, runValidators: true }
    );

    sendSuccess(res, attendance, 'Attendance recorded.', 201);
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not mark attendance.', 500);
  }
};

export const getAttendanceForCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filter: Record<string, unknown> = {};
    if (req.query.course) filter.course = req.query.course;
    if (req.query.week) filter.week = req.query.week;

    const attendance = await Attendance.find(filter)
      .populate('records.student', 'firstName lastName')
      .populate('instructor', 'firstName lastName')
      .sort({ date: -1 });

    sendSuccess(res, attendance, 'Attendance fetched.');
  } catch {
    sendError(res, 'Could not fetch attendance.', 500);
  }
};

export const getMyAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const records = await Attendance.find({ 'records.student': req.user!._id })
      .populate('course', 'title')
      .sort({ date: -1 });

    // Flatten to just this student's own record per session for a simpler frontend shape
    const mine = records.map((a) => {
      const ownRecord = a.records.find((r) => r.student.toString() === req.user!._id.toString());
      return {
        course: a.course,
        date: a.date,
        session: a.session,
        status: ownRecord?.status,
        note: ownRecord?.note,
      };
    });

    sendSuccess(res, mine, 'Your attendance fetched.');
  } catch {
    sendError(res, 'Could not fetch your attendance.', 500);
  }
};

/** Aggregate per-student attendance percentage for a course — used in instructor/admin dashboards. */
export const getAttendanceReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { courseId } = req.params;
    const sessions = await Attendance.find({ course: courseId });

    if (!sessions.length) {
      sendSuccess(res, { totalSessions: 0, students: [] }, 'No attendance records yet for this course.');
      return;
    }

    const totalSessions = sessions.length;
    const tally: Record<string, { present: number; absent: number; late: number; excused: number }> = {};

    for (const session of sessions) {
      for (const record of session.records) {
        const sid = record.student.toString();
        if (!tally[sid]) tally[sid] = { present: 0, absent: 0, late: 0, excused: 0 };
        const status = record.status as AttendanceStatus;
        tally[sid][status] = (tally[sid][status] || 0) + 1;
      }
    }

    const students = Object.entries(tally).map(([studentId, counts]) => {
      const attended = counts.present + counts.late;
      return {
        studentId,
        ...counts,
        attendanceRate: Math.round((attended / totalSessions) * 100),
      };
    });

    sendSuccess(res, { totalSessions, students }, 'Attendance report generated.');
  } catch {
    sendError(res, 'Could not generate attendance report.', 500);
  }
};
