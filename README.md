# OrigStudio Web

OrigStudio shared web frontend, used by both CE (Community Edition) and EE (Enterprise Edition) via Git Submodule.

## Tech Stack

- **Runtime**: Bun
- **Build**: Rsbuild
- **Framework**: React 19 + TypeScript
- **Routing**: TanStack Router
- **State**: TanStack Query
- **UI**: shadcn/ui + Radix + Tailwind CSS
- **i18n**: i18next
- **Test**: Jest + Playwright
- **Go Embed**: `//go:embed all:dist` for binary embedding

## Quick Start

```bash
bun install
bun run dev
```

Dev server runs at `http://localhost:18080`, proxying API requests to `http://localhost:8080`.

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start dev server |
| `bun run build` | Production build → `dist/` |
| `bun run preview` | Preview production build |
| `bun run lint` | ESLint check |
| `bun run typecheck` | TypeScript type check |
| `bun run test` | Run unit tests |
| `bun run test:e2e` | Run E2E tests (Playwright) |
| `bun run check` | lint + typecheck |

## Go Embed Integration

This repository contains Go files for embedding the frontend into the backend binary:

| File | Build Tag | Behavior |
|------|-----------|----------|
| `embed.go` | `!dev` (default) | Embeds `dist/` into binary via `//go:embed` |
| `embed_dev.go` | `dev` | Loads `dist/` from filesystem at runtime |
| `spa.go` | - | Registers SPA routes on gin.Engine |

**Release builds** (no `-tags=dev`): frontend is embedded in the binary.

**Dev builds** (`-tags=dev`): frontend is loaded from the filesystem, enabling hot reload.

## Usage as Submodule

```bash
git submodule add https://github.com/origadmin/orig-studio-web.git web
```

Update to latest:

```bash
cd web && git pull origin main && cd .. && git add web && git commit
```

Clone with submodules:

```bash
git clone --recurse-submodules <repo-url>
```

## Project Structure

```
├── src/
│   ├── components/     # UI components (admin, portal, common, ui)
│   ├── config/         # App configuration
│   ├── contexts/       # React contexts (auth, notification)
│   ├── hooks/          # Custom hooks
│   ├── i18n/           # Internationalization
│   ├── layout/         # Page layouts
│   ├── lib/            # Utilities, API client, services
│   ├── pages/          # Page components
│   ├── routes/         # TanStack Router route definitions
│   ├── themes/         # Theme system (15+ themes)
│   └── types/          # TypeScript type definitions
├── public/             # Static assets (images, locales, themes)
├── e2e/                # Playwright E2E tests
├── tests/              # Test files (features, bugs)
├── embed.go            # Go embed (production)
├── embed_dev.go        # Go embed (development)
└── spa.go              # SPA route registration
```

## License

Copyright (c) 2024 OrigAdmin. All rights reserved.
