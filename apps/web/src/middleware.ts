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

        console.log("fetcher:", fetcher ? "binding" : "http fallback");
        console.log("fetching:", fetcher ? url : fallbackUrl);

        const res = fetcher
            ? await fetcher.fetch(url as Parameters<Fetcher["fetch"]>[0])
            : await fetch(fallbackUrl);

        console.log("response status:", res.status);

        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        console.error("fetchFromCMS error:", e);
        return null;
    }
}

export const onRequest = defineMiddleware(async ({ locals }, next) => {
    let cmsBinding: Fetcher | null = null;

    try {
        const { env } = await import("cloudflare:workers");
        const binding = (env as unknown as { CMS?: Fetcher }).CMS;
        // Only use binding in production — in dev miniflare provides it but CMS Worker isn't running
        if (binding && import.meta.env.PROD) {
            cmsBinding = binding;
        }
    } catch {
        // Dev environment — cloudflare:workers module not available
    }

    const cmsUrl = import.meta.env.CMS_URL;

    const [navigation, siteSettings, pagesData, postsData] = await Promise.all([
        fetchFromCMS(cmsBinding, cmsUrl, "/api/globals/navigation?depth=1"),
        fetchFromCMS(cmsBinding, cmsUrl, "/api/globals/site-settings?depth=1"),
        fetchFromCMS(
            cmsBinding,
            cmsUrl,
            "/api/pages?depth=2&limit=100&where[status][equals]=published",
        ),
        fetchFromCMS(
            cmsBinding,
            cmsUrl,
            "/api/posts?depth=1&limit=100&where[status][equals]=published",
        ),
    ]);

    locals.navigation = navigation as App.Locals["navigation"];
    locals.siteSettings = siteSettings as App.Locals["siteSettings"];
    locals.pages = (pagesData as { docs?: PayloadPage[] })?.docs ?? [];
    locals.posts = (postsData as { docs?: PayloadPost[] })?.docs ?? [];

    return next();
});
