const MONTHS = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
}

const MONTH_PATTERN =
  '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)'

const DEFAULT_MODEL = 'google/gemma-4-26b-a4b-it:free'
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MAX_TEXT = 6000
const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const IMAGE_FALLBACK_MODELS = ['nvidia/nemotron-3.5-super-vl:free']

function monthIndex(value) {
  const key = String(value).toLowerCase().replace(/\.$/, '')
  return Object.hasOwn(MONTHS, key) ? MONTHS[key] : null
}

function utcNoon(year, month, day) {
  return new Date(Date.UTC(year, month, day, 12))
}

function isoOf(date) {
  return date.toISOString().slice(0, 10)
}

function toIso(year, month, day) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null
  if (month < 0 || month > 11 || day < 1 || day > 31) return null
  const date = utcNoon(year, month, day)
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month ||
    date.getUTCDate() !== day
  ) {
    return null
  }
  return isoOf(date)
}

function fullYear(value) {
  const year = Number(value)
  if (!Number.isFinite(year)) return null
  if (year >= 1000) return year
  if (year < 100) return year < 70 ? 2000 + year : 1900 + year
  return year
}

function startOfUtcDay(date) {
  return utcNoon(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

function addDaysIso(date, days) {
  const base = startOfUtcDay(date)
  base.setUTCDate(base.getUTCDate() + days)
  return isoOf(base)
}

function resolveYear(year, month, day, today) {
  if (year) return year
  const current = today.getUTCFullYear()
  const candidate = utcNoon(current, month, day)
  return candidate < startOfUtcDay(today) ? current + 1 : current
}

function normalizeText(value) {
  return String(value)
    .replaceAll(String.fromCharCode(0), '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_TEXT)
}

function cleanTitle(value) {
  let title = String(value ?? '')
    .replace(/^[\s#>*•–—-]+/, '')
    .replace(/\s+/g, ' ')
    .trim()
  title = title.replace(/^(?:subject|title|task|project|deadline)\s*[:-]\s*/i, '')
  title = title.replace(/^(?:due|date|when)\s*[:-]\s*/i, '')
  if (title.length > 90) {
    const cut = title.slice(0, 90)
    const boundary = cut.lastIndexOf(' ')
    title = `${cut.slice(0, boundary > 45 ? boundary : 90).trim()}…`
  }
  return title
}

function titleFromText(text) {
  const lines = text
    .split('\n')
    .map((line) => line.replace(/^\s*(?:[-*•>#]+|\d+[.)])\s*/, '').trim())
    .filter(Boolean)

  const named = lines.find((line) => /^(subject|title|task|project)\s*[:-]/i.test(line))
  if (named) {
    const value = cleanTitle(named.replace(/^[^:-]+[:-]\s*/, ''))
    if (value) return value
  }

  const meaningful = lines.find(
    (line) => !/^(due|deadline|date|when|location|link)\s*[:-]/i.test(line),
  )
  return cleanTitle(meaningful ?? lines[0] ?? '') || 'Untitled deadline'
}

function contextScore(text, index, hasYear, kind) {
  const before = text.slice(Math.max(0, index - 80), index).toLowerCase()
  const clue =
    /(due|deadline|submit|submission|apply|application|close|closes|closing|before|by|no later than|ends?|expires?|scheduled?)/.test(
      before,
    )
  return (clue ? 10 : 0) + (hasYear ? 3 : 0) + (kind === 'explicit' ? 2 : 0)
}

function chooseBest(candidates) {
  if (!candidates.length) return null
  return [...candidates].sort((a, b) => b.score - a.score || a.index - b.index)[0]
}

function collectExplicitDates(text, today) {
  const found = []
  const push = (date, index, hasYear) => {
    if (!date) return
    found.push({ date, index, hasYear, score: contextScore(text, index, hasYear, 'explicit') })
  }

  for (const match of text.matchAll(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/g)) {
    push(toIso(Number(match[1]), Number(match[2]) - 1, Number(match[3])), match.index ?? 0, true)
  }

  const monthDayYear = new RegExp(
    `\\b(${MONTH_PATTERN})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(20\\d{2}|\\d{2}))?\\b`,
    'gi',
  )
  for (const match of text.matchAll(monthDayYear)) {
    const month = monthIndex(match[1])
    const day = Number(match[2])
    if (month === null || day < 1 || day > 31) continue
    const year = match[3] ? fullYear(match[3]) : resolveYear(null, month, day, today)
    push(toIso(year, month, day), match.index ?? 0, Boolean(match[3]))
  }

  const dayMonthYear = new RegExp(
    `\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${MONTH_PATTERN})\\.?(?:,?\\s+(20\\d{2}|\\d{2}))?\\b`,
    'gi',
  )
  for (const match of text.matchAll(dayMonthYear)) {
    const month = monthIndex(match[2])
    const day = Number(match[1])
    if (month === null || day < 1 || day > 31) continue
    const year = match[3] ? fullYear(match[3]) : resolveYear(null, month, day, today)
    push(toIso(year, month, day), match.index ?? 0, Boolean(match[3]))
  }

  for (const match of text.matchAll(/\b(\d{1,2})[/.-](\d{1,2})[/.-](20\d{2}|\d{2})\b/g)) {
    const first = Number(match[1])
    const second = Number(match[2])
    if (first < 1 || second < 1) continue
    const month = first > 12 ? second - 1 : first - 1
    const day = first > 12 ? first : second
    const year = fullYear(match[3])
    push(toIso(year, month, day), match.index ?? 0, true)
  }

  return found
}

function collectRelativeDate(text, today) {
  const patterns = [
    { re: /\b(?:in|within)\s+(\d{1,3})\s+days?\b/i, days: (m) => Number(m[1]) },
    { re: /\b(?:in|within)\s+(\d{1,3})\s+weeks?\b/i, days: (m) => Number(m[1]) * 7 },
    { re: /\btomorrow\b/i, days: () => 1 },
    { re: /\btoday\b/i, days: () => 0 },
    { re: /\bnext\s+week\b/i, days: () => 7 },
    { re: /\bnext\s+month\b/i, days: () => 30 },
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern.re)
    if (match) {
      return { date: addDaysIso(today, pattern.days(match)), index: match.index ?? 0, hasYear: false }
    }
  }
  return null
}

export function parseDueDate(text, today = new Date()) {
  const explicit = chooseBest(collectExplicitDates(text, today))
  if (explicit) {
    return {
      date: explicit.date,
      confidence: explicit.hasYear ? 'high' : 'medium',
      source: 'explicit',
    }
  }

  const relative = collectRelativeDate(text, today)
  if (relative) {
    return { date: relative.date, confidence: 'medium', source: 'relative' }
  }

  return {
    date: null,
    confidence: 'low',
    source: 'missing',
    warning: 'No date was found, so this deadline was placed one week from today.',
  }
}

export function extractLocally(rawText, today = new Date()) {
  const text = normalizeText(rawText)
  const due = parseDueDate(text, today)
  const dueDate = due.date ?? addDaysIso(today, 7)

  return {
    title: titleFromText(text),
    description: text.slice(0, 900),
    dueDate,
    confidence: due.confidence,
    ...(due.warning ? { warning: due.warning } : {}),
  }
}

export function parseModelJson(content) {
  if (typeof content !== 'string') return null
  const trimmed = content.trim()
  if (!trimmed) return null

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced ? fenced[1].trim() : trimmed
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start === -1 || end <= start) return null

  try {
    const parsed = JSON.parse(candidate.slice(start, end + 1))
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function coerceDueDate(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null

  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) {
    return toIso(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
  }

  const parsed = parseDueDate(trimmed)
  if (parsed.date) return parsed.date

  const fallback = new Date(trimmed)
  return Number.isNaN(fallback.getTime()) ? null : isoOf(fallback)
}

const CONFIDENCE = new Set(['high', 'medium', 'low'])

export function normalizeModelDeadline(parsed, rawText, today = new Date()) {
  const local = extractLocally(rawText, today)
  const title = cleanTitle(parsed.title) || local.title
  const description =
    typeof parsed.description === 'string' && parsed.description.trim()
      ? parsed.description.trim().slice(0, 900)
      : local.description
  const dueDate = coerceDueDate(parsed.dueDate) ?? local.dueDate
  const confidence = CONFIDENCE.has(parsed.confidence) ? parsed.confidence : local.confidence

  return {
    title,
    description,
    dueDate,
    confidence,
    ...(parsed.dueDate ? {} : local.warning ? { warning: local.warning } : {}),
  }
}

function buildMessages(text, today) {
  return [
    {
      role: 'system',
      content: `You are My Oz, a precise deadline extraction engine. Today is ${today}.
Read the user's raw text and return exactly one deadline as JSON with these keys:
{"title": string (max 80 chars), "description": string (max 240 chars), "dueDate": "YYYY-MM-DD" or "", "confidence": "high" | "medium" | "low"}
Rules:
- Resolve relative dates (tomorrow, next Friday, in 3 days) against today's date.
- If several dates appear, choose the actual due/deadline date, not the date the text was posted.
- Never invent a date. If no date is present, use "" and "low".
- Keep the title short, specific, and human. Remove labels like "Subject:" or "Deadline:".
Return ONLY the JSON object. No markdown fences, no commentary.`,
    },
    { role: 'user', content: `RAW TEXT:\n"""\n${text}\n"""` },
  ]
}

function buildImageMessages(imageDataUrl, today) {
  return [
    {
      role: 'system',
      content: `You are My Oz, a precise deadline extraction engine. Today is ${today}.
Read the user's image and return exactly one deadline as JSON with these keys:
{"title": string (max 80 chars), "description": string (max 240 chars), "dueDate": "YYYY-MM-DD" or "", "confidence": "high" | "medium" | "low"}
Rules:
- Read screenshots, emails, posters, flyers, handouts, and photos of text.
- Resolve relative dates (tomorrow, next Friday, in 3 days) against today's date.
- If several dates appear, choose the actual due/deadline date, not the date the image was posted.
- Never invent a date. If no date is present, use "" and "low".
- Keep the title short, specific, and human. Remove labels like "Subject:" or "Deadline:".
Return ONLY the JSON object. No markdown fences, no commentary.`,
    },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Find the task and its due date in this image. Return the JSON object.',
        },
        { type: 'image_url', image_url: { url: imageDataUrl } },
      ],
    },
  ]
}

async function callOpenRouter(messages, model, apiKey, fetchImpl, maxTokens = 400) {
  const response = await fetchImpl(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.PUBLIC_APP_URL || 'http://localhost:8787',
      'X-Title': 'My Oz',
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_tokens: maxTokens,
      messages,
    }),
    signal: AbortSignal.timeout(30_000),
  })

  const bodyText = await response.text()
  if (!response.ok) {
    const error = new Error(`OpenRouter ${response.status}: ${bodyText.slice(0, 160)}`)
    error.status = response.status
    throw error
  }

  let payload
  try {
    payload = JSON.parse(bodyText)
  } catch {
    throw new Error('OpenRouter returned invalid JSON')
  }

  const content = payload?.choices?.[0]?.message?.content
  const parsed = parseModelJson(content)
  if (!parsed) throw new Error('The model returned an unreadable response')

  return { parsed, model: payload.model || model }
}

export async function extractDeadline(rawText, { fetchImpl = fetch } = {}) {
  const text = normalizeText(rawText)
  const local = extractLocally(text)
  const apiKey = process.env.OPENROUTER_API_KEY?.trim()
  const model = process.env.OPENROUTER_MODEL?.trim() || DEFAULT_MODEL

  if (!apiKey) {
    return {
      deadline: local,
      provider: 'local',
      model,
      warning: 'No OpenRouter key configured — used the offline parser.',
    }
  }

  const today = new Date().toISOString().slice(0, 10)
  try {
    const result = await callOpenRouter(buildMessages(text, today), model, apiKey, fetchImpl)

    return {
      deadline: normalizeModelDeadline(result.parsed, text),
      provider: 'gemma',
      model: result.model,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      deadline: local,
      provider: 'local',
      model,
      warning: `AI extraction failed (${message.slice(0, 180)}). Used the offline parser.`,
    }
  }
}

export async function extractDeadlineFromImage(
  imageBuffer,
  mimeType,
  { fetchImpl = fetch } = {},
) {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim()
  const model =
    process.env.OPENROUTER_VISION_MODEL?.trim() ||
    process.env.OPENROUTER_MODEL?.trim() ||
    DEFAULT_MODEL

  if (!apiKey) {
    const error = new Error('Image analysis needs OPENROUTER_API_KEY on the server.')
    error.status = 503
    throw error
  }

  if (!IMAGE_TYPES.has(mimeType)) {
    const error = new Error('Use a JPEG, PNG, WEBP, or GIF image.')
    error.status = 415
    throw error
  }

  if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
    const error = new Error('Choose an image first.')
    error.status = 400
    throw error
  }

  if (imageBuffer.length > MAX_IMAGE_BYTES) {
    const error = new Error('That image is too large. Keep it under 8 MB.')
    error.status = 413
    throw error
  }

  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const dataUrl = `data:${mimeType};base64,${imageBuffer.toString('base64')}`
  const models = [...new Set([model, ...IMAGE_FALLBACK_MODELS])]
  let lastError

  for (const candidate of models) {
    try {
      const result = await callOpenRouter(
        buildImageMessages(dataUrl, today),
        candidate,
        apiKey,
        fetchImpl,
        1000,
      )

      if (!cleanTitle(result.parsed.title)) {
        const error = new Error('I could not find a deadline in that image.')
        error.status = 422
        throw error
      }

      return {
        deadline: normalizeModelDeadline(result.parsed, '', now),
        provider: 'gemma',
        model: result.model,
      }
    } catch (error) {
      lastError = error
      const status = Number(error?.status)
      const retryable = !status || status === 408 || status === 429 || status >= 500
      if (!retryable) break
    }
  }

  const status = Number(lastError?.status)
  if (status === 422) throw lastError

  const message = lastError instanceof Error ? lastError.message : String(lastError)
  const friendly =
    status === 429
      ? 'The image reader is busy right now. Try again in a moment.'
      : status === 401 || status === 403
        ? 'The image reader could not authenticate with OpenRouter.'
        : status >= 500
          ? 'The image reader stumbled. Try again in a moment.'
          : `Image reading failed: ${message.slice(0, 180)}`

  const wrapped = new Error(friendly)
  wrapped.status = 502
  wrapped.cause = lastError
  throw wrapped
}

export { DEFAULT_MODEL, MAX_IMAGE_BYTES, MAX_TEXT }
