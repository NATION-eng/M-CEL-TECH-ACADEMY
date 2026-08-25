import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuthStore, type UserRole } from '../store/auth.store'
import { authAPI } from '../services/api'

const ROLE_REDIRECT: Record<UserRole, string> = {
  student: '/student/dashboard',
  instructor: '/instructor/dashboard',
  admin: '/admin/dashboard',
  super_admin: '/superadmin/dashboard',
}

interface Props {
  /** Small copy shown above the button, e.g. "Sign in" or "Sign up" */
  label?: string
}

/**
 * Renders Google's official "Sign in with Google" button (via the ID-token /
 * One Tap flow) and exchanges the resulting credential with our backend.
 * Silently renders nothing if VITE_GOOGLE_CLIENT_ID isn't configured, so
 * pages using this component still work in environments without it set up.
 */
export default function GoogleAuthButton({ label = 'Continue with Google' }: Props) {
  const { setAuth } = useAuthStore()
  const nav = useNavigate()

  if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) return null

  const handleSuccess = async (resp: CredentialResponse) => {
    if (!resp.credential) {
      toast.error('Google sign-in did not return a credential.')
      return
    }
    try {
      const { data } = await authAPI.google(resp.credential)
      const { user, accessToken, refreshToken } = data.data
      setAuth(user, accessToken, refreshToken, true)
      toast.success(data.message || 'Signed in with Google')
      nav(ROLE_REDIRECT[user.role as UserRole] ?? '/')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Google sign-in failed. Please try again.'
      toast.error(msg)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-xs text-slate-500 uppercase tracking-wide">{label}</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>
      <div className="flex justify-center [&>div]:w-full">
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={() => toast.error('Google sign-in failed. Please try again.')}
          theme="filled_black"
          shape="pill"
          width="100%"
          useOneTap={false}
        />
      </div>
    </div>
  )
}
