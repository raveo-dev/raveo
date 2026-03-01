/// <reference types="astro/client" />

type ENV = {
    CMS: Fetcher;
    CACHE: KVNamespace;
};

type Runtime = import("@astrojs/cloudflare").Runtime<ENV>;

type LexicalContent = import("./utils/lexical").LexicalContent;

interface PayloadPage {
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
    content?: LexicalContent | null;
    seo?: {
        title?: string | null;
        description?: string | null;
        noIndex?: boolean | null;
    } | null;
}

interface PayloadPost {
    id: string;
    title: string;
    slug: string;
    excerpt?: string | null;
    content?: LexicalContent | null;
    publishedDate?: string | null;
    categories?: Array<{ id: string; name: string }> | null;
    seo?: {
        title?: string | null;
        description?: string | null;
    } | null;
}

declare namespace App {
    interface Locals extends Runtime {
        navigation: {
            items: Array<{
                label: string;
                href: string;
                children?: Array<{ label: string; href: string }>;
            }>;
        } | null;
        siteSettings: {
            siteName: string;
            siteDescription: string;
        } | null;
        pages: PayloadPage[];
        posts: PayloadPost[];
    }
}
