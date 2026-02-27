import { defineMiddleware } from "astro:middleware";
import type { Fetcher } from "@cloudflare/workers-types";

async function fetchGlobal(
    fetcher: Fetcher | null,
    cmsUrl: string,
    slug: string,
) {
    try {
        const url = `https://cms/api/globals/${slug}?depth=1`;
        const fallbackUrl = `${cmsUrl}/api/globals/${slug}?depth=1`;

        const res = fetcher
            ? await fetcher.fetch(url as Parameters<Fetcher["fetch"]>[0])
            : await fetch(fallbackUrl);

        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

export const onRequest = defineMiddleware(async ({ locals }, next) => {
    let cmsBinding: Fetcher | null = null;

    try {
        const { env } = await import("cloudflare:workers");
        cmsBinding = (env as unknown as { CMS: Fetcher }).CMS ?? null;
    } catch {
        // Dev environment — cloudflare:workers module not available
    }

    const cmsUrl = import.meta.env.CMS_URL;

    const [navigation, siteSettings] = await Promise.all([
        fetchGlobal(cmsBinding, cmsUrl, "navigation"),
        fetchGlobal(cmsBinding, cmsUrl, "site-settings"),
    ]);

    locals.navigation = navigation as App.Locals["navigation"];
    locals.siteSettings = siteSettings as App.Locals["siteSettings"];

    return next();
});
