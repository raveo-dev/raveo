# Raveo

Cloudflare-native open-core CMS platform combining PayloadCMS with edge computing infrastructure.

> **Status:** Early development — not production ready yet.

## What is Raveo

Raveo is a monorepo boilerplate for building websites on Cloudflare Workers with PayloadCMS as the headless CMS and Astro as the frontend. Everything runs on Cloudflare's edge — no servers, no containers, no cold starts.

```
CMS Worker (PayloadCMS + Next.js)
  └── D1 (SQLite database)
  └── R2 (media storage)

Web Worker (Astro v6)
  └── KV (cache)
  └── Service binding → CMS Worker
```

## Stack

| Layer | Technology |
|---|---|
| Runtime | Cloudflare Workers |
| CMS | PayloadCMS 3.x |
| Frontend | Astro v6 |
| Database | Cloudflare D1 (SQLite) |
| Storage | Cloudflare R2 |
| Cache | Cloudflare KV |
| Monorepo | Turborepo + pnpm |
| Styling | Tailwind CSS v4 |

## Prerequisites

- Node.js >= 20
- pnpm >= 10
- Cloudflare account
- Wrangler CLI (`pnpm add -g wrangler`)

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/raveo-dev/raveo.git
cd raveo
pnpm install
```

### 2. Create Cloudflare resources

Create the required Cloudflare resources for the CMS:

```bash
# D1 database
wrangler d1 create raveo-cms

# R2 bucket
wrangler r2 bucket create raveo-cms-r2

# KV namespace (for web)
wrangler kv namespace create CACHE
```

### 3. Configure wrangler.jsonc

Copy the example configs and fill in your resource IDs:

```bash
cp apps/cms/wrangler.example.jsonc apps/cms/wrangler.jsonc
cp apps/web/wrangler.example.jsonc apps/web/wrangler.jsonc
```

Then update the placeholder values in both files with your actual Cloudflare resource IDs from step 2.

### 4. Set up environment variables

Create `apps/cms/.dev.vars`:

```
PAYLOAD_SECRET=your-secret-key-min-32-chars
```

Create `apps/web/.env.local`:

```
CMS_URL=http://localhost:3000
```

### 5. Run migrations and seed

```bash
# Run database migrations
pnpm --filter @raveo/cms payload migrate

# Seed demo content
pnpm --filter @raveo/cms seed
```

### 6. Start development

```bash
# Start CMS (http://localhost:3000)
pnpm --filter @raveo/cms dev

# Start web (http://localhost:4321)
pnpm --filter @raveo/web dev
```

Admin panel is available at `http://localhost:3000/admin`.
Default credentials after seed: `admin@example.com` / `password` (change immediately).

## Project Structure

```
raveo/
├── apps/
│   ├── cms/                    — PayloadCMS + Next.js
│   │   ├── src/
│   │   │   ├── collections/    — Content types
│   │   │   ├── globals/        — Site-wide settings
│   │   │   ├── migrations/     — D1 migrations
│   │   │   └── payload.config.ts
│   │   └── wrangler.jsonc
│   └── web/                    — Astro frontend
│       ├── src/
│       │   ├── layouts/
│       │   ├── middleware.ts   — CMS data fetching
│       │   └── pages/
│       └── wrangler.jsonc
├── packages/
│   ├── types/                  — Generated Payload types
│   └── config/                 — Shared tsconfig + Biome
├── AGENTS.md
└── turbo.json
```

## CMS Collections

| Collection | Description |
|---|---|
| Pages | Static pages with hero section |
| Posts | Blog posts with categories and tags |
| Categories | Post categories |
| Media | File uploads stored in R2 |
| Users | Admin users |

## Globals

| Global | Description |
|---|---|
| Navigation | Site navigation items |
| SiteSettings | Site name, description, logo |

## Deploying

### Before first deploy

Update `apps/web/src/pages/sitemap.xml.ts` and `astro.config.mjs` with your production domain.
Update `apps/cms/wrangler.jsonc` with the production Worker name.

```bash
# Deploy CMS
pnpm deploy:cms

# Deploy web
pnpm deploy:web

# Deploy both
pnpm deploy
```

## Adding a New Collection

1. Create `apps/cms/src/collections/MyCollection.ts`
2. Add to `collections` array in `apps/cms/src/payload.config.ts`
3. Generate migration: `pnpm --filter @raveo/cms payload migrate:create`
4. Register migration in `apps/cms/src/migrations/index.ts`
5. Run migration: `pnpm --filter @raveo/cms payload migrate`
6. Regenerate types: `pnpm generate:types`
7. Fetch in `apps/web/src/middleware.ts` and add type to `apps/web/src/env.d.ts`

## Key Architectural Decisions

**Why PayloadCMS on Workers?**
PayloadCMS 3.x runs natively inside Next.js, which can be deployed as a Cloudflare Worker via `@opennextjs/cloudflare`. This gives you a full-featured CMS with a single deployment artifact.

**Why service bindings instead of fetch?**
Cloudflare Workers cannot call another Worker's public URL. The web Worker communicates with the CMS Worker via service binding (`env.CMS.fetch()`) — zero latency, no public network.

**Why middleware for data fetching?**
Astro live collection loaders are plain functions without access to Cloudflare's `env`. Middleware has access to the Worker runtime context, enabling service binding usage with HTTP fallback for local development.

For detailed architectural context, see [AGENTS.md](./AGENTS.md).

## License

MIT
