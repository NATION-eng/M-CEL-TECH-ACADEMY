import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ConfirmProvider } from './components/ConfirmDialog'

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 5*60*1000 } } })
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

// Renders children as-is when no Client ID is configured, so the app (and the
// rest of login/register) still works in environments where Google Sign-In
// hasn't been set up yet — it just won't show the Google button.
function MaybeGoogleProvider({ children }: { children: React.ReactNode }) {
  if (!googleClientId) return <>{children}</>
  return <GoogleOAuthProvider clientId={googleClientId}>{children}</GoogleOAuthProvider>
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <QueryClientProvider client={qc}>
          <MaybeGoogleProvider>
            <ConfirmProvider>
              <App />
            </ConfirmProvider>
          </MaybeGoogleProvider>
          <Toaster position="top-right" toastOptions={{
            style: { background:'#0F1A2E', color:'#F1F5F9', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'12px', fontFamily:'Inter,sans-serif', fontSize:'14px' },
            success: { iconTheme: { primary:'#10B981', secondary:'#0F1A2E' } },
            error:   { iconTheme: { primary:'#EF4444', secondary:'#0F1A2E' } },
          }}/>
        </QueryClientProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
)
