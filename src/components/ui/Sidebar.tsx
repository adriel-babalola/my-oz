import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CalendarDays,
  CalendarPlus,
  LogOut,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react'
import { dueLabel, dueToneClasses, formatDueLong } from '../../lib/dates'
import { useAuthStore } from '../../store/useAuthStore'
import { useOzStore } from '../../store/useOzStore'
import type { Confidence } from '../../types/deadline'

const confidenceDot: Record<Confidence, string> = {
  high: 'bg-gold',
  medium: 'bg-gold/55',
  low: 'bg-muted/50',
}

export function Sidebar() {
  const sidebarOpen = useOzStore((state) => state.sidebarOpen)
  const deadlines = useOzStore((state) => state.deadlines)
  const toggleSidebar = useOzStore((state) => state.toggleSidebar)
  const selectDeadline = useOzStore((state) => state.selectDeadline)
  const openAIPanel = useOzStore((state) => state.openAIPanel)
  const clearDeadlines = useOzStore((state) => state.clearDeadlines)
  const restoreSamples = useOzStore((state) => state.restoreSamples)
  const logout = useAuthStore((state) => state.logout)

  const sorted = useMemo(
    () => [...deadlines].sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [deadlines],
  )

  function handleOpenDeadline(id: string) {
    selectDeadline(id)
    toggleSidebar()
  }

  function handleClear() {
    if (deadlines.length === 0) return
    if (window.confirm('Clear every marker from the road?')) clearDeadlines()
  }

  return (
    <AnimatePresence>
      {sidebarOpen && (
        <>
          <motion.button
            type="button"
            aria-label="Close the deadline list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleSidebar}
            className="fixed inset-0 z-40 cursor-default bg-ink/40 backdrop-blur-[3px]"
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Your deadline list"
            initial={{ x: '-105%' }}
            animate={{ x: 0 }}
            exit={{ x: '-105%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 260 }}
            className="fixed left-0 top-0 z-50 flex h-full w-[92vw] max-w-[380px] flex-col overflow-hidden rounded-r-[32px] border-r border-white/60 bg-parchment/95 shadow-glass backdrop-blur-2xl"
          >
            <div className="border-b border-sand/50 px-6 pb-5 pt-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="eyebrow">Your itinerary</p>
                  <h2 className="mt-2 font-serif text-[28px] font-semibold leading-none tracking-[-0.02em] text-ink">
                    The road ahead
                  </h2>
                  <p className="mt-2 text-xs leading-relaxed text-muted">
                    {deadlines.length === 0
                      ? 'The road is quiet.'
                      : `${deadlines.length} ${deadlines.length === 1 ? 'deadline' : 'deadlines'} between here and the castle.`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={toggleSidebar}
                  aria-label="Close"
                  className="icon-button h-9 w-9 shrink-0"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            <div className="oz-scrollbar flex-1 overflow-y-auto px-4 py-4">
              {sorted.length === 0 ? (
                <div className="mt-8 flex flex-col items-center px-4 text-center">
                  <div className="grid h-16 w-16 place-items-center rounded-full border border-gold/30 bg-gold/10 text-gold-deep">
                    <CalendarDays size={26} />
                  </div>
                  <h3 className="mt-4 font-serif text-lg font-semibold text-ink">
                    No markers yet
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    Paste an email, a posting, or a note and the road will remember it.
                  </p>
                  <button type="button" onClick={openAIPanel} className="btn-gold mt-5">
                    <CalendarPlus size={16} />
                    Add your first deadline
                  </button>
                  <button
                    type="button"
                    onClick={restoreSamples}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-gold-deep underline-offset-4 hover:underline"
                  >
                    <RotateCcw size={13} />
                    Restore sample road
                  </button>
                </div>
              ) : (
                <ul className="space-y-2">
                  {sorted.map((deadline) => {
                    const label = dueLabel(deadline.dueDate)
                    return (
                      <li key={deadline.id}>
                        <button
                          type="button"
                          onClick={() => handleOpenDeadline(deadline.id)}
                          className="group w-full rounded-2xl border border-white/70 bg-white/50 p-4 text-left shadow-sm transition duration-200 hover:bg-white/80 hover:shadow-lift"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-[15px] font-semibold tracking-[-0.01em] text-ink">
                                {deadline.title}
                              </p>
                              <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-muted">
                                <CalendarDays size={12} />
                                {formatDueLong(deadline.dueDate)}
                              </p>
                            </div>
                            <span
                              className={`pill shrink-0 whitespace-nowrap ${dueToneClasses[label.tone]}`}
                            >
                              {label.text}
                            </span>
                          </div>

                          <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-muted">
                            {deadline.description || 'No description yet.'}
                          </p>

                          <div className="mt-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${confidenceDot[deadline.confidence]}`}
                              aria-hidden="true"
                            />
                            {deadline.confidence} confidence
                            {deadline.verified && (
                              <span className="inline-flex items-center gap-1 text-gold-deep">
                                <ShieldCheck size={12} />
                                checked
                              </span>
                            )}
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            <div className="border-t border-sand/50 bg-white/30 px-5 py-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={openAIPanel}
                  className="btn-gold flex-1 py-2.5"
                >
                  <Plus size={16} />
                  Add deadline
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={deadlines.length === 0}
                  className="icon-button h-10 w-10 rounded-2xl disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Clear all deadlines"
                  title="Clear all deadlines"
                >
                  <Trash2 size={16} />
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="icon-button h-10 w-10 rounded-2xl"
                  aria-label="Sign out"
                  title="Sign out"
                >
                  <LogOut size={16} />
                </button>
              </div>
              <p className="mt-3 text-center text-[10px] leading-relaxed text-muted">
                Sooner deadlines sit closer to the start of the road.
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
