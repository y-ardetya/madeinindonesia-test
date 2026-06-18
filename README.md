![YHN](/banner.jpg)

# YHN

A modern Next.js 16 starter with React 19, Tailwind CSS v4, and WebGPU with WebGL fallback. *YHN* derived from Yohane aka Yoga Ardli Ardetya.

> **Note**: This README is for template developers. For client handoff, see [PROD-README.md](PROD-README.md).

Run `bun dev` and open [localhost:3000](http://localhost:3000) — the landing page is a step-by-step manual that walks you from a fresh clone to a shippable site. The rest of this README is the reference version.

[![Deploy with Vercel](https://vercel.com/button)]

> After deploying, set `NEXT_PUBLIC_BASE_URL` to your domain in the project's environment variables — it drives SEO, canonical URLs, sitemaps, and social ca## Features

- **Next.js 16 + React 19** — App Router with React 19.2 and strict TypeScript out of the box
- **Tailwind v4** — Tailwind CSS v4 alongside CSS Modules
- **WebGL / 3D Graphics** — Three.js and React Three Fiber architecture
- **Unified Generator** — scaffold pages and components quickly via `bun run generate`
- **Handoff Utility** — prepare the codebase for delivery via `bun run handoff`
- **Modern tooling** — Bun, Biome, and Turbopack

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
  ├── webgl/           # 3D graphics (opt-in)
  └── dev/             # Debug tools (optional)
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

