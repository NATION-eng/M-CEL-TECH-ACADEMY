/**
 * Wraps the existing .progress-track/.progress-fill visual in real ARIA
 * progressbar semantics. The previous inline version
 * (`<div className="progress-track"><div className="progress-fill" style={{width:`${progress}%`}}/></div>`)
 * looks identical visually but is invisible to assistive tech — a screen
 * reader user has no way to know a progress bar is even there, let alone
 * what percentage it shows.
 */
export function ProgressBar({
  value,
  label,
  className = '',
}: {
  value: number
  label: string
  className?: string
}) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={`progress-track ${className}`}
    >
      <div className="progress-fill" style={{ width: `${clamped}%` }} />
    </div>
  )
}
