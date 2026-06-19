'use client'

import { Outlines, PivotControls } from '@react-three/drei'
import type * as THREE from 'three/webgpu'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { useModelViewerStore } from '@/components/model-viewer/model-viewer-store'
import { ModelOutlines } from './model-outlines'

interface ModelRendererProps {
  defaultCubeRef: React.RefObject<THREE.Mesh | null>
  loadedObjects: { id: string; object: THREE.Object3D; center: THREE.Vector3 }[]
  controlsRef: React.RefObject<OrbitControlsImpl | null>
}

export function ModelRenderer({
  defaultCubeRef,
  loadedObjects,
  controlsRef,
}: ModelRendererProps) {
  const models = useModelViewerStore((s) => s.models)
  const selectedId = useModelViewerStore((s) => s.selectedId)
  const setSelectedId = useModelViewerStore((s) => s.setSelectedId)

  return (
    <group>
      {models.map((model) => {
        const isSelected = model.id === selectedId

        if (model.type === 'cube' && model.visible) {
          return (
            // biome-ignore lint/a11y/noStaticElementInteractions: react-three-fiber group is interactive in 3D scene
            <group
              key={model.id}
              onClick={(e) => {
                e.stopPropagation()
                setSelectedId(model.id)
              }}
            >
              <PivotControls
                visible={isSelected}
                anchor={[0, 0, 0]}
                depthTest={false}
                lineWidth={2}
                scale={1}
                axisColors={['#ff3653', '#00cf85', '#2fa1ff']}
                onDragStart={() => {
                  if (controlsRef.current) controlsRef.current.enabled = false
                }}
                onDragEnd={() => {
                  if (controlsRef.current) controlsRef.current.enabled = true
                }}
              >
                <mesh ref={defaultCubeRef} castShadow receiveShadow>
                  <boxGeometry args={[1, 1, 1]} />
                  <meshNormalMaterial />
                  {isSelected && (
                    <Outlines
                      thickness={3}
                      color="#00cfff"
                      transparent
                      opacity={0.9}
                    />
                  )}
                </mesh>
              </PivotControls>
            </group>
          )
        }

        const obj = loadedObjects.find((o) => o.id === model.id)
        if (obj && model.visible) {
          return (
            // biome-ignore lint/a11y/noStaticElementInteractions: react-three-fiber group is interactive in 3D scene
            <group
              key={model.id}
              position={[obj.center.x, obj.center.y, obj.center.z]}
              onClick={(e) => {
                e.stopPropagation()
                setSelectedId(model.id)
              }}
            >
              <PivotControls
                visible={isSelected}
                anchor={[0, 0, 0]}
                depthTest={false}
                lineWidth={2}
                scale={3}
                axisColors={['#ff3653', '#00cf85', '#2fa1ff']}
                onDragStart={() => {
                  if (controlsRef.current) controlsRef.current.enabled = false
                }}
                onDragEnd={() => {
                  if (controlsRef.current) controlsRef.current.enabled = true
                }}
              >
                <primitive object={obj.object} />
              </PivotControls>
              <ModelOutlines object={obj.object} isSelected={isSelected} />
            </group>
          )
        }
        return null
      })}
    </group>
  )
}
