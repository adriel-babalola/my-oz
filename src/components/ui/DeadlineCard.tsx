import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarDays, Check, MapPin, Pencil, ShieldCheck, Tag, Trash2, X } from 'lucide-react'
import { daysLeft, dueLabel, dueToneClasses, formatDueLong } from '../../lib/dates'
import { useOzStore } from '../../store/useOzStore'
import type { Deadline } from '../../types/deadline'

const confidenceClass = {
  high: 'border-gold/40 bg-gold/15 text-gold-deep',
  medium: 'border-sand/70 bg-white/50 text-ink-soft',
  low: 'border-sand/60 bg-ink/5 text-muted',
} as const

interface DeadlinePanelProps {
  deadline: Deadline
  onClose: () => void
  onRemove: () => void
}

function DeadlinePanel({ deadline, onClose, onRemove }: DeadlinePanelProps) {
  const updateDeadline = useOzStore((state) => state.updateDeadline)
  const showToast = useOzStore((state) => state.showToast)
  const [editing, setEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState(deadline.title)
  const [draftDescription, setDraftDescription] = useState(deadline.description)
  const [draftDueDate, setDraftDueDate] = useState(deadline.dueDate)
  const [editError, setEditError] = useState<string | null>(null)

  const label = dueLabel(deadline.dueDate)
  const days = daysLeft(deadline.dueDate)

  function startEditing() {
    setDraftTitle(deadline.title)
    setDraftDescription(deadline.description)
    setDraftDueDate(deadline.dueDate)
    setEditError(null)
    setEditing(true)
  }

  function handleSave() {
    const title = draftTitle.trim()
    if (!title) {
      setEditError('Give this marker a title.')
      return
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(draftDueDate)) {
      setEditError('Choose a due date.')
      return
    }

    updateDeadline(deadline.id, {
      title,
      description: draftDescription.trim(),
      dueDate: draftDueDate,
    })
    setEditing(false)
    showToast('Marker updated.', 'success')
  }

  return (
    <div className="relative overflow-hidden rounded-[32px] border border-white/70 bg-parchment/95 shadow-glass backdrop-blur-2xl">
      <div className="h-1 w-full bg-gradient-to-r from-gold-deep via-gold-light to-gold-deep" />
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-gold/15 blur-2xl"
        aria-hidden="true"
      />

      <button
        type="button"
        onClick={onClose}
        aria-label="Close deadline"
        className="icon-button absolute right-4 top-4 z-10 h-8 w-8"
      >
        <X size={15} />
      </button>

      <div className="oz-scrollbar max-h-[calc(100svh-2rem)] overflow-y-auto px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
        <div className="flex flex-wrap items-center gap-1.5 pr-9">
          <span className={`pill ${confidenceClass[deadline.confidence]}`}>
            {deadline.verified && <ShieldCheck size={11} />}
            {deadline.confidence} confidence
          </span>
          <span className={`pill ${dueToneClasses[label.tone]}`}>{label.text}</span>
          {deadline.source === 'Sample deadline' && (
            <span className="pill border-sand/70 bg-white/50 text-muted">
              <Tag size={10} className="text-gold-deep" />
              sample
            </span>
          )}
        </div>

        {editing ? (
          <div className="mt-4 space-y-3">
            <p className="eyebrow">Fix this marker</p>

            <label className="block">
              <span className="label-overline">Title</span>
              <input
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                className="field mt-1.5 h-11 px-3"
                autoFocus
              />
            </label>

            <label className="block">
              <span className="label-overline">Due date</span>
              <input
                type="date"
                value={draftDueDate}
                onChange={(event) => setDraftDueDate(event.target.value)}
                className="field mt-1.5 h-11 px-3"
              />
            </label>

            <label className="block">
              <span className="label-overline">Details</span>
              <textarea
                value={draftDescription}
                onChange={(event) => setDraftDescription(event.target.value)}
                rows={4}
                className="field mt-1.5 resize-none px-3 py-2.5"
              />
            </label>

            {editError && (
              <p role="alert" className="text-xs font-medium text-gold-deep">
                {editError}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button type="button" onClick={handleSave} className="btn-gold px-4 py-2.5 text-xs">
                <Check size={14} />
                Save changes
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="btn-quiet px-4 py-2.5 text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <h3 className="mt-3 font-serif text-2xl font-semibold leading-tight tracking-[-0.02em] text-ink">
              {deadline.title}
            </h3>

            <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-medium text-muted">
              <CalendarDays size={14} className="text-gold-deep" />
              {formatDueLong(deadline.dueDate)}
              <span className="text-sand">·</span>
              <MapPin size={13} className="text-gold-deep" />
              {days < 0 ? 'behind you' : days === 0 ? 'right here' : `${days} days down the road`}
            </div>

            <p className="oz-scrollbar mt-3 max-h-32 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
              {deadline.description || 'No description was included.'}
            </p>

            <details className="group mt-4 rounded-2xl border border-sand/60 bg-white/45 px-3.5 py-2.5">
              <summary className="cursor-pointer list-none text-[11px] font-semibold text-ink-soft marker:hidden">
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-gold-deep transition group-open:rotate-90">›</span>
                  Source text
                </span>
              </summary>
              <p className="oz-scrollbar mt-2 max-h-24 overflow-y-auto whitespace-pre-wrap text-[11px] leading-relaxed text-muted">
                {deadline.source}
              </p>
            </details>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={startEditing}
                className="btn-quiet px-3 py-2.5 text-xs"
              >
                <Pencil size={14} />
                Edit
              </button>
              <button
                type="button"
                onClick={onRemove}
                className="btn-quiet px-3 py-2.5 text-xs hover:border-gold-deep/30 hover:bg-gold-deep/10 hover:text-gold-deep"
              >
                <Trash2 size={14} />
                Remove
              </button>
              <button type="button" onClick={onClose} className="btn-gold ml-auto px-4 py-2.5 text-xs">
                Keep walking
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export function DeadlineCard() {
  const deadlines = useOzStore((state) => state.deadlines)
  const selectedDeadlineId = useOzStore((state) => state.selectedDeadlineId)
  const selectDeadline = useOzStore((state) => state.selectDeadline)
  const removeDeadline = useOzStore((state) => state.removeDeadline)
  const showToast = useOzStore((state) => state.showToast)
  const sidebarOpen = useOzStore((state) => state.sidebarOpen)
  const aiPanelOpen = useOzStore((state) => state.aiPanelOpen)

  const deadline = deadlines.find((item) => item.id === selectedDeadlineId)
  const visible = Boolean(deadline) && !sidebarOpen && !aiPanelOpen

  function handleRemove() {
    if (!deadline) return
    if (!window.confirm(`Remove “${deadline.title}” from the road?`)) return
    removeDeadline(deadline.id)
    showToast('Marker removed from the road.', 'info')
  }

  return (
    <AnimatePresence>
      {visible && deadline && (
        <motion.div
          key={deadline.id}
          initial={{ opacity: 0, scale: 0.94, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 24 }}
          transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-4 left-1/2 z-40 w-[92vw] max-w-lg -translate-x-1/2 sm:bottom-7"
        >
          <DeadlinePanel
            key={deadline.id}
            deadline={deadline}
            onClose={() => selectDeadline(null)}
            onRemove={handleRemove}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
