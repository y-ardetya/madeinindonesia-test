'use client'

import cn from 'clsx'
import { useRef, useState } from 'react'
import { useModelViewerStore } from '@/components/model-viewer/model-viewer-store'
import s from './sidebar.module.css'

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

export const UploadIcon = () => (
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

const MenuIcon = () => (
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
    <line x1="4" x2="20" y1="12" y2="12" />
    <line x1="4" x2="20" y1="6" y2="6" />
    <line x1="4" x2="20" y1="18" y2="18" />
  </svg>
)

const CloseIcon = () => (
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
    <line x1="18" x2="6" y1="6" y2="18" />
    <line x1="6" x2="18" y1="18" y2="6" />
  </svg>
)

export function Sidebar() {
  const models = useModelViewerStore((s) => s.models)
  const selectedId = useModelViewerStore((s) => s.selectedId)
  const addModels = useModelViewerStore((s) => s.addModels)
  const removeModel = useModelViewerStore((s) => s.removeModel)
  const toggleVisibility = useModelViewerStore((s) => s.toggleVisibility)
  const setColor = useModelViewerStore((s) => s.setColor)
  const setSelectedId = useModelViewerStore((s) => s.setSelectedId)

  const [isOpen, setIsOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    addModels(Array.from(e.target.files))
    e.target.value = ''
  }

  return (
    <>
      {/* Mobile trigger */}
      <button
        type="button"
        className={s.mobileMenuTrigger}
        onClick={() => setIsOpen(true)}
        aria-label="Open models menu"
      >
        <MenuIcon />
      </button>

      {/* Backdrop (mobile only) */}
      {isOpen && (
        // biome-ignore lint/a11y/noStaticElementInteractions: backdrop overlay
        <div
          className={s.mobileOverlay}
          onClick={() => setIsOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsOpen(false)
          }}
          role="presentation"
        />
      )}

      {/* Sidebar Panel */}
      <div className={cn(s.sidebar, isOpen && s.isOpen)}>
        {/* Mobile close button */}
        <button
          type="button"
          className={s.mobileCloseBtn}
          onClick={() => setIsOpen(false)}
          aria-label="Close models menu"
        >
          <CloseIcon />
        </button>

        <h2 className={s.sidebarTitle}>YHN Model Viewer</h2>

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
    </>
  )
}
