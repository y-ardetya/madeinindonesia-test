'use client'

import { useGLTF, useTexture } from '@react-three/drei'
import { useLoader } from '@react-three/fiber'
import { TransformProvider } from 'hamo'
import { type PropsWithChildren, useEffect } from 'react'
import * as THREE from 'three/webgpu'
import { Preloader } from '@/components/ui/preloader'
import {
  filterTexturesByDevice,
  IMAGE_ASSETS,
  PRELOAD_ALL,
  PRELOAD_LOADER,
} from '@/lib/utils/preload'
import { useIsAppReady, useWebGLStore } from '@/lib/webgl/store'

const preloadBrowserImage = (path: string) => {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.src = path
}

export function AppShell({ children }: PropsWithChildren) {
  const isAppReady = useIsAppReady()

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      useWebGLStore.getState().setHasCheckedActivation()
    })
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    const supportsHover = window.matchMedia('(hover: hover)').matches

    // 1. Preload DOM images (with CORS enabled)
    filterTexturesByDevice(IMAGE_ASSETS, supportsHover).forEach(
      preloadBrowserImage
    )

    // 2. Preload WebGL standard textures (useTexture)
    filterTexturesByDevice(PRELOAD_ALL, supportsHover).forEach((path) => {
      useTexture.preload(path)
    })

    // 3. Preload WebGL loader assets (useLoader / useGLTF)
    filterTexturesByDevice(PRELOAD_LOADER, supportsHover).forEach((path) => {
      if (path.endsWith('.glb') || path.endsWith('.gltf')) {
        useGLTF.preload(path)
      } else {
        useLoader.preload(THREE.TextureLoader, path)
      }
    })
  }, [])

  return (
    <>
      <Preloader
        ready={isAppReady}
        onComplete={() => useWebGLStore.getState().setPreloaderDone(true)}
      />
      <TransformProvider>{children}</TransformProvider>
    </>
  )
}
