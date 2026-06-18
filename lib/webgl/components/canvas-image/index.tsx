'use client'

import { useTexture } from '@react-three/drei'
import cn from 'clsx'
import type { Rect } from 'hamo'
import { type ComponentProps, type Ref, useRef } from 'react'
import type { Mesh, Texture } from 'three'
import { Image } from '@/components/ui/image'
import { useCanvas } from '@/webgl/components/canvas'
import { WebGLTunnel } from '@/webgl/components/tunnel'
import { useWebGLElement } from '@/webgl/hooks/use-webgl-element'
import { useWebGLRect } from '@/webgl/hooks/use-webgl-rect'

interface CanvasImageProps extends ComponentProps<'div'> {
  src: string
  alt?: string
}

export function CanvasImage({
  src,
  alt = '',
  className,
  ...props
}: CanvasImageProps) {
  const { setRef, rect, isVisible } = useWebGLElement<HTMLElement>()
  const { WebGLTunnel: isWebGLActive } = useCanvas()

  return (
    <div className={cn('relative aspect-square min-w-0', className)} {...props}>
      {isWebGLActive ? (
        <div
          ref={setRef}
          className="pointer-events-none h-full w-full rounded-md"
        />
      ) : (
        <Image
          ref={setRef as unknown as Ref<HTMLImageElement>}
          className="pointer-events-none h-full w-full rounded-md object-cover"
          alt={alt}
          src={src}
          fill
          unoptimized
        />
      )}
      <WebGLTunnel>
        <DOMSyncedPlane rect={rect} visible={isVisible} src={src} />
      </WebGLTunnel>
    </div>
  )
}

interface DOMSyncedPlaneProps {
  rect: Rect
  visible: boolean
  src: string
}

function DOMSyncedPlane({ rect, visible, src }: DOMSyncedPlaneProps) {
  const meshRef = useRef<Mesh>(null)
  const imageTexture = useTexture(src) as Texture

  useWebGLRect(
    rect,
    ({ position, scale }) => {
      if (!meshRef.current) return
      meshRef.current.position.copy(position)
      meshRef.current.scale.copy(scale)
    },
    { visible }
  )

  if (!visible) return null

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={imageTexture} />
    </mesh>
  )
}
