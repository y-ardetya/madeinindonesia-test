'use client'

import { Outlines } from '@react-three/drei'
import type * as THREE from 'three/webgpu'
import { useModelViewerStore } from '@/components/model-viewer/model-viewer-store'
import { ModelOutlines } from './model-outlines'

interface ModelRendererProps {
  defaultCubeRef: React.RefObject<THREE.Mesh | null>
  loadedObjects: { id: string; object: THREE.Object3D; center: THREE.Vector3 }[]
  yOffset: number
}

export function ModelRenderer({
  defaultCubeRef,
  loadedObjects,
  yOffset,
}: ModelRendererProps) {
  const models = useModelViewerStore((s) => s.models)
  const selectedId = useModelViewerStore((s) => s.selectedId)
  const setSelectedId = useModelViewerStore((s) => s.setSelectedId)

  return (
    <group position={[0, yOffset, 0]}>
      {models.map((model) => {
        const isSelected = model.id === selectedId

        if (model.type === 'cube' && model.visible) {
          return (
            // biome-ignore lint/a11y/noStaticElementInteractions: react-three-fiber group is interactive in 3D scene
            <group
              key={model.id}
              position={model.positionOffset ?? [0, 0, 0]}
              onClick={(e) => {
                e.stopPropagation()
                setSelectedId(model.id)
              }}
            >
              <mesh ref={defaultCubeRef} castShadow receiveShadow>
                <boxGeometry args={[1, 1, 1]} />
                <meshNormalMaterial />
                {isSelected && (
                  <Outlines
                    thickness={3}
                    color="#ffffff"
                    transparent
                    opacity={0.9}
                  />
                )}
              </mesh>
            </group>
          )
        }

        const obj = loadedObjects.find((o) => o.id === model.id)
        if (obj && model.visible) {
          return (
            // biome-ignore lint/a11y/noStaticElementInteractions: react-three-fiber group is interactive in 3D scene
            <group
              key={model.id}
              position={model.positionOffset ?? [0, 0, 0]}
              onClick={(e) => {
                e.stopPropagation()
                setSelectedId(model.id)
              }}
            >
              <primitive object={obj.object} />
              <ModelOutlines object={obj.object} isSelected={isSelected} />
            </group>
          )
        }
        return null
      })}
    </group>
  )
}
