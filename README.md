<img width="804" height="226" alt="images" src="https://github.com/user-attachments/assets/0dfb9b35-0bac-4c65-8b22-e72b3de12d72" />

# YHN

A modern Next.js 16 starter with React 19, Tailwind CSS v4, and WebGPU with WebGL fallback. *YHN* derived from Yohane aka Yoga Ardli Ardetya.

- **Next.js 16 + React 19** — App Router with React 19.2 and strict TypeScript out of the box
- **Tailwind v4** — Tailwind CSS v4 alongside CSS Modules
- **WebGL / 3D Graphics** — Three.js and React Three Fiber architecture
- **3D Model Viewer** — Fully modular R3F viewport with drag-and-drop loading, multi-model STL/GLTF support, custom presets, pivot controls, outline helpers, and adaptive auto-fitting
- **Unified Generator** — scaffold pages and components quickly via `bun run generate`
- **Handoff Utility** — prepare the codebase for delivery via `bun run handoff`
- **Modern tooling** — Bun, Biome, and Turbopack

## 3D Model Viewer Features

The project includes a robust, modular, and optimized 3D Model Viewer component (`@/components/model-viewer`) built using React Three Fiber, `@react-three/drei`, GSAP, and Zustand.

- **Multiple Model Loading**: Load and render multiple `STL`, `GLTF`, and `GLB` files simultaneously, with auto-assigned curated color themes.
- **Drag-and-Drop Viewport**: Drag files directly from your desktop into the viewport to import.
- **Outline & Highlight Helpers**: Highlight selection boundaries using custom portal outlines.
- **Camera View Presets**: Instantly snap or transition smoothly to Front, Back, Left, Right, Top, Bottom, and Isometric views targeting the active model or scene bounds.
- **Interactive Pivot Controls**: Position and manipulate default or uploaded models dynamically in the 3D workspace.
- **Helpers & Gizmos**: Features infinite grid helpers, and coordinate axis orientation view cubes/gizmos.
- **Modular Component Architecture**: Separated into clear folders for UI overlay elements (`Sidebar`, `ControlPanel`, `DropOverlay`) and WebGL logic (`Scene`, `CameraRig`, `ModelRenderer`, `SceneExtras`, `SceneLighting`, `useModelLoader` hook).
- **Zustand State Store**: Synchronized state management for mesh selection, visibility, coloring, camera triggers, and resets.

## Quick Start

```bash
bun install
bun dev                      # open localhost:3000
```

## Tech Stack

| Category | Technologies |
|----------|--------------|
| Framework | Next.js 16, React 19.2, TypeScript |
| Styling | Tailwind CSS v4, CSS Modules |
| Optional | React Three Fiber, GSAP, Zustand |
| Tooling | Bun, Biome, Turbopack |

> **Note**: `hamo` and `tempus` are packages published on a `dev` pre-release dist-tag. They do not follow semver guarantees — pin exact versions and review changes when bumping.

## Project Structure

```
app/                   # Next.js pages and routes (page.tsx is the landing)
components/            # UI components
lib/                   # Everything non-UI
  ├── hooks/           # Custom React hooks
  ├── styles/          # CSS & Tailwind
```

> **Mental model:** UI → `components/`, everything else → `lib/`.

## Documentation

| Area | Documentation |
|------|---------------|
| Engineering Standards | [AGENTS.md](AGENTS.md) - Canonical rules for all AI tools and contributors |
| Architecture | [ARCHITECTURE.md](ARCHITECTURE.md) - Key decisions, patterns, customization |
| Component Inventory | [COMPONENTS.md](COMPONENTS.md) - Auto-generated component/hook/utility manifest |
| Changelog | [CHANGELOG.md](CHANGELOG.md) - Release history and versioning policy |
| App Router | [app/README.md](app/README.md) - Pages, layouts, routing |
| Components | [components/README.md](components/README.md) - UI reference |
| Library | [lib/README.md](lib/README.md) - Hooks, utils, styles |

## Scripts

```bash
bun dev              # Development server
bun build            # Production build
bun lint             # Biome linter
bun run generate     # Generate pages/components
bun run handoff      # Prepare for client delivery
```

## Client Handoff

Prepare the codebase for client delivery:

```bash
bun run handoff
```

This interactive script:
- Removes YHN branding
- Swaps README with the production version
- Generates a component inventory
- Updates package.json with the project name

## Key Conventions

- **Images**: Use `@/components/ui/image` (never `next/image` directly)
- **Links**: Use `@/components/ui/link` (auto-handles external links)
- **CSS Modules**: Import as `s` → `import s from './component.module.css'`
- **Debug Tools**: Toggle with `Cmd/Ctrl + O`

## Deployment

```bash
vercel
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for deployment checklist and cache strategies.

