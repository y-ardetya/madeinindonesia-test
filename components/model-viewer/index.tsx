'use client'

import { Loader } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import cn from 'clsx'
import { Suspense, useEffect, useRef, useState } from 'react'
import { STLLoader } from 'three-stdlib'
import { Scene } from './canvas/scene'
import s from './model-viewer.module.css'
import { useModelViewerStore } from './model-viewer-store'
import { ControlPanel } from './ui/control-panel'
import { DropOverlay } from './ui/drop-overlay'
import { Sidebar } from './ui/sidebar'

export function ModelViewer() {
  const addModels = useModelViewerStore((s) => s.addModels)
  const setSelectedId = useModelViewerStore((s) => s.setSelectedId)

  // Drag-and-drop state
  const [isDragging, setIsDragging] = useState(false)
  const dragCounter = useRef(0)

  // Preload local STL models on mount
  useEffect(() => {
    const localModels = [
      '/models/11.stl',
      '/models/11_alveolar.stl',
      '/models/12.stl',
      '/models/12_alveolar.stl',
      '/models/13.stl',
      '/models/13_alveolar.stl',
      '/models/14.stl',
      '/models/14_alveolar.stl',
      '/models/15.stl',
      '/models/15_alveolar.stl',
    ]
    const loader = new STLLoader()
    for (const url of localModels) {
      loader.load(
        url,
        () => {
          console.log(`Preloaded: ${url}`)
        },
        undefined,
        (err) => {
          console.error(`Failed to preload ${url}:`, err)
        }
      )
    }
  }, [])

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
        onPointerMissed={() => setSelectedId(null)}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>

      {/* Fullscreen Drei Loader overlay */}
      <Loader />

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
