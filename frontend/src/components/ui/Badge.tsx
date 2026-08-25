import type { ReactNode } from 'react'

export type BadgeColor = 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'indigo' | 'cyan' | 'slate'

export function Badge({ color, children }: { color: BadgeColor; children: ReactNode }) {
  return <span className={`badge badge-${color}`}>{children}</span>
}

/**
 * Every list page (Payments, Students, Enrollments, Admissions...)
 * re-derives its own status→color mapping today, and they don't fully
 * agree — e.g. `pending` is badge-indigo in admin/Payments.tsx and
 * admin/Students.tsx but the student-facing Payments page never defines
 * it at all (falls through to no badge). Students.tsx also maps
 * `dropped` to badge-amber, grouping a terminal negative outcome with
 * "in progress" states like `partial`/`late` — this map corrects that
 * to red. This is the single source of truth going forward; point every
 * status badge at it so "what does amber mean" has one answer instead
 * of several slightly-different ones.
 */
const STATUS_COLOR_MAP: Record<string, BadgeColor> = {
  // positive / complete
  active: 'green',
  paid: 'green',
  completed: 'green',
  present: 'green',
  passed: 'green',
  approved: 'green',
  account_created: 'green',
  // awaiting action, not yet resolved either way
  pending: 'indigo',
  pending_payment: 'indigo',
  // in progress / needs attention, but not yet a problem
  partial: 'amber',
  late: 'amber',
  submitted: 'amber',
  in_progress: 'amber',
  under_review: 'amber',
  // negative / blocked / terminal-bad
  overdue: 'red',
  failed: 'red',
  suspended: 'red',
  dropped: 'red',
  absent: 'red',
  expired: 'red',
  refunded: 'red',
  // neutral / informational
  excused: 'slate',
  graded: 'blue',
  returned: 'blue',
  draft: 'slate',
}

export function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLOR_MAP[status.toLowerCase()] ?? 'slate'
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  return <Badge color={color}>{label}</Badge>
}
