/**
 * Formats a date as a short relative string, matching the spec's exact examples:
 * "Just now", "5 minutes ago", "2 hours ago", "Yesterday", "3 days ago" —
 * falling back to an absolute date once it's old enough that "N days ago"
 * stops being useful (matches most social/blog UI conventions).
 */
export function formatRelativeTime(input: string | Date | undefined | null): string {
  if (!input) return ''
  const date = typeof input === 'string' ? new Date(input) : input
  if (isNaN(date.getTime())) return ''

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffSec < 0) return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) // future-dated (e.g. scheduled), just show the date
  if (diffSec < 60) return 'Just now'
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`
  if (diffDay === 1) return 'Yesterday'
  if (diffDay < 7) return `${diffDay} days ago`

  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
