import { ImageJourney } from './components/journey/ImageJourney'
import { AIPanel } from './components/ui/AIPanel'
import { DeadlineCard } from './components/ui/DeadlineCard'
import { JourneyRail } from './components/ui/JourneyRail'
import { Sidebar } from './components/ui/Sidebar'
import { Toast } from './components/ui/Toast'
import { TopBar } from './components/ui/TopBar'

export default function App() {
  return (
    <main className="relative h-[100svh] w-full overflow-hidden bg-[#1a150f] font-sans text-ink">
      <ImageJourney />

      <div
        className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_center,transparent_44%,rgba(24,17,8,0.42)_100%)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-36 bg-gradient-to-b from-[#1a150f]/50 to-transparent"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-40 bg-gradient-to-t from-[#1a150f]/45 to-transparent"
        aria-hidden="true"
      />
      <div
        className="oz-grain pointer-events-none absolute inset-0 z-10 opacity-[0.05]"
        aria-hidden="true"
      />

      <TopBar />
      <Sidebar />
      <AIPanel />
      <DeadlineCard />
      <JourneyRail />
      <Toast />
    </main>
  )
}
