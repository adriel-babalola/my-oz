interface RoadLoaderProps {
  message: string
}

export function RoadLoader({ message }: RoadLoaderProps) {
  return (
    <main className="grid min-h-[100svh] place-items-center overflow-hidden bg-[#0B3B33] px-6">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(201,162,75,0.18),transparent_38%)]"
        aria-hidden="true"
      />
      <div className="relative flex flex-col items-center text-center" role="status" aria-live="polite">
        <div className="relative h-16 w-16">
          <span
            className="absolute inset-0 rounded-full border border-[#C9A24B]/20"
            aria-hidden="true"
          />
          <span
            className="absolute inset-0 animate-spin rounded-full border border-transparent border-t-[#E3C27A]"
            aria-hidden="true"
          />
          <span
            className="absolute inset-[7px] rounded-full border border-[#C9A24B]/15"
            aria-hidden="true"
          />
        </div>

        <p className="mt-7 font-display text-3xl tracking-[0.06em] text-[#E3C27A]">My Oz</p>
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.32em] text-white/55">
          {message}
        </p>
      </div>
    </main>
  )
}
