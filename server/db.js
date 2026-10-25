import { MongoClient } from 'mongodb'

const DEFAULT_DB = 'my-oz'

let client = null
let database = null
let status = 'idle'
let lastError = null

function mongoUri() {
  return process.env.MONGODB_URI?.trim() || ''
}

function dbNameFromUri(uri) {
  const match = uri.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?/#]+)/)
  if (!match?.[1]) return DEFAULT_DB
  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

export function getMongoConfig() {
  const uri = mongoUri()
  return {
    configured: Boolean(uri),
    uri,
    dbName: process.env.MONGODB_DB?.trim() || dbNameFromUri(uri),
  }
}

export function getMongoDatabase() {
  return database
}

export function getMongoStatus() {
  const configured = Boolean(mongoUri())
  return {
    configured,
    connected: Boolean(database),
    status: configured ? status : 'not-configured',
    name: database?.databaseName ?? null,
    error: lastError,
  }
}

export function mongoTarget() {
  const uri = mongoUri()
  if (!uri) return null

  const afterProtocol = uri.replace(/^mongodb(?:\+srv)?:\/\//, '').split('/')[0]
  const host = afterProtocol.includes('@') ? afterProtocol.split('@').pop() : afterProtocol
  return host || 'configured host'
}

function safeErrorMessage(error) {
  const message = error instanceof Error ? error.message : String(error)
  return message.replace(/\/\/[^@\s]+@/g, '//***@')
}

export async function connectMongo() {
  const { uri, dbName } = getMongoConfig()

  if (!uri) {
    status = 'not-configured'
    lastError = null
    return null
  }

  if (database) return database

  status = 'connecting'
  lastError = null
  client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 8_000,
    connectTimeoutMS: 8_000,
    family: 4,
  })

  try {
    await client.connect()
    database = client.db(dbName)
    await database.command({ ping: 1 })
    status = 'connected'
    return database
  } catch (error) {
    status = 'error'
    lastError = safeErrorMessage(error)
    await client.close().catch(() => {})
    client = null
    database = null
    throw error
  }
}

export async function closeMongo() {
  if (client) {
    await client.close().catch(() => {})
    client = null
  }
  database = null
  if (mongoUri()) status = 'closed'
}
