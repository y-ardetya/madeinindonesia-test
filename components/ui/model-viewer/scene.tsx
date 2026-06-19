'use client'

import {
  Center,
  GizmoHelper,
  GizmoViewport,
  OrbitControls,
  PerspectiveCamera,
} from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three/webgpu'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { GLTFLoader, STLLoader } from 'three-stdlib'
import type { LoadedModel } from './index'

export interface SceneProps {
  models: LoadedModel[]
  cameraView:
  | 'front'
  | 'back'
  | 'left'
  | 'right'
  | 'top'
  | 'bottom'
  | 'isometric'
  | null
  fitTrigger: number
  resetTrigger: number
  onCameraViewReset: () => void
}

interface LoadedObject {
  id: string
  object: THREE.Object3D
  url: string
}

export function Scene({
  models,
  cameraView,
  fitTrigger,
  onCameraViewReset,
}: SceneProps) {
  const { camera } = useThree()
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const groupRef = useRef<THREE.Group>(null)

  const [loadedObjects, setLoadedObjects] = useState<LoadedObject[]>([])

  // Interpolation transition reference
  const transitionRef = useRef<{
    active: boolean
    startPos: THREE.Vector3
    endPos: THREE.Vector3
    startTarget: THREE.Vector3
    endTarget: THREE.Vector3
    startUp: THREE.Vector3
    endUp: THREE.Vector3
    startTime: number
    duration: number
  } | null>(null)

  // Get combined bounding box of all visible loaded models
  const getCombinedBoundingBox = () => {
    const box = new THREE.Box3()
    let hasVisibleObjects = false

    models.forEach((model) => {
      if (model.visible) {
        if (model.type === 'cube') {
          box.expandByPoint(new THREE.Vector3(-0.5, -0.5, -0.5))
          box.expandByPoint(new THREE.Vector3(0.5, 0.5, 0.5))
          hasVisibleObjects = true
        } else {
          const obj = loadedObjects.find((o) => o.id === model.id)
          if (obj) {
            box.expandByObject(obj.object)
            hasVisibleObjects = true
          }
        }
      }
    })

    if (!hasVisibleObjects) {
      box.set(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1))
    }
    return box
  }

  // Load / unload models dynamically
  // biome-ignore lint/correctness/useExhaustiveDependencies: Load only when models list configuration changes
  useEffect(() => {
    const modelIds = new Set(models.map((m) => m.id))
    const objectsToDelete = loadedObjects.filter((obj) => !modelIds.has(obj.id))

    // Cleanup GPU resources of deleted models
    objectsToDelete.forEach((obj) => {
      obj.object.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => {
              m.dispose()
            })
          } else if (mesh.material) {
            mesh.material.dispose()
          }
          if (mesh.geometry) {
            mesh.geometry.dispose()
          }
        }
      })
    })

    const updatedObjects = loadedObjects.filter((obj) => modelIds.has(obj.id))

    const loadedIds = new Set(loadedObjects.map((obj) => obj.id))
    const modelsToLoad = models.filter(
      (m) => m.type !== 'cube' && !loadedIds.has(m.id)
    )

    if (modelsToLoad.length === 0) {
      setLoadedObjects(updatedObjects)
      return
    }

    const loadPromises = modelsToLoad.map((model) => {
      return new Promise<LoadedObject>((resolve) => {
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
              resolve({ id: model.id, object: mesh, url: model.url! })
            },
            undefined,
            (err) => {
              console.error(`Failed to load STL model ${model.name}:`, err)
              resolve({
                id: model.id,
                object: new THREE.Group(),
                url: model.url!,
              })
            }
          )
        } else {
          const loader = new GLTFLoader()
          loader.load(
            model.url!,
            (gltf) => {
              const sceneObj = gltf.scene
              sceneObj.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                  const mesh = child as THREE.Mesh
                  mesh.castShadow = true
                  mesh.receiveShadow = true
                }
              })
              resolve({ id: model.id, object: sceneObj, url: model.url! })
            },
            undefined,
            (err) => {
              console.error(`Failed to load GLTF/GLB model ${model.name}:`, err)
              resolve({
                id: model.id,
                object: new THREE.Group(),
                url: model.url!,
              })
            }
          )
        }
      })
    })

    Promise.all(loadPromises).then((newObjs) => {
      setLoadedObjects([...updatedObjects, ...newObjs])
    })
  }, [models])

  // Update object visibility and color changes
  useEffect(() => {
    loadedObjects.forEach((obj) => {
      const model = models.find((m) => m.id === obj.id)
      if (!model) return

      obj.object.visible = model.visible

      obj.object.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh
          if (mesh.material && 'color' in mesh.material) {
            const stdMaterial = mesh.material as THREE.MeshStandardMaterial
            stdMaterial.color.set(new THREE.Color(model.color))
          }
        }
      })
    })
  }, [models, loadedObjects])

  // Handle predefined camera view transitions
  // biome-ignore lint/correctness/useExhaustiveDependencies: Transition camera on cameraView triggers
  useEffect(() => {
    if (!cameraView) return

    const box = getCombinedBoundingBox()
    const center = new THREE.Vector3()
    box.getCenter(center)
    const size = new THREE.Vector3()
    box.getSize(size)
    const maxDim = Math.max(size.x, size.y, size.z)

    const fovRad = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180)
    let distance = maxDim / (2 * Math.tan(fovRad / 2))
    distance *= 1.35 // padded distance

    const dir = new THREE.Vector3()
    const targetUp = new THREE.Vector3(0, 1, 0)

    switch (cameraView) {
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
        targetUp.set(0, 0, -1)
        break
      case 'bottom':
        dir.set(0, -1, 0)
        targetUp.set(0, 0, 1)
        break
      case 'isometric':
        dir.set(1, 1, 1).normalize()
        break
    }

    const targetPos = center.clone().add(dir.multiplyScalar(distance))

    transitionRef.current = {
      active: true,
      startPos: camera.position.clone(),
      endPos: targetPos,
      startTarget: controlsRef.current
        ? controlsRef.current.target.clone()
        : new THREE.Vector3(),
      endTarget: center.clone(),
      startUp: camera.up.clone(),
      endUp: targetUp,
      startTime: performance.now(),
      duration: 800,
    }
  }, [cameraView, loadedObjects])

  // Handle fit view triggers
  // biome-ignore lint/correctness/useExhaustiveDependencies: Fit view on fitTrigger triggers
  useEffect(() => {
    if (fitTrigger === 0) return

    const box = getCombinedBoundingBox()
    const center = new THREE.Vector3()
    box.getCenter(center)
    const size = new THREE.Vector3()
    box.getSize(size)
    const maxDim = Math.max(size.x, size.y, size.z)

    const fovRad = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180)
    let distance = maxDim / (2 * Math.tan(fovRad / 2))
    distance *= 1.35

    const currentDir = new THREE.Vector3()
    camera.getWorldDirection(currentDir)
    const dirFromCenter = currentDir.clone().negate().normalize()
    const targetPos = center.clone().add(dirFromCenter.multiplyScalar(distance))

    transitionRef.current = {
      active: true,
      startPos: camera.position.clone(),
      endPos: targetPos,
      startTarget: controlsRef.current
        ? controlsRef.current.target.clone()
        : new THREE.Vector3(),
      endTarget: center.clone(),
      startUp: camera.up.clone(),
      endUp: camera.up.clone(),
      startTime: performance.now(),
      duration: 800,
    }
  }, [fitTrigger, loadedObjects])

  // Direct layout fitting for initial load
  const fitSceneDirectly = () => {
    const box = getCombinedBoundingBox()
    const center = new THREE.Vector3()
    box.getCenter(center)
    const size = new THREE.Vector3()
    box.getSize(size)
    const maxDim = Math.max(size.x, size.y, size.z)

    const fovRad = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180)
    let distance = maxDim / (2 * Math.tan(fovRad / 2))
    distance *= 1.35

    const targetPos = center
      .clone()
      .add(new THREE.Vector3(1, 1, 1).normalize().multiplyScalar(distance))

    camera.position.copy(targetPos)
    camera.up.set(0, 1, 0)
    if (controlsRef.current) {
      controlsRef.current.target.copy(center)
      controlsRef.current.update()
    }
  }

  const initialFitRef = useRef(false)
  // biome-ignore lint/correctness/useExhaustiveDependencies: initial load fitting
  useEffect(() => {
    const hasCube = models.some((m) => m.type === 'cube' && m.visible)
    const hasLoaded = loadedObjects.length > 0
    let timer: ReturnType<typeof setTimeout> | undefined
    if ((hasCube || hasLoaded) && !initialFitRef.current) {
      initialFitRef.current = true
      timer = setTimeout(() => {
        fitSceneDirectly()
        console.log('📷 Camera fitted to scene bounds initially.')
      }, 50)
    }
    return () => {
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [loadedObjects, models])

  // Diagnostic logging to track loaded and rendered objects in the scene graph
  useEffect(() => {
    console.log('📦 Models configuration:', models)
    console.log('WebGL loaded objects cache:', loadedObjects)
    if (groupRef.current) {
      const renderedObjects: Array<{
        id: string
        name: string
        type: string
        visible: boolean
      }> = []
      groupRef.current.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh
          renderedObjects.push({
            id: mesh.uuid,
            name: mesh.name || child.parent?.name || 'Mesh',
            type: mesh.geometry ? mesh.geometry.type : 'Unknown',
            visible: mesh.visible,
          })
        }
      })
      console.log('🌲 Rendered meshes in 3D group:', renderedObjects)
    }
  }, [models, loadedObjects])

  // Process smooth transitions in frame loop
  useFrame(() => {
    if (transitionRef.current?.active) {
      const t = transitionRef.current
      const now = performance.now()
      const elapsed = now - t.startTime
      const progress = Math.min(1.0, elapsed / t.duration)

      const ease = 1 - (1 - progress) ** 3 // easeOutCubic

      camera.position.lerpVectors(t.startPos, t.endPos, ease)

      if (controlsRef.current) {
        controlsRef.current.target.lerpVectors(t.startTarget, t.endTarget, ease)
      }

      camera.up.lerpVectors(t.startUp, t.endUp, ease)

      if (controlsRef.current) {
        controlsRef.current.update()
      }

      if (progress >= 1.0) {
        t.active = false
        onCameraViewReset()
      }
    }
  })

  // Cleanup on unmount
  // biome-ignore lint/correctness/useExhaustiveDependencies: Cleanup resource on unmount
  useEffect(() => {
    return () => {
      loadedObjects.forEach((obj) => {
        obj.object.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((m) => {
                m.dispose()
              })
            } else if (mesh.material) {
              mesh.material.dispose()
            }
            if (mesh.geometry) {
              mesh.geometry.dispose()
            }
          }
        })
      })
    }
  }, [])

  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={[2, 2, 3]}
        fov={45}
        near={0.1}
        far={1000}
      />

      <color attach="background" args={['#0c0c0e']} />

      <ambientLight intensity={0.8} />
      <directionalLight position={[10, 15, 10]} intensity={1.5} castShadow />
      <directionalLight position={[-10, 15, -10]} intensity={0.5} />

      <group ref={groupRef}>
        {models.map((model) => {
          if (model.type === 'cube' && model.visible) {
            return (
              <Center key={model.id}>
                <mesh castShadow receiveShadow>
                  <boxGeometry args={[1, 1, 1]} />
                  <meshNormalMaterial />
                </mesh>
              </Center>
            )
          }

          const obj = loadedObjects.find((o) => o.id === model.id)
          if (obj && model.visible) {
            return (
              <Center key={model.id}>
                <primitive object={obj.object} />
              </Center>
            )
          }
          return null
        })}
      </group>

      <gridHelper
        args={[30, 30, '#5a5a65', '#2a2a30']}
        position={[0, -0.6, 0]}
      />

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        onStart={() => {
          if (transitionRef.current) {
            transitionRef.current.active = false
          }
          onCameraViewReset()
        }}
      />

      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewport
          axisColors={['#ff3653', '#00cf85', '#2fa1ff']}
          labelColor="white"
        />
      </GizmoHelper>
    </>
  )
}
