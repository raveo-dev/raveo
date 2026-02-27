import type { LiveLoader } from "astro/loaders";

interface PayloadPost extends Record<string, unknown> {
    id: string;
    title: string;
    slug: string;
    excerpt?: string | null;
    publishedDate?: string | null;
}

interface EntryFilter {
    id: string;
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
