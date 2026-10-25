import assert from 'node:assert/strict'
import test from 'node:test'
import {
  coerceDueDate,
  extractDeadline,
  extractDeadlineFromImage,
  extractLocally,
  normalizeModelDeadline,
  parseDueDate,
  parseModelJson,
} from './extract.js'

const today = new Date('2026-10-25T12:00:00Z')

test('reads an ISO deadline', () => {
  const deadline = extractLocally('Submit the robotics build log by 2026-11-03.', today)
  assert.equal(deadline.dueDate, '2026-11-03')
  assert.equal(deadline.confidence, 'high')
})

test('reads a month-name deadline and ignores a posted date', () => {
  const deadline = extractLocally(
    'Subject: EMU Scholarship\nPosted September 1, 2026. Applications close November 14, 2026.',
    today,
  )
  assert.equal(deadline.dueDate, '2026-11-14')
  assert.equal(deadline.title, 'EMU Scholarship')
})

test('reads day-first and numeric dates', () => {
  assert.equal(parseDueDate('Due 31 December 2026', today).date, '2026-12-31')
  assert.equal(parseDueDate('Due 31/12/2026', today).date, '2026-12-31')
  assert.equal(parseDueDate('Due 12/31/2026', today).date, '2026-12-31')
})

test('rolls a year-less date into the next year when needed', () => {
  assert.equal(parseDueDate('Due January 5', today).date, '2027-01-05')
  assert.equal(parseDueDate('Due November 5', today).date, '2026-11-05')
})

test('reads relative dates', () => {
  assert.equal(parseDueDate('Due tomorrow', today).date, '2026-10-26')
  assert.equal(parseDueDate('Due in 3 days', today).date, '2026-10-28')
  assert.equal(parseDueDate('Due in 2 weeks', today).date, '2026-11-08')
})

test('falls back to one week out when there is no date', () => {
  const deadline = extractLocally('Finish the poster', today)
  assert.equal(deadline.dueDate, '2026-11-01')
  assert.equal(deadline.confidence, 'low')
  assert.match(deadline.warning, /one week/i)
})

test('parses fenced and chatty model JSON', () => {
  assert.deepEqual(
    parseModelJson('```json\n{"title":"Read me","dueDate":"2026-11-01"}\n```'),
    { title: 'Read me', dueDate: '2026-11-01' },
  )
  assert.deepEqual(
    parseModelJson('Here you go: {"title":"Read me","dueDate":"2026-11-01"} — enjoy!'),
    { title: 'Read me', dueDate: '2026-11-01' },
  )
  assert.equal(parseModelJson('not json'), null)
})

test('normalizes model output and falls back for a blank date', () => {
  const normalized = normalizeModelDeadline(
    { title: '  Subject: Demo day  ', description: 'Show the app.', dueDate: '', confidence: 'low' },
    'Demo day is coming up soon',
    today,
  )
  assert.equal(normalized.title, 'Demo day')
  assert.equal(normalized.dueDate, '2026-11-01')
  assert.equal(normalized.confidence, 'low')
})

test('coerces date values from a model', () => {
  assert.equal(coerceDueDate('2026-11-03T04:00:00Z'), '2026-11-03')
  assert.equal(coerceDueDate('November 3, 2026'), '2026-11-03')
  assert.equal(coerceDueDate(''), null)
})

test('calls OpenRouter when a key is present and normalizes the response', async () => {
  const previousKey = process.env.OPENROUTER_API_KEY
  const previousModel = process.env.OPENROUTER_MODEL
  process.env.OPENROUTER_API_KEY = 'test-key'
  process.env.OPENROUTER_MODEL = 'google/gemma-4-26b-a4b-it:free'

  let calledUrl = ''
  let requestBody = null
  const fetchImpl = async (url, init) => {
    calledUrl = String(url)
    requestBody = JSON.parse(init.body)
    return new Response(
      JSON.stringify({
        model: 'google/gemma-4-26b-a4b-it:free',
        choices: [
          {
            message: {
              content:
                '```json\n{"title":"Submit demo","description":"Send the demo.","dueDate":"2026-11-14","confidence":"high"}\n```',
            },
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }

  try {
    const result = await extractDeadline('Demo is due November 14, 2026.', { fetchImpl })
    assert.equal(calledUrl, 'https://openrouter.ai/api/v1/chat/completions')
    assert.equal(requestBody.model, 'google/gemma-4-26b-a4b-it:free')
    assert.equal(result.provider, 'gemma')
    assert.equal(result.deadline.title, 'Submit demo')
    assert.equal(result.deadline.dueDate, '2026-11-14')
    assert.equal(result.warning, undefined)
  } finally {
    if (previousKey === undefined) delete process.env.OPENROUTER_API_KEY
    else process.env.OPENROUTER_API_KEY = previousKey
    if (previousModel === undefined) delete process.env.OPENROUTER_MODEL
    else process.env.OPENROUTER_MODEL = previousModel
  }
})

test('falls back to the local parser when OpenRouter fails', async () => {
  const previousKey = process.env.OPENROUTER_API_KEY
  process.env.OPENROUTER_API_KEY = 'test-key'

  const fetchImpl = async () =>
    new Response(JSON.stringify({ error: 'rate limited' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    })

  try {
    const result = await extractDeadline('Submit the poster by 2026-11-02.', { fetchImpl })
    assert.equal(result.provider, 'local')
    assert.equal(result.deadline.dueDate, '2026-11-02')
    assert.match(result.warning, /offline parser/i)
  } finally {
    if (previousKey === undefined) delete process.env.OPENROUTER_API_KEY
    else process.env.OPENROUTER_API_KEY = previousKey
  }
})

test('sends an uploaded image to the vision model and normalizes the result', async () => {
  const previousKey = process.env.OPENROUTER_API_KEY
  const previousVisionModel = process.env.OPENROUTER_VISION_MODEL
  process.env.OPENROUTER_API_KEY = 'test-key'
  process.env.OPENROUTER_VISION_MODEL = 'vision/test-model'

  let requestBody = null
  const fetchImpl = async (_url, init) => {
    requestBody = JSON.parse(init.body)
    return new Response(
      JSON.stringify({
        model: 'vision/test-model',
        choices: [
          {
            message: {
              content:
                '{"title":"Pitch night","description":"Present the demo.","dueDate":"2026-11-20","confidence":"high"}',
            },
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }

  try {
    const result = await extractDeadlineFromImage(
      Buffer.from('fake-image'),
      'image/png',
      { fetchImpl },
    )
    const userMessage = requestBody.messages.at(-1)

    assert.equal(requestBody.model, 'vision/test-model')
    assert.equal(userMessage.content[1].type, 'image_url')
    assert.match(userMessage.content[1].image_url.url, /^data:image\/png;base64,/)
    assert.equal(result.provider, 'gemma')
    assert.equal(result.deadline.title, 'Pitch night')
    assert.equal(result.deadline.dueDate, '2026-11-20')
  } finally {
    if (previousKey === undefined) delete process.env.OPENROUTER_API_KEY
    else process.env.OPENROUTER_API_KEY = previousKey
    if (previousVisionModel === undefined) delete process.env.OPENROUTER_VISION_MODEL
    else process.env.OPENROUTER_VISION_MODEL = previousVisionModel
  }
})

test('rejects an unsupported image type before calling the model', async () => {
  const previousKey = process.env.OPENROUTER_API_KEY
  process.env.OPENROUTER_API_KEY = 'test-key'

  try {
    await assert.rejects(
      () => extractDeadlineFromImage(Buffer.from('fake'), 'image/bmp'),
      (error) => error.status === 415 && /JPEG/.test(error.message),
    )
  } finally {
    if (previousKey === undefined) delete process.env.OPENROUTER_API_KEY
    else process.env.OPENROUTER_API_KEY = previousKey
  }
})

test('reports a missing key for image analysis', async () => {
  const previousKey = process.env.OPENROUTER_API_KEY
  delete process.env.OPENROUTER_API_KEY

  try {
    await assert.rejects(
      () => extractDeadlineFromImage(Buffer.from('fake'), 'image/png'),
      (error) => error.status === 503 && /OPENROUTER_API_KEY/.test(error.message),
    )
  } finally {
    if (previousKey !== undefined) process.env.OPENROUTER_API_KEY = previousKey
  }
})

test('falls back to a second vision model when the first is rate-limited', async () => {
  const previousKey = process.env.OPENROUTER_API_KEY
  const previousVisionModel = process.env.OPENROUTER_VISION_MODEL
  process.env.OPENROUTER_API_KEY = 'test-key'
  process.env.OPENROUTER_VISION_MODEL = 'vision/primary'

  const models = []
  const fetchImpl = async (_url, init) => {
    const requestBody = JSON.parse(init.body)
    models.push(requestBody.model)

    if (requestBody.model === 'vision/primary') {
      return new Response(JSON.stringify({ error: 'rate limited' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({
        model: requestBody.model,
        choices: [
          {
            message: {
              content:
                '{"title":"Photo deadline","description":"From an image.","dueDate":"2026-12-01","confidence":"medium"}',
            },
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }

  try {
    const result = await extractDeadlineFromImage(Buffer.from('fake-image'), 'image/jpeg', {
      fetchImpl,
    })
    assert.deepEqual(models, ['vision/primary', 'nvidia/nemotron-3.5-super-vl:free'])
    assert.equal(result.model, 'nvidia/nemotron-3.5-super-vl:free')
    assert.equal(result.deadline.title, 'Photo deadline')
    assert.equal(result.deadline.dueDate, '2026-12-01')
  } finally {
    if (previousKey === undefined) delete process.env.OPENROUTER_API_KEY
    else process.env.OPENROUTER_API_KEY = previousKey
    if (previousVisionModel === undefined) delete process.env.OPENROUTER_VISION_MODEL
    else process.env.OPENROUTER_VISION_MODEL = previousVisionModel
  }
})

test('rejects an image with no readable deadline instead of inventing one', async () => {
  const previousKey = process.env.OPENROUTER_API_KEY
  process.env.OPENROUTER_API_KEY = 'test-key'

  const fetchImpl = async (_url, init) => {
    const requestBody = JSON.parse(init.body)
    return new Response(
      JSON.stringify({
        model: requestBody.model,
        choices: [
          {
            message: {
              content:
                '{"title":"","description":"","dueDate":"","confidence":"low"}',
            },
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }

  try {
    await assert.rejects(
      () => extractDeadlineFromImage(Buffer.from('fake-image'), 'image/png', { fetchImpl }),
      (error) => error.status === 422 && /could not find a deadline/i.test(error.message),
    )
  } finally {
    if (previousKey === undefined) delete process.env.OPENROUTER_API_KEY
    else process.env.OPENROUTER_API_KEY = previousKey
  }
})
