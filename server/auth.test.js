import assert from 'node:assert/strict'
import test from 'node:test'
import {
  authenticate,
  readBearerToken,
  signAuthToken,
  verifyAuthToken,
  verifyPassword,
} from './auth.js'

const secret = 'test-secret-that-is-long-enough-for-hs256-signing'
const testUser = { username: 'test-user', name: 'Test User' }
const testPassword = 'correct-horse-battery-staple'

test('accepts the configured password and rejects everything else', () => {
  assert.equal(verifyPassword(testPassword, testPassword), true)
  assert.equal(verifyPassword(`${testPassword}-wrong`, testPassword), false)
  assert.equal(verifyPassword('', testPassword), false)
  assert.equal(verifyPassword(undefined, testPassword), false)
})

test('signs and verifies an auth token', () => {
  const token = signAuthToken(testUser, secret, '1h')
  const user = verifyAuthToken(token, secret)

  assert.equal(user.username, testUser.username)
  assert.equal(user.name, testUser.name)
})

test('rejects a token signed with a different secret', () => {
  const token = signAuthToken(testUser, secret, '1h')

  assert.throws(() => verifyAuthToken(token, `${secret}-different`))
})

test('reads bearer authorization headers', () => {
  assert.equal(readBearerToken('Bearer abc.def.ghi'), 'abc.def.ghi')
  assert.equal(readBearerToken('bearer  token'), 'token')
  assert.equal(readBearerToken('Basic abc'), null)
  assert.equal(readBearerToken(undefined), null)
})

test('authenticates against the environment credentials', () => {
  process.env.AUTH_USERNAME = testUser.username
  process.env.AUTH_PASSWORD = testPassword
  process.env.AUTH_DISPLAY_NAME = testUser.name
  process.env.JWT_SECRET = secret

  assert.deepEqual(authenticate(testUser.username, testPassword), testUser)
  assert.equal(authenticate(testUser.username, 'wrong-password'), null)
  assert.equal(authenticate('someone-else', testPassword), null)
})
