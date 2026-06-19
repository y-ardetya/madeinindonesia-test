import * as THREE from 'three/webgpu'

export const INITIAL_POSE = {
  posX: 2,
  posY: 2,
  posZ: 3,
  tgtX: 0,
  tgtY: 0,
  tgtZ: 0,
} as const

export const PRESET_VIEWS = [
  'front',
  'back',
  'left',
  'right',
  'top',
  'bottom',
  'isometric',
] as const

export type PresetView = (typeof PRESET_VIEWS)[number]

export const CAMERA_TWEEN_DURATION = 1.0
export const CAMERA_TWEEN_EASE = 'osmo-ease'
export const FIT_DISTANCE_MULTIPLIER = 3.0

export const CAMERA_DEFAULTS = {
  fov: 45,
  near: 0.1,
  far: 1000,
} as const

export const ORBIT_CONTROLS_DEFAULTS = {
  dampingFactor: 0.08,
} as const

export const GRID_DEFAULTS = {
  position: [0, -0.6, 0] as [number, number, number],
  args: [50, 50] as [number, number],
  cellSize: 1,
  cellThickness: 1,
  cellColor: '#2a2a30',
  sectionSize: 5,
  sectionThickness: 1.5,
  sectionColor: '#5a5a65',
  fadeDistance: 100,
  fadeStrength: 1.5,
  infiniteGrid: true,
} as const

export const GIZMO_DEFAULTS = {
  axisColors: ['#ff3653', '#00cf85', '#2fa1ff'] as [string, string, string],
  labelColor: 'white',
  margin: [80, 80] as [number, number],
} as const

export function getCameraPresetValues(view: string) {
  const dir = new THREE.Vector3()
  const up = new THREE.Vector3(0, 1, 0)

  switch (view) {
    case 'front':
      dir.set(0, 0, 1)
      break
    case 'back':
      dir.set(0, 0, -1)
      break
    case 'left':
      dir.set(-1, 0, 0)
      break
    case 'right':
      dir.set(1, 0, 0)
      break
    case 'top':
      dir.set(0, 1, 0)
      up.set(0, 0, -1)
      break
    case 'bottom':
      dir.set(0, -1, 0)
      up.set(0, 0, 1)
      break
    case 'isometric':
      dir.set(1, 1, 1).normalize()
      break
  }

  return { dir, up }
}

export function getFitDistance(box: THREE.Box3, fov: number): number {
  const size = new THREE.Vector3()
  box.getSize(size)
  const maxDim = Math.max(size.x, size.y, size.z)
  const fovRad = fov * (Math.PI / 180)
  return (maxDim / (2 * Math.tan(fovRad / 2))) * FIT_DISTANCE_MULTIPLIER
}
