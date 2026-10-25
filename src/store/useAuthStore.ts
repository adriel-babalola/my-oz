import { create } from 'zustand'
import { clearAuthToken, readAuthToken, saveAuthToken } from '../lib/authToken'
import type { AuthUser, LoginResponse, MeResponse } from '../types/auth'

type AuthStatus = 'checking' | 'signed-out' | 'signed-in'

interface AuthState {
  status: AuthStatus
  token: string | null
  user: AuthUser | null
  error: string | null
  bootstrap: () => Promise<void>
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  expire: () => void
}

let bootstrapping = false

export const useAuthStore = create<AuthState>((set) => ({
  status: 'checking',
  token: readAuthToken(),
  user: null,
  error: null,

  bootstrap: async () => {
    if (bootstrapping) return
    bootstrapping = true

    const token = readAuthToken()

    if (!token) {
      set({ status: 'signed-out', token: null, user: null })
      bootstrapping = false
      return
    }

    try {
      const response = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) throw new Error('Session is no longer valid.')

      const payload = (await response.json()) as MeResponse
      set({ status: 'signed-in', token, user: payload.user, error: null })
    } catch {
      clearAuthToken()
      set({ status: 'signed-out', token: null, user: null, error: null })
    } finally {
      bootstrapping = false
    }
  },

  login: async (username, password) => {
    set({ error: null })

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const payload = (await response.json().catch(() => null)) as
        | (LoginResponse & { error?: string })
        | null

      if (!response.ok || !payload?.token || !payload.user) {
        set({ error: payload?.error ?? 'That username or password is not right.' })
        return false
      }

      saveAuthToken(payload.token)
      set({
        status: 'signed-in',
        token: payload.token,
        user: payload.user,
        error: null,
      })
      return true
    } catch {
      set({ error: 'The road is unreachable. Check your connection and try again.' })
      return false
    }
  },

  logout: () => {
    void fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    clearAuthToken()
    set({ status: 'signed-out', token: null, user: null, error: null })
  },

  expire: () => {
    clearAuthToken()
    set({
      status: 'signed-out',
      token: null,
      user: null,
      error: 'Your session expired. Sign in again.',
    })
  },
}))
