'use client'

import { useEffect, useState } from 'react'
import * as THREE from 'three/webgpu'
import { GLTFLoader, STLLoader } from 'three-stdlib'
import { useModelViewerStore } from '@/components/model-viewer/model-viewer-store'

export interface LoadedObject {
  id: string
  object: THREE.Object3D
  center: THREE.Vector3
  minY: number
  url: string
}

export function useModelLoader(
  defaultCubeRef: React.RefObject<THREE.Mesh | null>
) {
  const models = useModelViewerStore((s) => s.models)
  const selectedId = useModelViewerStore((s) => s.selectedId)
  const [loadedObjects, setLoadedObjects] = useState<LoadedObject[]>([])

  // ─── Bounding box: selected object OR all visible objects ──────────────────
  const getBoundingBox = (forSelected = false): THREE.Box3 => {
    const box = new THREE.Box3()
    let has = false

    const expandByLoadedObj = (obj: LoadedObject) => {
      obj.object.updateMatrixWorld(true)
      const localBox = new THREE.Box3().setFromObject(obj.object)
      box.union(localBox)
    }

    if (forSelected && selectedId) {
      if (selectedId === 'default-cube') {
        if (defaultCubeRef.current) {
          defaultCubeRef.current.updateMatrixWorld(true)
          box.setFromObject(defaultCubeRef.current)
          has = true
        } else {
          box.expandByPoint(new THREE.Vector3(-0.5, -0.5, -0.5))
          box.expandByPoint(new THREE.Vector3(0.5, 0.5, 0.5))
          has = true
        }
      } else {
        const obj = loadedObjects.find((o) => o.id === selectedId)
        if (obj) {
          expandByLoadedObj(obj)
          has = true
        }
      }
    }

    if (!has) {
      for (const model of models) {
        if (!model.visible) continue
        if (model.type === 'cube') {
          if (defaultCubeRef.current) {
            defaultCubeRef.current.updateMatrixWorld(true)
            const tempBox = new THREE.Box3().setFromObject(
              defaultCubeRef.current
            )
            box.union(tempBox)
            has = true
          } else {
            box.expandByPoint(new THREE.Vector3(-0.5, -0.5, -0.5))
            box.expandByPoint(new THREE.Vector3(0.5, 0.5, 0.5))
            has = true
          }
        } else {
          const obj = loadedObjects.find((o) => o.id === model.id)
          if (obj) {
            expandByLoadedObj(obj)
            has = true
          }
        }
      }
    }

    if (!has) box.set(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1))
    return box
  }

  // ─── Load / unload models ─────────────────────────────────────────────────
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    const modelIds = new Set(models.map((m) => m.id))
    const toDelete = loadedObjects.filter((o) => !modelIds.has(o.id))

    for (const obj of toDelete) {
      obj.object.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh
          if (Array.isArray(mesh.material)) {
            for (const m of mesh.material) {
              m.dispose()
            }
          } else {
            mesh.material?.dispose()
          }
          mesh.geometry?.dispose()
        }
      })
    }

    const surviving = loadedObjects.filter((o) => modelIds.has(o.id))
    const existingIds = new Set(surviving.map((o) => o.id))
    const toLoad = models.filter(
      (m) => m.type !== 'cube' && !existingIds.has(m.id)
    )

    if (toLoad.length === 0) {
      setLoadedObjects(surviving)
      return
    }

    const promises = toLoad.map(
      (model) =>
        new Promise<LoadedObject>((resolve) => {
          const onLoaded = (object: THREE.Object3D) => {
            // Apply correction rotation to align Blender Z-up to Three's Y-up
            object.rotation.x = -Math.PI / 2

            const box = new THREE.Box3().setFromObject(object)
            const center = new THREE.Vector3()
            box.getCenter(center)
            resolve({
              id: model.id,
              object,
              center,
              minY: box.min.y,
              url: model.url!,
            })
          }

          if (model.type === 'stl') {
            const loader = new STLLoader()
            loader.load(
              model.url!,
              (geometry) => {
                geometry.computeVertexNormals()
                const material = new THREE.MeshStandardMaterial({
                  color: new THREE.Color(model.color),
                  roughness: 0.4,
                  metalness: 0.2,
                })
                const mesh = new THREE.Mesh(geometry, material)
                mesh.castShadow = true
                mesh.receiveShadow = true
                onLoaded(mesh)
              },
              undefined,
              (err) => {
                console.error(`Failed to load STL ${model.name}:`, err)
                resolve({
                  id: model.id,
                  object: new THREE.Group(),
                  center: new THREE.Vector3(),
                  minY: 0,
                  url: model.url!,
                })
              }
            )
          } else {
            const loader = new GLTFLoader()
            loader.load(
              model.url!,
              (gltf) => {
                gltf.scene.traverse((child) => {
                  if ((child as THREE.Mesh).isMesh) {
                    const mesh = child as THREE.Mesh
                    mesh.castShadow = true
                    mesh.receiveShadow = true
                  }
                })
                onLoaded(gltf.scene)
              },
              undefined,
              (err) => {
                console.error(`Failed to load GLTF/GLB ${model.name}:`, err)
                resolve({
                  id: model.id,
                  object: new THREE.Group(),
                  center: new THREE.Vector3(),
                  minY: 0,
                  url: model.url!,
                })
              }
            )
          }
        })
    )

    Promise.all(promises).then((newObjs) =>
      setLoadedObjects([...surviving, ...newObjs])
    )
  }, [models])

  // ─── Sync visibility & color ──────────────────────────────────────────────
  useEffect(() => {
    for (const obj of loadedObjects) {
      const model = models.find((m) => m.id === obj.id)
      if (!model) continue
      obj.object.visible = model.visible
      obj.object.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh
          if (mesh.material && 'color' in mesh.material) {
            ;(mesh.material as THREE.MeshStandardMaterial).color.set(
              model.color
            )
          }
        }
      })
    }
  }, [models, loadedObjects])

  // ─── Cleanup on unmount ───────────────────────────────────────────────────
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    return () => {
      for (const obj of loadedObjects) {
        obj.object.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh
            if (Array.isArray(mesh.material)) {
              for (const m of mesh.material) {
                m.dispose()
              }
            } else {
              mesh.material?.dispose()
            }
            mesh.geometry?.dispose()
          }
        })
      }
    }
  }, [])

  const hasCube = models.some((m) => m.type === 'cube' && m.visible)
  const hasContent = hasCube || loadedObjects.length > 0

  // Calculate yOffset to align the bottom of active models with the grid at y = -0.5
  const activeObjs = loadedObjects.filter((obj) => {
    const model = models.find((m) => m.id === obj.id)
    return model?.visible
  })

  let yOffset = 0
  if (activeObjs.length > 0) {
    const minY = Math.min(...activeObjs.map((obj) => obj.minY))
    yOffset = -0.5 - minY
  }

  return {
    loadedObjects,
    getBoundingBox,
    hasContent,
    yOffset,
  }
}
