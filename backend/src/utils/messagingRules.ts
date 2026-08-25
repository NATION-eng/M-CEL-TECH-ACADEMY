import { UserRole } from '../types';

// Union of two specs given at different points: the original pairs
// (Student<->Instructor, Admin<->Instructor, Admin<->Student, Super
// Admin<->Admin) plus peer-to-peer messaging added later (Student<->Student,
// Instructor<->Instructor). Additive rather than a replacement — nothing that
// already worked (e.g. a student messaging an admin for support) was removed
// to make room for peer messaging.
//
// Opening student-to-student DMs is a real moderation surface (harassment,
// inappropriate contact) that a school platform can't just ignore — see
// reportConversation in message.controller.ts for the reporting path this
// unlocked alongside it.
export const ALLOWED_PAIRS: Record<UserRole, UserRole[]> = {
  student: ['student', 'instructor', 'admin'],
  instructor: ['instructor', 'student', 'admin'],
  admin: ['student', 'instructor', 'super_admin'],
  super_admin: ['admin'],
};

export function canMessage(fromRole: UserRole, toRole: UserRole): boolean {
  return ALLOWED_PAIRS[fromRole]?.includes(toRole) ?? false;
}
