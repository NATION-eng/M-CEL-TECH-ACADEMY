import { useState, useCallback, createContext, useContext, ReactNode } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { useEscapeKey } from '../hooks/useEscapeKey'

interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

/**
 * Provides a `confirm()` function anywhere in the tree via useConfirm().
 * Renders a real modal (not window.confirm) so destructive actions — delete,
 * revoke, suspend — get a consistent, styled "are you sure?" step before
 * anything irreversible happens.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null)
  const [busy, setBusy] = useState(false)

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      setState({ ...options, resolve })
    })
  }, [])

  const handle = (result: boolean) => {
    if (!state) return
    setBusy(false)
    state.resolve(result)
    setState(null)
  }

  // Escape always cancels, never confirms — this dialog is frequently
  // used for destructive actions (delete, revoke, suspend), so Escape
  // must be a safe no-op, matching standard dialog convention.
  useEscapeKey(!!state && !busy, () => handle(false))

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-message">
          <div className="card max-w-sm w-full p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className={`shrink-0 rounded-full p-2 ${state.danger !== false ? 'bg-red-500/10 text-red-400' : 'bg-brand-500/10 text-brand-400'}`}>
                <AlertTriangle size={18} />
              </div>
              <div>
                <h3 id="confirm-dialog-title" className="font-display font-semibold text-white">{state.title}</h3>
                <p id="confirm-dialog-message" className="text-sm text-slate-400 mt-1">{state.message}</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button className="btn-ghost text-sm" onClick={() => handle(false)} disabled={busy}>
                Cancel
              </button>
              <button
                className={`text-sm px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
                  state.danger !== false ? 'bg-red-600 hover:bg-red-500 text-white' : 'btn-primary'
                }`}
                onClick={() => { setBusy(true); handle(true) }}
                disabled={busy}
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : null}
                {state.confirmLabel ?? 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext)
  if (!ctx) {
    throw new Error('useConfirm must be used within a ConfirmProvider')
  }
  return ctx
}
