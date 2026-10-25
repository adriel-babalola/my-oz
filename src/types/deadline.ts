export type Confidence = 'high' | 'medium' | 'low'

export interface Deadline {
  id: string
  title: string
  description: string
  dueDate: string
  source: string
  confidence: Confidence
  verified: boolean
  curveT: number
}

export type DeadlinePatch = Pick<Deadline, 'title' | 'description' | 'dueDate'>

export interface DeadlineDraft {
  title: string
  description: string
  dueDate: string
  confidence: Confidence
  warning?: string
}

export interface ExtractResponse {
  deadline: DeadlineDraft
  provider: 'gemma' | 'local'
  model?: string
  warning?: string
}

export interface HealthResponse {
  ok: boolean
  aiConfigured: boolean
  provider: 'openrouter' | 'offline'
  model: string
}

export type ToastTone = 'success' | 'error' | 'info'

export interface ToastMessage {
  id: number
  message: string
  tone: ToastTone
}
