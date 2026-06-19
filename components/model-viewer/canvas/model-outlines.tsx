'use client'

import { Outlines } from '@react-three/drei'
import { createPortal } from '@react-three/fiber'
import { Fragment, useEffect, useState } from 'react'
import type * as THREE from 'three/webgpu'

interface ModelOutlinesProps {
  object: THREE.Object3D
  isSelected: boolean
}

export function ModelOutlines({ object, isSelected }: ModelOutlinesProps) {
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
      {meshes.map((mesh) => (
        <Fragment key={mesh.uuid}>
          {createPortal(<Outlines thickness={1.5} color="#ffffff" />, mesh)}
        </Fragment>
      ))}
    </>
  )
}
