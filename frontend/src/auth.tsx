import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  getAuthToken,
  setAuthToken,
  onSessionExpired,
  login as apiLogin,
  signup as apiSignup,
} from './api'

// The token returned by the backend only carries the user id, so we keep the
// email the user typed alongside it just to label the header.
const EMAIL_KEY = 'velocity_email'

interface AuthValue {
  token: string | null
  email: string | null
  isAuthed: boolean
  expired: boolean // the server rejected our stored token mid-session
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getAuthToken())
  const [email, setEmail] = useState<string | null>(() =>
    localStorage.getItem(EMAIL_KEY),
  )
  const [expired, setExpired] = useState(false)

  // api.ts clears the stored token when a request comes back 401; mirror that
  // here so the header stops claiming we're logged in.
  useEffect(() => {
    onSessionExpired(() => {
      setToken(null)
      localStorage.removeItem(EMAIL_KEY)
      setEmail(null)
      setExpired(true)
    })
  }, [])

  const remember = useCallback((tok: string, mail: string) => {
    setAuthToken(tok)
    setToken(tok)
    localStorage.setItem(EMAIL_KEY, mail)
    setEmail(mail)
    setExpired(false)
  }, [])

  const login = useCallback(
    async (mail: string, password: string) => {
      const { token } = await apiLogin(mail, password)
      remember(token, mail)
    },
    [remember],
  )

  const signup = useCallback(
    async (mail: string, password: string) => {
      const { token } = await apiSignup(mail, password)
      remember(token, mail)
    },
    [remember],
  )

  const logout = useCallback(() => {
    setAuthToken(null)
    setToken(null)
    localStorage.removeItem(EMAIL_KEY)
    setEmail(null)
  }, [])

  const value = useMemo(
    () => ({ token, email, isAuthed: !!token, expired, login, signup, logout }),
    [token, email, expired, login, signup, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
