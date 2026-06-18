// @ts-nocheck

import {
  Center,
  PerspectiveCamera,
  PresentationControls,
  useGLTF,
} from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Fn, mix, uniform } from 'three/tsl'
import type { Mesh } from 'three/webgpu'
import * as THREE from 'three/webgpu'

export interface SceneProps {
  presentationEnabled: boolean
  zoomPreset: 'close' | 'medium' | 'far'
  color: string
}

// 3D Scene rendered inside the R3F Canvas via WebGLTunnel
export function Scene({ presentationEnabled, zoomPreset, color }: SceneProps) {
  // Load shape.glb model from public/models/shape.glb
  const { scene } = useGLTF('/models/shape.glb')
  const modelRef = useRef<THREE.Group>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera>(null)

  // Reference to our custom WebGPU material to avoid recreating it
  const materialRef = useRef<THREE.MeshStandardNodeMaterial | null>(null)
  const prevColorUniformRef = useRef<ReturnType<typeof uniform> | null>(null)
  const targetColorUniformRef = useRef<ReturnType<typeof uniform> | null>(null)
  const transitionUniformRef = useRef<ReturnType<typeof uniform> | null>(null)

  if (!materialRef.current) {
    const prevColorUniform = uniform(new THREE.Color(color))
    const targetColorUniform = uniform(new THREE.Color(color))
    const transitionUniform = uniform(1.0)

    prevColorUniformRef.current = prevColorUniform
    targetColorUniformRef.current = targetColorUniform
    transitionUniformRef.current = transitionUniform

    // Blend standard colors on GPU using TSL Fn
    const getColor = Fn(() => {
      return mix(prevColorUniform, targetColorUniform, transitionUniform)
    })

    const mat = new THREE.MeshStandardNodeMaterial({
      roughness: 0.25,
      metalness: 0.2,
    })

    const finalColor = getColor()
    mat.colorNode = finalColor

    materialRef.current = mat
  }

  // Map zoom presets to target camera distance (Z axis)
  const getTargetZ = () => {
    switch (zoomPreset) {
      case 'close':
        return 1.8
      case 'medium':
        return 3.0
      case 'far':
        return 5.0
      default:
        return 3.0
    }
  }

  const targetZ = getTargetZ()

  // Smoothly interpolate camera position using useFrame (R3F render loop)
  useFrame((_state, delta) => {
    if (cameraRef.current) {
      cameraRef.current.position.z = THREE.MathUtils.lerp(
        cameraRef.current.position.z,
        targetZ,
        0.08
      )
    }

    // Add gentle idle rotation to the model when presentation controls are disabled
    if (modelRef.current && !presentationEnabled) {
      modelRef.current.rotation.y += 0.006
      modelRef.current.rotation.x = Math.sin(Date.now() * 0.001) * 0.05
    }

    // Transition progress animation
    if (
      transitionUniformRef.current &&
      (transitionUniformRef.current.value as number) < 1.0
    ) {
      transitionUniformRef.current.value = Math.min(
        1.0,
        (transitionUniformRef.current.value as number) + delta * 2.5
      )
    }
  })

  // Apply selected color dynamically via TSL uniform transition
  useEffect(() => {
    if (
      prevColorUniformRef.current &&
      targetColorUniformRef.current &&
      transitionUniformRef.current
    ) {
      const currentProgress = transitionUniformRef.current.value as number
      const prevColor = prevColorUniformRef.current.value as THREE.Color
      const targetColor = targetColorUniformRef.current.value as THREE.Color

      // Interpolate to avoid sudden visual jumps if clicked during a transition
      prevColor.lerpColors(prevColor, targetColor, currentProgress)

      // Set new color target
      targetColor.set(color)

      // Reset transition
      transitionUniformRef.current.value = 0.0
    }
  }, [color])

  // Replace default materials with our custom WebGPU material
  useEffect(() => {
    scene.traverse((child) => {
      if ((child as Mesh).isMesh) {
        const mesh = child as Mesh
        mesh.material = materialRef.current!
        mesh.castShadow = true
        mesh.receiveShadow = true
      }
    })
  }, [scene])

  // Clean up GPU resources on unmount
  useEffect(() => {
    return () => {
      if (materialRef.current) {
        materialRef.current.dispose()
      }
    }
  }, [])

  return (
    <>
      <PerspectiveCamera
        ref={cameraRef}
        makeDefault
        position={[0, 0.2, 3]}
        fov={45}
        near={0.1}
        far={100}
      />

      <color attach="background" args={['#000000']} />

      {/* Lighting configuration */}
      <ambientLight intensity={0.9} />
      <directionalLight position={[5, 10, 5]} intensity={1.5} castShadow />

      {/* Center scales and centers the GLTF model perfectly at [0, 0, 0] */}
      <PresentationControls
        enabled={presentationEnabled}
        rotation={[0, 0, 0]}
        polar={[-Math.PI / 4, Math.PI / 4]}
        azimuth={[-Math.PI / 2, Math.PI / 2]}
        config={{ mass: 1, tension: 170, friction: 26 }}
      >
        <Center>
          <primitive ref={modelRef} object={scene} />
        </Center>
      </PresentationControls>
    </>
  )
}
