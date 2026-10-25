import { CalendarPlus, Map, Menu } from 'lucide-react'
import { useOzStore } from '../../store/useOzStore'

export function TopBar() {
  const deadlines = useOzStore((state) => state.deadlines)
  const sidebarOpen = useOzStore((state) => state.sidebarOpen)
  const toggleSidebar = useOzStore((state) => state.toggleSidebar)
  const openAIPanel = useOzStore((state) => state.openAIPanel)

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-start justify-between gap-3 p-3 sm:p-5">
      <div className="pointer-events-auto flex items-center gap-2">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="Open the deadline list"
          aria-expanded={sidebarOpen}
          className="grid h-11 w-11 place-items-center rounded-2xl border border-white/60 bg-parchment/85 text-ink shadow-lift backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:bg-white active:scale-95"
        >
          <Menu size={19} />
        </button>

        <div className="hidden items-center gap-2 rounded-2xl border border-white/60 bg-parchment/80 px-3 py-2.5 text-ink shadow-lift backdrop-blur-xl sm:flex">
          <Map size={15} className="text-gold-deep" />
          <span className="text-xs font-semibold tracking-wide">
            {deadlines.length} {deadlines.length === 1 ? 'marker' : 'markers'}
          </span>
        </div>
      </div>

      <div className="pointer-events-none absolute left-1/2 top-2.5 -translate-x-1/2 text-center sm:top-4">
        <p className="font-display text-xl font-semibold tracking-[0.08em] text-parchment-strong drop-shadow-[0_2px_12px_rgba(20,14,6,0.7)] sm:text-2xl">
          My Oz
        </p>
        <p className="mt-0.5 hidden text-[9px] font-medium uppercase tracking-[0.34em] text-parchment/80 drop-shadow sm:block">
          The road to the Emerald Castle
        </p>
      </div>

      <button
        type="button"
        onClick={openAIPanel}
        aria-label="Add deadline"
        className="pointer-events-auto inline-flex h-11 items-center gap-2 rounded-2xl border border-gold/40 bg-ink/80 px-3.5 text-sm font-semibold text-parchment shadow-lift backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:bg-ink/90 active:scale-95 sm:px-4"
      >
        <CalendarPlus size={17} className="text-gold-light" />
        <span className="hidden sm:inline">Add deadline</span>
        <span className="sm:hidden">Add</span>
      </button>
    </header>
  )
}
