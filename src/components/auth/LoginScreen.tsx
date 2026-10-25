import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  UserRound,
} from 'lucide-react'
import { useAuthStore } from '../../store/useAuthStore'

const fieldShell =
  'mt-1.5 flex items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.055] px-4 text-white transition focus-within:border-[#E3C27A]/70 focus-within:bg-white/[0.08] focus-within:ring-4 focus-within:ring-[#C9A24B]/10'

export function LoginScreen() {
  const login = useAuthStore((state) => state.login)
  const error = useAuthStore((state) => state.error)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return

    setLoading(true)
    await login(username.trim(), password)
    setLoading(false)
    setPassword('')
  }

  return (
    <main className="relative h-[100svh] overflow-y-auto bg-[#0B3B33] lg:grid lg:grid-cols-[1.08fr_0.92fr]">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(201,162,75,0.16),transparent_40%),radial-gradient(circle_at_85%_80%,rgba(227,194,122,0.06),transparent_42%)]"
        aria-hidden="true"
      />

      <section className="relative flex min-h-[100svh] flex-col px-5 py-7 sm:px-9 sm:py-10 lg:px-14 lg:py-12 xl:px-20">
        <div className="flex items-center justify-between gap-4">
          <p className="font-display text-2xl tracking-[0.06em] text-[#E3C27A] sm:text-[28px]">
            My Oz
          </p>
          <p className="hidden text-[9px] font-semibold uppercase tracking-[0.28em] text-white/30 sm:block">
            The Yellow Brick Road of Tasks
          </p>
        </div>

        <div className="relative mx-auto mt-6 w-full max-w-[390px] overflow-hidden rounded-3xl border border-white/10 lg:hidden">
          <img
            src="/yellow-brick-road.webp"
            alt=""
            className="h-28 w-full object-cover object-center opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B3B33] via-[#0B3B33]/25 to-transparent" />
        </div>

        <div className="my-auto w-full max-w-[390px] self-center py-8 lg:py-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#C9A24B]">
            Members only
          </p>
          <h1 className="mt-4 font-display text-[44px] leading-[0.98] tracking-[-0.035em] text-[#E3C27A] sm:text-[52px]">
            Welcome back.
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-6 text-white/65">
            Sign in to walk your road and keep every task in sight.
          </p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/75">
                Username
              </span>
              <div className={fieldShell}>
                <UserRound size={17} className="shrink-0 text-[#C9A24B]" />
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  name="username"
                  autoComplete="username"
                  placeholder="Your name"
                  className="h-12 w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
                  required
                />
              </div>
            </label>

            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/75">
                Password
              </span>
              <div className={fieldShell}>
                <LockKeyhole size={17} className="shrink-0 text-[#C9A24B]" />
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Your password"
                  className="h-12 w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/45 transition hover:bg-white/10 hover:text-white"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            {error && (
              <p
                role="alert"
                className="rounded-2xl border border-[#C9A24B]/25 bg-[#C9A24B]/10 px-4 py-3 text-xs leading-relaxed text-[#F7E7BF]"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#C9A24B] px-5 text-sm font-semibold text-[#0B3B33] shadow-[0_18px_40px_-22px_rgba(201,162,75,0.7)] transition hover:bg-[#E3C27A] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Opening the road
                </>
              ) : (
                <>
                  Enter the road
                  <ArrowRight
                    size={17}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </>
              )}
            </button>
          </form>

          <p className="mt-7 text-[9px] font-semibold uppercase tracking-[0.26em] text-white/25">
            Private road. JWT secured.
          </p>
        </div>
      </section>

      <section className="relative hidden min-h-[100svh] overflow-hidden border-l border-[#C9A24B]/20 lg:block">
        <img
          src="/yellow-brick-road.webp"
          alt="A painted Yellow Brick Road winding toward the Emerald City"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,59,51,0.12)_0%,rgba(11,59,51,0.08)_42%,rgba(11,59,51,0.92)_100%)]"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(227,194,122,0.18),transparent_38%)]"
          aria-hidden="true"
        />

        <div className="absolute inset-x-0 bottom-0 p-12 xl:p-16">
          <p className="max-w-sm font-display text-4xl leading-[1.02] tracking-[-0.03em] text-[#E3C27A] xl:text-5xl">
            The road is waiting.
          </p>
          <p className="mt-4 max-w-sm text-sm leading-6 text-white/70">
            Every task becomes a marker. Every marker brings you closer to done.
          </p>
        </div>
      </section>
    </main>
  )
}
