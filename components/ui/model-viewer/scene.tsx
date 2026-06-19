'use client'

import {
  GizmoHelper,
  GizmoViewport,
  Grid,
  OrbitControls,
  Outlines,
  PerspectiveCamera,
  PivotControls,
} from '@react-three/drei'
import { createPortal, useFrame, useThree } from '@react-three/fiber'
import { gsap } from 'gsap'
import { CustomEase } from 'gsap/CustomEase'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three/webgpu'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { GLTFLoader, STLLoader } from 'three-stdlib'
import { useModelViewerStore } from './model-viewer-store'

// Register GSAP custom eases once (module-level, runs once)
gsap.registerPlugin(CustomEase)
CustomEase.create('osmo-ease', '0.625, 0.05, 0, 1')

interface LoadedObject {
  id: string
  object: THREE.Object3D
  /** World-space bounding box center, updated after load */
  center: THREE.Vector3
  url: string
}

export function Scene() {
  const { camera } = useThree()
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const defaultCubeRef = useRef<THREE.Mesh>(null)

  const models = useModelViewerStore((s) => s.models)
  const selectedId = useModelViewerStore((s) => s.selectedId)
  const cameraView = useModelViewerStore((s) => s.cameraView)
  const fitTrigger = useModelViewerStore((s) => s.fitTrigger)
  const resetTrigger = useModelViewerStore((s) => s.resetTrigger)
  const initialPose = useModelViewerStore((s) => s.initialPose)
  const setCameraView = useModelViewerStore((s) => s.setCameraView)
  const setSelectedId = useModelViewerStore((s) => s.setSelectedId)
  const setInitialPose = useModelViewerStore((s) => s.setInitialPose)

  const [loadedObjects, setLoadedObjects] = useState<LoadedObject[]>([])

  // GSAP tween proxy — avoids React re-renders during animation
  const tweenProxy = useRef({
    posX: 0,
    posY: 0,
    posZ: 0,
    tgtX: 0,
    tgtY: 0,
    tgtZ: 0,
    upX: 0,
    upY: 1,
    upZ: 0,
  })
  const activeTween = useRef<gsap.core.Tween | null>(null)
  const isTweening = useRef(false)

  // ─── Bounding box: selected object OR all visible objects ──────────────────
  const getBoundingBox = (forSelected = false): THREE.Box3 => {
    const box = new THREE.Box3()
    let has = false

    const expandByLoadedObj = (obj: LoadedObject) => {
      obj.object.updateMatrixWorld(true)
      const localBox = new THREE.Box3().setFromObject(obj.object)
      box.union(localBox)
    }

    // If focusing on a specific selected object
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

    // Fall back to all visible objects
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

  // ─── Camera tween helper ───────────────────────────────────────────────────
  const animateCamera = (
    endPos: THREE.Vector3,
    endTarget: THREE.Vector3,
    endUp: THREE.Vector3,
    onComplete?: () => void
  ) => {
    if (activeTween.current) activeTween.current.kill()
    if (controlsRef.current) {
      controlsRef.current.enableDamping = false
    }
    const proxy = tweenProxy.current
    proxy.posX = camera.position.x
    proxy.posY = camera.position.y
    proxy.posZ = camera.position.z
    proxy.tgtX = controlsRef.current?.target.x ?? 0
    proxy.tgtY = controlsRef.current?.target.y ?? 0
    proxy.tgtZ = controlsRef.current?.target.z ?? 0
    proxy.upX = camera.up.x
    proxy.upY = camera.up.y
    proxy.upZ = camera.up.z
    isTweening.current = true
    activeTween.current = gsap.to(proxy, {
      posX: endPos.x,
      posY: endPos.y,
      posZ: endPos.z,
      tgtX: endTarget.x,
      tgtY: endTarget.y,
      tgtZ: endTarget.z,
      upX: endUp.x,
      upY: endUp.y,
      upZ: endUp.z,
      duration: 1.0,
      ease: 'osmo-ease',
      onComplete: () => {
        isTweening.current = false
        if (controlsRef.current) {
          controlsRef.current.enableDamping = true
        }
        onComplete?.()
      },
    })
  }

  // Apply tween proxy to camera each frame
  useFrame(() => {
    if (!isTweening.current) return
    const p = tweenProxy.current
    camera.position.set(p.posX, p.posY, p.posZ)
    camera.up.set(p.upX, p.upY, p.upZ)
    if (controlsRef.current) {
      controlsRef.current.target.set(p.tgtX, p.tgtY, p.tgtZ)
      controlsRef.current.update()
    }
  })

  // ─── Camera view presets ── focuses on selected object if one is selected ──
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    if (!cameraView) return

    const box = getBoundingBox(true) // focus selected if available
    const center = new THREE.Vector3()
    box.getCenter(center)
    const size = new THREE.Vector3()
    box.getSize(size)
    const maxDim = Math.max(size.x, size.y, size.z)
    const fovRad = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180)
    let distance = maxDim / (2 * Math.tan(fovRad / 2))
    distance *= 3.0

    const dir = new THREE.Vector3()
    const up = new THREE.Vector3(0, 1, 0)

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

    animateCamera(
      center.clone().add(dir.multiplyScalar(distance)),
      center.clone(),
      up,
      () => setCameraView(null)
    )
  }, [cameraView, loadedObjects, selectedId, models, camera, setCameraView])

  // ─── Fit-to-view trigger ───────────────────────────────────────────────────
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    if (fitTrigger === 0) return
    const box = getBoundingBox(false)
    const center = new THREE.Vector3()
    box.getCenter(center)
    const size = new THREE.Vector3()
    box.getSize(size)
    const maxDim = Math.max(size.x, size.y, size.z)
    const fovRad = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180)
    let distance = maxDim / (2 * Math.tan(fovRad / 2))
    distance *= 3.0
    const dir = new THREE.Vector3()
    camera.getWorldDirection(dir)
    animateCamera(
      center
        .clone()
        .add(dir.clone().negate().normalize().multiplyScalar(distance)),
      center.clone(),
      camera.up.clone()
    )
  }, [fitTrigger, loadedObjects, models, camera])

  // ─── Reset Camera → replay initial pose ───────────────────────────────────
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    if (resetTrigger === 0) return
    const targetPose = initialPose || {
      posX: 2,
      posY: 2,
      posZ: 3,
      tgtX: 0,
      tgtY: 0,
      tgtZ: 0,
    }
    animateCamera(
      new THREE.Vector3(targetPose.posX, targetPose.posY, targetPose.posZ),
      new THREE.Vector3(targetPose.tgtX, targetPose.tgtY, targetPose.tgtZ),
      new THREE.Vector3(0, 1, 0)
    )
  }, [resetTrigger, initialPose])

  // ─── Initial camera fit (runs once when first content is ready) ────────────
  const didInitialFit = useRef(false)
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    const hasCube = models.some((m) => m.type === 'cube' && m.visible)
    const hasLoaded = loadedObjects.length > 0
    if ((hasCube || hasLoaded) && !didInitialFit.current) {
      didInitialFit.current = true
      const timer = setTimeout(() => {
        const box = getBoundingBox(false)
        const center = new THREE.Vector3()
        box.getCenter(center)
        const size = new THREE.Vector3()
        box.getSize(size)
        const maxDim = Math.max(size.x, size.y, size.z)
        const fovRad = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180)
        let distance = maxDim / (2 * Math.tan(fovRad / 2))
        distance *= 3.0
        const targetPos = center
          .clone()
          .add(new THREE.Vector3(1, 1, 1).normalize().multiplyScalar(distance))
        camera.position.copy(targetPos)
        camera.up.set(0, 1, 0)
        if (controlsRef.current) {
          controlsRef.current.target.copy(center)
          controlsRef.current.update()
        }
        // Snapshot this pose for Reset Camera
        setInitialPose({
          posX: targetPos.x,
          posY: targetPos.y,
          posZ: targetPos.z,
          tgtX: center.x,
          tgtY: center.y,
          tgtZ: center.z,
        })
      }, 60)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [loadedObjects, models, camera, setInitialPose])

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
            mesh.material.forEach((m) => {
              m.dispose()
            })
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
            // Compute the bounding-box center BEFORE adding to scene
            const box = new THREE.Box3().setFromObject(object)
            const center = new THREE.Vector3()
            box.getCenter(center)

            // Shift the object so its visual center lands at local [0,0,0].
            // PivotControls with anchor=[0,0,0] will then sit exactly on the
            // mesh center, regardless of where the geometry's own origin is.
            object.position.sub(center)

            // `center` becomes the group's world position so the model
            // still appears at the correct location in the scene.
            resolve({ id: model.id, object, center, url: model.url! })
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
            ; (mesh.material as THREE.MeshStandardMaterial).color.set(
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
      activeTween.current?.kill()
      for (const obj of loadedObjects) {
        obj.object.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((m) => {
                m.dispose()
              })
            } else {
              mesh.material?.dispose()
            }
            mesh.geometry?.dispose()
          }
        })
      }
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

      {/* Models */}
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
                {/* PivotControls wraps the cube and centers itself at [0,0,0] */}
                <PivotControls
                  visible={isSelected}
                  anchor={[0, 0, 0]}
                  depthTest={false}
                  lineWidth={2}
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
              // group sits at the original world-space center of the model.
              // The object inside has been pre-shifted by -center during load,
              // so its local origin IS its visual center.
              // PivotControls anchor=[0,0,0] therefore lands exactly on the mesh.
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

      <Grid
        position={[0, -0.6, 0]}
        args={[30, 30]}
        cellSize={1}
        cellThickness={1}
        cellColor="#2a2a30"
        sectionSize={5}
        sectionThickness={1.5}
        sectionColor="#5a5a65"
        fadeDistance={100}
        fadeStrength={1.5}
        infiniteGrid
      />

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        onStart={() => {
          if (isTweening.current) {
            activeTween.current?.kill()
            isTweening.current = false
          }
          setCameraView(null)
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

function ModelOutlines({
  object,
  isSelected,
}: {
  object: THREE.Object3D
  isSelected: boolean
}) {
  const [meshes, setMeshes] = useState<THREE.Mesh[]>([])

  useEffect(() => {
    const list: THREE.Mesh[] = []
    object.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        list.push(child as THREE.Mesh)
      }
    })
    setMeshes(list)
  }, [object])

  if (!isSelected) return null

  return (
    <>
      {meshes.map((mesh) =>
        createPortal(
          <Outlines thickness={1.5} color="#ffffff" />,
          mesh
        )
      )}
    </>
  )
}
