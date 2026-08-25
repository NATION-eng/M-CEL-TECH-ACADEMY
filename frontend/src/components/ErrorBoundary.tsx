import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertOctagon, RotateCcw, Home } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Catches render/lifecycle errors anywhere in the component tree below it and
 * shows a friendly fallback instead of a blank white screen. Does NOT catch
 * errors inside event handlers or async code (React limitation) — those are
 * handled by try/catch + toast at the call site instead.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Server-side logging hook: send to your monitoring service here in production.
    console.error('Unhandled UI error caught by ErrorBoundary:', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-ink-900 p-6">
          <div className="text-center max-w-sm">
            <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
              <AlertOctagon size={28} />
            </div>
            <h2 className="text-xl font-display font-bold text-white mb-2">Something went wrong</h2>
            <p className="text-slate-400 text-sm mb-6">
              This part of the page hit an unexpected error. Your data is safe — try reloading, or head back home.
            </p>
            <div className="flex gap-3 justify-center">
              <button className="btn-ghost text-sm" onClick={() => window.location.reload()}>
                <RotateCcw size={14} /> Reload
              </button>
              <a href="/" className="btn-primary text-sm">
                <Home size={14} /> Go Home
              </a>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
