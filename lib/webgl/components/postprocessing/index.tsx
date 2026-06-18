import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { pass, uniform, uv } from 'three/tsl'
import * as THREE from 'three/webgpu'
import { smokeNode } from '@/lib/webgl/utils/smoke'

const FLUID_DEFAULTS = {
  speedFactor: 1,
  simRes: 128,
  dyeRes: 128,
  iterations: 3,
  densityDissipation: 0.97,
  velocityDissipation: 0.98,
  pressureDissipation: 0.9,
  curlStrength: 20,
  radius: 0.05,
  pressureFactor: 0.2,
  useBoundaries: false,
  pointerScale: 10,
}

export function PostProcessing() {
  const { gl: renderer, scene, camera, size } = useThree()
  const postProcessingRef = useRef<THREE.RenderPipeline | null>(null)

  const pointer = new THREE.Vector2()
  const distortionStrength = uniform(0.003)

  useEffect(() => {
    if (!(renderer && scene && camera)) return

    const fluid = smokeNode(
      pointer,
      FLUID_DEFAULTS.simRes,
      FLUID_DEFAULTS.dyeRes,
      FLUID_DEFAULTS.iterations,
      FLUID_DEFAULTS.densityDissipation,
      FLUID_DEFAULTS.velocityDissipation,
      FLUID_DEFAULTS.pressureDissipation,
      FLUID_DEFAULTS.curlStrength,
      FLUID_DEFAULTS.pressureFactor,
      FLUID_DEFAULTS.radius,
      FLUID_DEFAULTS.useBoundaries,
      FLUID_DEFAULTS.pointerScale,
      1,
      FLUID_DEFAULTS.speedFactor
    )

    const scenePass = pass(scene, camera)
    const scenePassColor = scenePass.getTextureNode('output')

    const fluidTexture = fluid.getTextureNode()
    // biome-ignore lint/suspicious/noTsIgnore: TSL union type is too complex for TypeScript compiler
    // @ts-ignore
    const fluidVelocity = fluidTexture.xy.mul(distortionStrength).mul(0.01)
    const distortedUV = uv().sub(fluidVelocity)

    const outputNode = scenePassColor.sample(distortedUV)

    const postProcessing = new THREE.RenderPipeline(
      renderer as unknown as THREE.Renderer
    )
    postProcessing.outputNode = outputNode
    postProcessing.needsUpdate = true
    postProcessingRef.current = postProcessing

    return () => {
      postProcessingRef.current = null
    }
  }, [renderer, scene, camera, pointer, distortionStrength])

  useEffect(() => {
    const pipeline = postProcessingRef.current as unknown as {
      setSize?: (w: number, h: number) => void
    }
    if (pipeline?.setSize) {
      pipeline.setSize(size.width, size.height)
    }
  }, [size])

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      pointer.set(
        (e.clientX / size.width) * 2 - 1,
        -((e.clientY / size.height) * 2 - 1)
      )
    }
    window.addEventListener('pointermove', onPointerMove)
    return () => window.removeEventListener('pointermove', onPointerMove)
  }, [pointer, size])

  useFrame(({ gl }) => {
    if (postProcessingRef.current) {
      gl.clear()
      postProcessingRef.current.render()
    }
  }, 1)

  return null
}
