/**
 * Skeleton loading primitives. The app previously had no shared loading
 * pattern — every page either rolled its own or (more often) just showed a
 * single centered spinner for the whole page, which causes a jarring
 * blank-then-pop-in layout shift. These match the actual shape of the
 * content they stand in for, so the page's layout doesn't jump once real
 * data arrives.
 *
 * All skeleton elements are aria-hidden — the loading *state* itself is
 * announced once, by the parent via role="status" (see Spinner.tsx or wrap
 * a skeleton group in <div role="status" aria-label="Loading...">), not by
 * every individual placeholder block.
 */

export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-lg bg-white/[0.06] ${className}`} />
}

export function SkeletonText({ lines = 1, className = '' }: { lines?: number; className?: string }) {
  return (
    <div aria-hidden="true" className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 animate-pulse rounded bg-white/[0.06]"
          style={{ width: i === lines - 1 && lines > 1 ? '70%' : '100%' }}
        />
      ))}
    </div>
  )
}

/** Matches .stat-card exactly, so it swaps in/out without any layout shift. */
export function StatCardSkeleton() {
  return (
    <div className="stat-card">
      <SkeletonBlock className="h-9 w-9 rounded-xl" />
      <SkeletonBlock className="h-7 w-16" />
      <SkeletonBlock className="h-3 w-24" />
    </div>
  )
}

/** Matches .card-hover's typical "title + badge + progress" content shape. */
export function CourseCardSkeleton() {
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <SkeletonBlock className="h-4 w-3/5" />
          <SkeletonBlock className="h-5 w-20 rounded-full" />
        </div>
        <SkeletonBlock className="h-5 w-10" />
      </div>
      <SkeletonBlock className="mb-4 h-1.5 w-full rounded-full" />
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-3 w-28" />
        <SkeletonBlock className="h-3 w-16" />
      </div>
    </div>
  )
}

/** Generic compact list row — assignments, activity feeds, notifications. */
export function ListItemSkeleton() {
  return (
    <div className="card flex items-start gap-3 p-3.5">
      <SkeletonBlock className="mt-0.5 h-4 w-4 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <SkeletonBlock className="h-3 w-4/5" />
        <SkeletonBlock className="h-2.5 w-2/5" />
      </div>
    </div>
  )
}

/** Table body placeholder — for the many data-listing admin/instructor pages. */
export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <SkeletonBlock className="h-3.5 w-full max-w-[140px]" />
        </td>
      ))}
    </tr>
  )
}
