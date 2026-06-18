/**
 * @module store
 */

import { create } from 'zustand'
import { type TunnelInstance, tunnel } from '@/webgl/utils/tunnel'

type WebGLTunnelInstance = TunnelInstance

let webGLTunnelSingleton: WebGLTunnelInstance | null = null
let domTunnelSingleton: WebGLTunnelInstance | null = null

function getWebGLTunnel(): WebGLTunnelInstance {
  if (!webGLTunnelSingleton) {
    webGLTunnelSingleton = tunnel()
  }
  return webGLTunnelSingleton
}

function getDOMTunnel(): WebGLTunnelInstance {
  if (!domTunnelSingleton) {
    domTunnelSingleton = tunnel()
  }
  return domTunnelSingleton
}

type WebGLStore = {
  isActivated: boolean
  isActive: boolean
  sceneReady: boolean
  preloaderDone: boolean

  /**
   * Becomes true one frame after mount, giving `<Wrapper webgl>` time
   * to call `activate()` if the page needs it. Used by `useIsAppReady`
   * to avoid a premature `true` result before activation status is known.
   */
  hasCheckedActivation: boolean

  setPreloaderDone: (val: boolean) => void
  getWebGLTunnel: () => WebGLTunnelInstance
  getDOMTunnel: () => WebGLTunnelInstance

  activate: () => void
  setActive: (active: boolean) => void
  setSceneReady: () => void
  setHasCheckedActivation: () => void
}

export const useWebGLStore = create<WebGLStore>((set, get) => ({
  isActivated: false,
  isActive: false,
  sceneReady: false,
  hasCheckedActivation: false,
  preloaderDone: false,
  setPreloaderDone: (val: boolean) => set({ preloaderDone: val }),

  getWebGLTunnel,
  getDOMTunnel,

  activate: () => {
    const state = get()
    if (state.isActivated) return

    set({
      isActivated: true,
      isActive: true,
    })
  },

  setActive: (active: boolean) => {
    set({ isActive: active })
  },

  setSceneReady: () => {
    if (get().sceneReady) return
    set({ sceneReady: true })
  },

  setHasCheckedActivation: () => {
    if (get().hasCheckedActivation) return
    set({ hasCheckedActivation: true })
  },
}))

/**
 * Derived, page-agnostic "is the app ready to reveal" signal.
 *
 * - Returns `false` until `hasCheckedActivation` is true (gives
 *   `<Wrapper webgl>` a chance to call `activate()` first).
 * - If never activated, the app is ready immediately.
 * - If activated, wait for `sceneReady`.
 */
export const useIsAppReady = () =>
  useWebGLStore((s) => {
    if (!s.hasCheckedActivation) return false
    return !s.isActivated || s.sceneReady
  })

export const usePreloaderDone = () =>
  useWebGLStore((state) => state.preloaderDone)
