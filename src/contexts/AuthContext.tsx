import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { api } from '../api/client'

export type Role = 'user' | 'admin'

export interface User {
  userId: string
  email: string
  role: Role
  name?: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, name?: string) => Promise<void>
  logout: () => void
  isAdmin: () => boolean
  loading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

const TOKEN_KEY = 'learning_dashboard_token'
const USER_KEY = 'learning_dashboard_user'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const persist = useCallback((t: string, u: User) => {
    localStorage.setItem(TOKEN_KEY, t)
    localStorage.setItem(USER_KEY, JSON.stringify(u))
    setToken(t)
    setUser(u)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post<{ token: string; user: User }>('/api/auth/login', { email, password })
    persist(data.token, data.user)
  }, [persist])

  const signup = useCallback(async (email: string, password: string, name?: string) => {
    const { data } = await api.post<{ token: string; user: User }>('/api/auth/signup', { email, password, name })
    persist(data.token, data.user)
  }, [persist])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
  }, [])

  const isAdmin = useCallback(() => user?.role === 'admin', [user])

  useEffect(() => {
    const t = localStorage.getItem(TOKEN_KEY)
    const u = localStorage.getItem(USER_KEY)
    if (t && u) {
      try {
        setToken(t)
        setUser(JSON.parse(u))
        api.defaults.headers.common['Authorization'] = `Bearer ${t}`
      } catch {
        logout()
      }
    }
    setLoading(false)
  }, [logout])

  useEffect(() => {
    if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    else delete api.defaults.headers.common['Authorization']
  }, [token])

  return (
    <AuthContext.Provider value={{ user, token, login, signup, logout, isAdmin, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
