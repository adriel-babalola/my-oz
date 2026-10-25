import { AUTH_EXPIRED_EVENT, readAuthToken } from './authToken'

const configuredApiUrl = (import.meta.env.VITE_API_URL ?? '')
  .trim()
  .replace(/\/+$/, '')
  .replace(/\/api$/, '')

export const API_BASE_URL = configuredApiUrl

export function apiUrl(path: string) {
  if (!API_BASE_URL || !path.startsWith('/')) return path
  return `${API_BASE_URL}${path}`
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  const token = readAuthToken()

  if (token) headers.set('Authorization', `Bearer ${token}`)

  const target = typeof input === 'string' ? apiUrl(input) : input
  const response = await fetch(target, { ...init, headers })

  if (response.status === 401) {
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
  }

  return response
}

export async function apiJson<T>(
  input: RequestInfo | URL,
  init: RequestInit = {},
  fallback = 'The road is foggy. Try again in a moment.',
): Promise<T> {
  const response = await apiFetch(input, init)
  const payload = (await response.json().catch(() => null)) as { error?: string } | null

  if (!response.ok) {
    throw new ApiError(payload?.error ?? fallback, response.status)
  }

  return payload as T
}
