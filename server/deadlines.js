import crypto from 'node:crypto'
import { getMongoDatabase } from './db.js'

const COLLECTION = 'deadlines'
const CONFIDENCE = new Set(['high', 'medium', 'low'])

function badRequest(message) {
  const error = new Error(message)
  error.status = 400
  return error
}

function storageUnavailable() {
  const error = new Error('Cloud storage is offline. Your changes stay on this device for now.')
  error.status = 503
  return error
}

function collection() {
  const database = getMongoDatabase()
  if (!database) throw storageUnavailable()
  return database.collection(COLLECTION)
}

function validDueDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00`)
  return !Number.isNaN(date.getTime())
}

function clampProgress(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0.5
  return Math.min(1, Math.max(0, value))
}

function cleanDeadline(input) {
  if (!input || typeof input !== 'object') throw badRequest('A deadline payload is required.')

  const title = typeof input.title === 'string' ? input.title.trim().slice(0, 120) : ''
  const description =
    typeof input.description === 'string' ? input.description.trim().slice(0, 900) : ''
  const dueDate = typeof input.dueDate === 'string' ? input.dueDate.trim() : ''

  if (!title) throw badRequest('Give this deadline a title.')
  if (!validDueDate(dueDate)) throw badRequest('Use a valid due date in YYYY-MM-DD format.')

  return {
    title,
    description,
    dueDate,
    source: typeof input.source === 'string' ? input.source.trim().slice(0, 6000) : '',
    confidence: CONFIDENCE.has(input.confidence) ? input.confidence : 'low',
    verified: Boolean(input.verified),
    curveT: clampProgress(input.curveT),
  }
}

function publicDeadline(document) {
  return {
    id: document.id,
    title: document.title,
    description: document.description,
    dueDate: document.dueDate,
    source: document.source,
    confidence: document.confidence,
    verified: document.verified,
    curveT: document.curveT,
  }
}

export async function listDeadlines(owner) {
  const documents = await collection().find({ owner }).sort({ dueDate: 1, createdAt: 1 }).toArray()
  return documents.map(publicDeadline)
}

export async function createDeadline(owner, input) {
  const deadline = cleanDeadline(input)
  const id =
    typeof input.id === 'string' && input.id.trim()
      ? input.id.trim().slice(0, 80)
      : crypto.randomUUID()
  const now = new Date()

  const document = {
    ...deadline,
    id,
    owner,
    createdAt: now,
    updatedAt: now,
  }

  await collection().insertOne(document)
  return publicDeadline(document)
}

export async function updateDeadline(owner, id, patch) {
  const existing = await collection().findOne({ owner, id })
  if (!existing) return null

  const deadline = cleanDeadline({ ...existing, ...patch })
  const updatedAt = new Date()

  await collection().updateOne(
    { owner, id },
    { $set: { ...deadline, updatedAt } },
  )

  return publicDeadline({ ...existing, ...deadline })
}

export async function deleteDeadline(owner, id) {
  const result = await collection().deleteOne({ owner, id })
  return result.deletedCount > 0
}

export async function deleteAllDeadlines(owner) {
  const result = await collection().deleteMany({ owner })
  return result.deletedCount
}
