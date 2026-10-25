import type { Confidence, Deadline, ExtractResponse } from '../types/deadline'
import { apiFetch } from './api'
import { curveTFor } from './dates'

const CONFIDENCE: Confidence[] = ['high', 'medium', 'low']
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_IMAGE_INPUT_BYTES = 12 * 1024 * 1024
const MAX_IMAGE_SIDE = 1800

function validDueDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00`)
  return !Number.isNaN(date.getTime())
}

export interface ExtractedDeadline {
  deadline: Deadline
  provider: 'gemma' | 'local'
  model?: string
  warning?: string
}

function buildExtraction(
  payload: (ExtractResponse & { error?: string }) | null,
  source: string,
): ExtractedDeadline {
  if (!payload?.deadline?.title || !validDueDate(payload.deadline.dueDate)) {
    throw new Error('The AI returned a deadline I could not read. Try rephrasing it.')
  }

  const confidence = CONFIDENCE.includes(payload.deadline.confidence)
    ? payload.deadline.confidence
    : 'low'
  const provider = payload.provider === 'gemma' ? 'gemma' : 'local'
  const dueDate = payload.deadline.dueDate

  return {
    deadline: {
      id: crypto.randomUUID(),
      title: payload.deadline.title.trim().slice(0, 120) || 'Untitled deadline',
      description: payload.deadline.description?.trim().slice(0, 900) ?? '',
      dueDate,
      source,
      confidence,
      verified: provider === 'gemma' && confidence !== 'low',
      curveT: curveTFor(dueDate),
    },
    provider,
    model: payload.model,
    warning: payload.warning,
  }
}

async function prepareImage(file: File) {
  if (!IMAGE_TYPES.includes(file.type)) {
    throw new Error('Use a JPEG, PNG, WEBP, or GIF image.')
  }

  if (file.size > MAX_IMAGE_INPUT_BYTES) {
    throw new Error('That image is too large. Use one under 12 MB.')
  }

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height))

  if (scale === 1 && file.size <= 4 * 1024 * 1024) {
    bitmap.close()
    return file
  }

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))

  const context = canvas.getContext('2d')
  if (!context) {
    bitmap.close()
    throw new Error('This browser could not prepare that image.')
  }

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result)
        else reject(new Error('This browser could not prepare that image.'))
      },
      'image/jpeg',
      0.9,
    )
  })

  return blob
}

export async function extractDeadline(raw: string): Promise<ExtractedDeadline> {
  const response = await apiFetch('/api/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: raw }),
  })

  const payload = (await response.json().catch(() => null)) as
    | (ExtractResponse & { error?: string })
    | null

  if (!response.ok) {
    throw new Error(payload?.error ?? `The road is foggy (error ${response.status}).`)
  }

  return buildExtraction(payload, raw.trim().slice(0, 6000))
}

export async function extractDeadlineFromImage(file: File): Promise<ExtractedDeadline> {
  const image = await prepareImage(file)
  const response = await apiFetch('/api/extract/image', {
    method: 'POST',
    headers: { 'Content-Type': image.type || 'image/jpeg' },
    body: image,
  })

  const payload = (await response.json().catch(() => null)) as
    | (ExtractResponse & { error?: string })
    | null

  if (!response.ok) {
    throw new Error(payload?.error ?? `The image reader is foggy (error ${response.status}).`)
  }

  return buildExtraction(payload, `Image upload: ${file.name}`)
}
