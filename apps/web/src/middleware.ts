import { defineMiddleware } from "astro:middleware";

async function fetchGlobal(cmsUrl: string, slug: string) {
    try {
        const res = await fetch(`${cmsUrl}/api/globals/${slug}?depth=1`);
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

export const onRequest = defineMiddleware(async ({ locals }, next) => {
    const cmsUrl = import.meta.env.CMS_URL;

    const [navigation, siteSettings] = await Promise.all([
        fetchGlobal(cmsUrl, "navigation"),
        fetchGlobal(cmsUrl, "site-settings"),
    ]);

    locals.navigation = navigation;
    locals.siteSettings = siteSettings;

    return next();
});
