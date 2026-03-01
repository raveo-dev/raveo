import { defineMiddleware } from "astro:middleware";
import type { Fetcher } from "@cloudflare/workers-types";

async function fetchFromCMS(
    fetcher: Fetcher | null,
    cmsUrl: string,
    path: string,
) {
    try {
        const url = `https://cms${path}`;
        const fallbackUrl = `${cmsUrl}${path}`;

        const res = fetcher
            ? await fetcher.fetch(url as Parameters<Fetcher["fetch"]>[0])
            : await fetch(fallbackUrl);

        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        console.error("fetchFromCMS error:", e);
        return null;
    }
}

async function cachedFetch(
    fetcher: Fetcher | null,
    cmsUrl: string,
    path: string,
    cache: KVNamespace | null,
) {
    if (cache) {
        try {
            const cached = await cache.get(path, "json");
            if (cached) return cached;
        } catch {
            // KV read failed — fall through to CMS
        }
    }

    const data = await fetchFromCMS(fetcher, cmsUrl, path);

    if (data && cache) {
        // Fire-and-forget — don't block the response
        cache
            .put(path, JSON.stringify(data), { expirationTtl: 300 })
            .catch(() => {});
    }

    return data;
}

export const onRequest = defineMiddleware(async ({ locals }, next) => {
    let cmsBinding: Fetcher | null = null;
    let cacheBinding: KVNamespace | null = null;

    try {
        const { env } = await import("cloudflare:workers");
        const cfEnv = env as unknown as { CMS?: Fetcher; CACHE?: KVNamespace };
        // Only use bindings in production — in dev miniflare provides them but Workers aren't running
        if (import.meta.env.PROD) {
            if (cfEnv.CMS) cmsBinding = cfEnv.CMS;
            if (cfEnv.CACHE) cacheBinding = cfEnv.CACHE;
        }
    } catch {
        // Dev environment — cloudflare:workers module not available
    }

    const cmsUrl = import.meta.env.CMS_URL;
    const fetcher = cmsBinding;
    const cache = cacheBinding;

    const [navigation, siteSettings, pagesData, postsData] = await Promise.all([
        cachedFetch(fetcher, cmsUrl, "/api/globals/navigation?depth=1", cache),
        cachedFetch(
            fetcher,
            cmsUrl,
            "/api/globals/site-settings?depth=1",
            cache,
        ),
        cachedFetch(
            fetcher,
            cmsUrl,
            "/api/pages?depth=2&limit=100&where[status][equals]=published",
            cache,
        ),
        cachedFetch(
            fetcher,
            cmsUrl,
            "/api/posts?depth=2&limit=100&where[status][equals]=published",
            cache,
        ),
    ]);

    locals.navigation = navigation as App.Locals["navigation"];
    locals.siteSettings = siteSettings as App.Locals["siteSettings"];
    locals.pages = (pagesData as { docs?: PayloadPage[] })?.docs ?? [];
    locals.posts = (postsData as { docs?: PayloadPost[] })?.docs ?? [];

    return next();
});
