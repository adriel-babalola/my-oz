import { differenceInCalendarDays, format, parseISO } from 'date-fns'

export const ROAD_START_T = 0.06
export const ROAD_END_T = 0.94

export type DueTone = 'overdue' | 'today' | 'soon' | 'later'

function dueAtNoon(dueDate: string) {
  return parseISO(`${dueDate}T12:00:00`)
}

export function daysLeft(dueDate: string, now = new Date()) {
  return differenceInCalendarDays(dueAtNoon(dueDate), now)
}

export function curveTFor(dueDate: string, now = new Date()) {
  const days = daysLeft(dueDate, now)

  if (days <= 0) return 0.06
  if (days === 1) return 0.12
  if (days === 2) return 0.18
  if (days === 3) return 0.24
  if (days <= 5) return 0.32
  if (days <= 8) return 0.44
  if (days <= 14) return 0.58
  if (days <= 25) return 0.72
  if (days <= 45) return 0.84
  return 0.94
}

export function formatDueLong(dueDate: string) {
  return format(dueAtNoon(dueDate), 'EEE, MMM d, yyyy')
}

export function formatDueShort(dueDate: string) {
  return format(dueAtNoon(dueDate), 'MMM d')
}

export function dueLabel(dueDate: string, now = new Date()): { text: string; tone: DueTone } {
  const days = daysLeft(dueDate, now)

  if (days < 0) {
    const overdue = Math.abs(days)
    return { text: `Overdue by ${overdue} ${overdue === 1 ? 'day' : 'days'}`, tone: 'overdue' }
  }
  if (days === 0) return { text: 'Due today', tone: 'today' }
  if (days <= 7) return { text: `${days} ${days === 1 ? 'day' : 'days'} left`, tone: 'soon' }
  return { text: `${days} days left`, tone: 'later' }
}

export const dueToneClasses: Record<DueTone, string> = {
  overdue: 'border-gold-deep/35 bg-gold-deep/15 text-gold-deep',
  today: 'border-gold/45 bg-gold/20 text-ink',
  soon: 'border-gold/30 bg-gold/10 text-gold-deep',
  later: 'border-sand/70 bg-white/50 text-ink-soft',
}
