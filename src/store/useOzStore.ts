import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ApiError } from '../lib/api'
import { curveTFor } from '../lib/dates'
import {
  clearDeadlinesApi,
  deleteDeadlineApi,
  fetchDeadlines,
  patchDeadline,
  saveDeadline,
} from '../lib/deadlinesApi'
import { createSampleDeadlines } from '../lib/sampleDeadlines'
import type { Deadline, DeadlinePatch, ToastMessage, ToastTone } from '../types/deadline'

function sortByDue(deadlines: Deadline[]) {
  return [...deadlines].sort((a, b) => a.dueDate.localeCompare(b.dueDate))
}

function cloudMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Cloud storage is offline. Your road is saved on this device.'
}

interface OzState {
  deadlines: Deadline[]
  sidebarOpen: boolean
  aiPanelOpen: boolean
  selectedDeadlineId: string | null
  targetProgress: number
  toast: ToastMessage | null
  addDeadline: (deadline: Deadline) => void
  updateDeadline: (id: string, patch: DeadlinePatch) => void
  removeDeadline: (id: string) => void
  clearDeadlines: () => void
  restoreSamples: () => void
  loadDeadlines: () => Promise<void>
  toggleSidebar: () => void
  toggleAIPanel: () => void
  openAIPanel: () => void
  selectDeadline: (id: string | null) => void
  setTargetProgress: (progress: number) => void
  showToast: (message: string, tone?: ToastTone) => void
  clearToast: () => void
}

export const useOzStore = create<OzState>()(
  persist(
    (set, get) => ({
      deadlines: createSampleDeadlines(),
      sidebarOpen: false,
      aiPanelOpen: false,
      selectedDeadlineId: null,
      targetProgress: 0.1,
      toast: null,

      addDeadline: (deadline) => {
        set((state) => ({
          deadlines: sortByDue([
            ...state.deadlines.filter((item) => item.id !== deadline.id),
            deadline,
          ]),
          selectedDeadlineId: deadline.id,
          targetProgress: deadline.curveT,
        }))

        void saveDeadline(deadline).catch((error) => {
          if (error instanceof ApiError && error.status === 401) return
          get().showToast(cloudMessage(error), 'info')
        })
      },

      updateDeadline: (id, patch) => {
        let updated: Deadline | undefined

        set((state) => {
          const current = state.deadlines.find((item) => item.id === id)
          if (!current) return state

          const dueDate = /^\d{4}-\d{2}-\d{2}$/.test(patch.dueDate)
            ? patch.dueDate
            : current.dueDate

          updated = {
            ...current,
            ...patch,
            title: patch.title.trim() || current.title,
            dueDate,
            curveT: curveTFor(dueDate),
          }

          return {
            deadlines: sortByDue(
              state.deadlines.map((item) => (item.id === id ? updated! : item)),
            ),
            targetProgress: updated.curveT,
          }
        })

        if (!updated) return

        void patchDeadline(updated).catch((error) => {
          if (error instanceof ApiError && error.status === 401) return
          get().showToast(cloudMessage(error), 'info')
        })
      },

      removeDeadline: (id) => {
        set((state) => ({
          deadlines: state.deadlines.filter((item) => item.id !== id),
          selectedDeadlineId: state.selectedDeadlineId === id ? null : state.selectedDeadlineId,
        }))

        void deleteDeadlineApi(id).catch((error) => {
          if (error instanceof ApiError && error.status === 401) return
          get().showToast(cloudMessage(error), 'info')
        })
      },

      clearDeadlines: () => {
        const hadDeadlines = get().deadlines.length > 0
        set({ deadlines: [], selectedDeadlineId: null, targetProgress: 0.1 })

        if (!hadDeadlines) return

        void clearDeadlinesApi().catch((error) => {
          if (error instanceof ApiError && error.status === 401) return
          get().showToast(cloudMessage(error), 'info')
        })
      },

      restoreSamples: () => {
        const samples = createSampleDeadlines()
        set({
          deadlines: samples,
          selectedDeadlineId: null,
          targetProgress: 0.1,
        })

        void Promise.allSettled(samples.map(saveDeadline)).then((results) => {
          if (results.some((result) => result.status === 'rejected')) {
            get().showToast(
              'Sample road restored here. Cloud storage is offline.',
              'info',
            )
          }
        })
      },

      loadDeadlines: async () => {
        try {
          const remote = await fetchDeadlines()

          if (remote.length === 0) {
            const local = get().deadlines

            if (local.length > 0) {
              const results = await Promise.allSettled(local.map(saveDeadline))
              if (results.some((result) => result.status === 'rejected')) {
                get().showToast(
                  'Your road is saved on this device. Cloud storage is offline.',
                  'info',
                )
              }
            }
            return
          }

          set({
            deadlines: sortByDue(remote),
            selectedDeadlineId: null,
            targetProgress: 0.1,
          })
        } catch (error) {
          if (error instanceof ApiError && error.status === 401) return
          get().showToast(cloudMessage(error), 'info')
        }
      },

      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen, aiPanelOpen: false })),

      toggleAIPanel: () =>
        set((state) => ({ aiPanelOpen: !state.aiPanelOpen, sidebarOpen: false })),

      openAIPanel: () => set({ aiPanelOpen: true, sidebarOpen: false }),

      selectDeadline: (id) =>
        set((state) => {
          if (!id) return { selectedDeadlineId: null }
          const deadline = state.deadlines.find((item) => item.id === id)
          return {
            selectedDeadlineId: id,
            targetProgress: deadline?.curveT ?? state.targetProgress,
          }
        }),

      setTargetProgress: (progress) =>
        set({ targetProgress: Math.max(0, Math.min(1, progress)) }),

      showToast: (message, tone = 'info') =>
        set({ toast: { id: Date.now(), message, tone } }),

      clearToast: () => set({ toast: null }),
    }),
    {
      name: 'my-oz-road-v1',
      version: 2,
      partialize: (state) => ({ deadlines: state.deadlines }),
      migrate: (persisted) => {
        const saved = persisted as { deadlines?: Deadline[] } | undefined
        if (!saved?.deadlines) return persisted
        return {
          ...saved,
          deadlines: saved.deadlines.map((deadline) => ({
            ...deadline,
            curveT: curveTFor(deadline.dueDate),
          })),
        }
      },
    },
  ),
)
