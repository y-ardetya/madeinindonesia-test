# AI Usage Report

## Session Date
2026-06-19

## Tools
- Antigravity (Gemini 3.5 Flash)

## Prompts

### Prompt 1 — Initial Feature Request
Build out the foundational model viewer feature: support loading multiple 3D models (STL, GLTF/GLB) into a single scene, add predefined camera views (front, back, left, right, top, bottom, isometric) with smooth transitions, integrate an orientation gizmo/view cube for quick camera reorientation, enable orbit controls with fit-to-view and reset-camera actions, and create a basic UI with file upload, a model list, camera view buttons, and a reset button.

### Prompt 2 — Bug Fix: Anisotropy Error (GizmoViewport)
Debug a recurring runtime error (`Cannot read properties of undefined (reading 'getMaxAnisotropy')`), first reported generally and then traced to originate from the `GizmoViewport` component.

### Prompt 3 — Selection and Camera UX Fixes
Show the active object's name in the bottom UI bar; fix reset camera so it returns to the initial load position instead of jumping to isometric; replace `TransformControls` with `PivotControl`, centered on the mesh's actual bounding box; and make predefined camera views target the currently active object instead of always the original cube.

### Prompt 4 — Camera View, Fit-to-View & Reset Camera Fixes
Following up on camera targeting not working as expected: fix predefined camera views so they reliably frame the active object, remove a leftover "ghost" blue cube from the scene, and make the grid floor infinite. Also fix fit-to-view and reset-camera behavior — reset should restore the exact initial camera position, and fit-to-view should frame the object with reasonable padding instead of too close or too large.

### Prompt 5 — Outline Effect for Uploaded Models (Drei's Outline Component)
Extend the selection outline effect to uploaded models, not just the default cube; then switch the implementation from a manual dynamic bounding-box approach to drei's `Outline` component, since the manual approach didn't handle the varied shapes and scales of uploaded models well.

### Prompt 6 — Codebase Cleanup
Clean up unused code, keeping only what's actively used by the model viewer; remove unused GSAP scroll-effect and preloader logic (while keeping GSAP itself); add WebGL-performance-related hooks.

### Prompt 7 — Further Scene Splitting + Canvas Styling
Split the scene further into dedicated components (loader, lighting, grid/gizmo helpers), and restyle the canvas: black background inside the canvas, white background and white gutters outside it.

### Prompt 8 — Folder Restructure (canvas / ui)
Restructure the model viewer into its own folder with `canvas/` and `ui/` subdirectories for better separation of concerns.

### Prompt 9 — Move Viewer Out of UI Folder + Constants
Move the model viewer out of the `ui/` folder to a top-level location, introduce a `constants` file for shared values, and shorten the overly long `CameraRig` component.

### Prompt 10 — Documentation Update
Update all project documentation (README, `agents.md`, `architecture.md`) to reflect the current codebase, and highlight the model viewer's features in the main README.

### Prompt 11 — Deselect, Spawn Placement, Responsive Styling, Persistent Label
Add click-outside-to-deselect behavior (removing the outline/pivot control); fix newly uploaded models spawning at random positions (place them beside or behind the default cube, or centered if it's deleted); apply the project's existing responsive/CSS conventions to the model viewer styles; and make the active-object label in the bottom panel persistent (showing "None" when nothing is selected) instead of appearing only on selection.

### Prompt 12 — Typography and Mobile Grid Refinement
Refine sidebar and bottom bar typography: use the display font for "Camera Views"/"Actions" labels and a serif font for view/action names (Front, Back, Fit View, Reset Camera), matching the existing responsive font setup; switch the mobile camera views list to a 2-column grid.

## Manual Adjustments
- Added a default fallback scene (cube with `MeshNormalMaterial` + a drei grid floor) and fixed model uploads that weren't rendering.
- Resolved a TSL/WebGPU compatibility issue caused by an unsupported `ShaderMaterial`.
- Debugged and fixed a black-screen rendering issue, including default cube visibility, using console logging to confirm model load/render state.
- Implemented drag-and-drop file loading, GSAP-based camera transition animations with custom eases, Zustand state management, model visibility toggle/delete, and a selection outline + `PivotControl`.
- Refactored the model viewer into a more modular structure with reusable components (e.g. `CameraRig`).
- Fixed a React key warning in `ModelRenderer`/`ModelOutlines`; restyled the sidebar and control panel (white background, black text); made the mobile layout more compact with a hamburger menu.
- Split the single `model-viewer.module.css` into per-component stylesheets.
- Added a local model library UI for preset models in `public/models`, with a drei `Loader` and preloading.
-