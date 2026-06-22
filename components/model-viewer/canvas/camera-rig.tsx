'use client'

import {
  AdaptiveDpr,
  AdaptiveEvents,
  OrbitControls,
  PerspectiveCamera,
} from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { gsap } from 'gsap'
import { CustomEase } from 'gsap/CustomEase'
import { useEffect, useRef } from 'react'
import * as THREE from 'three/webgpu'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import {
  CAMERA_DEFAULTS,
  CAMERA_TWEEN_DURATION,
  CAMERA_TWEEN_EASE,
  getCameraPresetValues,
  getFitDistance,
  INITIAL_POSE,
  ORBIT_CONTROLS_DEFAULTS,
} from '@/components/model-viewer/constants'
import { useModelViewerStore } from '@/components/model-viewer/model-viewer-store'

// Register GSAP custom eases once
gsap.registerPlugin(CustomEase)
CustomEase.create('osmo-ease', '0.625, 0.05, 0, 1')

interface CameraRigProps {
  getBoundingBox: (forSelected?: boolean) => THREE.Box3
  hasContent: boolean
  controlsRef: React.RefObject<OrbitControlsImpl | null>
}

export function CameraRig({
  getBoundingBox,
  hasContent,
  controlsRef,
}: CameraRigProps) {
  const { camera } = useThree()

  const cameraView = useModelViewerStore((s) => s.cameraView)
  const fitTrigger = useModelViewerStore((s) => s.fitTrigger)
  const resetTrigger = useModelViewerStore((s) => s.resetTrigger)
  const initialPose = useModelViewerStore((s) => s.initialPose)
  const setCameraView = useModelViewerStore((s) => s.setCameraView)
  const setInitialPose = useModelViewerStore((s) => s.setInitialPose)

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
      duration: CAMERA_TWEEN_DURATION,
      ease: CAMERA_TWEEN_EASE,
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

    const box = getBoundingBox(false)
    const center = new THREE.Vector3()
    box.getCenter(center)
    const distance = getFitDistance(
      box,
      (camera as THREE.PerspectiveCamera).fov
    )

    const { dir, up } = getCameraPresetValues(cameraView)

    animateCamera(
      center.clone().add(dir.multiplyScalar(distance)),
      center.clone(),
      up,
      () => setCameraView(null)
    )
  }, [cameraView, camera, getBoundingBox, setCameraView])

  // ─── Fit-to-view trigger ───────────────────────────────────────────────────
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    if (fitTrigger === 0) return
    const box = getBoundingBox(false)
    const center = new THREE.Vector3()
    box.getCenter(center)
    const distance = getFitDistance(
      box,
      (camera as THREE.PerspectiveCamera).fov
    )
    const dir = new THREE.Vector3()
    camera.getWorldDirection(dir)
    animateCamera(
      center
        .clone()
        .add(dir.clone().negate().normalize().multiplyScalar(distance)),
      center.clone(),
      camera.up.clone()
    )
  }, [fitTrigger, camera, getBoundingBox])

  // ─── Reset Camera → replay initial pose ───────────────────────────────────
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    if (resetTrigger === 0) return
    const targetPose = initialPose || {
      posX: INITIAL_POSE.posX,
      posY: INITIAL_POSE.posY,
      posZ: INITIAL_POSE.posZ,
      tgtX: INITIAL_POSE.tgtX,
      tgtY: INITIAL_POSE.tgtY,
      tgtZ: INITIAL_POSE.tgtZ,
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
    if (hasContent && !didInitialFit.current) {
      didInitialFit.current = true
      const timer = setTimeout(() => {
        const box = getBoundingBox(false)
        const center = new THREE.Vector3()
        box.getCenter(center)
        const distance = getFitDistance(
          box,
          (camera as THREE.PerspectiveCamera).fov
        )
        const targetPos = center
          .clone()
          .add(
            new THREE.Vector3(0, 0.2, 1).normalize().multiplyScalar(distance)
          )
        camera.position.copy(targetPos)
        camera.up.set(0, 1, 0)
        if (controlsRef.current) {
          controlsRef.current.target.copy(center)
          controlsRef.current.update()
        }
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
  }, [hasContent, camera, getBoundingBox, setInitialPose])

  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={[INITIAL_POSE.posX, INITIAL_POSE.posY, INITIAL_POSE.posZ]}
        fov={CAMERA_DEFAULTS.fov}
        near={CAMERA_DEFAULTS.near}
        far={CAMERA_DEFAULTS.far}
      />
      <AdaptiveDpr />
      <AdaptiveEvents />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={ORBIT_CONTROLS_DEFAULTS.dampingFactor}
        onStart={() => {
          if (isTweening.current) {
            activeTween.current?.kill()
            isTweening.current = false
          }
          setCameraView(null)
        }}
      />
    </>
  )
}
