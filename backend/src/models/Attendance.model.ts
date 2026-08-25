import mongoose, { Schema } from 'mongoose';
import { IAttendance } from '../types';

const AttendanceSchema = new Schema<IAttendance>({
  course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  week: { type: Schema.Types.ObjectId, ref: 'Week' },
  date: { type: Date, required: true },
  session: { type: String, required: true },
  instructor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  records: [{
    student: { type: Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['present', 'absent', 'late', 'excused'], default: 'absent' },
    note: String,
  }],
}, { timestamps: true });

// markAttendance upserts on exactly this triple; the eligibility engine and
// student attendance history both filter by course + records.student.
AttendanceSchema.index({ course: 1, date: 1, session: 1 }, { unique: true });
AttendanceSchema.index({ course: 1, 'records.student': 1 });

export default mongoose.model<IAttendance>('Attendance', AttendanceSchema);
