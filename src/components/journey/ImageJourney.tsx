import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Image as ImageIcon } from 'lucide-react'
import {
  IMAGE_HEIGHT,
  IMAGE_WIDTH,
  ROAD_CONTROL_POINTS,
  buildRoadSvgPath,
  getRoadPoint,
} from '../../lib/roadPath'
import { useOzStore } from '../../store/useOzStore'
import { JourneyMarker } from './JourneyMarker'

interface Size {
  width: number
  height: number
}

interface DragState {
  pointerId: number
  startY: number
  startProgress: number
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function getViewportSize(): Size {
  if (typeof window === 'undefined') return { width: 1440, height: 900 }
  return { width: window.innerWidth, height: window.innerHeight }
}

export function ImageJourney() {
  const viewportRef = useRef<HTMLDivElement>(null)
  const worldRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const travelerRef = useRef<HTMLDivElement>(null)
  const targetRef = useRef(useOzStore.getState().targetProgress)
  const currentRef = useRef(useOzStore.getState().targetProgress)
  const enabledRef = useRef(true)
  const selectedRef = useRef(false)
  const dragRef = useRef<DragState | null>(null)

  const [size, setSize] = useState<Size>(getViewportSize)
  const [isDragging, setIsDragging] = useState(false)
  const [imageReady, setImageReady] = useState(false)
  const [calibrate] = useState(
    () =>
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('calibrate') === '1',
  )

  const deadlines = useOzStore((state) => state.deadlines)
  const targetProgress = useOzStore((state) => state.targetProgress)
  const setTargetProgress = useOzStore((state) => state.setTargetProgress)
  const overlayOpen = useOzStore(
    (state) => state.sidebarOpen || state.aiPanelOpen || state.selectedDeadlineId !== null,
  )
  const selectedDeadlineId = useOzStore((state) => state.selectedDeadlineId)

  useEffect(() => {
    targetRef.current = targetProgress
  }, [targetProgress])

  useEffect(() => {
    enabledRef.current = !overlayOpen
  }, [overlayOpen])

  useEffect(() => {
    selectedRef.current = selectedDeadlineId !== null
  }, [selectedDeadlineId])

  useEffect(() => {
    const element = viewportRef.current
    if (!element) return

    const update = () => {
      setSize({ width: element.clientWidth, height: element.clientHeight })
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    window.addEventListener('resize', update)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])

  const { worldWidth, worldHeight } = useMemo(() => {
    const aspect = IMAGE_WIDTH / IMAGE_HEIGHT
    let width = size.width
    let height = width / aspect

    if (height < size.height) {
      height = size.height
      width = height * aspect
    }

    return { worldWidth: Math.round(width), worldHeight: Math.round(height) }
  }, [size])

  const roadPath = useMemo(() => buildRoadSvgPath(200), [])
  const [travelerStart] = useState(() => getRoadPoint(useOzStore.getState().targetProgress))

  const applyCamera = useCallback(
    (progress: number) => {
      const world = worldRef.current
      if (!world) return

      const point = getRoadPoint(progress)
      const lookAhead = selectedRef.current ? point : getRoadPoint(Math.min(1, progress + 0.055))
      const mobile = size.width < 640
      const focusY = selectedRef.current ? (mobile ? 0.38 : 0.43) : mobile ? 0.5 : 0.54
      const scale = 1.08 + Math.pow(progress, 1.12) * 1.12
      const focusWorldX = (lookAhead.percentX / 100) * worldWidth
      const focusWorldY = (lookAhead.percentY / 100) * worldHeight

      let translateX = size.width * 0.5 - focusWorldX * scale
      let translateY = size.height * focusY - focusWorldY * scale

      const minX = size.width - worldWidth * scale
      const minY = size.height - worldHeight * scale
      translateX = minX > 0 ? (size.width - worldWidth * scale) / 2 : clamp(translateX, minX, 0)
      translateY = minY > 0 ? (size.height - worldHeight * scale) / 2 : clamp(translateY, minY, 0)

      world.style.transform = `translate3d(${translateX.toFixed(2)}px, ${translateY.toFixed(
        2,
      )}px, 0) scale(${scale.toFixed(4)})`

      if (travelerRef.current) {
        travelerRef.current.style.left = `${((point.percentX / 100) * worldWidth).toFixed(2)}px`
        travelerRef.current.style.top = `${((point.percentY / 100) * worldHeight).toFixed(2)}px`
      }

      if (progressRef.current) {
        progressRef.current.style.transform = `scaleX(${progress.toFixed(4)})`
      }
    },
    [size, worldWidth, worldHeight],
  )

  useEffect(() => {
    let frame = 0
    let last = performance.now()

    const tick = (now: number) => {
      const delta = Math.min(0.05, (now - last) / 1000)
      last = now

      const target = targetRef.current
      const current = currentRef.current
      const difference = target - current
      const next =
        Math.abs(difference) < 0.00025
          ? target
          : current + difference * (1 - Math.exp(-delta * 7.5))

      currentRef.current = next
      applyCamera(next)
      frame = requestAnimationFrame(tick)
    }

    applyCamera(currentRef.current)
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [applyCamera])

  const moveTo = useCallback(
    (next: number) => {
      const clamped = clamp(next, 0.04, 0.97)
      targetRef.current = clamped
      setTargetProgress(clamped)
    },
    [setTargetProgress],
  )

  useEffect(() => {
    const element = viewportRef.current
    if (!element) return

    const handleWheel = (event: WheelEvent) => {
      if (!enabledRef.current) return
      event.preventDefault()
      const rawDelta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY
      const delta = clamp(rawDelta, -80, 80) * 0.00065
      moveTo(targetRef.current + delta)
    }

    element.addEventListener('wheel', handleWheel, { passive: false })
    return () => element.removeEventListener('wheel', handleWheel)
  }, [moveTo])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!enabledRef.current) return
      const target = event.target as HTMLElement | null
      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable
      ) {
        return
      }

      if (event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === ' ') {
        event.preventDefault()
        moveTo(targetRef.current + 0.06)
      } else if (event.key === 'ArrowUp' || event.key === 'PageUp') {
        event.preventDefault()
        moveTo(targetRef.current - 0.06)
      } else if (event.key === 'Home') {
        event.preventDefault()
        moveTo(0.06)
      } else if (event.key === 'End') {
        event.preventDefault()
        moveTo(0.94)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [moveTo])

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!enabledRef.current) return
    if ((event.target as HTMLElement).closest('button, a, input, textarea')) return
    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startProgress: targetRef.current,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    setIsDragging(true)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    moveTo(drag.startProgress + (drag.startY - event.clientY) * 0.00105)
  }

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return
    dragRef.current = null
    setIsDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  return (
    <div
      ref={viewportRef}
      aria-label="Yellow Brick Road journey. Scroll, drag, or use the arrow keys to travel."
      className={`absolute inset-0 overflow-hidden bg-[#1a150f] select-none ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      style={{ touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <div
        ref={worldRef}
        className="absolute left-0 top-0 origin-top-left will-change-transform"
        style={{ width: worldWidth, height: worldHeight }}
      >
        <img
          src="/yellow-brick-road.webp"
          alt="A golden brick road winding through an enchanted valley toward the Emerald City."
          className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
            imageReady ? 'opacity-100' : 'opacity-0'
          }`}
          draggable={false}
          decoding="async"
          fetchPriority="high"
          onLoad={() => setImageReady(true)}
        />

        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(30,22,11,0.18),transparent_22%,transparent_72%,rgba(30,22,11,0.34))]"
          aria-hidden="true"
        />

        <svg
          viewBox={`0 0 ${IMAGE_WIDTH} ${IMAGE_HEIGHT}`}
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="road-trail" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#F6D98C" stopOpacity="0.9" />
              <stop offset="55%" stopColor="#D8A94C" stopOpacity="0.62" />
              <stop offset="100%" stopColor="#F0D28B" stopOpacity="0.2" />
            </linearGradient>
            <filter id="road-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="10" />
            </filter>
          </defs>

          <path
            d={roadPath}
            fill="none"
            stroke="url(#road-trail)"
            strokeWidth={calibrate ? 18 : 26}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={calibrate ? 0.75 : 0.24}
            filter="url(#road-glow)"
          />
          <path
            d={roadPath}
            fill="none"
            stroke="url(#road-trail)"
            strokeWidth={calibrate ? 7 : 5}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={calibrate ? '4 8' : '10 18'}
            opacity={calibrate ? 1 : 0.62}
          />

          {calibrate &&
            ROAD_CONTROL_POINTS.map((point, index) => (
              <g key={`${point.x}-${point.y}`}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={11}
                  fill="#211A12"
                  stroke="#F6D98C"
                  strokeWidth={3}
                />
                <text
                  x={point.x + 18}
                  y={point.y + 5}
                  fill="#FFF7E2"
                  fontSize={22}
                  fontWeight={700}
                  style={{ paintOrder: 'stroke', stroke: '#211A12', strokeWidth: 4 }}
                >
                  {index}
                </text>
              </g>
            ))}
        </svg>

        <div
          ref={travelerRef}
          className="pointer-events-none absolute z-[19] -translate-x-1/2 -translate-y-1/2"
          style={{
            left: (travelerStart.percentX / 100) * worldWidth,
            top: (travelerStart.percentY / 100) * worldHeight,
          }}
          aria-hidden="true"
        >
          <div className="relative grid h-3.5 w-3.5 place-items-center">
            <span className="absolute inset-0 rounded-full border border-gold-pale/80 animate-oz-pulse" />
            <span className="h-2 w-2 rounded-full border border-white/60 bg-gold-light shadow-[0_0_14px_rgba(232,194,107,0.9)]" />
          </div>
        </div>

        {deadlines.map((deadline) => (
          <JourneyMarker
            key={deadline.id}
            deadline={deadline}
            worldWidth={worldWidth}
            worldHeight={worldHeight}
          />
        ))}
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[2px] bg-white/10"
        aria-hidden="true"
      >
        <div
          ref={progressRef}
          className="h-full origin-left scale-x-[0.1] bg-gold/80"
          style={{ transform: 'scaleX(0.1)' }}
        />
      </div>

      {calibrate && (
        <div className="pointer-events-none absolute bottom-5 left-5 z-30 flex items-center gap-2 rounded-full border border-white/15 bg-ink/80 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-parchment/90 shadow-lift backdrop-blur-xl">
          <ImageIcon size={13} className="text-gold-light" />
          Path calibration
        </div>
      )}
    </div>
  )
}
