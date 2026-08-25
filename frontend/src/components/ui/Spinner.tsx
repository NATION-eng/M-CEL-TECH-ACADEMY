/**
 * The existing spinner pattern (`<div className="w-8 h-8 border-4 ... animate-spin" />`)
 * is purely decorative to a screen reader — nothing announces that content
 * is loading, or when it finishes. This wraps the same visual in the ARIA
 * semantics that make it actually accessible, and centralizes it so a
 * future visual tweak happens in one file instead of ~15.
 */
export function Spinner({ size = 32, label = 'Loading…' }: { size?: number; label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center">
      <div
        aria-hidden="true"
        className="animate-spin rounded-full border-4 border-brand-500 border-t-transparent"
        style={{ width: size, height: size }}
      />
      <span className="sr-only">{label}</span>
    </div>
  )
}

/** Full-section loading state — replaces the old ad-hoc "flex items-center justify-center min-h-[400px]" blocks. */
export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <Spinner label={label} />
    </div>
  )
}
