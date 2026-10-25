import { useRef } from 'react'
import { ChevronLeft, ChevronRight, Mouse } from 'lucide-react'
import { useOzStore } from '../../store/useOzStore'

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export function JourneyRail() {
  const deadlines = useOzStore((state) => state.deadlines)
  const targetProgress = useOzStore((state) => state.targetProgress)
  const setTargetProgress = useOzStore((state) => state.setTargetProgress)
  const selectDeadline = useOzStore((state) => state.selectDeadline)
  const selectedDeadlineId = useOzStore((state) => state.selectedDeadlineId)
  const sidebarOpen = useOzStore((state) => state.sidebarOpen)
  const aiPanelOpen = useOzStore((state) => state.aiPanelOpen)
  const railRef = useRef<HTMLDivElement>(null)

  if (selectedDeadlineId || sidebarOpen || aiPanelOpen) return null

  function seek(clientX: number) {
    const rect = railRef.current?.getBoundingClientRect()
    if (!rect) return
    setTargetProgress(clamp((clientX - rect.left) / rect.width, 0.04, 0.97))
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest('[data-tick]')) return
    event.currentTarget.setPointerCapture(event.pointerId)
    seek(event.clientX)
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) seek(event.clientX)
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const step = 0.04
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      event.stopPropagation()
      setTargetProgress(clamp(targetProgress - step, 0.04, 0.97))
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      event.stopPropagation()
      setTargetProgress(clamp(targetProgress + step, 0.04, 0.97))
    } else if (event.key === 'Home') {
      event.preventDefault()
      event.stopPropagation()
      setTargetProgress(0.04)
    } else if (event.key === 'End') {
      event.preventDefault()
      event.stopPropagation()
      setTargetProgress(0.97)
    }
  }

  const percent = `${targetProgress * 100}%`

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-3 sm:bottom-6">
      <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-white/15 bg-ink/65 px-2 py-1.5 text-parchment/90 shadow-lift backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setTargetProgress(clamp(targetProgress - 0.05, 0.04, 0.97))}
          aria-label="Walk backward"
          className="grid h-7 w-7 place-items-center rounded-full text-parchment/75 transition hover:bg-white/10 hover:text-parchment active:scale-95"
        >
          <ChevronLeft size={15} />
        </button>

        <div
          ref={railRef}
          role="slider"
          tabIndex={0}
          aria-label="Journey progress"
          aria-valuemin={4}
          aria-valuemax={97}
          aria-valuenow={Math.round(targetProgress * 100)}
          aria-valuetext={`${Math.round(targetProgress * 100)} percent`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={handleKeyDown}
          className="relative h-8 w-32 cursor-ew-resize touch-none select-none sm:w-44"
        >
          <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/15" />
          <div
            className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-gold/80"
            style={{ width: percent }}
          />

          {deadlines.map((deadline) => (
            <button
              key={deadline.id}
              type="button"
              data-tick
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => selectDeadline(deadline.id)}
              aria-label={`Jump to ${deadline.title}`}
              title={deadline.title}
              className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-ink/30 bg-parchment/90 transition hover:scale-125 hover:bg-gold-light"
              style={{ left: `${deadline.curveT * 100}%` }}
            />
          ))}

          <div
            className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/50 bg-gold-light shadow-[0_0_0_4px_rgba(199,150,52,0.16)]"
            style={{ left: percent }}
          />
        </div>

        <button
          type="button"
          onClick={() => setTargetProgress(clamp(targetProgress + 0.05, 0.04, 0.97))}
          aria-label="Walk forward"
          className="grid h-7 w-7 place-items-center rounded-full text-parchment/75 transition hover:bg-white/10 hover:text-parchment active:scale-95"
        >
          <ChevronRight size={15} />
        </button>

        <span className="hidden items-center gap-1.5 pl-1 pr-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-parchment/60 sm:flex">
          <Mouse size={12} className="text-gold-light" />
          Travel
        </span>
      </div>
    </div>
  )
}
