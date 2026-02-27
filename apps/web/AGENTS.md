# AGENTS.md — apps/web

Raveo-specific rules for the web app. Read the root `AGENTS.md` first, then this file.

## Stack

- Astro v6 beta
- Cloudflare Workers via `@astrojs/cloudflare` adapter
- Tailwind CSS v4
- TypeScript

## Critical: CMS Data Fetching Pattern

The web Worker communicates with the CMS Worker via Cloudflare service binding — never via public URL.

### Why Not fetch() or Live Collections

- Workers cannot call another Worker's public URL — Cloudflare blocks this
- Astro live collection loaders are plain functions without access to `env`
- Service binding (`env.CMS`) is only available in Worker runtime context

### The Pattern

All CMS data is fetched in `src/middleware.ts` and stored in `locals`. Pages read from `locals` — no additional fetches.

```typescript
// middleware.ts — production uses service binding, dev uses HTTP fallback
import.meta.env.PROD
  ? env.CMS.fetch(new Request('https://cms/api/posts'))  // service binding
  : fetch('http://localhost:3000/api/posts')              // HTTP fallback
```

The hostname `https://cms/` is fictitious — service binding ignores it and routes internally.

### Adding New Data to Middleware

1. Add fetch call to `Promise.all` in `middleware.ts`
2. Add type to `env.d.ts` in `App.Locals`
3. Access via `Astro.locals.myData` in `.astro` files

Never call `fetch()` directly in `.astro` files for CMS data.

## Routing

| Route | File | Source |
|---|---|---|
| `/` | `src/pages/index.astro` | `locals.pages` (slug: `home`) |
| `/[slug]` | `src/pages/[slug].astro` | `locals.pages` |
| `/blog` | `src/pages/blog/index.astro` | `locals.posts` |
| `/blog/[slug]` | `src/pages/blog/[slug].astro` | `locals.posts` |
| `/sitemap.xml` | `src/pages/sitemap.xml.ts` | `locals.pages` + `locals.posts` |
| `/llms-full.txt` | `src/pages/llms-full.txt.ts` | `locals.pages` + `locals.posts` |

## Locals Types

Defined in `src/env.d.ts`. Always update when adding new data to middleware.

```typescript
declare namespace App {
  interface Locals extends Runtime {
    navigation: { ... } | null
    siteSettings: { ... } | null
    pages: PayloadPage[]
    posts: PayloadPost[]
  }
}
```

## Layout

`src/layouts/Layout.astro` accepts:

- `title: string` — required
- `description?: string` — optional
- `noIndex?: boolean` — optional, adds `noindex` meta tag

Navigation and siteSettings are read directly from `Astro.locals` inside the layout.

## Adding a New Page Type

1. Add new data type to `src/env.d.ts`
2. Fetch in `src/middleware.ts`
3. Create route in `src/pages/`
4. Read from `Astro.locals`

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `CMS_URL` | Yes (dev) | CMS base URL for HTTP fallback |
| `ASTRO_SITE` | No | Used for sitemap canonical URLs |

In production, `CMS_URL` is unused — all requests go through service binding.

## Wrangler Config

Service binding to CMS Worker:

```jsonc
"services": [{ "binding": "CMS", "service": "raveo-cms" }]
```

`raveo-cms` must match the `name` field in `apps/cms/wrangler.jsonc`.

## Workers Constraints

- `import.meta.env.PROD` — use this to detect production vs dev
- `cloudflare:workers` module — available in production, throws in dev (catch it)
- No Node.js APIs — only Web APIs
