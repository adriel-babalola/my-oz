import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { authenticate, getAuthConfig, requireAuth, signAuthToken } from './auth.js'
import { closeMongo, connectMongo, getMongoConfig, getMongoStatus, mongoTarget } from './db.js'
import {
  createDeadline,
  deleteAllDeadlines,
  deleteDeadline,
  listDeadlines,
  updateDeadline,
} from './deadlines.js'
import { extractDeadline, extractDeadlineFromImage, MAX_TEXT } from './extract.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const port = Number(process.env.PORT) || 8787
const model = process.env.OPENROUTER_MODEL?.trim() || 'google/gemma-4-26b-a4b-it:free'
const hasKey = Boolean(process.env.OPENROUTER_API_KEY?.trim())
const mongoConfig = getMongoConfig()
const authConfig = getAuthConfig()

const publicAppUrl =
  (process.env.PUBLIC_APP_URL?.trim() || 'http://localhost:8787').replace(/\/+$/, '')
const configuredOrigins = (process.env.CORS_ORIGIN?.trim() || '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean)
const allowAllOrigins = configuredOrigins.includes('*')
const allowedOrigins = new Set([
  publicAppUrl,
  ...configuredOrigins,
  'http://localhost:8787',
  'http://127.0.0.1:8787',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
])
allowedOrigins.delete('*')

function safeErrorMessage(error) {
  const message = error instanceof Error ? error.message : String(error)
  return message.replace(/\/\/[^@\s]+@/g, '//***@')
}

async function probeOpenRouter() {
  if (!hasKey) {
    console.log('[My Oz] OpenRouter not configured — offline parser active.')
    return
  }

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/key', {
        headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY?.trim()}` },
        signal: AbortSignal.timeout(8_000),
      })

      if (response.ok) {
        console.log(`[My Oz] OpenRouter connected — model ${model}`)
        return
      }

      if (attempt === 2) {
        console.warn(
          `[My Oz] OpenRouter check failed — HTTP ${response.status} (offline parser still available).`,
        )
        return
      }
    } catch (error) {
      if (attempt === 2) {
        console.warn(
          `[My Oz] OpenRouter check failed — ${safeErrorMessage(error)} (offline parser still available).`,
        )
        return
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 1_000))
  }
}

console.log(`[My Oz] Booting on port ${port}.`)
console.log(
  `[My Oz] OpenRouter — ${hasKey ? 'key found' : 'no key'} · model ${model}`,
)
console.log(
  authConfig.configured
    ? `[My Oz] Auth — JWT enabled for ${authConfig.username} · token ${authConfig.tokenTtl}`
    : '[My Oz] Auth — not configured (set AUTH_USERNAME, AUTH_PASSWORD, and JWT_SECRET).',
)
console.log(
  mongoConfig.configured
    ? `[My Oz] MongoDB — connecting to ${mongoTarget()} · db ${mongoConfig.dbName}`
    : '[My Oz] MongoDB — not configured (add MONGODB_URI to .env).',
)
console.log(
  allowAllOrigins
    ? '[My Oz] CORS — all origins allowed.'
    : `[My Oz] CORS — ${[...allowedOrigins].join(', ')}`,
)

try {
  const database = await connectMongo()
  if (database) {
    console.log(
      `[My Oz] MongoDB connected — ${mongoTarget()} · db ${getMongoStatus().name ?? mongoConfig.dbName}`,
    )
  }
} catch (error) {
  console.error(`[My Oz] MongoDB connection failed — ${safeErrorMessage(error)}`)
}

app.disable('x-powered-by')
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowAllOrigins || allowedOrigins.has(origin)) {
        callback(null, true)
        return
      }

      const error = new Error('Origin not allowed by CORS.')
      error.status = 403
      callback(error)
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86_400,
  }),
)
app.use(express.json({ limit: '64kb' }))

app.get('/api/health', (_request, response) => {
  const mongo = getMongoStatus()
  response.json({
    ok: true,
    authConfigured: authConfig.configured,
    aiConfigured: hasKey,
    provider: hasKey ? 'openrouter' : 'offline',
    model,
    database: {
      configured: mongo.configured,
      connected: mongo.connected,
      status: mongo.status,
      name: mongo.name,
    },
  })
})

app.post('/api/auth/login', (request, response) => {
  response.set('Cache-Control', 'no-store')

  if (!authConfig.configured) {
    response.status(503).json({ error: 'Authentication is not configured on this server.' })
    return
  }

  const username = typeof request.body?.username === 'string' ? request.body.username : ''
  const password = typeof request.body?.password === 'string' ? request.body.password : ''
  const user = authenticate(username, password)

  if (!user) {
    response.status(401).json({ error: 'That username or password is not right.' })
    return
  }

  response.json({ token: signAuthToken(user), user })
})

app.get('/api/auth/me', requireAuth, (request, response) => {
  response.set('Cache-Control', 'no-store')
  response.json({ user: request.user })
})

app.post('/api/auth/logout', (_request, response) => {
  response.set('Cache-Control', 'no-store')
  response.json({ ok: true })
})

app.get('/api/deadlines', requireAuth, async (request, response) => {
  const deadlines = await listDeadlines(request.user.username)
  response.json({ deadlines })
})

app.post('/api/deadlines', requireAuth, async (request, response) => {
  const deadline = await createDeadline(request.user.username, request.body)
  response.status(201).json({ deadline })
})

const updateDeadlineHandler = async (request, response) => {
  const deadline = await updateDeadline(request.user.username, request.params.id, request.body)
  if (!deadline) {
    response.status(404).json({ error: 'That marker is not on your road.' })
    return
  }
  response.json({ deadline })
}

app.patch('/api/deadlines/:id', requireAuth, updateDeadlineHandler)
app.put('/api/deadlines/:id', requireAuth, updateDeadlineHandler)

app.delete('/api/deadlines/:id', requireAuth, async (request, response) => {
  const deleted = await deleteDeadline(request.user.username, request.params.id)
  if (!deleted) {
    response.status(404).json({ error: 'That marker is not on your road.' })
    return
  }
  response.json({ ok: true })
})

app.delete('/api/deadlines', requireAuth, async (request, response) => {
  const deleted = await deleteAllDeadlines(request.user.username)
  response.json({ ok: true, deleted })
})

app.post('/api/extract', requireAuth, async (request, response) => {
  const text = typeof request.body?.text === 'string' ? request.body.text.trim() : ''

  if (!text) {
    response.status(400).json({ error: 'Paste a deadline first.' })
    return
  }

  if (text.length > MAX_TEXT) {
    response.status(413).json({ error: `That text is too long. Keep it under ${MAX_TEXT} characters.` })
    return
  }

  try {
    const result = await extractDeadline(text)
    response.json(result)
  } catch (error) {
    console.error('[My Oz] extract failed:', error)
    response.status(500).json({ error: 'The road is foggy. Try again in a moment.' })
  }
})

app.post(
  '/api/extract/image',
  requireAuth,
  express.raw({ type: 'image/*', limit: '8mb' }),
  async (request, response) => {
    const mimeType = String(request.headers['content-type'] ?? '')
      .split(';')[0]
      .trim()
      .toLowerCase()

    try {
      const result = await extractDeadlineFromImage(request.body, mimeType)
      response.json(result)
    } catch (error) {
      const status = Number(error?.status) || 502
      if (status >= 500 && status !== 503) {
        console.error(
          '[My Oz] image extract failed:',
          safeErrorMessage(error.cause ?? error),
        )
      }
      response.status(status).json({ error: safeErrorMessage(error) })
    }
  },
)

const dist = path.resolve(here, '../dist')

if (fs.existsSync(dist)) {
  app.use(express.static(dist, { index: false, maxAge: '1h' }))
  app.use((request, response, next) => {
    if (request.method !== 'GET' || request.path.startsWith('/api')) {
      next()
      return
    }
    response.sendFile(path.join(dist, 'index.html'))
  })
} else {
  app.get('/', (_request, response) => {
    response
      .type('text/plain')
      .send('My Oz API is running. Use `npm run dev` to start the Vite app.')
  })
}

app.use((error, _request, response, _next) => {
  if (error?.type === 'entity.parse.failed') {
    response.status(400).json({ error: 'That request was not valid JSON.' })
    return
  }

  if (error?.type === 'entity.too.large') {
    response.status(413).json({ error: 'That image is too large. Keep it under 8 MB.' })
    return
  }

  const status = Number(error?.status) || 500

  if (status >= 500 && status !== 503) {
    console.error('[My Oz] request failed:', safeErrorMessage(error))
  }

  response
    .status(status)
    .json({ error: status >= 500 && status !== 503 ? 'The road is foggy. Try again in a moment.' : safeErrorMessage(error) })
})

const server = app.listen(port, () => {
  const aiMode = hasKey ? `OpenRouter (${model})` : 'offline parser (no OpenRouter key)'
  console.log(`[My Oz] Server listening on http://localhost:${port} — ${aiMode}`)
  void probeOpenRouter()
})

async function shutdown(signal) {
  console.log(`[My Oz] ${signal} received — shutting down.`)
  await closeMongo()
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(1), 5_000).unref()
}

process.once('SIGINT', () => void shutdown('SIGINT'))
process.once('SIGTERM', () => void shutdown('SIGTERM'))
