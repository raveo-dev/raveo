import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ locals, site }) => {
    const baseUrl =
        site?.toString().replace(/\/$/, "") ?? "https://YOUR_DOMAIN";
    const siteName = locals.siteSettings?.siteName ?? "Raveo";
    const siteDescription = locals.siteSettings?.siteDescription ?? "";

    const postsContent = locals.posts
        .map(
            (post) => `## ${post.title}

URL: ${baseUrl}/blog/${post.slug}
${post.publishedDate ? `Date: ${new Date(post.publishedDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}` : ""}
${post.excerpt ? `\n${post.excerpt}` : ""}
`,
        )
        .join("\n---\n\n");

    const pagesContent = locals.pages
        .filter((page) => page.slug !== "home")
        .map(
            (page) => `## ${page.title}

URL: ${baseUrl}/${page.slug}
${page.hero?.heading ? `\n${page.hero.heading}` : ""}
${page.hero?.subheading ? `\n${page.hero.subheading}` : ""}
`,
        )
        .join("\n---\n\n");

    const content = `# ${siteName}

> ${siteDescription}

Base URL: ${baseUrl}

---

# Pages

${pagesContent}

---

# Blog Posts

${postsContent}`;

    return new Response(content, {
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
        },
    });
};
