'use client'

import { Canvas } from '@react-three/fiber'
import cn from 'clsx'
import { Suspense, useRef, useState } from 'react'
import s from './model-viewer.module.css'
import { useModelViewerStore } from './model-viewer-store'
import { Scene } from './scene'

// ─── Icons ────────────────────────────────────────────────────────────────────

const EyeIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const EyeOffIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <line x1="2" y1="2" x2="22" y2="22" />
  </svg>
)

const TrashIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </svg>
)

const UploadIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
)

// ─── Main Component ───────────────────────────────────────────────────────────

export function ModelViewer() {
  const models = useModelViewerStore((s) => s.models)
  const selectedId = useModelViewerStore((s) => s.selectedId)
  const cameraView = useModelViewerStore((s) => s.cameraView)
  const addModels = useModelViewerStore((s) => s.addModels)
  const removeModel = useModelViewerStore((s) => s.removeModel)
  const toggleVisibility = useModelViewerStore((s) => s.toggleVisibility)
  const setColor = useModelViewerStore((s) => s.setColor)
  const setSelectedId = useModelViewerStore((s) => s.setSelectedId)
  const setCameraView = useModelViewerStore((s) => s.setCameraView)
  const triggerFit = useModelViewerStore((s) => s.triggerFit)
  const triggerReset = useModelViewerStore((s) => s.triggerReset)

  // Drag-and-drop state
  const [isDragging, setIsDragging] = useState(false)
  const dragCounter = useRef(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ─── File input handler ───────────────────────────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    addModels(Array.from(e.target.files))
    // Reset input so same file can be re-uploaded
    e.target.value = ''
  }

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
      {isDragging && (
        <div className={s.dropOverlay} aria-hidden="true">
          <div className={s.dropHint}>
            <UploadIcon />
            <span>Drop 3D files here</span>
            <span className={s.dropSub}>GLTF · GLB · STL</span>
          </div>
        </div>
      )}

      <div className={s.frameOverlay} />

      {/* Sidebar */}
      <div className={s.sidebar}>
        <h2 className={s.sidebarTitle}>3D Models</h2>

        <label className={s.uploadArea}>
          <UploadIcon />
          <span className={s.uploadText}>Upload 3D Files</span>
          <span className={s.uploadSubtext}>
            or drag & drop · GLTF, GLB, STL
          </span>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".gltf,.glb,.stl"
            onChange={handleFileUpload}
            className={s.fileInput}
          />
        </label>

        <div className={s.modelList}>
          {models.length === 0 ? (
            <div className={s.emptyState}>No models loaded</div>
          ) : (
            models.map((model) => (
              // biome-ignore lint/a11y/useSemanticElements: custom styled container behaves as button
              <div
                key={model.id}
                className={cn(
                  s.modelItem,
                  selectedId === model.id && s.isSelected
                )}
                onClick={() =>
                  setSelectedId(model.id === selectedId ? null : model.id)
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setSelectedId(model.id === selectedId ? null : model.id)
                  }
                }}
                role="button"
                tabIndex={0}
                aria-pressed={selectedId === model.id}
                aria-label={`Select ${model.name}`}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleVisibility(model.id)
                  }}
                  className={s.visibilityBtn}
                  title={model.visible ? 'Hide Model' : 'Show Model'}
                  aria-label={model.visible ? 'Hide model' : 'Show model'}
                >
                  {model.visible ? <EyeIcon /> : <EyeOffIcon />}
                </button>

                <span className={s.modelName} title={model.name}>
                  {model.name}
                </span>

                <div className={s.modelMeta}>
                  <div
                    className={s.modelColorPicker}
                    style={{ backgroundColor: model.color }}
                    title="Change Model Color"
                  >
                    <input
                      type="color"
                      value={model.color}
                      onChange={(e) => setColor(model.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className={s.colorInput}
                      aria-label={`Change color for ${model.name}`}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeModel(model.id)
                    }}
                    className={s.deleteBtn}
                    title="Remove Model"
                    aria-label="Remove model"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Bottom control panel */}
      <div className={s.controlPanel}>
        {/* Active object name chip */}
        {selectedId && (
          <div className={s.activeObjectChip}>
            <span className={s.activeObjectDot} />
            <span className={s.activeObjectName}>
              {models.find((m) => m.id === selectedId)?.name ?? 'Object'}
            </span>
          </div>
        )}

        <div className={s.controlRow}>
          <div className={s.controlGroup}>
            <span className={s.groupLabel}>Camera Views</span>
            <div className={s.btnGroup}>
              {(
                [
                  'front',
                  'back',
                  'left',
                  'right',
                  'top',
                  'bottom',
                  'isometric',
                ] as const
              ).map((view) => (
                <button
                  key={view}
                  type="button"
                  className={cn(s.btn, cameraView === view && s.isActive)}
                  onClick={() => setCameraView(view)}
                >
                  {view.charAt(0).toUpperCase() + view.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className={s.controlGroup}>
            <span className={s.groupLabel}>Actions</span>
            <div className={s.btnGroup}>
              <button
                type="button"
                className={s.btn}
                onClick={triggerFit}
                title="Fit entire scene to view"
              >
                Fit View
              </button>
              <button
                type="button"
                className={s.btn}
                onClick={triggerReset}
                title="Reset camera to initial position"
              >
                Reset Camera
              </button>
            </div>
          </div>
        </div>
        {/* end controlRow */}
      </div>
    </div>
  )
}
