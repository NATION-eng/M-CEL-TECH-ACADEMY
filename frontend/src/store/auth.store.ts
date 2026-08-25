import { create } from 'zustand'
import { persist, StateStorage } from 'zustand/middleware'

export type UserRole = 'student'|'instructor'|'admin'|'super_admin'

export interface AuthUser {
  _id: string
  firstName: string
  lastName: string
  email: string
  role: UserRole
  profilePicture?: string
  phone?: string
  bio?: string
  skills?: string[] | string
  githubUrl?: string
  linkedinUrl?: string
  portfolioUrl?: string
  studentId?: string
  specializations?: string[] | string
  instructorId?: string
}

interface AuthState {
  user: AuthUser|null
  accessToken: string|null
  refreshToken: string|null
  isAuthenticated: boolean
  setAuth: (u: AuthUser, at: string, rt: string, rememberMe?: boolean) => void
  updateUser: (u: Partial<AuthUser>) => void
  clearAuth: () => void
}

const REMEMBER_FLAG_KEY = 'mv-remember-me'

// "Remember me" unchecked means the session should NOT survive closing the
// browser. Zustand's persist middleware needs one storage engine chosen up
// front, so this adapter picks localStorage vs sessionStorage per-call based
// on a flag that itself always lives in localStorage (it has to live
// somewhere durable to be readable before the store rehydrates).
const conditionalStorage: StateStorage = {
  getItem: (name) => {
    const remembered = localStorage.getItem(REMEMBER_FLAG_KEY) === 'true'
    return (remembered ? localStorage : sessionStorage).getItem(name)
  },
  setItem: (name, value) => {
    const remembered = localStorage.getItem(REMEMBER_FLAG_KEY) === 'true'
    if (remembered) {
      sessionStorage.removeItem(name)
      localStorage.setItem(name, value)
    } else {
      localStorage.removeItem(name)
      sessionStorage.setItem(name, value)
    }
  },
  removeItem: (name) => {
    localStorage.removeItem(name)
    sessionStorage.removeItem(name)
  },
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null, accessToken: null, refreshToken: null, isAuthenticated: false,
      setAuth: (user, accessToken, refreshToken, rememberMe) => {
        if (rememberMe !== undefined) {
          localStorage.setItem(REMEMBER_FLAG_KEY, rememberMe ? 'true' : 'false')
        }
        set({ user, accessToken, refreshToken, isAuthenticated: true })
      },
      updateUser: (updates) => set(s => ({ user: s.user ? { ...s.user, ...updates } : null })),
      clearAuth: () => {
        localStorage.removeItem(REMEMBER_FLAG_KEY)
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false })
      },
    }),
    {
      name: 'mv-auth',
      storage: { getItem: async (n) => { const v = conditionalStorage.getItem(n); return v ? JSON.parse(v as string) : null }, setItem: async (n, v) => conditionalStorage.setItem(n, JSON.stringify(v)), removeItem: async (n) => conditionalStorage.removeItem(n) },
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken, refreshToken: s.refreshToken, isAuthenticated: s.isAuthenticated } as unknown as AuthState),
    }
  )
)
