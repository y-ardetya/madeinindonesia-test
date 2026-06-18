# Preloader and Asset Loading System

The preloading system in this repository manages assets for both the **standard HTML DOM** and **WebGL (Three.js)**. It uses a combination of early browser-cache loading and Three.js manager tracking to deliver a seamless transition into the experience.

---

## 1. Preloader Hook (`usePreloader`)

We provide a clean, stateful React hook called `usePreloader` that handles all of the tracking and animation logic.

### Usage

```tsx
import { usePreloader } from '@/lib/hooks/use-preloader'

export function MyCustomPreloader({ ready, onComplete }) {
  const { progress, isDone, containerRef } = usePreloader({ ready, onComplete })

  if (isDone) return null

  return (
    <div ref={containerRef} className="my-preloader-overlay">
      <span>{progress}%</span>
    </div>
  )
}
```

### Hook API

- **Parameters**:
  - `ready` (boolean): Whether the application layout/WebGL activation has completed.
  - `onComplete` (function, optional): Callback executed when the exit animation completes.
- **Returns**:
  - `progress` (number): Eased progress value (0 to 100).
  - `active` (boolean): True if Three.js is actively downloading assets.
  - `isDone` (boolean): True when the exit animation finishes (the preloader should unmount).
  - `containerRef` (React.RefObject): Must be attached to the root preloader element to run the exit slide animation.

---

## 2. Asset Loading Strategies

Assets are configured in [preload.ts](file:///d:/Learning/boiler/lib/utils/preload.ts) using three distinct arrays:

1. **`IMAGE_ASSETS`** (DOM Images):
   - Preloaded via browser-native `new Image()`.
   - Used for normal `<img>` or `@/components/ui/image` elements.
   
2. **`PRELOAD_ALL`** (Three.js standard textures):
   - Preloaded via `@react-three/drei`'s `useTexture` hooks.
   
3. **`PRELOAD_LOADER`** (Three.js loader textures):
   - Preloaded via `@react-three/fiber`'s `useLoader(TextureLoader)`.

---

## 3. Q&A: Should I specify an image in both DOM (`IMAGE_ASSETS`) and WebGL (`PRELOAD_ALL`/`PRELOAD_LOADER`)?

**Yes. If an image is used in both the DOM and WebGL, you should put it in both lists.**

Here is why:
- **`IMAGE_ASSETS`** preloads the image into the browser's HTTP cache.
- **WebGL preloading (`PRELOAD_ALL` / `PRELOAD_LOADER`)** performs the HTTP request (utilizing the browser's cache if already fetched) **and immediately uploads the texture data into the GPU's memory**.
- If you only put it in `IMAGE_ASSETS`, when the WebGL component mounts, it will download the image quickly from cache but will suffer from **GPU upload jank (frame drops)** during the texture initialization.
- If you only put it in `PRELOAD_ALL`, the DOM image element will not be preloaded early, causing a loading flash when the DOM component mounts.
- Listing the file in both places ensures the image is preloaded for both targets (DOM and GPU) without duplicate network requests (thanks to browser-level HTTP caching).
