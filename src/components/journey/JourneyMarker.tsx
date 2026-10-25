import { CalendarDays } from 'lucide-react'
import { daysLeft, dueLabel, formatDueShort } from '../../lib/dates'
import { getRoadPoint } from '../../lib/roadPath'
import { useOzStore } from '../../store/useOzStore'
import type { Deadline } from '../../types/deadline'

interface JourneyMarkerProps {
  deadline: Deadline
  worldWidth: number
  worldHeight: number
}

export function JourneyMarker({ deadline, worldWidth, worldHeight }: JourneyMarkerProps) {
  const selectedDeadlineId = useOzStore((state) => state.selectedDeadlineId)
  const selectDeadline = useOzStore((state) => state.selectDeadline)

  const point = getRoadPoint(deadline.curveT)
  const selected = selectedDeadlineId === deadline.id
  const days = daysLeft(deadline.dueDate)
  const label = dueLabel(deadline.dueDate)
  const scale = Math.max(0.55, Math.min(1.1, point.scale)) * (selected ? 1.14 : 1)
  const pixelX = (point.percentX / 100) * worldWidth
  const pixelY = (point.percentY / 100) * worldHeight
  const countdown = days < 0 ? 'past' : days === 0 ? 'today' : days === 1 ? '1d' : `${days}d`

  return (
    <div
      className="pointer-events-none absolute"
      style={{
        left: pixelX,
        top: pixelY,
        zIndex: selected ? 34 : Math.round(20 + point.scale * 12),
        transform: `translate(-50%, -50%) scale(${scale})`,
        transformOrigin: 'center center',
      }}
    >
      <div className="group relative flex flex-col items-center">
        <button
          type="button"
          onClick={() => selectDeadline(deadline.id)}
          aria-label={`Open ${deadline.title}`}
          className={`pointer-events-auto relative grid h-11 w-11 place-items-center rounded-full border text-ink shadow-[0_0_0_1px_rgba(255,255,255,0.34)_inset,0_10px_24px_-8px_rgba(60,38,4,0.8)] transition duration-200 ease-out hover:scale-105 active:scale-95 ${
            selected
              ? 'border-gold-pale bg-gradient-to-b from-gold-pale via-gold-light to-gold'
              : 'border-gold-light/80 bg-gradient-to-b from-gold-light via-gold to-gold-deep'
          }`}
        >
          <span
            className="pointer-events-none absolute inset-0 rounded-full border border-gold-pale/70 animate-oz-pulse"
            aria-hidden="true"
          />
          <CalendarDays size={17} strokeWidth={2.2} aria-hidden="true" />
        </button>

        <span className="pointer-events-none mt-1.5 rounded-full border border-white/15 bg-ink/65 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-parchment/90 shadow-sm backdrop-blur-md">
          {countdown}
        </span>

        <div
          className={`pointer-events-none absolute bottom-[calc(100%+10px)] w-max max-w-[190px] rounded-2xl border border-white/70 bg-parchment/95 px-3 py-2 text-center shadow-lift backdrop-blur-xl transition duration-200 ${
            selected
              ? 'translate-y-0 opacity-100'
              : 'translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100'
          }`}
        >
          <p className="truncate text-xs font-semibold tracking-[-0.01em] text-ink">
            {deadline.title}
          </p>
          <p className="mt-0.5 text-[10px] font-medium text-muted">
            {formatDueShort(deadline.dueDate)} · {label.text}
          </p>
        </div>
      </div>
    </div>
  )
}
