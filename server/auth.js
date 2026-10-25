import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'

const ISSUER = 'my-oz'
const AUDIENCE = 'my-oz-app'

function env(name) {
  return process.env[name]?.trim() ?? ''
}

export function getAuthConfig() {
  const username = env('AUTH_USERNAME')
  const password = env('AUTH_PASSWORD')
  const displayName = env('AUTH_DISPLAY_NAME') || username || 'Traveler'
  const jwtSecret = env('JWT_SECRET')
  const tokenTtl = env('AUTH_TOKEN_TTL') || '7d'

  return {
    username,
    password,
    displayName,
    jwtSecret,
    tokenTtl,
    configured: Boolean(username && password && jwtSecret && jwtSecret.length >= 32),
  }
}

function timingSafeEqualText(left, right) {
  const a = Buffer.from(String(left))
  const b = Buffer.from(String(right))
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

export function verifyPassword(candidate, expected) {
  if (typeof candidate !== 'string' || typeof expected !== 'string') return false
  return timingSafeEqualText(candidate, expected)
}

export function authenticate(username, password) {
  const config = getAuthConfig()
  if (!config.configured) return null

  const usernameMatches = timingSafeEqualText(username ?? '', config.username)
  const passwordMatches = verifyPassword(password, config.password)

  if (!usernameMatches || !passwordMatches) return null

  return { username: config.username, name: config.displayName }
}

export function signAuthToken(user, secret = getAuthConfig().jwtSecret, tokenTtl = getAuthConfig().tokenTtl) {
  if (!secret) throw new Error('JWT_SECRET is not configured.')

  return jwt.sign(
    { name: user.name },
    secret,
    {
      subject: user.username,
      expiresIn: tokenTtl,
      issuer: ISSUER,
      audience: AUDIENCE,
    },
  )
}

export function verifyAuthToken(token, secret = getAuthConfig().jwtSecret) {
  if (!secret) throw new Error('JWT_SECRET is not configured.')

  const payload = jwt.verify(token, secret, { issuer: ISSUER, audience: AUDIENCE })

  if (typeof payload !== 'object' || !payload.sub) {
    throw new Error('Invalid token payload.')
  }

  return {
    username: String(payload.sub),
    name: typeof payload.name === 'string' ? payload.name : String(payload.sub),
  }
}

export function readBearerToken(header) {
  if (typeof header !== 'string') return null
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || null
}

export function requireAuth(request, response, next) {
  const config = getAuthConfig()

  if (!config.configured) {
    response.status(503).json({ error: 'Authentication is not configured on this server.' })
    return
  }

  const token = readBearerToken(request.headers.authorization)

  if (!token) {
    response.status(401).json({ error: 'Sign in to continue.', code: 'AUTH_REQUIRED' })
    return
  }

  try {
    request.user = verifyAuthToken(token, config.jwtSecret)
    next()
  } catch {
    response.status(401).json({ error: 'Your session expired. Sign in again.', code: 'AUTH_EXPIRED' })
  }
}
