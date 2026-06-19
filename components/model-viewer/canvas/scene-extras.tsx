'use client'

import { GizmoHelper, GizmoViewport, Grid } from '@react-three/drei'
import {
  GIZMO_DEFAULTS,
  GRID_DEFAULTS,
} from '@/components/model-viewer/constants'

export function SceneExtras() {
  return (
    <>
      <color attach="background" args={['#000000']} />

      <Grid
        position={GRID_DEFAULTS.position}
        args={GRID_DEFAULTS.args}
        cellSize={GRID_DEFAULTS.cellSize}
        cellThickness={GRID_DEFAULTS.cellThickness}
        cellColor={GRID_DEFAULTS.cellColor}
        sectionSize={GRID_DEFAULTS.sectionSize}
        sectionThickness={GRID_DEFAULTS.sectionThickness}
        sectionColor={GRID_DEFAULTS.sectionColor}
        fadeDistance={GRID_DEFAULTS.fadeDistance}
        fadeStrength={GRID_DEFAULTS.fadeStrength}
        infiniteGrid={GRID_DEFAULTS.infiniteGrid}
      />

      <GizmoHelper alignment="bottom-right" margin={GIZMO_DEFAULTS.margin}>
        <GizmoViewport
          axisColors={GIZMO_DEFAULTS.axisColors}
          labelColor={GIZMO_DEFAULTS.labelColor}
        />
      </GizmoHelper>
    </>
  )
}
