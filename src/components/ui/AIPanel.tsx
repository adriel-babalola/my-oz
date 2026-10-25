import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  ImagePlus,
  Loader2,
  Mail,
  Megaphone,
  ScanText,
  StickyNote,
  X,
} from 'lucide-react'
import { apiUrl } from '../../lib/api'
import { extractDeadline, extractDeadlineFromImage } from '../../lib/extractDeadline'
import { useOzStore } from '../../store/useOzStore'
import type { HealthResponse } from '../../types/deadline'

const EXAMPLES = [
  {
    label: 'Email',
    icon: Mail,
    text: 'Subject: YSWS project submission\nHi Adriel, just a reminder that your project is due by Friday, November 14, 2026. Submit the repo link and a short demo video before 11:59pm.',
  },
  {
    label: 'Posting',
    icon: Megaphone,
    text: 'EMU Scholarship 2026 applications close October 31, 2026. Applicants must submit a personal statement, transcript, and one recommendation letter through the portal.',
  },
  {
    label: 'Note',
    icon: StickyNote,
    text: 'Robotics build log: finish the drivetrain write-up. I need to upload it in 5 days or Coach will chase me again.',
  },
]

export function AIPanel() {
  const aiPanelOpen = useOzStore((state) => state.aiPanelOpen)
  const toggleAIPanel = useOzStore((state) => state.toggleAIPanel)
  const addDeadline = useOzStore((state) => state.addDeadline)
  const showToast = useOzStore((state) => state.showToast)

  const [raw, setRaw] = useState('')
  const [loading, setLoading] = useState(false)
  const [imageLoading, setImageLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!aiPanelOpen) return
    let cancelled = false

    fetch(apiUrl('/api/health'))
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('offline'))))
      .then((data: HealthResponse) => {
        if (!cancelled) setHealth(data)
      })
      .catch(() => {
        if (!cancelled) setHealth(null)
      })

    return () => {
      cancelled = true
    }
  }, [aiPanelOpen])

  async function handleExtract() {
    if (!raw.trim() || loading) return
    setLoading(true)
    setError(null)

    try {
      const result = await extractDeadline(raw)
      addDeadline(result.deadline)
      setRaw('')
      toggleAIPanel()

      if (result.warning) {
        showToast(result.warning, 'info')
      } else {
        showToast('Deadline placed on the road.', 'success')
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Something went wrong on the road.'
      setError(message)
      showToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file || loading) return

    setLoading(true)
    setImageLoading(true)
    setError(null)

    try {
      const result = await extractDeadlineFromImage(file)
      addDeadline(result.deadline)
      setRaw('')
      toggleAIPanel()

      if (result.warning) {
        showToast(result.warning, 'info')
      } else {
        showToast('Deadline placed on the road.', 'success')
      }
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : 'Something went wrong with that image.'
      setError(message)
      showToast(message, 'error')
    } finally {
      setLoading(false)
      setImageLoading(false)
    }
  }

  const aiReady = health?.aiConfigured === true
  const modelLabel = health?.model.split('/').pop()?.replace(':free', ' · free') ?? 'Gemma 4'
  const statusDot = !health ? 'bg-muted/60' : aiReady ? 'bg-gold' : 'bg-gold-deep'

  return (
    <AnimatePresence>
      {aiPanelOpen && (
        <>
          <motion.button
            type="button"
            aria-label="Close the add deadline panel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleAIPanel}
            className="fixed inset-0 z-40 cursor-default bg-ink/40 backdrop-blur-[3px]"
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Add a deadline"
            initial={{ x: '105%' }}
            animate={{ x: 0 }}
            exit={{ x: '105%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 260 }}
            className="fixed right-0 top-0 z-50 flex h-full w-[92vw] max-w-md flex-col overflow-hidden rounded-l-[32px] border-l border-white/60 bg-parchment/95 shadow-glass backdrop-blur-2xl"
          >
            <div className="border-b border-sand/50 px-6 pb-5 pt-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="eyebrow">Ask the wizard</p>
                  <h2 className="mt-2 font-serif text-[28px] font-semibold leading-none tracking-[-0.02em] text-ink">
                    Drop it on the road
                  </h2>
                  <p className="mt-2 text-xs leading-relaxed text-muted">
                    Paste text or upload an image. Gemma pulls out the title, details, and deadline.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={toggleAIPanel}
                  aria-label="Close"
                  className="icon-button h-9 w-9 shrink-0"
                >
                  <X size={17} />
                </button>
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-2xl border border-sand/60 bg-white/50 px-3 py-2">
                <span
                  className={`h-2 w-2 rounded-full ${statusDot} ${health ? '' : 'animate-pulse'}`}
                />
                <span className="text-[11px] font-semibold text-ink">
                  {health ? (aiReady ? 'Gemma 4 ready' : 'Offline parser') : 'Checking the crystal ball…'}
                </span>
                <span className="ml-auto truncate text-[10px] font-medium text-muted">
                  {health ? modelLabel : 'OpenRouter'}
                </span>
              </div>
            </div>

            <div className="oz-scrollbar flex-1 overflow-y-auto px-6 py-5">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="deadline-raw" className="label-overline">
                  Raw text
                </label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  aria-label="Analyze an image"
                  title="Analyze an image"
                  className="grid h-8 w-8 place-items-center rounded-full border border-sand/70 bg-white/50 text-gold-deep transition hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ImagePlus size={15} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleImage}
                />
              </div>
              <textarea
                id="deadline-raw"
                value={raw}
                onChange={(event) => setRaw(event.target.value)}
                maxLength={6000}
                placeholder="Paste the deadline, posting, or email text here…"
                className="field mt-2 h-52 resize-none p-4 leading-relaxed"
              />
              <div className="mt-2 flex justify-between text-[10px] text-muted">
                <span>No formatting needed, or use the image button.</span>
                <span>{raw.length}/6000</span>
              </div>

              <div className="mt-5">
                <p className="label-overline">Try an example</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {EXAMPLES.map((example) => (
                    <button
                      key={example.label}
                      type="button"
                      onClick={() => {
                        setRaw(example.text)
                        setError(null)
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-sand/70 bg-white/50 px-3 py-1.5 text-[11px] font-semibold text-ink-soft transition hover:bg-white/85"
                    >
                      <example.icon size={13} className="text-gold-deep" />
                      {example.label}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-gold-deep/30 bg-gold-deep/10 p-3.5 text-xs leading-relaxed text-gold-deep">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              {!aiReady && health && (
                <div className="mt-5 rounded-2xl border border-gold/30 bg-gold/10 p-3.5 text-[11px] leading-relaxed text-gold-deep">
                  No OpenRouter key on the server, so the offline parser will handle dates. Add
                  <code className="mx-1 rounded bg-gold/15 px-1 py-0.5 font-mono text-[10px]">
                    OPENROUTER_API_KEY
                  </code>
                  to <code className="font-mono text-[10px]">.env</code> to use Gemma 4.
                </div>
              )}
            </div>

            <div className="border-t border-sand/50 bg-white/30 px-6 py-4">
              <button
                type="button"
                onClick={handleExtract}
                disabled={loading || !raw.trim()}
                className="btn-gold w-full rounded-2xl py-3"
              >
                {loading ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    {imageLoading ? 'Reading the image…' : 'Reading the signs…'}
                  </>
                ) : (
                  <>
                    <ScanText size={17} />
                    Extract &amp; place on road
                  </>
                )}
              </button>
              <p className="mt-3 text-center text-[10px] leading-relaxed text-muted">
                The key stays on your server. Only your text or image is sent.
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
