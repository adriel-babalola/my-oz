export const AUTH_TOKEN_KEY = 'my-oz-auth-token'
export const AUTH_EXPIRED_EVENT = 'my-oz:auth-expired'

export function readAuthToken() {
  try {
    return window.localStorage.getItem(AUTH_TOKEN_KEY)
  } catch {
    return null
  }
}

export function saveAuthToken(token: string) {
  try {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token)
  } catch {
    // Storage can be unavailable in private browsing; the session still works in memory.
  }
}

export function clearAuthToken() {
  try {
    window.localStorage.removeItem(AUTH_TOKEN_KEY)
  } catch {
    // Nothing to clear.
  }
}
