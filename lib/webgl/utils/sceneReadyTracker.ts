'use client'

import { useProgress } from '@react-three/drei'
import { useEffect, useRef, useState } from 'react'
import { useWebGLStore } from '@/lib/webgl/store'

export function SceneReadyTracker() {
  const setSceneReady = useWebGLStore((s) => s.setSceneReady)
  const [state, setState] = useState(() => useProgress.getState())
  const everActive = useRef(false)

  useEffect(() => {
    const unsubscribe = useProgress.subscribe((newState) => {
      // Defer state update to next microtask to avoid updating during another component's render phase
      queueMicrotask(() => {
        setState(newState)
      })
    })

    return unsubscribe
  }, [])

  const { active, progress } = state

  useEffect(() => {
    if (active) everActive.current = true
  }, [active])

  useEffect(() => {
    if (active) return

    // Loading finished normally.
    if (everActive.current && progress === 100) {
      queueMicrotask(() => setSceneReady())
      return
    }

    // Nothing ever started loading — give it a brief window in case
    // something queues a load slightly after mount, then bail to ready.
    let id: ReturnType<typeof setTimeout> | undefined
    if (!everActive.current) {
      id = setTimeout(() => {
        if (!everActive.current) {
          setSceneReady()
        }
      }, 500)
    }

    return () => {
      if (id) clearTimeout(id)
    }
  }, [active, progress, setSceneReady])

  return null
}
