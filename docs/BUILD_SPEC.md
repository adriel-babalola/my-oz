# my-oz — Build Prompt

*Give this entire doc to a fresh Claude chat (or Claude Code) as the build spec.*

## What this is

A deadline-tracking app styled as the Yellow Brick Road from The Wizard of Oz. You paste in a raw deadline (text you copied from an email, a posting, anywhere), an AI extracts and cleans it, and it appears as a circular marker along a 3D golden road that winds toward an Emerald Castle on the horizon. Scrolling flies the camera forward along the road — not a normal page scroll. Clicking a marker opens a curved card with the task, description, and days remaining.

Project name: **my-oz**. No auth yet — single user, local/session state is fine for v1.

---

## Tech stack

```bash
npm create vite@latest my-oz -- --template react-ts
cd my-oz

npm install three @react-three/fiber @react-three/drei
npm install framer-motion zustand date-fns lucide-react
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

- **React Three Fiber + drei** — the 3D road, camera, scroll rig, and HTML-in-3D markers
- **Tailwind** — all UI styling (sidebar, panel, cards, buttons)
- **Framer Motion** — slide-in/fade-in for the sidebar, AI panel, and deadline cards
- **Zustand** — small global store for: deadlines list, sidebar open/closed, AI panel open/closed, selected deadline
- **date-fns** — days-until-deadline math
- **lucide-react** — icons (menu, sparkles/wand for the AI panel, X to close)

### Why this stack for the scroll effect

Use `@react-three/drei`'s `ScrollControls` + `useScroll`. This creates an invisible scroll container in front of the canvas; `useScroll().offset` gives a dampened 0→1 value as the user scrolls, which you sample against a `THREE.CatmullRomCurve3` to move the camera **forward along the road**, not down a page. This is the standard "scroll-driven camera fly-through" pattern — confirm the exact current API on `docs.pmnd.rs/drei` before building, since drei's API shifts between versions.

---

## Visual theme

Go with a **painterly storybook-realistic** look to match your favorite reference image (the emerald castle, warm sunlit road, trees either side):

- **Palette**: gold/amber road (#F2C94C → #E8A825 gradient), deep emerald (#1B5E3F) for the castle and accents, cream/parchment (#FAF3E3) for UI surfaces, warm brown for tree trunks/shadow
- **Headings font**: a serif with a storybook feel — `Fraunces` or `Cinzel` (Google Fonts)
- **Body font**: `Inter` or `Manrope` — clean, keeps UI legible against the busy 3D scene
- **UI shapes**: large rounded corners (`rounded-2xl`/`rounded-3xl`), soft drop shadows, parchment-colored panels with a thin gold border — think "storybook page" rather than flat SaaS UI
- **Markers**: circular, gold, glowing softly (CSS `box-shadow` or a subtle pulse animation), so they read clearly against the road

---

## Honest scoping note on the 3D environment

Full photoreal 3D matching your reference images (real trees, real castle, real lighting) is a much bigger undertaking than one AI build session — that's closer to a 3D art/photogrammetry project. The pragmatic v1, buildable in one focused session:

- A **procedural stylized road**: a tube/ribbon mesh following the CatmullRomCurve3, textured gold with dark grout lines (can be a simple repeating texture, not hand-modeled bricks)
- The **castle as a 2D sprite/billboard** (`<Html>` or a textured plane) placed at the far end of the curve, using your cleaned-up reference image
- **Trees as billboarded sprites** along the sides of the road (flat images that always face the camera), not full 3D tree models
- Sky as a gradient or an environment texture from drei's `<Environment>`

This gets you the described flythrough and top-down view with real depth and parallax, without needing custom 3D modeling. Swap in fuller 3D assets later if you want.

---

## File structure

```
src/
  main.tsx
  App.tsx
  store/
    useOzStore.ts          # zustand: deadlines, panel states, selected deadline
  types/
    deadline.ts
  components/
    scene/
      Scene.tsx             # Canvas, lights, ScrollControls wrapper
      CameraRig.tsx         # the scroll -> curve -> camera logic
      Road.tsx              # tube mesh along the curve
      Castle.tsx            # billboard sprite at curve end
      Trees.tsx             # billboarded tree sprites along curve
      DeadlineMarker.tsx    # circular <Html> button at a point on the curve
    ui/
      TopBar.tsx            # menu button (opens sidebar) + sparkle button (opens AI panel)
      Sidebar.tsx           # slide-in left: full deadline list
      AIPanel.tsx           # slide-in right: paste-in textarea -> extraction
      DeadlineCard.tsx      # curved rounded card, fades in on marker click
    lib/
      extractDeadline.ts    # calls your AI extraction endpoint
```

---

## Data model

```ts
// src/types/deadline.ts
export interface Deadline {
  id: string
  title: string
  description: string
  dueDate: string          // ISO date
  source: string            // raw text or URL it was extracted from
  confidence: 'high' | 'medium' | 'low'
  verified: boolean         // set true once AI re-checks it
  curveT: number             // 0 to 1, position along the road (computed from dueDate)
}
```

`curveT` is how a deadline becomes a point on the road: map the deadline's days-until-due onto 0→1 (soonest deadlines near the start of the road, farthest near the castle), using `date-fns`'s `differenceInDays`.

---

## Key code snippets

### Zustand store

```ts
// src/store/useOzStore.ts
import { create } from 'zustand'
import { Deadline } from '../types/deadline'

interface OzState {
  deadlines: Deadline[]
  sidebarOpen: boolean
  aiPanelOpen: boolean
  selectedDeadlineId: string | null
  addDeadline: (d: Deadline) => void
  toggleSidebar: () => void
  toggleAIPanel: () => void
  selectDeadline: (id: string | null) => void
}

export const useOzStore = create<OzState>((set) => ({
  deadlines: [],
  sidebarOpen: false,
  aiPanelOpen: false,
  selectedDeadlineId: null,
  addDeadline: (d) => set((s) => ({ deadlines: [...s.deadlines, d] })),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen, aiPanelOpen: false })),
  toggleAIPanel: () => set((s) => ({ aiPanelOpen: !s.aiPanelOpen, sidebarOpen: false })),
  selectDeadline: (id) => set({ selectedDeadlineId: id }),
}))
```

### CameraRig — the scroll-driven flythrough

```tsx
// src/components/scene/CameraRig.tsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useScroll } from '@react-three/drei'
import * as THREE from 'three'

export const roadCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(3, 1.2, -20),
  new THREE.Vector3(-2, 1.1, -45),
  new THREE.Vector3(1, 1.5, -70),
  new THREE.Vector3(0, 2, -100), // castle end
])

export function CameraRig() {
  const scroll = useScroll()
  const lookTarget = useRef(new THREE.Vector3())

  useFrame(({ camera }) => {
    const t = scroll.offset // 0 -> 1, dampened
    const pos = roadCurve.getPointAt(Math.min(t, 0.99))
    const lookAheadT = Math.min(t + 0.03, 1)
    lookTarget.current.copy(roadCurve.getPointAt(lookAheadT))

    camera.position.lerp(pos, 0.15)
    camera.lookAt(lookTarget.current)
  })

  return null
}
```

### DeadlineMarker — circular button on the road

```tsx
// src/components/scene/DeadlineMarker.tsx
import { Html } from '@react-three/drei'
import { Deadline } from '../../types/deadline'
import { useOzStore } from '../../store/useOzStore'
import { roadCurve } from './CameraRig'

export function DeadlineMarker({ deadline }: { deadline: Deadline }) {
  const selectDeadline = useOzStore((s) => s.selectDeadline)
  const pos = roadCurve.getPointAt(deadline.curveT)

  return (
    <Html position={[pos.x, pos.y + 0.3, pos.z]} center distanceFactor={8}>
      <button
        onClick={() => selectDeadline(deadline.id)}
        className="h-10 w-10 rounded-full bg-amber-400 border-2 border-amber-100
                   shadow-[0_0_18px_rgba(244,196,48,0.8)] hover:scale-110
                   transition-transform"
        aria-label={deadline.title}
      />
    </Html>
  )
}
```

### DeadlineCard — the curved fade-in card on click

```tsx
// src/components/ui/DeadlineCard.tsx
import { AnimatePresence, motion } from 'framer-motion'
import { differenceInCalendarDays } from 'date-fns'
import { useOzStore } from '../../store/useOzStore'

export function DeadlineCard() {
  const { deadlines, selectedDeadlineId, selectDeadline } = useOzStore()
  const deadline = deadlines.find((d) => d.id === selectedDeadlineId)

  return (
    <AnimatePresence>
      {deadline && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 20 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50
                     w-[90vw] max-w-md rounded-[2rem] bg-[#FAF3E3]
                     border border-amber-300 shadow-2xl p-6"
        >
          <button
            onClick={() => selectDeadline(null)}
            className="absolute top-4 right-4 text-amber-700"
          >
            ✕
          </button>
          <h3 className="font-serif text-xl text-emerald-900">{deadline.title}</h3>
          <p className="mt-2 text-sm text-stone-700">{deadline.description}</p>
          <p className="mt-4 text-amber-700 font-semibold">
            {differenceInCalendarDays(new Date(deadline.dueDate), new Date())} days left
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

### Sidebar (left slide-in, full deadline list)

```tsx
// src/components/ui/Sidebar.tsx
import { motion, AnimatePresence } from 'framer-motion'
import { useOzStore } from '../../store/useOzStore'

export function Sidebar() {
  const { sidebarOpen, deadlines, selectDeadline, toggleSidebar } = useOzStore()

  return (
    <AnimatePresence>
      {sidebarOpen && (
        <motion.aside
          initial={{ x: '-100%' }}
          animate={{ x: 0 }}
          exit={{ x: '-100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 220 }}
          className="fixed left-0 top-0 h-full w-[85vw] sm:w-80 z-40
                     bg-[#FAF3E3] border-r border-amber-300 shadow-2xl p-5 overflow-y-auto"
        >
          <button onClick={toggleSidebar} className="mb-4 text-amber-700">✕ Close</button>
          <h2 className="font-serif text-lg text-emerald-900 mb-3">The Road Ahead</h2>
          <ul className="space-y-2">
            {deadlines.map((d) => (
              <li key={d.id}>
                <button
                  onClick={() => { selectDeadline(d.id); toggleSidebar() }}
                  className="w-full text-left rounded-xl p-3 bg-white/60 hover:bg-white
                             border border-amber-200"
                >
                  <p className="font-medium text-stone-800">{d.title}</p>
                  <p className="text-xs text-stone-500">{d.dueDate}</p>
                </button>
              </li>
            ))}
          </ul>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
```

### AI panel (right slide-in, paste + extract)

```tsx
// src/components/ui/AIPanel.tsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useOzStore } from '../../store/useOzStore'
import { extractDeadline } from '../../lib/extractDeadline'

export function AIPanel() {
  const { aiPanelOpen, toggleAIPanel, addDeadline } = useOzStore()
  const [raw, setRaw] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleExtract() {
    setLoading(true)
    const deadline = await extractDeadline(raw)
    addDeadline(deadline)
    setRaw('')
    setLoading(false)
    toggleAIPanel()
  }

  return (
    <AnimatePresence>
      {aiPanelOpen && (
        <motion.aside
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 220 }}
          className="fixed right-0 top-0 h-full w-[90vw] sm:w-96 z-40
                     bg-[#FAF3E3] border-l border-amber-300 shadow-2xl p-5
                     rounded-l-[2rem] flex flex-col"
        >
          <button onClick={toggleAIPanel} className="self-end text-amber-700 mb-3">✕</button>
          <h2 className="font-serif text-lg text-emerald-900 mb-2">Drop it on the Road</h2>
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="Paste the deadline, posting, or email text here..."
            className="flex-1 rounded-xl border border-amber-200 p-3 text-sm resize-none"
          />
          <button
            onClick={handleExtract}
            disabled={loading || !raw.trim()}
            className="mt-3 rounded-xl bg-emerald-800 text-amber-50 py-2.5 font-medium
                       disabled:opacity-50"
          >
            {loading ? 'Reading the signs…' : 'Extract & Place on Road'}
          </button>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
```

---

## Responsiveness notes

- Canvas/Scene fills the viewport (`w-full h-screen`); all UI is `fixed` overlay, so it doesn't fight with 3D resizing
- Sidebar/AIPanel: `w-[85vw] sm:w-80` (or `sm:w-96`) so they're nearly full-width on mobile, fixed-width on larger screens
- DeadlineCard: `w-[90vw] max-w-md`, centered — same card works at any width
- On touch devices, drei's `ScrollControls` needs touch-drag enabled (check current prop name — it's changed across versions) so the flythrough works without a mouse wheel
- Test the `<Html>` markers at small viewport sizes — `distanceFactor` may need tuning so circles don't get too large/small on mobile

---

## Build order (so it's testable at every step)

1. Scaffold Vite + Tailwind, confirm it runs
2. Static road (tube mesh on the curve) + fixed camera — just see the shape
3. Add `ScrollControls` + `CameraRig` — confirm the flythrough works on scroll
4. Add `Castle` billboard at the curve's end
5. Hardcode 2–3 fake `Deadline` objects, render `DeadlineMarker`s, confirm click opens `DeadlineCard`
6. Add `TopBar`, `Sidebar`, `AIPanel` with hardcoded data
7. Wire `extractDeadline.ts` to a real AI call (OpenAI/Anthropic/Gemini — whichever you have a key for) that returns the `Deadline` JSON shape above
8. Add `Trees` billboards and the background image/sky last — purely visual polish
9. Mobile pass: test on an actual phone, fix touch-scroll and sizing

Stop after step 7 if time is tight — that's a fully working version of what you described.
