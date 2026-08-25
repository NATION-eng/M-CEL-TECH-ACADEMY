import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * Most pages today handle "nothing here" with a single muted line of text
 * (`<p className="text-xs text-slate-500 py-2">No submissions yet.</p>`),
 * which is fine for a small list inside a dashboard card but reads as
 * unfinished on a page whose *entire* content is empty (e.g. a student
 * with zero courses, an instructor with zero students). This gives empty
 * pages the same level of polish as populated ones, with room for an icon
 * and a next-action instead of just silence.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  compact?: boolean
}) {
  if (compact) {
    return <p className="py-2 text-xs text-slate-500">{title}</p>
  }

  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.04]">
          <Icon className="h-6 w-6 text-slate-500" strokeWidth={1.5} />
        </div>
      )}
      <p className="text-sm font-medium text-slate-300">{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-xs text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
