import type { LiveLoader } from "astro/loaders";

// Sdílený filter type pro oba loadery
interface EntryFilter {
    id: string;
}

// ===== Posts =====

interface PayloadPost extends Record<string, unknown> {
    id: string;
    title: string;
    slug: string;
    excerpt?: string | null;
    publishedDate?: string | null;
}

export function payloadPostsLoader(config: {
    cmsUrl: string;
}): LiveLoader<PayloadPost, EntryFilter> {
    return {
        name: "payload-posts",
        loadCollection: async () => {
            try {
                const res = await fetch(
                    `${config.cmsUrl}/api/posts?depth=1&limit=100`,
                );
                if (!res.ok) throw new Error(`CMS fetch failed: ${res.status}`);
                const data = await res.json();
                return {
                    entries: data.docs.map((doc: PayloadPost) => ({
                        id: doc.id,
                        data: doc,
                    })),
                };
            } catch (error) {
                return { error: error as Error };
            }
        },
        loadEntry: async ({ filter }) => {
            try {
                const res = await fetch(
                    `${config.cmsUrl}/api/posts/${filter.id}?depth=1`,
                );
                if (!res.ok) return undefined;
                const doc = await res.json();
                return { id: doc.id, data: doc };
            } catch (error) {
                return { error: error as Error };
            }
        },
    };
}

// ===== Pages =====

interface PayloadPage extends Record<string, unknown> {
    id: string;
    title: string;
    slug: string;
    status: "draft" | "published" | "archived";
    hero?: {
        heading?: string | null;
        subheading?: string | null;
        image?: {
            id: string;
            url: string;
            alt: string;
            width?: number;
            height?: number;
        } | null;
    } | null;
    seo?: {
        title?: string | null;
        description?: string | null;
        noIndex?: boolean | null;
    } | null;
}

export function payloadPagesLoader(config: {
    cmsUrl: string;
}): LiveLoader<PayloadPage, EntryFilter> {
    return {
        name: "payload-pages",
        loadCollection: async () => {
            try {
                const res = await fetch(
                    `${config.cmsUrl}/api/pages?depth=2&limit=100&where[status][equals]=published`,
                );
                if (!res.ok) throw new Error(`CMS fetch failed: ${res.status}`);
                const data = await res.json();
                return {
                    entries: data.docs.map((doc: PayloadPage) => ({
                        id: doc.id,
                        data: doc,
                    })),
                };
            } catch (error) {
                return { error: error as Error };
            }
        },
        loadEntry: async ({ filter }) => {
            try {
                const res = await fetch(
                    `${config.cmsUrl}/api/pages/${filter.id}?depth=2`,
                );
                if (!res.ok) return undefined;
                const doc = await res.json();
                return { id: doc.id, data: doc };
            } catch (error) {
                return { error: error as Error };
            }
        },
    };
}
