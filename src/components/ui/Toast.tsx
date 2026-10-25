import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { useOzStore } from '../../store/useOzStore'

const icons = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
}

const tones = {
  success: 'border-gold-light/35 bg-ink/85',
  error: 'border-gold-deep/60 bg-ink/90',
  info: 'border-white/15 bg-ink/80',
}

const iconTones = {
  success: 'text-gold-light',
  error: 'text-gold',
  info: 'text-parchment/80',
}

export function Toast() {
  const toast = useOzStore((state) => state.toast)
  const clearToast = useOzStore((state) => state.clearToast)

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(clearToast, 5200)
    return () => window.clearTimeout(timer)
  }, [toast, clearToast])

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: -12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.97 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="fixed left-1/2 top-[5.4rem] z-[60] w-[92vw] max-w-md -translate-x-1/2 sm:top-[6.4rem]"
        >
          <div
            className={`flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-parchment shadow-glass-dark backdrop-blur-2xl ${tones[toast.tone]}`}
          >
            {(() => {
              const Icon = icons[toast.tone]
              return <Icon size={17} className={`mt-0.5 shrink-0 ${iconTones[toast.tone]}`} />
            })()}
            <p className="flex-1 text-xs font-medium leading-relaxed">{toast.message}</p>
            <button
              type="button"
              onClick={clearToast}
              aria-label="Dismiss message"
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/10 transition hover:bg-white/20"
            >
              <X size={13} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
