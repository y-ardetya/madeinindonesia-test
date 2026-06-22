'use client'

import { useRef } from 'react'
import type * as THREE from 'three/webgpu'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { CameraRig } from './camera-rig'
import { ModelRenderer } from './model-renderer'
import { SceneExtras } from './scene-extras'
import { SceneLighting } from './scene-lighting'
import { useModelLoader } from './use-model-loader'

export function Scene() {
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const defaultCubeRef = useRef<THREE.Mesh>(null)

  const { loadedObjects, getBoundingBox, hasContent, yOffset } =
    useModelLoader(defaultCubeRef)

  return (
    <>
      <CameraRig
        getBoundingBox={getBoundingBox}
        hasContent={hasContent}
        controlsRef={controlsRef}
      />

      <SceneLighting />

      <ModelRenderer
        defaultCubeRef={defaultCubeRef}
        loadedObjects={loadedObjects}
        yOffset={yOffset}
      />

      <SceneExtras />
    </>
  )
}
