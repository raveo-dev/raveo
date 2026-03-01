import type { APIRoute } from "astro";

const CACHE_KEYS = [
    "/api/globals/navigation?depth=1",
    "/api/globals/site-settings?depth=1",
    "/api/pages?depth=2&limit=100&where[status][equals]=published",
    "/api/posts?depth=2&limit=100&where[status][equals]=published",
];

export const POST: APIRoute = async ({ request }) => {
    const secret = request.headers.get("x-revalidate-secret");

    let expectedSecret: string | undefined;
    try {
        const { env } = await import("cloudflare:workers");
        const cfEnv = env as unknown as { REVALIDATE_SECRET?: string };
        expectedSecret = cfEnv.REVALIDATE_SECRET;
    } catch {
        expectedSecret = import.meta.env.REVALIDATE_SECRET;
    }

    if (!secret || !expectedSecret || secret !== expectedSecret) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }

    let cache: KVNamespace | null = null;

    try {
        const { env } = await import("cloudflare:workers");
        const cfEnv = env as unknown as { CACHE?: KVNamespace };
        if (cfEnv.CACHE) cache = cfEnv.CACHE;
    } catch {
        return new Response(JSON.stringify({ error: "KV not available" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }

    if (!cache) {
        return new Response(JSON.stringify({ error: "KV not bound" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }

    const deleted: string[] = [];

    for (const key of CACHE_KEYS) {
        try {
            await cache.delete(key);
            deleted.push(key);
        } catch {
            // Key might not exist — that's fine
        }
    }

    return new Response(JSON.stringify({ success: true, deleted }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
};
