'use client'

import cn from 'clsx'
import { useState } from 'react'
import { PRESET_VIEWS } from '@/components/model-viewer/constants'
import { useModelViewerStore } from '@/components/model-viewer/model-viewer-store'
import s from './control-panel.module.css'

// ─── Icons ────────────────────────────────────────────────────────────────────

function CameraIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
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
}

export function ControlPanel() {
  const models = useModelViewerStore((s) => s.models)
  const selectedId = useModelViewerStore((s) => s.selectedId)
  const cameraView = useModelViewerStore((s) => s.cameraView)
  const setCameraView = useModelViewerStore((s) => s.setCameraView)
  const triggerFit = useModelViewerStore((s) => s.triggerFit)
  const triggerReset = useModelViewerStore((s) => s.triggerReset)

  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <>
      {/* Mobile trigger */}
      <button
        type="button"
        className={s.mobilePanelTrigger}
        onClick={() => setIsExpanded(true)}
        aria-label="Open camera controls"
      >
        <CameraIcon />
        <span>Views & Actions</span>
      </button>

      {/* Backdrop (mobile only) */}
      {isExpanded && (
        // biome-ignore lint/a11y/noStaticElementInteractions: backdrop overlay
        <div
          className={s.mobileOverlay}
          onClick={() => setIsExpanded(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsExpanded(false)
          }}
          role="presentation"
        />
      )}

      {/* Bottom control panel */}
      <div className={cn(s.controlPanel, isExpanded && s.isExpanded)}>
        {/* Mobile close button */}
        <button
          type="button"
          className={s.mobileCloseBtn}
          onClick={() => setIsExpanded(false)}
          aria-label="Close camera controls"
        >
          <CloseIcon />
        </button>

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
              {PRESET_VIEWS.map((view) => (
                <button
                  key={view}
                  type="button"
                  className={cn(s.btn, cameraView === view && s.isActive)}
                  onClick={() => {
                    setCameraView(view)
                    setIsExpanded(false) // Close modal on choice (good UX)
                  }}
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
                onClick={() => {
                  triggerFit()
                  setIsExpanded(false)
                }}
                title="Fit entire scene to view"
              >
                Fit View
              </button>
              <button
                type="button"
                className={s.btn}
                onClick={() => {
                  triggerReset()
                  setIsExpanded(false)
                }}
                title="Reset camera to initial position"
              >
                Reset Camera
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
