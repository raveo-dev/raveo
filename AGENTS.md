# AGENTS.md — Raveo Monorepo

This file provides architectural context for AI assistants working in this repository.
Read this before making any changes.

## Repository Structure

```
raveo/
├── apps/
│   ├── cms/     — PayloadCMS + Next.js → Cloudflare Worker
│   └── web/     — Astro v6 → Cloudflare Worker
├── packages/
│   ├── types/   — Generated Payload types (@raveo/types)
│   └── config/  — Shared tsconfig + Biome config
├── turbo.json
└── pnpm-workspace.yaml
```

## Running the Project

```bash
# Start both apps in parallel
pnpm --filter @raveo/cms dev    # CMS at http://localhost:3000
pnpm --filter @raveo/web dev    # Web at http://localhost:4321

# Seed demo data
pnpm --filter @raveo/cms seed

# Regenerate shared types after CMS schema changes
pnpm --filter @raveo/cms generate:types

# Typecheck all packages
pnpm typecheck

# Deploy both apps
pnpm deploy

# Deploy individually
pnpm deploy:cms
pnpm deploy:web
```

## Monorepo Rules

- Package manager: pnpm only — never use npm or yarn
- Always use `--filter` flag to target specific apps
- Shared configs live in `packages/config/`
- Shared types live in `packages/types/` — never write Payload types manually, always generate

## Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Runtime | Cloudflare Workers | V8 isolate, no Node.js |
| CMS | PayloadCMS 3.x | Runs inside Next.js |
| Frontend | Astro v6 beta | Cloudflare-native |
| Database | Cloudflare D1 | Serverless SQLite |
| Storage | Cloudflare R2 | S3-compatible |
| Cache | Cloudflare KV | Sub-ms edge reads |
| Monorepo | Turborepo + pnpm | Task orchestration |
| Linter | Biome.js | Replaces ESLint + Prettier |

## Cloudflare Workers Constraints

These apply to both apps — violating them will cause runtime errors:

- **No sharp** — image processing not supported on Workers. Always set `crop: false`, `focalPoint: false` on Media collections
- **No filesystem** — no `fs` module, no subprocesses
- **No Node.js modules** — only Web APIs and Cloudflare APIs
- **No self-fetch** — a Worker cannot call its own public URL or another Worker's public URL. Use service bindings instead

## Worker-to-Worker Communication

Web Worker communicates with CMS Worker via service binding — never via public URL.

```typescript
// WRONG — will fail on Workers
fetch('https://raveo-cms.workers.dev/api/posts')

// CORRECT — service binding (configured in apps/web/wrangler.jsonc)
env.CMS.fetch(new Request('https://cms/api/posts'))
```

In dev, service binding is unavailable — use HTTP fallback to `localhost:3000`.
See `apps/web/AGENTS.md` for the full pattern.

## Code Style

- Language: TypeScript everywhere
- Formatter: Biome.js (`pnpm lint:fix`)
- All comments and names in code must be in English
- No `any` types unless absolutely necessary with explanation comment
