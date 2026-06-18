'use client'

import type { ComponentProps } from 'react'
import { usePreloader } from '@/lib/hooks/use-preloader'

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  zIndex: 9999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#000',
}

const percentageStyle: React.CSSProperties = {
  textAlign: 'center',
  fontFamily: "'Inter', sans-serif",
  fontSize: '2rem',
  fontWeight: 'bold',
  color: '#fff',
}

interface PreloaderProps extends ComponentProps<'div'> {
  ready?: boolean
  onComplete?: () => void
}

/**
 * Preloader component that covers the screen and displays loading progress.
 * Smoothly animates progress up to 100% and slides out when the application is ready.
 */
export function Preloader({
  ready = false,
  onComplete,
  ...props
}: PreloaderProps) {
  const { progress, isDone, containerRef } = usePreloader({ ready, onComplete })

  if (isDone) return null

  return (
    <div
      ref={containerRef}
      style={overlayStyle}
      className="preloader"
      {...props}
    >
      <span style={percentageStyle}>{progress}%</span>
    </div>
  )
}
