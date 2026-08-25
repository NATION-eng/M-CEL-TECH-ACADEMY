import { useEffect } from 'react'

/**
 * Every modal/overlay in the app (ConfirmDialog, the certificate QR
 * modal) closes on backdrop click but not on Escape — a real
 * accessibility gap for keyboard-only users, who have no way to
 * dismiss an overlay without a mouse. Call this with the close handler
 * and it wires up the listener only while `active` is true.
 */
export function useEscapeKey(active: boolean, onEscape: () => void) {
  useEffect(() => {
    if (!active) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onEscape()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [active, onEscape])
}
