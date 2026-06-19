'use client'

import { Canvas } from '@react-three/fiber'
import cn from 'clsx'
import { Suspense, useRef, useState } from 'react'
import { Scene } from './canvas/scene'
import s from './model-viewer.module.css'
import { useModelViewerStore } from './model-viewer-store'
import { ControlPanel } from './ui/control-panel'
import { DropOverlay } from './ui/drop-overlay'
import { Sidebar } from './ui/sidebar'

export function ModelViewer() {
  const addModels = useModelViewerStore((s) => s.addModels)

  // Drag-and-drop state
  const [isDragging, setIsDragging] = useState(false)
  const dragCounter = useRef(0)

  // ─── Drag-and-drop handlers ───────────────────────────────────────────────
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current += 1
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current -= 1
    if (dragCounter.current === 0) setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current = 0
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    addModels(files)
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: drag-and-drop container
    <div
      className={cn(s.container, isDragging && s.isDragging)}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* 3D Canvas */}
      <Canvas
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
        }}
        gl={{ antialias: true, alpha: false }}
        shadows
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>

      {/* Drag overlay hint */}
      <DropOverlay isDragging={isDragging} />

      <div className={s.frameOverlay} />

      {/* Sidebar */}
      <Sidebar />

      {/* Bottom control panel */}
      <ControlPanel />
    </div>
  )
}
