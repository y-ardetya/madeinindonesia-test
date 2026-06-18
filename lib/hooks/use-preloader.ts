'use client'

import gsap from 'gsap'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three/webgpu'
import { useWebGLStore } from '@/lib/webgl/store'

interface UsePreloaderProps {
  ready: boolean
  onComplete?: (() => void) | undefined
}

/**
 * Hook to manage Three.js DefaultLoadingManager progress and smooth transitions using GSAP.
 *
 * @param ready - True when the application is initialized and ready to reveal content
 * @param onComplete - Optional callback triggered after the exit animation completes
 */
export function usePreloader({ ready, onComplete }: UsePreloaderProps) {
  const [progress, setProgress] = useState(0)
  const [active, setActive] = useState(false)
  const [isDone, setIsDone] = useState(false)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const exitStarted = useRef(false)
  const [realProgress, setRealProgress] = useState(0)
  const [targetProgress, setTargetProgress] = useState(0)

  useWebGLStore((state) => state.preloaderDone)

  // Stable references for state that effects need to read without triggering re-runs
  const readyRef = useRef(ready)
  useEffect(() => {
    readyRef.current = ready
  }, [ready])

  const onCompleteRef = useRef(onComplete)
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  // Centralized function to start exit animation using current values
  const triggerExit = () => {
    exitStarted.current = true
    if (containerRef.current) {
      gsap.to(containerRef.current, {
        y: '-100%',
        duration: 0.6,
        ease: 'power2.inOut',
        onComplete: () => {
          setIsDone(true)
          onCompleteRef.current?.()
        },
      })
    } else {
      setIsDone(true)
      onCompleteRef.current?.()
    }
  }

  // Ref to trigger exit from inside effects without re-instantiating dependencies
  const triggerExitRef = useRef(triggerExit)
  useEffect(() => {
    triggerExitRef.current = triggerExit
  })

  // 1. THREE.js DefaultLoadingManager integration
  useEffect(() => {
    let frameId = 0
    const origOnStart = THREE.DefaultLoadingManager.onStart
    const origOnProgress = THREE.DefaultLoadingManager.onProgress
    const origOnLoad = THREE.DefaultLoadingManager.onLoad

    THREE.DefaultLoadingManager.onStart = (url, loaded, total) => {
      setActive(true)
      origOnStart?.(url, loaded, total)
    }

    THREE.DefaultLoadingManager.onProgress = (url, loaded, total) => {
      cancelAnimationFrame(frameId)
      frameId = requestAnimationFrame(() => {
        setRealProgress((loaded / total) * 100)
      })
      origOnProgress?.(url, loaded, total)
    }

    THREE.DefaultLoadingManager.onLoad = () => {
      cancelAnimationFrame(frameId)
      setRealProgress(100)
      setActive(false)
      origOnLoad?.()
    }

    return () => {
      THREE.DefaultLoadingManager.onStart = origOnStart
      THREE.DefaultLoadingManager.onProgress = origOnProgress
      THREE.DefaultLoadingManager.onLoad = origOnLoad
      cancelAnimationFrame(frameId)
    }
  }, [])

  // 2. Calculate target progress step by step
  useEffect(() => {
    let newTarget = 0
    if (active) {
      newTarget = (realProgress / 100) * 85
    } else if (ready) {
      newTarget = 100
    } else {
      newTarget = realProgress > 0 ? (realProgress / 100) * 85 : 10
    }
    setTargetProgress((prev) => Math.max(prev, newTarget))
  }, [realProgress, active, ready])

  const trackerRef = useRef({ val: 0 })

  // 3. Smooth progress updates using GSAP
  useEffect(() => {
    const currentVal = trackerRef.current.val
    const distance = targetProgress - currentVal
    let duration = 0.5

    if (distance > 60) duration = 1.5
    else if (distance > 30) duration = 1.0
    else if (distance > 10) duration = 0.6
    else if (distance > 0) duration = 0.4

    gsap.to(trackerRef.current, {
      val: targetProgress,
      duration: duration,
      ease: 'power2.out',
      overwrite: true,
      onUpdate: () => {
        const val = trackerRef.current.val
        const safeProgress = Math.min(100, Math.max(0, val))
        setProgress(Math.round(safeProgress))

        if (val >= 99.5 && readyRef.current && !exitStarted.current) {
          triggerExitRef.current()
        }
      },
    })
  }, [targetProgress])

  // 4. Trigger exit if we are already at 100% and finally become ready
  useEffect(() => {
    if (trackerRef.current.val >= 99.5 && ready && !exitStarted.current) {
      triggerExitRef.current()
    }
  }, [ready])

  return {
    progress,
    active,
    isDone,
    containerRef,
  }
}
