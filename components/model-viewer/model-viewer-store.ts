'use client'

import { create } from 'zustand'

export type CameraView =
  | 'front'
  | 'back'
  | 'left'
  | 'right'
  | 'top'
  | 'bottom'
  | 'isometric'
  | null

export type TransformMode = 'translate' | 'rotate' | 'scale'

export interface LoadedModel {
  id: string
  name: string
  url?: string
  type: 'glb' | 'gltf' | 'stl' | 'cube'
  visible: boolean
  color: string
  positionOffset?: [number, number, number]
}

// Curated colors for auto-assignment
export const COLOR_PALETTE = [
  { name: 'Pastel Pink', hex: '#FFD1DC' },
  { name: 'Pastel Peach', hex: '#FFDAB9' },
  { name: 'Pastel Yellow', hex: '#FDFD96' },
  { name: 'Pastel Mint', hex: '#B5EAD7' },
  { name: 'Pastel Sky', hex: '#AEC6CF' },
  { name: 'Pastel Lavender', hex: '#C3B1E1' },
  { name: 'Pastel Lilac', hex: '#DCD0FF' },
  { name: 'Pastel Rose', hex: '#F4C2C2' },
  { name: 'Pastel Coral', hex: '#FFB7B2' },
  { name: 'Pastel Periwinkle', hex: '#C6D8FF' },
]

interface ModelViewerState {
  models: LoadedModel[]
  selectedId: string | null
  cameraView: CameraView
  transformMode: TransformMode
  fitTrigger: number
  resetTrigger: number
  /** Stored once after the first auto-fit so Reset Camera can replay it */
  initialPose: {
    posX: number
    posY: number
    posZ: number
    tgtX: number
    tgtY: number
    tgtZ: number
  } | null
}

interface ModelViewerActions {
  addModels: (files: File[]) => void
  removeModel: (id: string) => void
  toggleVisibility: (id: string) => void
  setColor: (id: string, color: string) => void
  setSelectedId: (id: string | null) => void
  setCameraView: (view: CameraView) => void
  setTransformMode: (mode: TransformMode) => void
  setInitialPose: (pose: ModelViewerState['initialPose']) => void
  triggerFit: () => void
  triggerReset: () => void
  addLocalModel: (
    name: string,
    url: string,
    type: 'glb' | 'gltf' | 'stl'
  ) => void
}

const generateDefaultModels = (): LoadedModel[] => {
  const defaultModels: LoadedModel[] = [
    {
      id: 'upper-base',
      name: 'Upper Base',
      url: '/models/upper_base.stl',
      type: 'stl',
      visible: true,
      color: '#FFB7B2',
      positionOffset: [0, 0, 0],
    },
    {
      id: 'lower-base',
      name: 'Lower Base',
      url: '/models/lower_base.stl',
      type: 'stl',
      visible: true,
      color: '#FFB7B2',
      positionOffset: [0, 0, 0],
    },
  ]

  const quadrants = [1, 2, 3, 4]
  let colorIndex = 0

  for (const q of quadrants) {
    for (let t = 1; t <= 7; t++) {
      const id = `${q}${t}`
      defaultModels.push({
        id,
        name: `${id}`,
        url: `/models/${id}.stl`,
        type: 'stl',
        visible: true,
        color: '#F4F1DE',
        positionOffset: [0, 0, 0],
      })

      const color =
        COLOR_PALETTE[colorIndex % COLOR_PALETTE.length]?.hex ?? '#B5EAD7'
      colorIndex++
      defaultModels.push({
        id: `${id}_alveolar`,
        name: `Alveolar ${id}`,
        url: `/models/${id}_alveolar.stl`,
        type: 'stl',
        visible: true,
        color,
        positionOffset: [0, 0, 0],
      })
    }
  }

  return defaultModels
}

type ModelViewerStore = ModelViewerState & ModelViewerActions

export const useModelViewerStore = create<ModelViewerStore>((set, get) => ({
  models: generateDefaultModels(),
  selectedId: null,
  cameraView: null,
  transformMode: 'translate',
  fitTrigger: 0,
  resetTrigger: 0,
  initialPose: null,

  // Actions
  addModels: (files: File[]) => {
    const { models } = get()
    const newModels: LoadedModel[] = []

    for (const file of files) {
      if (!file) continue
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (ext === 'glb' || ext === 'gltf' || ext === 'stl') {
        const url = URL.createObjectURL(file)
        const id = `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
        const colorIndex =
          (models.length + newModels.length) % COLOR_PALETTE.length
        const color = COLOR_PALETTE[colorIndex]?.hex ?? '#E07A5F'

        newModels.push({
          id,
          name: file.name,
          url,
          type: ext as 'glb' | 'gltf' | 'stl',
          visible: true,
          color,
          positionOffset: [0, 0, 0],
        })
      }
    }

    if (newModels.length > 0) {
      set((state) => ({
        models: [...state.models, ...newModels],
        fitTrigger: state.fitTrigger + 1,
      }))
    }
  },

  removeModel: (id: string) => {
    set((state) => {
      const target = state.models.find((m) => m.id === id)
      if (target?.url) {
        URL.revokeObjectURL(target.url)
      }
      return {
        models: state.models.filter((m) => m.id !== id),
        selectedId: state.selectedId === id ? null : state.selectedId,
        fitTrigger: state.fitTrigger + 1,
      }
    })
  },

  toggleVisibility: (id: string) => {
    set((state) => ({
      models: state.models.map((m) =>
        m.id === id ? { ...m, visible: !m.visible } : m
      ),
    }))
  },

  setColor: (id: string, color: string) => {
    set((state) => ({
      models: state.models.map((m) => (m.id === id ? { ...m, color } : m)),
    }))
  },

  setSelectedId: (id: string | null) => {
    set({ selectedId: id })
  },

  setCameraView: (view: CameraView) => {
    set({ cameraView: view })
  },

  setTransformMode: (mode: TransformMode) => {
    set({ transformMode: mode })
  },

  setInitialPose: (pose) => {
    set({ initialPose: pose })
  },

  triggerFit: () => {
    set((state) => ({ fitTrigger: state.fitTrigger + 1 }))
  },

  triggerReset: () => {
    // Increment resetTrigger — Scene reads this to replay the initial pose
    set((state) => ({ resetTrigger: state.resetTrigger + 1 }))
  },

  addLocalModel: (name, url, type) => {
    const { models } = get()

    const colorIndex = models.length % COLOR_PALETTE.length
    const color = COLOR_PALETTE[colorIndex]?.hex ?? '#E07A5F'
    const id = `${name}-${Date.now()}`

    set((state) => ({
      models: [
        ...state.models,
        {
          id,
          name,
          url,
          type,
          visible: true,
          color,
          positionOffset: [0, 0, 0],
        },
      ],
      fitTrigger: state.fitTrigger + 1,
    }))
  },
}))
