'use client'

import { UploadIcon } from '@/components/model-viewer/ui/sidebar'
import s from './drop-overlay.module.css'

interface DropOverlayProps {
  isDragging: boolean
}

export function DropOverlay({ isDragging }: DropOverlayProps) {
  if (!isDragging) return null

  return (
    <div className={s.dropOverlay} aria-hidden="true">
      <div className={s.dropHint}>
        <UploadIcon />
        <span>Drop 3D files here</span>
        <span className={s.dropSub}>GLTF · GLB · STL</span>
      </div>
    </div>
  )
}
