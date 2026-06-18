'use client'

import cn from 'clsx'
import { useState } from 'react'
import { WebGLTunnel } from '@/webgl/components/tunnel'
import s from './model-viewer.module.css'
import { Scene } from './scene'

// Curated colors for the palette
const COLOR_PALETTE = [
  { name: 'Ochre', hex: '#F2CC8F' },
  { name: 'Terracotta', hex: '#E07A5F' },
  { name: 'Sage', hex: '#81B29A' },
  { name: 'Indigo', hex: '#3D5A80' },
  { name: 'Rose', hex: '#F38375' },
  { name: 'Charcoal', hex: '#222222' },
]

export function ModelViewer() {
  const [presentationEnabled, setPresentationEnabled] = useState(true)
  const [zoomPreset, setZoomPreset] = useState<'close' | 'medium' | 'far'>(
    'medium'
  )
  const [color, setColor] = useState('#E07A5F')

  return (
    <div className={s.container}>
      {/* 3D Scene Teleportation */}
      <WebGLTunnel>
        <Scene
          presentationEnabled={presentationEnabled}
          zoomPreset={zoomPreset}
          color={color}
        />
      </WebGLTunnel>

      {/* 
        Rounded cutout frame.
        Positioned fixed/absolute over the canvas.
        Its huge box-shadow masks the canvas area, leaving a rounded "hole" in the center.
      */}
      <div className={s.frameOverlay} />

      {/* Interactive Bottom Control Panel */}
      <div className={s.controlPanel}>
        {/* Toggle Presentation Controls */}
        <div className={s.controlGroup}>
          <span className={s.groupLabel}>Controls</span>
          <button
            type="button"
            className={cn(s.btn, presentationEnabled && s.isActive)}
            onClick={() => setPresentationEnabled(!presentationEnabled)}
          >
            {presentationEnabled ? 'Drag Active' : 'Enable Drag'}
          </button>
        </div>

        {/* Camera Zoom Presets */}
        <div className={s.controlGroup}>
          <span className={s.groupLabel}>Camera Zoom</span>
          <div className={s.btnGroup}>
            {(['close', 'medium', 'far'] as const).map((preset) => (
              <button
                key={preset}
                type="button"
                className={cn(s.btn, zoomPreset === preset && s.isActive)}
                onClick={() => setZoomPreset(preset)}
              >
                {preset.charAt(0).toUpperCase() + preset.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Color Presets */}
        <div className={s.controlGroup}>
          <span className={s.groupLabel}>Model Color</span>
          <div className={s.palette}>
            {COLOR_PALETTE.map((item) => (
              <button
                key={item.hex}
                type="button"
                className={cn(s.colorBtn, color === item.hex && s.colorActive)}
                style={{ backgroundColor: item.hex }}
                onClick={() => setColor(item.hex)}
                title={item.name}
                aria-label={`Change color to ${item.name}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
