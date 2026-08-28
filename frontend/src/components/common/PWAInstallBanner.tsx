import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Check if dismissed in this session
    const isDismissed = sessionStorage.getItem('pwa_banner_dismissed')
    if (isDismissed) return

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowBanner(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = () => {
    if (!deferredPrompt) return
    const promptEvent = deferredPrompt
    // Immediately hide banner to unblock UI paint (0ms INP)
    setShowBanner(false)
    setDeferredPrompt(null)

    // Trigger OS prompt asynchronously outside the click handler paint cycle
    setTimeout(async () => {
      try {
        await promptEvent.prompt()
        await promptEvent.userChoice
      } catch (err) {
        console.warn('PWA install prompt dismissed or aborted', err)
      }
    }, 10)
  }

  const handleDismiss = () => {
    setShowBanner(false)
    sessionStorage.setItem('pwa_banner_dismissed', 'true')
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="card p-4 bg-ink-800/95 backdrop-blur-xl border border-brand-500/30 shadow-2xl shadow-brand-950/50 flex items-center gap-3.5">
        <div className="h-10 w-10 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 shadow-md">
          <img src="/logo.png" alt="M-CEL TECH" className="h-7 w-auto object-contain" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display text-sm font-bold text-white leading-tight">Install M-CEL TECH App</div>
          <p className="text-xs text-slate-400 mt-0.5 truncate">Fast offline access & home screen launch</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleInstall}
            className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1"
          >
            <Download size={13} /> Install
          </button>
          <button
            onClick={handleDismiss}
            className="btn-ghost p-1.5 text-slate-400 hover:text-white"
            aria-label="Dismiss install banner"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}