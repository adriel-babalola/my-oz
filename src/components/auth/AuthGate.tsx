import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AUTH_EXPIRED_EVENT } from '../../lib/authToken'
import { useAuthStore } from '../../store/useAuthStore'
import { useOzStore } from '../../store/useOzStore'
import { LoginScreen } from './LoginScreen'
import { RoadLoader } from './RoadLoader'

interface AuthGateProps {
  children: ReactNode
}

export function AuthGate({ children }: AuthGateProps) {
  const status = useAuthStore((state) => state.status)
  const bootstrap = useAuthStore((state) => state.bootstrap)
  const expire = useAuthStore((state) => state.expire)
  const [entering, setEntering] = useState(false)
  const previousStatus = useRef(status)
  const loadedRoad = useRef(false)

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  useEffect(() => {
    const handleExpired = () => expire()
    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired)
  }, [expire])

  useEffect(() => {
    if (status === 'signed-in' && !loadedRoad.current) {
      loadedRoad.current = true
      void useOzStore.getState().loadDeadlines()
    }

    if (status === 'signed-out') {
      loadedRoad.current = false
    }
  }, [status])

  useEffect(() => {
    if (status === 'signed-in' && previousStatus.current === 'signed-out') {
      setEntering(true)
      previousStatus.current = status
      const timer = window.setTimeout(() => setEntering(false), 900)
      return () => window.clearTimeout(timer)
    }

    previousStatus.current = status
  }, [status])

  if (status === 'checking') return <RoadLoader message="Finding the road" />
  if (status === 'signed-out') return <LoginScreen />
  if (entering) return <RoadLoader message="The gates are open" />

  return <>{children}</>
}
