# Architecture Guide

Key architectural decisions and patterns for teams working with this codebase.

## Core Decisions

### React Compiler (No Manual Memoization)

React Compiler is enabled — no `useMemo`, `useCallback`, or `React.memo`. See AGENTS.md § No manual memoization.

### CSS Modules + Tailwind

Tailwind for layout/spacing/color; CSS Modules for complex animations and custom layouts. See AGENTS.md § Styling split.

### Custom Image/Link Components

Always use these, never native HTML:

```tsx
import { Image } from '@/components/ui/image'
import { Link } from '@/components/ui/link'
```

**Why?**
- Image: Optimization, aspect ratios, WebGL integration
- Link: External detection, prefetching, consistent behavior

### Lenis for Scrolling

Configured in `app/layout.tsx`. ScrollTrigger uses Lenis automatically.

### Optional Features Pattern

Root layout conditionally loads features:

```tsx
import { OptionalFeatures } from '@/lib/features'
<OptionalFeatures /> // Only loads WebGL, dev tools when needed
```

## Cache Components (Next.js 16)

Server Components use advanced caching. Key rules:

| Data Type | Cache Strategy |
|-----------|----------------|
| Public content | ISR with `revalidate` |
| User-specific | `cache: 'no-store'` |
| Real-time | `cache: 'no-store'` |

**Gotchas:**
- Never cache user data (carts, accounts, private content)
- Wrap cached components in Suspense boundaries
- Test with hard refresh AND navigation (different cache layers)
- Use `revalidateTag()` or `revalidatePath()` for invalidation

## WebGL Architecture

Uses lazy GlobalCanvas with visibility-based pausing:

```
Root Layout → GlobalCanvas (lazy-loaded via lib/features, mounts on first WebGL page)
    └─ WebGLTunnel (portals 3D content)
        └─ Your 3D scene
```

Context survives navigation. See [lib/webgl/README.md](lib/webgl/README.md).

## Animation

Use `useReveal` (CSS-driven, compositor thread) for reveal-on-scroll and entrance animations. Reserve GSAP for orchestration, scrubbing, and pinning. Always honor `prefers-reduced-motion` — `useReveal` short-circuits automatically; CSS global neutralizer is in `global.css`. See AGENTS.md § Animation.

## File Organization

```
components/
├── model-viewer/ → Fully featured 3D Model Viewer
├── ui/        → Primitives (reusable)
├── layout/    → Site chrome (customize)
└── effects/   → Animations

lib/
├── hooks/     → React hooks
├── styles/    → CSS & Tailwind config
├── utils/     → Pure utilities
├── webgl/     → 3D graphics (optional)
└── dev/       → Debug tools (optional)
```

### Validation Layer

Zod schemas are used to validate configuration environment variables. The schema lives in `lib/utils/validation.ts`. The typed env singleton (`lib/env.ts`) provides type safety and IntelliSense for accessing environment variables in `process.env`.


## Deployment Checklist

- [ ] Environment variables configured
- [ ] Build passes (`bun build`)
- [ ] Performance score > 90

## Customization Boundaries

One decision drives how you work in this repo: **are you building your project, or extending the starter?**

- **Building your project** (pages, content, styling): modify freely. `app/` is yours.
- **Extending the starter** (new shared primitives): add alongside the existing ones rather than rewriting them.

This keeps upstream updates smooth. When you create new components instead of modifying starter ones, and keep your pages and content separate from starter utilities, pulling YHN updates stays low-conflict. There are no strict folder rules beyond that: `components/` for UI, `lib/` for everything else.


