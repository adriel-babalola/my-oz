import type { Deadline } from '../types/deadline'
import { apiJson } from './api'

interface DeadlineResponse {
  deadline: Deadline
}

interface DeadlinesResponse {
  deadlines: Deadline[]
}

export async function fetchDeadlines() {
  const payload = await apiJson<DeadlinesResponse>(
    '/api/deadlines',
    {},
    'Could not load your road.',
  )
  return payload.deadlines
}

export async function saveDeadline(deadline: Deadline) {
  const payload = await apiJson<DeadlineResponse>(
    '/api/deadlines',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(deadline),
    },
    'Could not save this marker.',
  )
  return payload.deadline
}

export async function patchDeadline(deadline: Deadline) {
  const payload = await apiJson<DeadlineResponse>(
    `/api/deadlines/${encodeURIComponent(deadline.id)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(deadline),
    },
    'Could not update this marker.',
  )
  return payload.deadline
}

export async function deleteDeadlineApi(id: string) {
  await apiJson<{ ok: boolean }>(
    `/api/deadlines/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
    'Could not remove this marker.',
  )
}

export async function clearDeadlinesApi() {
  await apiJson<{ ok: boolean; deleted: number }>(
    '/api/deadlines',
    { method: 'DELETE' },
    'Could not clear the road.',
  )
}
