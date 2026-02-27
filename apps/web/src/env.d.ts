/// <reference types="astro/client" />

type ENV = {
    CMS: Fetcher;
    CACHE: KVNamespace;
};

type Runtime = import("@astrojs/cloudflare").Runtime<ENV>;

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
    }
}
