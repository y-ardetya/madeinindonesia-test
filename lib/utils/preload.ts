/**
 * Texture Preload List
 * Shows the three loading strategies used across the experience.
 */

// 1. DOM-loaded image (preloaded via new Image() in App.jsx)
export const IMAGE_ASSETS: string[] = ['/images/img1.png', '/images/img2.png']

// 2. Three.js texture loaded via useTexture (drei) - e.g. entrance/corridor/gallery/contact
export const PRELOAD_ALL: string[] = ['/images/img1.png', '/images/img2.png']

// 3. Three.js texture loaded via useLoader(TextureLoader) - e.g. about/studio
export const PRELOAD_LOADER: string[] = ['/models/shape.glb']

/**
 * Filters the preload list based on whether the device supports hover (desktop)
 * or is a touch-only device (mobile/tablet).
 * @param list The list of texture paths to filter
 * @param usePainted Whether to prioritize _painted versions
 * @returns The filtered list
 */
export const filterTexturesByDevice = (
  list: string[],
  usePainted: boolean
): string[] => {
  return list.filter((path) => {
    const isPainted = path.includes('_painted.webp')

    if (isPainted) {
      return usePainted
    }

    const paintedVersion = path.replace('.webp', '_painted.webp')
    if (list.includes(paintedVersion)) {
      // Standard version with a painted counterpart - keep regardless of device
      return true
    }

    // No painted version exists - always keep
    return true
  })
}
