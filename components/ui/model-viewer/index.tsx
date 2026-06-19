'use client'

import { Canvas } from '@react-three/fiber'
import cn from 'clsx'
import { Suspense, useState } from 'react'
import s from './model-viewer.module.css'
import { Scene } from './scene'

// Curated colors for the palette
const COLOR_PALETTE = [
  { name: 'Ochre', hex: '#F2CC8F' },
  { name: 'Terracotta', hex: '#E07A5F' },
  { name: 'Sage', hex: '#81B29A' },
  { name: 'Indigo', hex: '#3D5A80' },
  { name: 'Rose', hex: '#F38375' },
  { name: 'Charcoal', hex: '#222222' },
]

export interface LoadedModel {
  id: string
  name: string
  url?: string
  type: 'glb' | 'gltf' | 'stl' | 'cube'
  visible: boolean
  color: string
}

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

export function ModelViewer() {
  const [models, setModels] = useState<LoadedModel[]>([
    {
      id: 'default-cube',
      name: 'Default Cube',
      type: 'cube',
      visible: true,
      color: '#81B29A',
    },
  ])
  const [cameraView, setCameraView] = useState<
    'front' | 'back' | 'left' | 'right' | 'top' | 'bottom' | 'isometric' | null
  >(null)
  const [fitTrigger, setFitTrigger] = useState(0)
  const [resetTrigger, setResetTrigger] = useState(0)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const files = Array.from(e.target.files)
    const newModels: LoadedModel[] = []

    files.forEach((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (ext === 'glb' || ext === 'gltf' || ext === 'stl') {
        const url = URL.createObjectURL(file)
        const id = `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
        const colorIndex =
          (models.length + newModels.length) % COLOR_PALETTE.length
        const color = COLOR_PALETTE[colorIndex]?.hex || '#E07A5F'

        newModels.push({
          id,
          name: file.name,
          url,
          type: ext as 'glb' | 'gltf' | 'stl',
          visible: true,
          color,
        })
      }
    })

    if (newModels.length > 0) {
      setModels((prev) => [...prev, ...newModels])
      setFitTrigger((prev) => prev + 1)
    }
  }

  const toggleVisibility = (id: string) => {
    setModels((prev) =>
      prev.map((model) =>
        model.id === id ? { ...model, visible: !model.visible } : model
      )
    )
    setFitTrigger((prev) => prev + 1)
  }

  const deleteModel = (id: string) => {
    setModels((prev) => {
      const target = prev.find((m) => m.id === id)
      if (target?.url) {
        URL.revokeObjectURL(target.url)
      }
      return prev.filter((model) => model.id !== id)
    })
    setFitTrigger((prev) => prev + 1)
  }

  const handleColorChange = (id: string, color: string) => {
    setModels((prev) =>
      prev.map((model) => (model.id === id ? { ...model, color } : model))
    )
  }

  const handleResetCamera = () => {
    setCameraView('isometric')
    setResetTrigger((prev) => prev + 1)
  }

  const handleFitToView = () => {
    setFitTrigger((prev) => prev + 1)
  }

  return (
    <div className={s.container}>
      <Canvas
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        gl={{ antialias: true, alpha: false }}
        shadows
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          <Scene
            models={models}
            cameraView={cameraView}
            fitTrigger={fitTrigger}
            resetTrigger={resetTrigger}
            onCameraViewReset={() => setCameraView(null)}
          />
        </Suspense>
      </Canvas>

      <div className={s.frameOverlay} />

      <div className={s.sidebar}>
        <h2 className={s.sidebarTitle}>3D Models</h2>

        <label className={s.uploadArea}>
          <UploadIcon />
          <span className={s.uploadText}>Upload 3D Files</span>
          <span className={s.uploadSubtext}>Supports GLTF, GLB, STL</span>
          <input
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
              <div key={model.id} className={s.modelItem}>
                <button
                  type="button"
                  onClick={() => toggleVisibility(model.id)}
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
                      onChange={(e) =>
                        handleColorChange(model.id, e.target.value)
                      }
                      className={s.colorInput}
                      aria-label={`Change color for ${model.name}`}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => deleteModel(model.id)}
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

      <div className={s.controlPanel}>
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
              onClick={handleFitToView}
              title="Fit entire scene to view"
            >
              Fit View
            </button>
            <button
              type="button"
              className={s.btn}
              onClick={handleResetCamera}
              title="Reset camera to isometric view"
            >
              Reset Camera
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
