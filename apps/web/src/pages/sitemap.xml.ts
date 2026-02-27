import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ locals, site }) => {
    const baseUrl =
        site?.toString().replace(/\/$/, "") ?? "https://YOUR_DOMAIN";

    const pages = locals.pages.map((page) => ({
        url: `${baseUrl}/${page.slug === "home" ? "" : page.slug}`,
        lastmod: new Date().toISOString(),
    }));

    const posts = locals.posts.map((post) => ({
        url: `${baseUrl}/blog/${post.slug}`,
        lastmod: post.publishedDate ?? new Date().toISOString(),
    }));

    const urls = [...pages, ...posts];

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
    .map(
        ({ url, lastmod }) => `  <url>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
  </url>`,
    )
    .join("\n")}
</urlset>`;

    return new Response(sitemap, {
        headers: {
            "Content-Type": "application/xml",
        },
    });
};
